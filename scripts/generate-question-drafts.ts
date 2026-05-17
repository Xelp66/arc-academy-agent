import assert from "node:assert/strict";

import { createQuestionDrafts } from "../src/lib/persistence";
import {
  autoValidateAndApproveDrafts,
  detectDuplicateQuestion,
  generateQuestionDrafts,
  isArcRelevantQuestion,
  validateGeneratedQuestion,
} from "../src/lib/questionGenerator";
import type { QuizCategory, QuizLevel } from "../src/types/quiz";
import { questions as existingQuestions } from "../src/lib/data/questions";

const level: QuizLevel = "builder";
const categories: QuizCategory[] = [
  "basics",
  "network",
  "gas",
  "evm",
  "agents",
  "security",
];

const drafts = categories.flatMap((category) =>
  generateQuestionDrafts(level, category, 2),
);
const shouldSave = process.argv.includes("--save");
const shouldAutoApprove = process.argv.includes("--auto-approve");

assert.equal(drafts.length, 12, "Expected 12 sample drafts.");

const seen = new Set<string>();

for (const draft of drafts) {
  validateGeneratedQuestion(draft);
  assert.equal(isArcRelevantQuestion(draft), true, `Draft ${draft.id} must be Arc relevant.`);

  const duplicate = detectDuplicateQuestion(
    draft,
    [
      ...existingQuestions.map((question) => ({
        id: question.id,
        question: question.question,
      })),
      ...drafts
        .filter((candidate) => candidate.id !== draft.id)
        .map((candidate) => ({ id: candidate.id, question: candidate.question })),
    ],
  );

  assert.equal(duplicate, false, `Draft ${draft.id} should be unique.`);
  assert.equal(seen.has(draft.id), false, `Draft id ${draft.id} should be unique.`);
  seen.add(draft.id);
}

console.log(`Generated ${drafts.length} Arc question drafts.`);
for (const draft of drafts) {
  console.log(
    JSON.stringify(
      {
        id: draft.id,
        level: draft.level,
        category: draft.category,
        question: draft.question,
        correctAnswer: draft.correctAnswer,
        status: draft.status,
      },
      null,
      2,
    ),
  );
}

console.log("Draft validation passed for all sample questions.");

async function persistDrafts() {
  if (!shouldSave && !shouldAutoApprove) {
    return;
  }

  const reviewed = autoValidateAndApproveDrafts(drafts);
  const saved = await createQuestionDrafts(reviewed.approved);
  console.log(`Saved ${saved.length} approved question drafts to the database.`);
  console.log(`Auto-approval result: ${reviewed.approved.length} approved, ${reviewed.rejected.length} rejected.`);
}

persistDrafts().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
