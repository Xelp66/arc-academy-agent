import type { QuizLevel as QuestionTier } from "@/types/quiz";

export type LevelId =
  | "visitor"
  | "explorer"
  | "pathfinder"
  | "builder"
  | "operator"
  | "strategist"
  | "architect"
  | "protocolist"
  | "arc-sage"
  | "arc-master";

export type LevelConfig = {
  id: LevelId;
  name: string;
  order: number;
  questionCount: number;
  passingScore: number;
  xpReward: number;
  badgeReward: string;
  unlockedBy: LevelId | null;
  questionTier: QuestionTier;
};

export const LEVELS: LevelConfig[] = [
  {
    id: "visitor",
    name: "Visitor",
    order: 1,
    questionCount: 20,
    passingScore: 14,
    xpReward: 50,
    badgeReward: "Arc Initiate",
    unlockedBy: null,
    questionTier: "visitor",
  },
  {
    id: "explorer",
    name: "Explorer",
    order: 2,
    questionCount: 20,
    passingScore: 15,
    xpReward: 75,
    badgeReward: "Arc Explorer",
    unlockedBy: "visitor",
    questionTier: "explorer",
  },
  {
    id: "pathfinder",
    name: "Pathfinder",
    order: 3,
    questionCount: 20,
    passingScore: 15,
    xpReward: 100,
    badgeReward: "Arc Pathfinder",
    unlockedBy: "explorer",
    questionTier: "pathfinder",
  },
  {
    id: "builder",
    name: "Builder",
    order: 4,
    questionCount: 20,
    passingScore: 16,
    xpReward: 125,
    badgeReward: "Arc Builder",
    unlockedBy: "pathfinder",
    questionTier: "builder",
  },
  {
    id: "operator",
    name: "Operator",
    order: 5,
    questionCount: 20,
    passingScore: 16,
    xpReward: 150,
    badgeReward: "Arc Operator",
    unlockedBy: "builder",
    questionTier: "operator",
  },
  {
    id: "strategist",
    name: "Strategist",
    order: 6,
    questionCount: 20,
    passingScore: 17,
    xpReward: 175,
    badgeReward: "Arc Strategist",
    unlockedBy: "operator",
    questionTier: "strategist",
  },
  {
    id: "architect",
    name: "Architect",
    order: 7,
    questionCount: 20,
    passingScore: 17,
    xpReward: 200,
    badgeReward: "Arc Architect",
    unlockedBy: "strategist",
    questionTier: "architect",
  },
  {
    id: "protocolist",
    name: "Protocolist",
    order: 8,
    questionCount: 20,
    passingScore: 18,
    xpReward: 250,
    badgeReward: "Arc Protocolist",
    unlockedBy: "architect",
    questionTier: "protocolist",
  },
  {
    id: "arc-sage",
    name: "Arc Sage",
    order: 9,
    questionCount: 20,
    passingScore: 18,
    xpReward: 300,
    badgeReward: "Arc Sage",
    unlockedBy: "protocolist",
    questionTier: "arc_sage",
  },
  {
    id: "arc-master",
    name: "Arc Master",
    order: 10,
    questionCount: 20,
    passingScore: 19,
    xpReward: 400,
    badgeReward: "Arc Master",
    unlockedBy: "arc-sage",
    questionTier: "arc_master",
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id) as LevelId[];

export function getLevelConfig(levelId?: LevelId | null) {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

export function getNextLevel(levelId?: LevelId | null) {
  const current = getLevelConfig(levelId);
  return LEVELS.find((level) => level.unlockedBy === current.id) ?? null;
}

export function getPreviousLevel(levelId?: LevelId | null) {
  const current = getLevelConfig(levelId);
  return current.unlockedBy ? getLevelConfig(current.unlockedBy) : null;
}

export function getLevelLabel(levelId?: LevelId | null) {
  return getLevelConfig(levelId).name;
}
