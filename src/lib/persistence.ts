import { Prisma } from "@/generated/prisma/client";
import type { RewardStatus } from "@/lib/antiAbuse";
import { missions } from "@/lib/data/missions";
import { inferIdentityType, type IdentityType } from "@/lib/identity";
import type { LevelId } from "@/lib/levels";
import { getLevelConfig } from "@/lib/levels";
import { prisma } from "@/lib/prisma";
import { calculateScore } from "@/lib/quiz";
import {
  hashGeneratedQuestionText,
  normalizeGeneratedQuestionText,
  type GeneratedQuestionDraft,
} from "@/lib/questionGenerator";

const walletPattern = /^0x[a-fA-F0-9]{40}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
const rewardAmountLabel = "testnet USDC eligibility";
const questionDraftSelect = {
  id: true,
  levelId: true,
  category: true,
  question: true,
  questionNormalized: true,
  questionHash: true,
  options: true,
  correctAnswer: true,
  explanation: true,
  sourceHint: true,
  sourceTopic: true,
  difficulty: true,
  modelUsed: true,
  uniquenessReason: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserIdentityInput =
  {
    identityType?: IdentityType;
    walletAddress?: string;
    email?: string;
  };

function normalizeWallet(walletAddress: string) {
  return walletAddress.trim().toLowerCase();
}

function normalizeTxHash(txHash: string) {
  return txHash.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertWalletAddress(walletAddress: string) {
  if (!walletPattern.test(walletAddress.trim())) {
    throw new Error("Wallet address must be 0x followed by 40 hexadecimal characters.");
  }
}

function assertEmail(email: string) {
  if (!emailPattern.test(email.trim())) {
    throw new Error("Enter a valid email address.");
  }
}

function assertTxHash(txHash: string) {
  if (!txHashPattern.test(txHash.trim())) {
    throw new Error("Transaction hash must be 0x followed by 64 hexadecimal characters.");
  }
}

export function createIdentityInput(input: {
  identityType?: IdentityType;
  walletAddress?: string;
  email?: string;
}): UserIdentityInput | null {
  const inferredType = inferIdentityType(input);

  if (inferredType === "email" && input.email) {
    return {
      identityType: "email",
      email: input.email,
      walletAddress: input.walletAddress,
    };
  }

  if (inferredType === "wallet" && input.walletAddress) {
    return {
      identityType: "wallet",
      walletAddress: input.walletAddress,
      email: input.email,
    };
  }

  return null;
}

export async function getOrCreateUser(identity: string | UserIdentityInput) {
  const input =
    typeof identity === "string"
      ? ({ identityType: "wallet", walletAddress: identity } satisfies UserIdentityInput)
      : identity;

  const inferredType = inferIdentityType(input);

  if (inferredType === "email") {
    if (!input.email) {
      throw new Error("An email address is required.");
    }

    assertEmail(input.email);
    const normalizedEmail = normalizeEmail(input.email);

    await prisma.$executeRaw`
      INSERT OR IGNORE INTO "User" ("id", "email")
      VALUES (${crypto.randomUUID()}, ${normalizedEmail})
    `;

    const users = await prisma.$queryRaw<
      Array<{
        id: string;
        walletAddress: string | null;
        email: string | null;
        identityType: string;
        username: string | null;
        xp: number;
        level: string;
        createdAt: Date;
      }>
    >`
      SELECT
        "id",
        "walletAddress",
        "email",
        CASE
          WHEN "email" IS NOT NULL THEN 'email'
          WHEN "walletAddress" IS NOT NULL THEN 'wallet'
          ELSE 'guest'
        END AS "identityType",
        "username",
        "xp",
        "level",
        "createdAt"
      FROM "User"
      WHERE "email" = ${normalizedEmail}
      LIMIT 1
    `;

    if (!users[0]) {
      throw new Error("Could not create email identity.");
    }

    return users[0];
  }

  if (!input.walletAddress) {
    throw new Error("A wallet address is required.");
  }

  assertWalletAddress(input.walletAddress);
  const normalizedWallet = normalizeWallet(input.walletAddress);

  await prisma.$executeRaw`
    INSERT OR IGNORE INTO "User" ("id", "walletAddress")
    VALUES (${crypto.randomUUID()}, ${normalizedWallet})
  `;

  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      walletAddress: string | null;
      email: string | null;
      identityType: string;
      username: string | null;
      xp: number;
      level: string;
      createdAt: Date;
    }>
  >`
    SELECT
      "id",
      "walletAddress",
      "email",
      CASE
        WHEN "email" IS NOT NULL THEN 'email'
        WHEN "walletAddress" IS NOT NULL THEN 'wallet'
        ELSE 'guest'
      END AS "identityType",
      "username",
      "xp",
      "level",
      "createdAt"
    FROM "User"
    WHERE "walletAddress" = ${normalizedWallet}
    LIMIT 1
  `;

  if (!users[0]) {
    throw new Error("Could not create wallet identity.");
  }

  return users[0];
}

export async function createQuizSession(
  userId?: string | null,
  levelId: LevelId = "visitor",
  questionIds: string[] = [],
) {
  const level = getLevelConfig(levelId);

  return prisma.quizSession.create({
    data: {
      ...(userId
        ? {
            user: {
              connect: {
                id: userId,
              },
            },
          }
        : {}),
      levelId: level.id,
      passingScore: level.passingScore,
      total: level.questionCount,
      questionIds,
    },
  });
}

export async function recordAnswer(
  sessionId: string,
  questionId: string,
  selectedAnswer: string,
  isCorrect: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const answer = await tx.answer.create({
      data: {
        sessionId,
        questionId,
        selectedAnswer,
        isCorrect,
      },
    });

    const answers = await tx.answer.findMany({
      where: { sessionId },
      select: {
        questionId: true,
        selectedAnswer: true,
        isCorrect: true,
      },
    });
    const score = calculateScore(
      answers.map((item) => ({
        questionId: item.questionId,
        selectedAnswer: item.selectedAnswer,
        correct: item.isCorrect,
        explanation: "",
      })),
    );

    await tx.quizSession.update({
      where: { id: sessionId },
      data: {
        score: score.correct,
        total: score.total,
      },
    });

    return answer;
  });
}

export async function completeQuizSession(sessionId: string) {
  return prisma.$transaction(async (tx) => {
    const answers = await tx.answer.findMany({
      where: { sessionId },
      select: {
        isCorrect: true,
      },
    });
    const correct = answers.filter((answer) => answer.isCorrect).length;

    return tx.quizSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        score: correct,
        total: answers.length,
        completedAt: new Date(),
      },
    });
  });
}

export async function recordMissionSubmission(
  userId: string,
  missionId: string,
  txHash: string,
) {
  assertTxHash(txHash);

  try {
    return await prisma.missionSubmission.create({
      data: {
        userId,
        missionId,
        txHash: normalizeTxHash(txHash),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "Duplicate mission submission blocked for this wallet or transaction hash.",
      );
    }

    throw error;
  }
}

type MarkMissionVerifiedInput = {
  userId: string;
  missionId: string;
  txHash: string;
};

export async function markMissionVerified({
  userId,
  missionId,
  txHash,
}: MarkMissionVerifiedInput) {
  assertTxHash(txHash);

  const normalizedTxHash = normalizeTxHash(txHash);
  const mission = missions.find((item) => item.id === missionId);

  if (!mission) {
    throw new Error("Mission not found.");
  }

  return prisma.$transaction(async (tx) => {
    const existingSubmission = await tx.missionSubmission.findUnique({
      where: {
        userId_missionId: {
          userId,
          missionId,
        },
      },
      select: {
        status: true,
      },
    });

    if (existingSubmission?.status === "verified") {
      throw new Error("This wallet has already verified this mission.");
    }

    const submission = await tx.missionSubmission.update({
      where: {
        userId_missionId: {
          userId,
          missionId,
        },
      },
      data: {
        txHash: normalizedTxHash,
        status: "verified",
        verifiedAt: new Date(),
      },
    });

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        xp: {
          increment: mission.xpReward,
        },
        level: mission.level,
      },
    });

    return {
      submission,
      user,
    };
  });
}

type CreateRewardEligibilityInput = {
  userId: string;
  missionId: string;
  txHash: string;
};

export async function createRewardEligibility({
  userId,
  missionId,
  txHash,
}: CreateRewardEligibilityInput) {
  assertTxHash(txHash);

  // Phase 12 intentionally records eligibility only. Automatic distribution
  // must remain disabled until later abuse controls and manual review exist.
  return prisma.reward.upsert({
    where: {
      userId_missionId: {
        userId,
        missionId,
      },
    },
    update: {},
    create: {
      userId,
      missionId,
      amount: rewardAmountLabel,
      status: "eligible" satisfies RewardStatus,
      txHash: normalizeTxHash(txHash),
    },
  });
}

export async function getRewardForMission(userId: string, missionId: string) {
  return prisma.reward.findUnique({
    where: {
      userId_missionId: {
        userId,
        missionId,
      },
    },
  });
}

export async function getRewardQueue() {
  return prisma.reward.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          walletAddress: true,
          xp: true,
          level: true,
        },
      },
    },
  });
}

export async function createQuestionDrafts(
  drafts: GeneratedQuestionDraft[],
) {
  if (!drafts.length) {
    return [];
  }

  return prisma.$transaction(async (tx) => {
    const saved: Awaited<ReturnType<typeof tx.questionDraft.create>>[] = [];

    for (const draft of drafts) {
      const questionHash = draft.questionHash ?? hashGeneratedQuestionText(draft.question);
      const questionNormalized =
        draft.questionNormalized ?? normalizeGeneratedQuestionText(draft.question);
      const existing = await tx.questionDraft.findFirst({
        where: {
          OR: [
            { questionHash },
            { question: draft.question },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        const updated = await tx.questionDraft.update({
          where: { id: existing.id },
          data: {
            levelId: draft.level,
            category: draft.category,
            question: draft.question,
            questionNormalized,
            questionHash,
            options: draft.options as Prisma.InputJsonValue,
            correctAnswer: draft.correctAnswer,
            explanation: draft.explanation,
            sourceHint: draft.sourceHint,
            sourceTopic: draft.sourceTopic ?? draft.sourceHint ?? null,
            difficulty: draft.difficulty ?? "medium",
            modelUsed: draft.modelUsed ?? null,
            uniquenessReason: draft.uniquenessReason ?? null,
            status: draft.status,
            rejectionReason: draft.rejectionReason ?? null,
          },
          select: questionDraftSelect,
        });

        saved.push(updated);
        continue;
      }

      const created = await tx.questionDraft.create({
        data: {
          id: draft.id,
          levelId: draft.level,
          category: draft.category,
          question: draft.question,
          questionNormalized,
          questionHash,
          options: draft.options as Prisma.InputJsonValue,
          correctAnswer: draft.correctAnswer,
          explanation: draft.explanation,
          sourceHint: draft.sourceHint,
          sourceTopic: draft.sourceTopic ?? draft.sourceHint ?? null,
          difficulty: draft.difficulty ?? "medium",
          modelUsed: draft.modelUsed ?? null,
          uniquenessReason: draft.uniquenessReason ?? null,
          status: draft.status,
          rejectionReason: draft.rejectionReason ?? null,
        },
        select: questionDraftSelect,
      });

      saved.push(created);
    }

    return saved;
  });
}

export async function listQuestionDrafts() {
  return prisma.questionDraft.findMany({
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
    select: questionDraftSelect,
  });
}

export async function listApprovedQuestionDrafts() {
  return prisma.questionDraft.findMany({
    where: { status: "approved" },
    orderBy: { createdAt: "desc" },
    select: questionDraftSelect,
  });
}

export async function approveQuestionDraft(id: string) {
  return prisma.questionDraft.update({
    where: { id },
    data: {
      status: "approved",
      rejectionReason: null,
    },
    select: questionDraftSelect,
  });
}

export async function rejectQuestionDraft(id: string, rejectionReason?: string) {
  return prisma.questionDraft.update({
    where: { id },
    data: {
      status: "rejected",
      rejectionReason: rejectionReason ?? "Rejected by admin review.",
    },
    select: questionDraftSelect,
  });
}
