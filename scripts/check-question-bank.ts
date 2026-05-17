import "dotenv/config";

import { listQuestionDrafts } from "../src/lib/persistence";

async function main() {
  const drafts = await listQuestionDrafts();
  const byLevel = new Map<string, number>();
  const byDifficulty = new Map<string, number>();
  const hashCounts = new Map<string, number>();

  let inactiveCount = 0;
  let invalidCount = 0;

  for (const draft of drafts) {
    byLevel.set(draft.levelId, (byLevel.get(draft.levelId) ?? 0) + 1);
    byDifficulty.set(draft.difficulty ?? "unknown", (byDifficulty.get(draft.difficulty ?? "unknown") ?? 0) + 1);

    const hash = draft.questionHash ?? "";
    if (hash) {
      hashCounts.set(hash, (hashCounts.get(hash) ?? 0) + 1);
    }

    if (draft.status !== "approved") {
      inactiveCount += 1;
    }

    if (!draft.question || !Array.isArray(draft.options) || !draft.correctAnswer || !draft.explanation) {
      invalidCount += 1;
    }
  }

  const duplicateHashCount = [...hashCounts.values()].filter((value) => value > 1).length;

  console.log(`Total questions: ${drafts.length}`);
  console.log("Count per level:");
  for (const [level, count] of [...byLevel.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${level}: ${count}`);
  }
  console.log("Count per difficulty:");
  for (const [difficulty, count] of [...byDifficulty.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${difficulty}: ${count}`);
  }
  console.log(`Duplicate hash count: ${duplicateHashCount}`);
  console.log(`Inactive/invalid count: ${inactiveCount + invalidCount}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
