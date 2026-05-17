import type { QuizScore } from "@/types/quiz";
import {
  inferIdentityType,
  readSelectedIdentity,
  type SelectedIdentity,
} from "@/lib/identity";
import {
  getLevelConfig,
  getLevelLabel,
  getNextLevel,
  type LevelId,
} from "@/lib/levels";

export const LOCAL_PROGRESS_KEY = "arc-academy-progress";

export type LocalMissionVerification = {
  missionId: string;
  txHash: string;
  walletAddress: string;
  verifiedAt: string;
  blockNumber?: string;
  from?: string;
  to?: string | null;
};

export type LocalProgress = {
  identity?: SelectedIdentity;
  walletAddress?: string;
  email?: string;
  recentQuestionIds?: string[];
  recentQuestionTexts?: string[];
  currentLevelId?: LevelId;
  completedLevelIds?: LevelId[];
  latestQuizScore?: QuizScore;
  latestQuizPassed?: boolean;
  latestQuizCompletedAt?: string;
  latestQuizLevelId?: LevelId;
  missionVerification?: LocalMissionVerification;
  badges: string[];
};

export const emptyLocalProgress: LocalProgress = {
  badges: [],
};

function progressStorageKey(identity: SelectedIdentity | null) {
  const inferredType = inferIdentityType(identity);

  if (inferredType === "wallet" && identity?.walletAddress) {
    return `${LOCAL_PROGRESS_KEY}:wallet:${identity.walletAddress}`;
  }

  if (inferredType === "email" && identity?.email) {
    return `${LOCAL_PROGRESS_KEY}:email:${identity.email}`;
  }

  return LOCAL_PROGRESS_KEY;
}

function normalizeProgress(value: Partial<LocalProgress>): LocalProgress {
  const completedLevelIds = Array.isArray(value.completedLevelIds)
    ? [...new Set(value.completedLevelIds)]
    : [];
  const recentQuestionTexts = Array.isArray(value.recentQuestionTexts)
    ? [...new Set(value.recentQuestionTexts.filter((item): item is string => typeof item === "string" && item.trim().length > 0))]
    : [];
  const recentQuestionIds = Array.isArray(value.recentQuestionIds)
    ? [...new Set(value.recentQuestionIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0))]
    : [];

  return {
    ...emptyLocalProgress,
    ...value,
    currentLevelId: value.currentLevelId ?? "visitor",
    completedLevelIds,
    recentQuestionIds,
    recentQuestionTexts,
    badges: Array.isArray(value.badges) ? value.badges : [],
  };
}

export function readLocalProgress(): LocalProgress {
  if (typeof window === "undefined") {
    return emptyLocalProgress;
  }

  const identity = readSelectedIdentity();
  const raw = window.localStorage.getItem(progressStorageKey(identity));

  if (!raw) {
    return normalizeProgress({ ...emptyLocalProgress, identity: identity ?? undefined });
  }

  try {
    return normalizeProgress(JSON.parse(raw) as Partial<LocalProgress>);
  } catch {
    return emptyLocalProgress;
  }
}

export function writeLocalProgress(progress: LocalProgress) {
  const identity = progress.identity ?? readSelectedIdentity();
  window.localStorage.setItem(
    progressStorageKey(identity),
    JSON.stringify(normalizeProgress({ ...progress, identity: identity ?? undefined })),
  );
}

export function updateLocalProgress(
  updater: (current: LocalProgress) => LocalProgress,
) {
  const updated = updater(readLocalProgress());
  writeLocalProgress(updated);
  window.dispatchEvent(new Event("arc-academy-progress-updated"));
  return updated;
}

export function upsertBadge(badges: string[], badge: string) {
  return badges.includes(badge) ? badges : [...badges, badge];
}

export function getLocalXp(progress: LocalProgress) {
  const completedLevelXp = (progress.completedLevelIds ?? [])
    .map((levelId) => getLevelConfig(levelId).xpReward)
    .reduce((sum, value) => sum + value, 0);
  const quizXp = progress.latestQuizScore
    ? progress.latestQuizScore.correct * 2
    : 0;
  const missionXp = progress.missionVerification ? 100 : 0;

  return completedLevelXp + quizXp + missionXp;
}

export function getLocalLevel(progress: LocalProgress) {
  return getLevelLabel(progress.currentLevelId);
}

export function getLocalLevelConfig(progress: LocalProgress) {
  return getLevelConfig(progress.currentLevelId);
}

export function advanceLocalProgress(
  progress: LocalProgress,
  passed: boolean,
  levelId?: LevelId,
) {
  const currentLevel = getLevelConfig(progress.currentLevelId);
  const selectedLevel = getLevelConfig(levelId ?? currentLevel.id);
  const nextLevel = getNextLevel(selectedLevel.id);
  const shouldAdvance = passed && selectedLevel.order >= currentLevel.order;

  return {
    ...progress,
    currentLevelId: shouldAdvance ? nextLevel?.id ?? selectedLevel.id : currentLevel.id,
    completedLevelIds: passed
      ? [...new Set([...(progress.completedLevelIds ?? []), selectedLevel.id])]
      : progress.completedLevelIds ?? [],
  };
}
