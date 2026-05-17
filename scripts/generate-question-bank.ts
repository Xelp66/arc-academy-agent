import "dotenv/config";

import { createQuestionDrafts, listQuestionDrafts } from "../src/lib/persistence";
import {
  autoValidateAndApproveDrafts,
  generateFreshQuestionSessionDrafts,
  hashGeneratedQuestionText,
  type GeneratedQuestionDraft,
} from "../src/lib/questionGenerator";
import type { QuizLevel } from "../src/types/quiz";

const LEVELS: QuizLevel[] = [
  "visitor",
  "explorer",
  "pathfinder",
  "builder",
  "operator",
  "strategist",
  "architect",
  "protocolist",
  "arc_sage",
  "arc_master",
];

function parseArg(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function parseCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

function parseBatchSize(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLevel(value: string) {
  if ((LEVELS as readonly string[]).includes(value)) {
    return value as QuizLevel;
  }

  return "visitor";
}

function toSignature(draft: {
  id: string;
  question: string;
  questionHash?: string | null;
}) {
  return {
    id: draft.id,
    question: draft.question,
    questionHash: draft.questionHash ?? hashGeneratedQuestionText(draft.question),
  };
}

async function main() {
  const level = parseLevel(parseArg("level", "visitor"));
  const target = parseCount(parseArg("count", "20"));
  const batchSize = Math.min(parseBatchSize(parseArg("batchSize", "10"), 10), target);
  const safeAttemptLimit = 25;

  console.log("DEV-ONLY: Arc question bank generation script.");
  console.log(`Target level: ${level}`);
  console.log(`Target count: ${target}`);

  const existingDrafts = await listQuestionDrafts();
  const existing = existingDrafts.map(toSignature);
  console.log(`Loaded ${existing.length} existing question draft records.`);

  let savedCount = 0;
  let attempts = 0;

  while (savedCount < target && attempts < safeAttemptLimit) {
    attempts += 1;
    const remaining = target - savedCount;
    const requestCount = Math.min(batchSize, remaining);

    console.log(`Attempt ${attempts}: generating ${requestCount} questions...`);

    const generation = await generateFreshQuestionSessionDrafts(level, requestCount, {
      existingQuestions: existing.map((item) => ({
        id: item.id,
        question: item.question,
        questionHash: item.questionHash,
      })),
    });

    const reviewed = autoValidateAndApproveDrafts(
      generation.questions as GeneratedQuestionDraft[],
      existing.map((item) => ({
        id: item.id,
        question: item.question,
      })),
    );

    const saved = await createQuestionDrafts(reviewed.approved);

    for (const item of saved) {
      existing.push(toSignature(item));
    }

    savedCount += saved.length;

    console.log(
      `Attempt ${attempts}: source=${generation.source} model=${generation.modelUsed ?? "local"} fallback=${generation.fallbackUsed ? "yes" : "no"} approved=${reviewed.approved.length} saved=${saved.length} totalSaved=${savedCount}`,
    );

    if (requestCount <= 0) {
      break;
    }
  }

  if (savedCount < target) {
    console.error(
      `Stopped after ${attempts} attempts with only ${savedCount}/${target} questions saved.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Saved ${savedCount} questions for level ${level}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
