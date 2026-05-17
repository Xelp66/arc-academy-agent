import type { Mission } from "@/types/mission";

export const missions: Mission[] = [
  {
    id: "first-arc-testnet-tx",
    level: "explorer",
    title: "First Arc Testnet Transaction",
    description:
      "Enter the transaction hash of a transaction you made on Arc Testnet. The system checks whether the hash exists through the Arc Testnet RPC.",
    requiredInput: "txHash",
    xpReward: 100,
    badgeReward: "Arc Explorer",
    rewardEligibility: true,
  },
  {
    id: "first-contract-deploy",
    level: "builder",
    title: "Deploy Your First HelloArchitect Contract",
    description:
      "Deploy a simple contract on Arc Testnet and enter the contract address. This task will become active after the MVP.",
    requiredInput: "contractAddress",
    xpReward: 300,
    badgeReward: "Arc Builder",
    rewardEligibility: false,
  },
];
