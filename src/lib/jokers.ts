import type { PublicQuizQuestion, QuizQuestion } from "@/types/quiz";

export type JokerId =
  | "fiftyFifty"
  | "askTheDocs"
  | "askTheArchitect"
  | "explainLikeNew";

export type JokerResult = {
  id: JokerId;
  title: string;
  message: string;
  remainingOptions?: string[];
};

type JokerQuestion = PublicQuizQuestion | QuizQuestion;

function hasCorrectAnswer(question: JokerQuestion): question is QuizQuestion {
  return "correctAnswer" in question && typeof question.correctAnswer === "string";
}

function wrongOptions(question: QuizQuestion): string[] {
  return question.options.filter((option) => option !== question.correctAnswer);
}

function categoryHint(question: JokerQuestion): string {
  switch (question.category) {
    case "basics":
      return "Think about Arc's core product direction and the kind of applications it wants to make easier.";
    case "network":
      return "Focus on how wallets, explorers, chain IDs, RPC endpoints, and transaction proofs identify activity on a specific chain.";
    case "gas":
      return "Look for the token model used to pay transaction fees on Arc, not the token used by another EVM network.";
    case "evm":
      return "Connect this to Ethereum-style developer tooling and Solidity compatibility.";
    case "agents":
      return "Think about trust signals that help people decide whether an autonomous agent is reliable.";
    case "security":
      return "Separate test environments and learning proofs from production assets or real financial value.";
    default:
      return "Read the question carefully and eliminate answers that do not match Arc's documented behavior.";
  }
}

function beginnerExplanation(question: JokerQuestion): string {
  switch (question.category) {
    case "basics":
      return "Start with the big picture: a network's focus tells you which user and developer experiences it is designed to support.";
    case "network":
      return "A blockchain network has identifiers and public tools. Chain IDs prevent wallet confusion, RPC endpoints let apps read the chain, and explorers make transactions inspectable.";
    case "gas":
      return "Every transaction needs a fee so the network can process it. On Arc, the important detail is which asset the network expects for that fee.";
    case "evm":
      return "EVM compatibility means developers can often reuse familiar Ethereum tools, languages, and deployment workflows.";
    case "agents":
      return "In an agent economy, users need evidence that an agent behaves well over time before trusting it with important tasks.";
    case "security":
      return "Testnets are practice environments. They are useful for learning and verification, but their assets should not be treated like mainnet funds.";
    default:
      return "Break the question into the topic, the network detail being tested, and which options are unrelated or unsafe.";
  }
}

export function fiftyFifty(question: JokerQuestion): JokerResult {
  if (!hasCorrectAnswer(question)) {
    return {
      id: "fiftyFifty",
      title: "50:50",
      message:
        "50:50 is unavailable in API mode until joker requests move server-side. Other hints remain available without exposing answers.",
    };
  }

  const removedWrongOptions = wrongOptions(question).slice(0, 2);
  const remainingOptions = question.options.filter(
    (option) => option === question.correctAnswer || !removedWrongOptions.includes(option),
  );

  return {
    id: "fiftyFifty",
    title: "50:50",
    message: "Two incorrect options were removed. The correct option is still on the board.",
    remainingOptions,
  };
}

export function askTheDocs(question: JokerQuestion): JokerResult {
  return {
    id: "askTheDocs",
    title: "Ask the Docs",
    message: question.sourceHint
      ? `Check this area of the docs: ${question.sourceHint}. Use it to confirm the concept, then choose from the remaining options.`
      : "Check the relevant Arc docs section for this topic, then choose the option that matches the documented behavior.",
  };
}

export function askTheArchitect(question: JokerQuestion): JokerResult {
  return {
    id: "askTheArchitect",
    title: "Ask the Architect",
    message: categoryHint(question),
  };
}

export function explainLikeNew(question: JokerQuestion): JokerResult {
  return {
    id: "explainLikeNew",
    title: "Explain Like I'm New",
    message: beginnerExplanation(question),
  };
}
