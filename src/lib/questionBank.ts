import { questions as staticQuestions } from "@/lib/data/questions";
import { listApprovedQuestionDrafts, createQuestionDrafts } from "@/lib/persistence";
import type { QuestionDraft } from "@/generated/prisma/client";
import type { QuizQuestion, QuizLevel } from "@/types/quiz";
import { prisma } from "@/lib/prisma";
import {
  autoValidateAndApproveDrafts,
  hashGeneratedQuestionText,
  generateQuestionsWithProvider,
  type GeneratedQuestionDraft,
} from "@/lib/questionGenerator";

export function questionDraftToQuizQuestion(
  draft: Pick<
    QuestionDraft,
    "id" | "levelId" | "category" | "question" | "options" | "correctAnswer" | "explanation" | "sourceHint"
  >,
): QuizQuestion {
  return {
    id: draft.id,
    level: draft.levelId as QuizQuestion["level"],
    category: draft.category as QuizQuestion["category"],
    question: draft.question,
    options: Array.isArray(draft.options) ? (draft.options as string[]) : [],
    correctAnswer: draft.correctAnswer,
    explanation: draft.explanation,
    sourceHint: draft.sourceHint ?? undefined,
  };
}

export async function loadApprovedQuestionPool() {
  let approvedDrafts: Awaited<ReturnType<typeof listApprovedQuestionDrafts>> = [];

  try {
    approvedDrafts = await listApprovedQuestionDrafts();
  } catch (error) {
    if (!(error instanceof TypeError && /questionDraft/i.test(String(error.message)))) {
      throw error;
    }
  }

  const approvedQuestions = approvedDrafts.map(questionDraftToQuizQuestion);
  const merged = [...staticQuestions, ...approvedQuestions];
  const unique = new Map(merged.map((question) => [question.id, question] as const));

  return [...unique.values()];
}

export function getStaticQuestionPool() {
  return [...staticQuestions];
}

export function countApprovedQuestionsForLevel(pool: readonly QuizQuestion[], level: QuizLevel) {
  return pool.filter((question) => question.level === level).length;
}

export async function generateAndApproveLevelDrafts(level: QuizLevel) {
  const approvedQuestions = (await loadApprovedQuestionPool()).filter(
    (question) => question.level === level,
  );
  const generated = await generateQuestionsWithProvider(level, 20, {
    existingQuestions: approvedQuestions.map((question) => ({
      id: question.id,
      question: question.question,
    })),
  });
  const reviewed = autoValidateAndApproveDrafts(generated, approvedQuestions.map((question) => ({
    id: question.id,
    question: question.question,
  })));
  await createQuestionDrafts(reviewed.approved);
  return reviewed.reviewed;
}

export async function ensureApprovedQuestionsForLevel(level: QuizLevel, minimum = 40) {
  const approvedQuestions = (await loadApprovedQuestionPool()).filter(
    (question) => question.level === level,
  );

  if (approvedQuestions.length >= minimum) {
    return approvedQuestions;
  }

  try {
    const reviewedDrafts = await generateAndApproveLevelDrafts(level);
    return [
      ...approvedQuestions,
      ...reviewedDrafts
        .filter((draft): draft is GeneratedQuestionDraft & { status: "approved" } => draft.status === "approved")
        .map((draft) => questionDraftToQuizQuestion({
          id: draft.id,
          levelId: draft.level,
          category: draft.category,
          question: draft.question,
          options: draft.options,
          correctAnswer: draft.correctAnswer,
          explanation: draft.explanation,
          sourceHint: draft.sourceHint ?? null,
        })),
    ];
  } catch {
    return approvedQuestions;
  }
}

type QuizSelectionHistory = {
  questionId: string;
  createdAt: Date;
};

export type QuestionBankSelection = {
  questions: QuizQuestion[];
  usedFallback: boolean;
  fallbackReason?: string;
  approvedCount: number;
  bankCount: number;
  unseenCount: number;
  reusedCount: number;
  selectedQuestionHashes: string[];
};

function shuffle<T>(items: readonly T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

const QUIZ_LEVEL_ORDER: Record<QuizLevel, number> = {
  visitor: 1,
  explorer: 2,
  pathfinder: 3,
  builder: 4,
  operator: 5,
  strategist: 6,
  architect: 7,
  protocolist: 8,
  arc_sage: 9,
  arc_master: 10,
};

function difficultyForLevel(level: QuizLevel) {
  const order = QUIZ_LEVEL_ORDER[level];

  if (order <= 2) {
    return { easy: 12, medium: 6, hard: 2 };
  }

  if (order <= 4) {
    return { easy: 8, medium: 8, hard: 4 };
  }

  if (order <= 6) {
    return { easy: 5, medium: 9, hard: 6 };
  }

  if (order <= 8) {
    return { easy: 3, medium: 8, hard: 9 };
  }

  return { easy: 2, medium: 6, hard: 12 };
}

function normaliseQuestion(question: QuizQuestion) {
  return {
    ...question,
    options: [...question.options],
  };
}

function questionHash(question: QuizQuestion) {
  return hashGeneratedQuestionText(question.question);
}

function uniqueByHash(questions: QuizQuestion[]) {
  const seen = new Set<string>();
  const unique: QuizQuestion[] = [];

  for (const question of questions) {
    const hash = questionHash(question);

    if (seen.has(hash)) {
      continue;
    }

    seen.add(hash);
    unique.push(question);
  }

  return unique;
}

function selectByDifficulty(
  questions: QuizQuestion[],
  seenIds: Set<string>,
  lastSeenAt: Map<string, Date>,
  target: number,
) {
  const unseen = shuffle(
    questions.filter((question) => !seenIds.has(question.id)),
  );
  const seen = [...questions.filter((question) => seenIds.has(question.id))].sort((left, right) => {
    const leftSeen = lastSeenAt.get(left.id)?.getTime() ?? 0;
    const rightSeen = lastSeenAt.get(right.id)?.getTime() ?? 0;

    if (leftSeen !== rightSeen) {
      return leftSeen - rightSeen;
    }

    return left.id.localeCompare(right.id);
  });

  return [...unseen, ...seen].slice(0, target);
}

async function loadSelectionHistory(userId?: string, recentQuestionIds: string[] = []) {
  const history: QuizSelectionHistory[] = [];

  if (userId) {
    const answers = await prisma.answer.findMany({
      where: {
        session: { userId },
      },
      select: {
        questionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    for (const answer of answers) {
      history.push({
        questionId: answer.questionId,
        createdAt: answer.createdAt,
      });
    }
  }

  const now = new Date();
  for (const questionId of recentQuestionIds) {
    history.push({
      questionId,
      createdAt: now,
    });
  }

  return history;
}

export async function selectQuestionsForQuiz(options: {
  level: QuizLevel;
  count: number;
  userId?: string | null;
  recentQuestionIds?: string[];
}): Promise<QuestionBankSelection> {
  const { level, count, userId, recentQuestionIds = [] } = options;
  const approvedDrafts = await listApprovedQuestionDrafts();
  const approvedQuestions = approvedDrafts
    .filter((draft) => draft.levelId === level)
    .map(questionDraftToQuizQuestion);
  const fallbackQuestions = staticQuestions.filter((question) => question.level === level);
  const approvalCount = approvedQuestions.length;
  const history = await loadSelectionHistory(userId ?? undefined, recentQuestionIds);
  const seenIds = new Set(history.map((item) => item.questionId));
  const lastSeenAt = new Map<string, Date>();

  for (const item of history) {
    const current = lastSeenAt.get(item.questionId);
    if (!current || item.createdAt > current) {
      lastSeenAt.set(item.questionId, item.createdAt);
    }
  }

  const approvedBank = uniqueByHash(approvedQuestions.map(normaliseQuestion));
  const fallbackBank = uniqueByHash(fallbackQuestions.map(normaliseQuestion));
  const primaryBank = approvedBank.length >= count ? approvedBank : [...approvedBank, ...fallbackBank];
  const mergedBank = uniqueByHash(primaryBank);

  const groups = {
    easy: mergedBank.filter((question) => (question.difficulty ?? "easy") === "easy"),
    medium: mergedBank.filter((question) => (question.difficulty ?? "medium") === "medium"),
    hard: mergedBank.filter((question) => (question.difficulty ?? "medium") === "hard"),
  };

  const targets = difficultyForLevel(level);
  const selected: QuizQuestion[] = [];
  const selectedHashes = new Set<string>();

  for (const difficulty of ["easy", "medium", "hard"] as const) {
    const target = Math.min(targets[difficulty], count - selected.length);
    if (target <= 0) {
      continue;
    }

    const pool = selectByDifficulty(groups[difficulty], seenIds, lastSeenAt, target);
    for (const question of pool) {
      const hash = questionHash(question);
      if (selectedHashes.has(hash)) {
        continue;
      }
      selected.push(question);
      selectedHashes.add(hash);
      if (selected.length >= count) {
        break;
      }
    }
  }

  if (selected.length < count) {
    const remainderPool = [
      ...mergedBank.filter((question) => !selectedHashes.has(questionHash(question))),
    ].sort((left, right) => {
      const leftSeen = lastSeenAt.get(left.id)?.getTime() ?? 0;
      const rightSeen = lastSeenAt.get(right.id)?.getTime() ?? 0;

      if (leftSeen !== rightSeen) {
        return leftSeen - rightSeen;
      }

      return left.id.localeCompare(right.id);
    });

    for (const question of remainderPool) {
      const hash = questionHash(question);
      if (selectedHashes.has(hash)) {
        continue;
      }

      selected.push(question);
      selectedHashes.add(hash);
      if (selected.length >= count) {
        break;
      }
    }
  }

  const usedFallback = selected.length < count || approvalCount < count;
  const fallbackReason = usedFallback
    ? approvalCount < count
      ? "Question bank does not have enough approved questions for this level yet."
      : "Question bank does not have enough questions for this level yet."
    : undefined;

  return {
    questions: shuffle(selected.slice(0, count)).map((question) => ({
      ...question,
      options: shuffle(question.options),
    })),
    usedFallback,
    fallbackReason,
    approvedCount: approvalCount,
    bankCount: mergedBank.length,
    unseenCount: selected.filter((question) => !seenIds.has(question.id)).length,
    reusedCount: selected.filter((question) => seenIds.has(question.id)).length,
    selectedQuestionHashes: selected.slice(0, count).map((question) => questionHash(question)),
  };
}

export async function getQuestionBankCounts() {
  const approvedDrafts = await listApprovedQuestionDrafts();
  const byLevel = new Map<string, number>();
  const byDifficulty = new Map<string, number>();
  const duplicateHashes = new Map<string, number>();

  for (const draft of approvedDrafts) {
    byLevel.set(draft.levelId, (byLevel.get(draft.levelId) ?? 0) + 1);
    const difficulty = draft.difficulty ?? "unknown";
    byDifficulty.set(difficulty, (byDifficulty.get(difficulty) ?? 0) + 1);
    const hash = draft.questionHash ?? hashGeneratedQuestionText(draft.question);
    duplicateHashes.set(hash, (duplicateHashes.get(hash) ?? 0) + 1);
  }

  const duplicateHashCount = [...duplicateHashes.values()].filter((value) => value > 1).length;
  const inactiveCount = approvedDrafts.filter((draft) => draft.status !== "approved").length;

  return {
    total: approvedDrafts.length,
    byLevel,
    byDifficulty,
    duplicateHashCount,
    inactiveCount,
  };
}
