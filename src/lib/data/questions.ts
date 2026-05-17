import type { QuizCategory, QuizLevel, QuizQuestion } from "@/types/quiz";

const QUESTION_LEVELS = [
  "visitor",
  "explorer",
  "pathfinder",
  "builder",
  "operator",
  "strategist",
  "architect",
  "protocolist",
  "arc_sage",
  "arc_master",
] as const satisfies readonly QuizLevel[];

const LEVEL_LABELS: Record<QuizLevel, string> = {
  visitor: "Visitor",
  explorer: "Explorer",
  pathfinder: "Pathfinder",
  builder: "Builder",
  operator: "Operator",
  strategist: "Strategist",
  architect: "Architect",
  protocolist: "Protocolist",
  arc_sage: "Arc Sage",
  arc_master: "Arc Master",
};

type QuestionSeed = {
  slug: string;
  category: QuizCategory;
  buildQuestion: (levelLabel: string) => string;
  options: readonly [string, string, string, string];
  correctAnswer: string;
  explanation: string;
  sourceHint?: string;
};

const questionSeeds: QuestionSeed[] = [
  {
    slug: "gas-usdc",
    category: "gas",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Which token pays gas on Arc?`,
    options: ["ETH", "ARB", "USDC", "MATIC"],
    correctAnswer: "USDC",
    explanation: "Arc uses USDC for gas in this MVP.",
    sourceHint: "Arc docs: gas and fees",
  },
  {
    slug: "chain-id",
    category: "network",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What is the Arc Testnet chain ID?`,
    options: ["42161", "5042002", "84532", "11155111"],
    correctAnswer: "5042002",
    explanation: "5042002 is the Arc Testnet chain ID.",
    sourceHint: "Arc docs: connect to Arc",
  },
  {
    slug: "rpc-purpose",
    category: "network",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What does an RPC endpoint do?`,
    options: [
      "Connects a wallet or app to the network",
      "Stores a private key",
      "Mints rewards automatically",
      "Creates a wallet seed phrase",
    ],
    correctAnswer: "Connects a wallet or app to the network",
    explanation: "RPC is how apps talk to the Arc network.",
    sourceHint: "Arc docs: connect to Arc",
  },
  {
    slug: "explorer-purpose",
    category: "network",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What is an explorer used for?`,
    options: [
      "Inspecting transactions and addresses",
      "Changing a wallet password",
      "Generating private keys",
      "Deploying contracts from the browser",
    ],
    correctAnswer: "Inspecting transactions and addresses",
    explanation: "Explorers are for reading chain activity.",
    sourceHint: "Arc Testnet explorer",
  },
  {
    slug: "testnet-money",
    category: "security",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Is testnet USDC real money?`,
    options: [
      "Yes",
      "No, it is test-only value",
      "Only on mainnet",
      "Only when bridged",
    ],
    correctAnswer: "No, it is test-only value",
    explanation: "Testnet funds do not carry real value.",
    sourceHint: "Arc Academy safety notes",
  },
  {
    slug: "evm-compatible",
    category: "evm",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What does EVM-compatible mean?`,
    options: [
      "Solidity and Ethereum tools can be reused",
      "It only supports Bitcoin scripts",
      "It cannot run smart contracts",
      "It is not developer-friendly",
    ],
    correctAnswer: "Solidity and Ethereum tools can be reused",
    explanation: "EVM compatibility lets Ethereum tools work here.",
    sourceHint: "Arc docs: EVM compatibility",
  },
  {
    slug: "wallet-address",
    category: "basics",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What is a wallet address mainly used for?`,
    options: [
      "Identifying a public account on-chain",
      "Storing the seed phrase",
      "Signing with a private key directly",
      "Hiding transaction history forever",
    ],
    correctAnswer: "Identifying a public account on-chain",
    explanation: "Wallet addresses are public identifiers.",
    sourceHint: "Arc Academy basics",
  },
  {
    slug: "tx-hash",
    category: "network",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What does a transaction hash help you find?`,
    options: [
      "A transaction on the explorer",
      "A wallet password",
      "A private key backup",
      "A smart contract compiler version",
    ],
    correctAnswer: "A transaction on the explorer",
    explanation: "Tx hashes are used to look up transaction records.",
    sourceHint: "Arc Testnet explorer",
  },
  {
    slug: "private-key",
    category: "security",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Should you share a private key with Archie?`,
    options: ["Yes", "No", "Only for testnet", "Only by email"],
    correctAnswer: "No",
    explanation: "Private keys must stay secret.",
    sourceHint: "Arc Academy safety notes",
  },
  {
    slug: "seed-phrase",
    category: "security",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What should a seed phrase be treated as?`,
    options: [
      "A secret recovery key",
      "A public wallet name",
      "A gas payment token",
      "A block explorer shortcut",
    ],
    correctAnswer: "A secret recovery key",
    explanation: "Seed phrases restore wallets and must stay private.",
    sourceHint: "Arc Academy safety notes",
  },
  {
    slug: "contract-language",
    category: "evm",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Which language is common for EVM contracts?`,
    options: ["Solidity", "Swift", "Rust", "Go"],
    correctAnswer: "Solidity",
    explanation: "Solidity is the common EVM contract language.",
    sourceHint: "Arc docs: EVM compatibility",
  },
  {
    slug: "gas-fee",
    category: "gas",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Why do you pay gas on Arc?`,
    options: [
      "To execute network actions",
      "To make the explorer faster",
      "To hide your wallet address",
      "To create test badges",
    ],
    correctAnswer: "To execute network actions",
    explanation: "Gas pays for network computation.",
    sourceHint: "Arc docs: gas and fees",
  },
  {
    slug: "agent-purpose",
    category: "agents",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What is Archie meant to do in this MVP?`,
    options: [
      "Guide learning and quiz selection",
      "Send rewards automatically",
      "Sign wallet transactions",
      "Store private keys",
    ],
    correctAnswer: "Guide learning and quiz selection",
    explanation: "Archie is a read-only teacher agent here.",
    sourceHint: "Arc Academy agent profile",
  },
  {
    slug: "agent-safety",
    category: "security",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Which behavior keeps an agent safe?`,
    options: [
      "No private keys and no transaction sending",
      "Auto-approving all prompts",
      "Revealing answers before submit",
      "Changing rewards on the client",
    ],
    correctAnswer: "No private keys and no transaction sending",
    explanation: "Safety means read-only behavior.",
    sourceHint: "Arc Academy safety notes",
  },
  {
    slug: "basic-identity",
    category: "basics",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Why does the app store identity locally?`,
    options: [
      "To save progress in this browser",
      "To sign transactions automatically",
      "To mint badges on-chain",
      "To expose secrets to the client",
    ],
    correctAnswer: "To save progress in this browser",
    explanation: "Local identity keeps browser progress persistent.",
    sourceHint: "Arc Academy identity flow",
  },
  {
    slug: "network-readonly",
    category: "network",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What does read-only RPC checking mean?`,
    options: [
      "It reads chain data without sending transactions",
      "It signs wallet transactions for you",
      "It mints rewards automatically",
      "It changes a wallet seed phrase",
    ],
    correctAnswer: "It reads chain data without sending transactions",
    explanation: "Read-only RPC checks inspect data only.",
    sourceHint: "Arc Academy safety notes",
  },
  {
    slug: "protocol-rules",
    category: "agents",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Why should an agent follow protocol rules?`,
    options: [
      "To stay predictable and safe",
      "To hide the correct answer",
      "To send rewards faster",
      "To avoid using categories",
    ],
    correctAnswer: "To stay predictable and safe",
    explanation: "Protocol rules keep the system dependable.",
    sourceHint: "Arc Academy agent profile",
  },
  {
    slug: "anti-abuse",
    category: "security",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: Why does the app use anti-abuse checks?`,
    options: [
      "To prevent duplicate claims and repeated misuse",
      "To make questions easier",
      "To send funds automatically",
      "To hide the leaderboard",
    ],
    correctAnswer: "To prevent duplicate claims and repeated misuse",
    explanation: "Anti-abuse protects progression and rewards.",
    sourceHint: "Arc Academy safety notes",
  },
  {
    slug: "level-progress",
    category: "basics",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: What happens when you pass a level?`,
    options: [
      "The next level unlocks",
      "The wallet address is deleted",
      "The quiz answers are revealed",
      "The app sends a transaction",
    ],
    correctAnswer: "The next level unlocks",
    explanation: "Passing moves you forward in progression.",
    sourceHint: "Arc levels",
  },
  {
    slug: "contract-address",
    category: "network",
    buildQuestion: (levelLabel) =>
      `${levelLabel}: How is a contract address different from a wallet address?`,
    options: [
      "It identifies a smart contract on-chain",
      "It stores a private key",
      "It pays gas by itself",
      "It replaces the need for RPC",
    ],
    correctAnswer: "It identifies a smart contract on-chain",
    explanation: "Contract addresses point to deployed contracts.",
    sourceHint: "Arc Academy basics",
  },
];

function buildQuestion(
  level: QuizLevel,
  seed: QuestionSeed,
): QuizQuestion {
  const levelLabel = LEVEL_LABELS[level];

  return {
    id: `${level}-${seed.slug}`,
    level,
    category: seed.category,
    question: seed.buildQuestion(levelLabel),
    options: [...seed.options],
    correctAnswer: seed.correctAnswer,
    explanation: seed.explanation,
    sourceHint: seed.sourceHint,
  };
}

export const questions: QuizQuestion[] = QUESTION_LEVELS.flatMap((level) =>
  questionSeeds.map((seed) => buildQuestion(level, seed)),
);
