import "dotenv/config";

import assert from "node:assert/strict";

import { prisma } from "../src/lib/prisma";
import { listQuestionDrafts, createQuestionDrafts } from "../src/lib/persistence";
import {
  autoValidateAndApproveDrafts,
  buildOpenRouterModelSequence,
  generateFreshQuestionSessionDrafts,
  hashGeneratedQuestionText,
  isArcRelevantQuestion,
  normalizeGeneratedQuestionText,
} from "../src/lib/questionGenerator";
import type { GeneratedQuestionDraft } from "../src/lib/questionGenerator";

type DraftSignature = {
  id: string;
  question: string;
  questionHash: string;
  sourceTopic?: string;
  difficulty?: string;
};

type BatchResult = {
  batchNumber: number;
  model: string;
  questions: GeneratedQuestionDraft[];
  fallbackUsed: boolean;
  saved: Array<{
    id: string;
    savedToDb: boolean;
    checkedAgainstDb: boolean;
  }>;
};

const createdHashes: string[] = [];

function toSignature(item: {
  id: string;
  question: string;
  questionHash?: string | null;
  sourceTopic?: string | null;
  difficulty?: string | null;
}): DraftSignature {
  return {
    id: item.id,
    question: item.question,
    questionHash: item.questionHash ?? hashGeneratedQuestionText(item.question),
    sourceTopic: item.sourceTopic ?? undefined,
    difficulty: item.difficulty ?? undefined,
  };
}

function signaturesFromDrafts(drafts: GeneratedQuestionDraft[]): DraftSignature[] {
  return drafts.map((draft) => ({
    id: draft.id,
    question: draft.question,
    questionHash: draft.questionHash ?? hashGeneratedQuestionText(draft.question),
    sourceTopic: draft.sourceTopic ?? undefined,
    difficulty: draft.difficulty ?? undefined,
  }));
}

function printQuestion(prefix: string, question: GeneratedQuestionDraft, dbChecked: boolean, savedToDb: boolean) {
  console.log(prefix);
  console.log(`  difficulty: ${question.difficulty ?? "unknown"}`);
  console.log(`  sourceTopic: ${question.sourceTopic ?? question.sourceHint ?? "unknown"}`);
  console.log(`  question: ${question.question}`);
  console.log(`  options: ${JSON.stringify(question.options)}`);
  console.log(`  correctAnswer: ${question.correctAnswer}`);
  console.log(`  explanation: ${question.explanation}`);
  console.log(`  questionHash: ${question.questionHash ?? hashGeneratedQuestionText(question.question)}`);
  console.log(`  uniquenessReason: ${question.uniquenessReason ?? ""}`);
  console.log(`  checkedAgainstDatabase: ${dbChecked ? "yes" : "no"}`);
  console.log(`  savedToDatabase: ${savedToDb ? "yes" : "no"}`);
}

async function saveApprovedDrafts(
  drafts: GeneratedQuestionDraft[],
  existingQuestions: DraftSignature[],
) {
  if (!drafts.length) {
    return [];
  }

  const reviewed = autoValidateAndApproveDrafts(
    drafts,
    existingQuestions.map((item) => ({
      id: item.id,
      question: item.question,
    })),
  );

  return createQuestionDrafts(reviewed.approved);
}

async function cleanupTemporaryDrafts(questionHashes: string[]) {
  if (!questionHashes.length) {
    return;
  }

  await prisma.questionDraft.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "or-" } },
        { questionHash: { in: questionHashes } },
      ],
    },
  });
}

async function generateBatch(
  batchNumber: number,
  existingQuestions: DraftSignature[],
): Promise<BatchResult> {
  const generation = await generateFreshQuestionSessionDrafts("operator", 5, {
    previousQuestionIds: [],
    existingQuestions,
  });
  const questions = generation.questions;

  assert.equal(questions.length, 5, `Batch ${batchNumber} should contain exactly 5 questions.`);
  assert.equal(
    new Set(questions.map((question) => question.id)).size,
    questions.length,
    `Batch ${batchNumber} should not repeat question ids.`,
  );

  assert.equal(
    questions.every((question) => isArcRelevantQuestion(question)),
    true,
    `Batch ${batchNumber} should be Arc/Archie relevant.`,
  );

  const blacklist = /blockchain|crypto/i;
  assert.equal(
    questions.every((question) => !blacklist.test(question.question)),
    true,
    `Batch ${batchNumber} should not include generic crypto/blockchain questions.`,
  );

  const savedRecords = await saveApprovedDrafts(questions, existingQuestions);
  const savedHashes = new Set(
    savedRecords.map((record) => record.questionHash ?? hashGeneratedQuestionText(record.question)),
  );

  const saved = questions.map((question) => {
    const hash = question.questionHash ?? hashGeneratedQuestionText(question.question);
    return {
      id: question.id,
      checkedAgainstDb: existingQuestions.some((item) => item.questionHash === hash || normalizeGeneratedQuestionText(item.question) === normalizeGeneratedQuestionText(question.question)),
      savedToDb: savedHashes.has(hash),
    };
  });

  return {
    batchNumber,
    model: generation.modelUsed ?? questions[0]?.modelUsed ?? "unknown",
    questions,
    fallbackUsed: generation.fallbackUsed,
    saved,
  };
}

async function main() {
  console.log("DEV-ONLY: real OpenRouter question generation verification script.");

  const models = buildOpenRouterModelSequence();
  if (!models.length) {
    throw new Error("OpenRouter is not configured. Set LLM_PROVIDER=openrouter and OPENROUTER_API_KEY.");
  }

  console.log(`OpenRouter model chain: ${models.join(" -> ")}`);

  await cleanupTemporaryDrafts([]);

  const initialDrafts = await listQuestionDrafts();
  const initialSignatures = initialDrafts.map(toSignature);
  const initialSignatureCount = initialSignatures.length;
  console.log(`Loaded ${initialSignatureCount} existing question records from the database.`);

  const firstBatch = await generateBatch(1, initialSignatures);
  const firstBatchSignatures = signaturesFromDrafts(firstBatch.questions);
  createdHashes.push(...firstBatch.questions.map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)));

  console.log(`Using OpenRouter model: ${firstBatch.model}`);
  console.log(`Generated ${firstBatch.questions.length} valid unique questions in batch 1.`);
  console.log(`Fallback used in batch 1: ${firstBatch.fallbackUsed ? "yes" : "no"}`);
  for (const [index, question] of firstBatch.questions.entries()) {
    const savedInfo = firstBatch.saved[index];
    printQuestion(`Question ${index + 1} (batch 1):`, question, Boolean(savedInfo?.checkedAgainstDb), Boolean(savedInfo?.savedToDb));
  }

  const refreshedDrafts = await listQuestionDrafts();
  const refreshedSignatures = refreshedDrafts.map(toSignature);
  const secondExisting = [...initialSignatures, ...firstBatchSignatures, ...refreshedSignatures].reduce<DraftSignature[]>(
    (accumulator, item) => {
      if (!accumulator.some((candidate) => candidate.id === item.id || candidate.questionHash === item.questionHash)) {
        accumulator.push(item);
      }

      return accumulator;
    },
    [],
  );

  const secondBatch = await generateBatch(2, secondExisting);
  createdHashes.push(...secondBatch.questions.map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)));

  console.log(`Using OpenRouter model: ${secondBatch.model}`);
  console.log(`Generated ${secondBatch.questions.length} valid unique questions in batch 2.`);
  console.log(`Fallback used in batch 2: ${secondBatch.fallbackUsed ? "yes" : "no"}`);
  for (const [index, question] of secondBatch.questions.entries()) {
    const savedInfo = secondBatch.saved[index];
    printQuestion(`Question ${index + 1} (batch 2):`, question, Boolean(savedInfo?.checkedAgainstDb), Boolean(savedInfo?.savedToDb));
  }

  const firstHashes = new Set(firstBatch.questions.map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)));
  const secondHashes = new Set(secondBatch.questions.map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)));
  const overlap = [...firstHashes].filter((hash) => secondHashes.has(hash));

  console.log(`Batch overlap count: ${overlap.length}`);
  console.log(`Difficulty mix batch 1: ${[...new Set(firstBatch.questions.map((question) => question.difficulty))].join(", ")}`);
  console.log(`Difficulty mix batch 2: ${[...new Set(secondBatch.questions.map((question) => question.difficulty))].join(", ")}`);

  assert.equal(overlap.length, 0, "The second batch must not repeat the first batch.");

  const combinedDifficulties = new Set([
    ...firstBatch.questions.map((question) => question.difficulty),
    ...secondBatch.questions.map((question) => question.difficulty),
  ]);
  assert.equal(
    combinedDifficulties.has("easy") && combinedDifficulties.has("medium") && combinedDifficulties.has("hard"),
    true,
    "Combined batches should include easy, medium, and hard questions.",
  );

  console.log("Duplicate prevention worked: yes");
  console.log("Arc/Archie-specific questions: yes");
  console.log("Generic crypto/blockchain questions: rejected");
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await cleanupTemporaryDrafts([...new Set(createdHashes)]);
  await prisma.$disconnect().catch(() => undefined);
});
