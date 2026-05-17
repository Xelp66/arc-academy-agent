import assert from "node:assert/strict";

import { questions } from "../src/lib/data/questions";
import {
  DEFAULT_QUIZ_LENGTH,
  calculateScore,
  checkAnswer,
  hasPassed,
  selectQuestions,
} from "../src/lib/quiz";
import type { QuizLevel } from "../src/types/quiz";

const selectedQuestions = selectQuestions();
assert.equal(selectedQuestions.length, DEFAULT_QUIZ_LENGTH);
assert.equal(new Set(selectedQuestions.map((question) => question.id)).size, 20);

for (const question of selectedQuestions) {
  assert.equal(question.options.length, 4);
  assert.ok(question.options.includes(question.correctAnswer));
}

const knownQuestion = questions.find(
  (question) => question.id === "visitor-gas-usdc",
);
assert.ok(knownQuestion);

const correctAnswer = checkAnswer(knownQuestion.id, knownQuestion.correctAnswer);
assert.equal(correctAnswer.correct, true);
assert.equal(correctAnswer.explanation, knownQuestion.explanation);

const wrongAnswer = checkAnswer(knownQuestion.id, "ETH");
assert.equal(wrongAnswer.correct, false);
assert.equal(wrongAnswer.explanation, knownQuestion.explanation);

const passingScore = calculateScore([
  ...Array.from({ length: 7 }, (_, index) => ({
    questionId: `correct-${index}`,
    selectedAnswer: "A",
    correct: true,
    explanation: "Correct.",
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    questionId: `wrong-${index}`,
    selectedAnswer: "B",
    correct: false,
    explanation: "Wrong.",
  })),
]);

assert.deepEqual(passingScore, {
  correct: 7,
  total: 10,
  percentage: 70,
});
assert.equal(hasPassed(passingScore), true);

const failingScore = calculateScore([
  ...Array.from({ length: 6 }, (_, index) => ({
    questionId: `correct-${index}`,
    selectedAnswer: "A",
    correct: true,
    explanation: "Correct.",
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    questionId: `wrong-${index}`,
    selectedAnswer: "B",
    correct: false,
    explanation: "Wrong.",
  })),
]);

assert.equal(hasPassed(failingScore), false);

const visitorQuestions = selectQuestions("visitor", 20);
assert.ok(visitorQuestions.length > 0);
assert.ok(visitorQuestions.every((question) => question.level === "visitor"));

const allLevels: QuizLevel[] = [
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

for (const level of allLevels) {
  const levelQuestions = selectQuestions(level, 20);
  assert.equal(levelQuestions.length, 20);
  assert.ok(levelQuestions.every((question) => question.level === level));
}

const questionCounts = allLevels.reduce<Record<QuizLevel, number>>(
  (counts, level) => {
    counts[level] = questions.filter((question) => question.level === level).length;
    return counts;
  },
  {
    visitor: 0,
    explorer: 0,
    pathfinder: 0,
    builder: 0,
    operator: 0,
    strategist: 0,
    architect: 0,
    protocolist: 0,
    arc_sage: 0,
    arc_master: 0,
  },
);

assert.equal(questions.length, 200);
for (const level of allLevels) {
  assert.equal(questionCounts[level], 20);
}

console.log("Quiz engine tests passed.");
