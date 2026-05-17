import { questions } from "@/lib/data/questions";
import type {
  AnswerResult,
  QuizLevel,
  QuizQuestion,
  QuizScore,
} from "@/types/quiz";

export const DEFAULT_QUIZ_LENGTH = 20;
export const PASSING_CORRECT_ANSWERS = 7;

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function shuffleQuestionOptions(question: QuizQuestion): QuizQuestion {
  return {
    ...question,
    options: shuffle(question.options),
  };
}

export function selectQuestions(
  level?: QuizLevel,
  count = DEFAULT_QUIZ_LENGTH,
): QuizQuestion[] {
  const pool = level
    ? questions.filter((question) => question.level === level)
    : questions;

  return shuffle(pool)
    .slice(0, Math.max(0, count))
    .map(shuffleQuestionOptions);
}

export function checkAnswer(
  questionId: string,
  selectedAnswer: string,
  pool: readonly QuizQuestion[] = questions,
): AnswerResult {
  const question = pool.find((item) => item.id === questionId);

  if (!question) {
    return {
      questionId,
      selectedAnswer,
      correct: false,
      explanation: "Question not found.",
    };
  }

  return {
    questionId,
    selectedAnswer,
    correct: selectedAnswer === question.correctAnswer,
    explanation: question.explanation,
  };
}

export function calculateScore(results: AnswerResult[]): QuizScore {
  const correct = results.filter((result) => result.correct).length;
  const total = results.length;

  return {
    correct,
    total,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}

export function hasPassed(score: QuizScore): boolean {
  return score.correct >= PASSING_CORRECT_ANSWERS;
}
