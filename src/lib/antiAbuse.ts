import { prisma } from "@/lib/prisma";
import { getLevelConfig, type LevelId } from "@/lib/levels";

export const REWARD_STATUSES = [
  "not_eligible",
  "eligible",
  "queued",
  "sent",
  "rejected",
] as const;

export type RewardStatus = (typeof REWARD_STATUSES)[number];

export type AntiAbuseDecision = {
  allowed: boolean;
  status: number;
  message?: string;
};

const walletPattern = /^0x[a-fA-F0-9]{40}$/;
const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
export function normalizeWalletAddress(walletAddress: string) {
  return walletAddress.trim().toLowerCase();
}

export function normalizeTxHash(txHash: string) {
  return txHash.trim().toLowerCase();
}

export function isValidWalletAddress(walletAddress: string) {
  return walletPattern.test(walletAddress.trim());
}

export function isValidTxHash(txHash: string) {
  return txHashPattern.test(txHash.trim());
}

export function validateWalletAddress(walletAddress: string): AntiAbuseDecision {
  return isValidWalletAddress(walletAddress)
    ? { allowed: true, status: 200 }
    : {
        allowed: false,
        status: 400,
        message: "Wallet address must be 0x followed by 40 hexadecimal characters.",
      };
}

async function findPassedQuizForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sessions: {
        where: {
          status: "completed",
        },
        select: { id: true, levelId: true, score: true },
      },
    },
  });

  return Boolean(
    user?.sessions.find((session) => {
      const level = getLevelConfig(session.levelId as LevelId);
      return session.score >= level.passingScore;
    }),
  );
}

export function validateTxHash(txHash: string): AntiAbuseDecision {
  return isValidTxHash(txHash)
    ? { allowed: true, status: 200 }
    : {
        allowed: false,
        status: 400,
        message: "Transaction hash must be 0x followed by 64 hexadecimal characters.",
      };
}

export async function hasPassedQuiz(walletAddress: string) {
  const walletCheck = validateWalletAddress(walletAddress);

  if (!walletCheck.allowed) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: normalizeWalletAddress(walletAddress) },
    select: { id: true },
  });

  return user ? findPassedQuizForUser(user.id) : false;
}

export async function canSubmitMissionProofForUser(
  userId: string,
  missionWalletAddress: string,
  missionId: string,
  txHash: string,
): Promise<AntiAbuseDecision> {
  const walletCheck = validateWalletAddress(missionWalletAddress);
  if (!walletCheck.allowed) {
    return walletCheck;
  }

  const txHashCheck = validateTxHash(txHash);
  if (!txHashCheck.allowed) {
    return txHashCheck;
  }

  // TODO: Add rate limiting for repeated mission submission attempts.
  // TODO: Add CAPTCHA before reward-sensitive mission verification.

  const normalizedTxHash = normalizeTxHash(txHash);
  const existingIdentityMission = await prisma.missionSubmission.findUnique({
    where: {
      userId_missionId: {
        userId,
        missionId,
      },
    },
    select: { status: true, txHash: true },
  });

  if (existingIdentityMission?.status === "verified") {
    return {
      allowed: false,
      status: 409,
      message: "This mission is already verified for this identity.",
    };
  }

  if (
    existingIdentityMission?.txHash &&
    existingIdentityMission.txHash !== normalizedTxHash
  ) {
    return {
      allowed: false,
      status: 409,
      message:
        "This identity already has a pending proof for this mission. Verify that proof before submitting a different hash.",
    };
  }

  const existingTxHash = await prisma.missionSubmission.findUnique({
    where: { txHash: normalizedTxHash },
    select: { userId: true, missionId: true, status: true },
  });

  if (
    existingTxHash &&
    (existingTxHash.userId !== userId || existingTxHash.missionId !== missionId)
  ) {
    return {
      allowed: false,
      status: 409,
      message: "This transaction hash was already used.",
    };
  }

  return { allowed: true, status: 200 };
}

export async function canSubmitMissionProof(
  walletAddress: string,
  missionId: string,
  txHash: string,
): Promise<AntiAbuseDecision> {
  const walletCheck = validateWalletAddress(walletAddress);
  if (!walletCheck.allowed) {
    return walletCheck;
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: normalizeWalletAddress(walletAddress) },
    select: { id: true },
  });

  if (!user) {
    const txHashCheck = validateTxHash(txHash);
    return txHashCheck.allowed ? { allowed: true, status: 200 } : txHashCheck;
  }

  return canSubmitMissionProofForUser(user.id, walletAddress, missionId, txHash);
}

export async function canVerifyMissionProof(
  walletAddress: string,
  missionId: string,
  txHash: string,
) {
  return canSubmitMissionProof(walletAddress, missionId, txHash);
}

export async function canVerifyMissionProofForUser(
  userId: string,
  missionWalletAddress: string,
  missionId: string,
  txHash: string,
) {
  return canSubmitMissionProofForUser(
    userId,
    missionWalletAddress,
    missionId,
    txHash,
  );
}

export async function getRewardEligibilityForUser(
  userId: string,
  missionId: string,
): Promise<{
  eligible: boolean;
  status: RewardStatus;
  message: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      sessions: {
        where: {
          status: "completed",
        },
        select: { id: true, levelId: true, score: true },
        take: 1,
      },
      submissions: {
        where: {
          missionId,
          status: "verified",
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  const passedSession = user?.sessions.find((session) => {
    const level = getLevelConfig(session.levelId as LevelId);
    return session.score >= level.passingScore;
  });

  if (!user) {
    return {
      eligible: false,
      status: "not_eligible",
      message: "Pass the quiz before reward eligibility can be shown.",
    };
  }

  if (!passedSession) {
    return {
      eligible: false,
      status: "not_eligible",
      message: "Pass the quiz before reward eligibility can be shown.",
    };
  }

  if (!user.submissions.length) {
    return {
      eligible: false,
      status: "not_eligible",
      message: "Verify the mission proof before reward eligibility can be shown.",
    };
  }

  return {
    eligible: true,
    status: "eligible",
    message: "Quiz pass and verified mission confirmed. Reward eligibility is recorded, but no funds are sent.",
  };
}

export async function getRewardEligibility(
  walletAddress: string,
  missionId: string,
): Promise<{
  eligible: boolean;
  status: RewardStatus;
  message: string;
}> {
  const walletCheck = validateWalletAddress(walletAddress);
  if (!walletCheck.allowed) {
    return {
      eligible: false,
      status: "not_eligible",
      message: walletCheck.message ?? "Invalid wallet address.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: normalizeWalletAddress(walletAddress) },
    select: { id: true },
  });

  if (!user) {
    return {
      eligible: false,
      status: "not_eligible",
      message: "Pass the quiz before reward eligibility can be shown.",
    };
  }

  return getRewardEligibilityForUser(user.id, missionId);
}

export async function canStartQuiz(walletAddress: string): Promise<boolean> {
  return validateWalletAddress(walletAddress).allowed;
}

export async function canSubmitMission(
  walletAddress: string,
  missionId: string,
): Promise<boolean> {
  const walletCheck = validateWalletAddress(walletAddress);
  if (!walletCheck.allowed) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: normalizeWalletAddress(walletAddress) },
    select: {
      submissions: {
        where: { missionId, status: "verified" },
        select: { id: true },
        take: 1,
      },
    },
  });

  return !user?.submissions.length;
}

export async function isSuspiciousQuizSession(
  sessionId: string,
): Promise<boolean> {
  // TODO: Add minimum quiz duration and impossible-answer-speed checks.
  // TODO: Add CAPTCHA challenge hooks for suspicious sessions.
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { startedAt: true, completedAt: true },
  });

  if (!session?.completedAt) {
    return false;
  }

  return session.completedAt.getTime() - session.startedAt.getTime() < 15_000;
}
