export type MissionLevel = "explorer" | "builder" | "architect";

export type MissionRequiredInput = "txHash" | "contractAddress" | "walletAddress";

export type Mission = {
  id: string;
  level: MissionLevel;
  title: string;
  description: string;
  requiredInput: MissionRequiredInput;
  xpReward: number;
  badgeReward?: string;
  rewardEligibility?: boolean;
};
