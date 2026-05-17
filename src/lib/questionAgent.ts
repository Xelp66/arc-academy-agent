import { createQuizSession, getOrCreateUser, type UserIdentityInput } from "@/lib/persistence";
import { inferIdentityType, type SelectedIdentity } from "@/lib/identity";
import { DEFAULT_QUIZ_LENGTH } from "@/lib/quiz";
import { getLevelConfig, type LevelId } from "@/lib/levels";
import type { QuizQuestion } from "@/types/quiz";
import { selectQuestionsForQuiz } from "@/lib/questionBank";

export type AgentContext = {
  identity: SelectedIdentity | UserIdentityInput | null;
  level?: LevelId;
  count: number;
  previousQuestionIds: string[];
  recentQuestionIds?: string[];
  debugSummary?: AgentDebugSummary;
};

export type AgentResponse = {
  sessionId: string;
  questions: PublicQuizQuestion[];
  context: AgentContext;
  generation: QuizSelectionSummary;
};

export type AgentDebugSummary = {
  selectedCount: number;
  unseenCount: number;
  reusedCount: number;
  levelId: LevelId;
};

export type QuizSelectionSummary = {
  source: "question-bank";
  levelId: LevelId;
  selectedCount: number;
  approvedCount: number;
  bankCount: number;
  unseenCount: number;
  reusedCount: number;
  fallbackUsed: boolean;
  fallbackReason?: string;
  selectedQuestionHashes: string[];
};

export type PublicQuizQuestion = Pick<
  QuizQuestion,
  "id" | "level" | "category" | "question" | "options" | "sourceHint"
>;

// TODO: Replace this rule-based bank selector with a future AI/RAG-backed
// generator once question generation and citations are available offline.
export type QuestionAgentContext = AgentContext;
export type QuestionAgentResponse = AgentResponse;

function toPersistenceIdentity(
  identity: SelectedIdentity | UserIdentityInput | null,
): UserIdentityInput | null {
  const inferredType = inferIdentityType(identity);

  if (inferredType === "wallet" && identity?.walletAddress) {
    return {
      identityType: "wallet",
      walletAddress: identity.walletAddress,
    };
  }

  if (inferredType === "email" && identity?.email) {
    return {
      identityType: "email",
      email: identity.email,
    };
  }

  return null;
}

function toSafeClientQuestion(question: QuizQuestion): PublicQuizQuestion {
  return {
    id: question.id,
    level: question.level,
    category: question.category,
    question: question.question,
    options: [...question.options],
    sourceHint: question.sourceHint,
  };
}

export async function buildQuizSession(
  identity: SelectedIdentity | UserIdentityInput | null,
  levelId?: LevelId,
  count = DEFAULT_QUIZ_LENGTH,
  recentQuestionIds: string[] = [],
): Promise<QuestionAgentResponse> {
  const userIdentity = toPersistenceIdentity(identity);
  const user = userIdentity ? await getOrCreateUser(userIdentity) : null;
  const levelConfig = getLevelConfig(levelId);
  const requestedCount = count > 0 ? count : levelConfig.questionCount;

  const selection = await selectQuestionsForQuiz({
    level: levelConfig.questionTier,
    count: requestedCount,
    userId: user?.id ?? undefined,
    recentQuestionIds,
  });

  const selectedQuestions = selection.questions.slice(0, requestedCount);

  if (selectedQuestions.length < requestedCount) {
    throw new Error(selection.fallbackReason ?? "Question bank does not have enough questions for this level yet.");
  }

  const session = await createQuizSession(
    user?.id,
    levelConfig.id,
    selectedQuestions.map((question) => question.id),
  );

  console.info(
    "[quiz-start]",
    JSON.stringify({
      levelId: levelConfig.id,
      sessionId: session.id,
      approvedCount: selection.approvedCount,
      bankCount: selection.bankCount,
      selectedCount: selectedQuestions.length,
      unseenCount: selection.unseenCount,
      reusedCount: selection.reusedCount,
      fallbackUsed: selection.usedFallback,
      fallbackReason: selection.fallbackReason ?? null,
      selectedQuestionHashes: selection.selectedQuestionHashes,
    }),
  );

  return {
    sessionId: session.id,
    questions: selectedQuestions.map(toSafeClientQuestion),
    context: {
      identity,
      level: levelConfig.id,
      count: selectedQuestions.length,
      previousQuestionIds: recentQuestionIds,
      recentQuestionIds,
      debugSummary: {
        selectedCount: selectedQuestions.length,
        unseenCount: selection.unseenCount,
        reusedCount: selection.reusedCount,
        levelId: levelConfig.id,
      },
    },
    generation: {
      source: "question-bank",
      levelId: levelConfig.id,
      selectedCount: selectedQuestions.length,
      approvedCount: selection.approvedCount,
      bankCount: selection.bankCount,
      unseenCount: selection.unseenCount,
      reusedCount: selection.reusedCount,
      fallbackUsed: selection.usedFallback,
      fallbackReason: selection.fallbackReason,
      selectedQuestionHashes: selection.selectedQuestionHashes,
    },
  };
}
