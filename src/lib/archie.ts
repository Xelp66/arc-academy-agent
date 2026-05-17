import type { QuizCategory } from "@/types/quiz";
import { getLevelConfig, type LevelId } from "@/lib/levels";

export type AgentContext = {
  category?: QuizCategory;
  walletAddress?: string;
  quizScore?: {
    correct: number;
    total: number;
  };
  missionId?: string;
};

export type AgentResponse = {
  speaker: "Archie";
  message: string;
  tone: "neutral" | "success" | "warning";
  sources?: string[];
};

function response(
  message: string,
  tone: AgentResponse["tone"] = "neutral",
  sources?: string[],
): AgentResponse {
  return {
    speaker: "Archie",
    message,
    tone,
    sources,
  };
}

export function getWelcomeMessage(): AgentResponse {
  return response(
    "Welcome. Today we’ll track your progress through the Arc levels together.",
  );
}

export function getCorrectAnswerMessage(): AgentResponse {
  return response("Correct. You’re starting to think like an Architect.", "success");
}

export function getWrongAnswerMessage(): AgentResponse {
  return response(
    "Close, but that is not the correct answer. Read the explanation and recover on the next question.",
    "warning",
  );
}

export function getWrongAnswerGuidanceMessage(category: QuizCategory): AgentResponse {
  const guidance = getTopicExplanation(category);

  return response(
    `${getWrongAnswerMessage().message} ${guidance.message}`,
    "warning",
  );
}

export function getQuizPassMessage(): AgentResponse {
  return response(
    "You passed the level. Unlock the next level and keep moving forward.",
    "success",
  );
}

export function getQuizRetryMessage(): AgentResponse {
  return response(
    "This round was not enough to pass. Review the explanations and try again.",
    "warning",
  );
}

export function getMissionRecommendationMessage(
  passed: boolean,
  weakCategories: QuizCategory[] = [],
): AgentResponse {
  if (passed) {
    return response(
      "You passed the level. Unlock the next level and keep moving forward.",
      "success",
    );
  }

  const studySummary = getStudySummaryMessage(weakCategories);

  return response(
    `${getQuizRetryMessage().message} ${studySummary.message}`,
    "warning",
  );
}

export function getLevelProgressMessage(
  currentLevelId: LevelId,
  passed: boolean,
  weakCategories: QuizCategory[] = [],
): AgentResponse {
  const currentLevel = getLevelConfig(currentLevelId);

  if (passed) {
    return response(
      `Congratulations. You passed ${currentLevel.name}. The next level is now unlocked.`,
      "success",
    );
  }

  const studySummary = getStudySummaryMessage(weakCategories);

  return response(
    `You need to get stronger at ${currentLevel.name}. ${studySummary.message}`,
    "warning",
  );
}

export function getLevelPathMessage(
  currentLevelId: LevelId,
  completedCount = 0,
) {
  const currentLevel = getLevelConfig(currentLevelId);
  const nextLevel = getLevelConfig(
    ([
      "visitor",
      "explorer",
      "pathfinder",
      "builder",
      "operator",
      "strategist",
      "architect",
      "protocolist",
      "arc-sage",
      "arc-master",
    ] as LevelId[])[currentLevel.order] ?? currentLevel.id,
  );

  if (currentLevel.order >= 10) {
    return response(
      `You are at the final level of the Arc journey: ${currentLevel.name}. Completed levels: ${completedCount}.`,
      "success",
    );
  }

  return response(
    `You are currently at ${currentLevel.name}. Next up is ${nextLevel.name}. Completed levels: ${completedCount}.`,
    "neutral",
  );
}

export function getProfileSummaryMessage(
  currentLevelId: LevelId,
  completedCount: number,
  badgeCount: number,
  xp: number,
) {
  const currentLevel = getLevelConfig(currentLevelId);

  return response(
    `You are currently at ${currentLevel.name}. ${completedCount} levels are complete, ${badgeCount} badges are earned, and you have ${xp} total XP.`,
    "neutral",
  );
}

export function getMissionVerifiedMessage(): AgentResponse {
  return response(
    "Verification has been recorded for level progression. Reward eligibility is evaluated separately.",
    "success",
  );
}

export function getMissionPageGuidanceMessage(
  identityType?: "wallet" | "email" | "guest",
  hasVerifiedMission?: boolean,
): AgentResponse {
  if (identityType === "email") {
    return response(
      hasVerifiedMission
        ? "You can continue with email, but a wallet address is still required for legacy proof."
        : "You can continue with email, but you still need to enter a wallet address for legacy proof checks.",
      "warning",
    );
  }

  if (hasVerifiedMission) {
    return response(
      "Your wallet profile is ready. If legacy proof is verified, reward eligibility is evaluated only by anti-abuse checks.",
      "success",
    );
  }

  return response(
    "Legacy proof fields are kept only for compatibility. The main path is now level progression.",
    "neutral",
  );
}

export function getTopicExplanation(category: QuizCategory): AgentResponse {
  switch (category) {
    case "basics":
      return response(
        "This question checks Arc’s foundation. Think about which problem the network is trying to solve.",
      );
    case "network":
      return response(
        "This section asks you to distinguish chain ID, RPC, explorer, and transaction proof concepts.",
      );
    case "gas":
      return response(
        "For gas questions, focus on which asset pays the fee; do not rely on habits from other EVM networks.",
      );
    case "evm":
      return response(
        "EVM compatibility means familiar Solidity and Ethereum development tools can still be used.",
      );
    case "agents":
      return response(
        "In an agent economy, trust signals matter. An agent’s history and reputation make decisions easier.",
      );
    case "security":
      return response(
        "For security questions, separate testnet from mainnet, understand private key risk, and remember these assets have no real value.",
      );
  }
}

export function getStudySummaryMessage(
  weakCategories: QuizCategory[],
): AgentResponse {
  if (!weakCategories.length) {
    return response(
      "You are balanced. On the next step, you can move forward with harder questions.",
      "success",
    );
  }

  const categoryNames = weakCategories
    .map((category) => {
      switch (category) {
        case "basics":
          return "basics";
        case "network":
          return "network";
        case "gas":
          return "gas";
        case "evm":
          return "EVM";
        case "agents":
          return "agents";
        case "security":
          return "security";
      }
    })
    .join(", ");

  return response(
    `Your weak areas are: ${categoryNames}. Study those topics and try the quiz again.`,
    "warning",
  );
}
