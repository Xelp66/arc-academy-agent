import { createHash } from "node:crypto";
import { questions as existingQuestions } from "@/lib/data/questions";
import type { QuizCategory, QuizLevel } from "@/types/quiz";

export const QUESTION_DRAFT_STATUS = "draft" as const;
export const QUESTION_APPROVED_STATUS = "approved" as const;
export const QUESTION_REJECTED_STATUS = "rejected" as const;

export type QuestionDraftStatus =
  | typeof QUESTION_DRAFT_STATUS
  | typeof QUESTION_APPROVED_STATUS
  | typeof QUESTION_REJECTED_STATUS;

export type GeneratedQuestionDraft = {
  id: string;
  level: QuizLevel;
  category: QuizCategory;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceHint?: string;
  status: QuestionDraftStatus;
  rejectionReason?: string | null;
  sourceTopic?: string;
  difficulty?: "easy" | "medium" | "hard";
  uniquenessReason?: string;
  questionNormalized?: string;
  questionHash?: string;
  modelUsed?: string;
};

export type QuestionGenerationContext = {
  previousQuestionIds?: string[];
  existingQuestions?: Array<{
    id: string;
    question: string;
    questionHash?: string;
    sourceTopic?: string;
    difficulty?: string;
  }>;
};

export type QuestionGenerationRun = {
  questions: GeneratedQuestionDraft[];
  source: "openrouter" | "local";
  modelChain: string[];
  modelUsed?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  duplicateRejected: number;
  unrelatedRejected: number;
  historyCount: number;
  questionHashes: string[];
};

type DraftTemplate = {
  key: string;
  question: (levelLabel: string, variant: number) => string;
  options: (levelLabel: string, variant: number) => [string, string, string, string];
  correctAnswer: string;
  explanation: (levelLabel: string, variant: number) => string;
  sourceHint: string;
};

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

const ARC_RELEVANT_KEYWORDS = [
  "arc",
  "archie",
  "arc testnet",
  "arc network",
  "arc rpc",
  "arc explorer",
  "usdc",
  "stablecoin",
  "level",
  "agent",
  "testnet",
];

const GENERIC_BLOCKCHAIN_TERMS = ["blockchain", "crypto", "wallet", "smart contract"];
const ARC_CONSTANTS = [
  "arc testnet",
  "arc network",
  "arc rpc",
  "arc explorer",
  "usdc",
  "archie",
  "level",
  "agent",
];

const TURKISH_MARKERS = [
  "ç",
  "ğ",
  "ı",
  "İ",
  "ö",
  "ş",
  "ü",
  "hoş",
  "merhaba",
  "soru",
  "cevap",
  "öğren",
  "seviy",
  "ilerle",
  "başla",
  "kaydet",
];

function shuffleItems<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function stripCodeFence(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  return trimmed;
}

function isEnglishVisibleText(value: string) {
  const text = value.trim().toLowerCase();

  if (!text) {
    return false;
  }

  return !TURKISH_MARKERS.some((marker) => text.includes(marker));
}

function toQuestionCategory(value: string): QuizCategory | null {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "basics" ||
    normalized === "network" ||
    normalized === "gas" ||
    normalized === "evm" ||
    normalized === "agents" ||
    normalized === "security"
  ) {
    return normalized;
  }

  return null;
}

export function normalizeGeneratedQuestionText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashGeneratedQuestionText(value: string) {
  return createHash("sha256").update(normalizeGeneratedQuestionText(value)).digest("hex");
}

const CATEGORY_TEMPLATES: Record<QuizCategory, DraftTemplate[]> = {
  basics: [
    {
      key: "arc-basics-path",
      question: (levelLabel, variant) =>
        `${levelLabel}: Which path best describes how Arc Academy guides learners through level ${variant + 1}?`,
      options: () => [
        "One level at a time with quiz checks",
        "Random jumps with no progress tracking",
        "Only wallet signatures",
        "Automatic rewards without review",
      ],
      correctAnswer: "One level at a time with quiz checks",
      explanation: () =>
        "Arc Academy uses level-based quiz progression, not random jumps.",
      sourceHint: "Arc Academy levels overview",
    },
    {
      key: "arc-basics-teacher",
      question: (levelLabel, variant) =>
        `${levelLabel}: What is Archie's main role in the Arc Academy MVP draft ${variant + 1}?`,
      options: () => [
        "A read-only teacher agent",
        "A private-key manager",
        "An automatic reward sender",
        "A wallet signer",
      ],
      correctAnswer: "A read-only teacher agent",
      explanation: () =>
        "Archie guides learners without handling private keys or transactions.",
      sourceHint: "Archie agent profile",
    },
    {
      key: "arc-basics-security",
      question: (levelLabel, variant) =>
        `${levelLabel}: What should learners remember before trusting an Arc answer draft ${variant + 1}?`,
      options: () => [
        "Check the source hint and explanation",
        "Share the seed phrase",
        "Skip validation because it is testnet",
        "Send a transaction first",
      ],
      correctAnswer: "Check the source hint and explanation",
      explanation: () =>
        "Arc emphasizes safe, source-backed learning before action.",
      sourceHint: "Arc Academy safety notes",
    },
  ],
  network: [
    {
      key: "arc-network-rpc",
      question: (levelLabel, variant) =>
        `${levelLabel}: What is the safe purpose of Arc RPC in draft ${variant + 1}?`,
      options: () => [
        "Read chain data and submit read-only requests",
        "Store private keys in the browser",
        "Mint rewards automatically",
        "Replace the explorer entirely",
      ],
      correctAnswer: "Read chain data and submit read-only requests",
      explanation: () =>
        "Arc RPC is used for read-only network access in the MVP.",
      sourceHint: "Arc docs: connect to Arc",
    },
    {
      key: "arc-network-chain",
      question: (levelLabel, variant) =>
        `${levelLabel}: Which detail helps identify Arc Testnet in draft ${variant + 1}?`,
      options: () => [
        "Its chain ID and explorer",
        "A seed phrase prompt",
        "A private key export",
        "A mainnet bridge reward",
      ],
      correctAnswer: "Its chain ID and explorer",
      explanation: () =>
        "Arc Testnet is identified by its chain ID and explorer data.",
      sourceHint: "Arc Testnet connection guide",
    },
    {
      key: "arc-network-explorer",
      question: (levelLabel, variant) =>
        `${levelLabel}: What should learners inspect in the Arc explorer draft ${variant + 1}?`,
      options: () => [
        "Transactions, addresses, and blocks",
        "Private keys and passwords",
        "Reward wallet secrets",
        "Local device screenshots",
      ],
      correctAnswer: "Transactions, addresses, and blocks",
      explanation: () =>
        "Explorers are for reading chain activity, not for secrets.",
      sourceHint: "Arc Testnet explorer",
    },
  ],
  gas: [
    {
      key: "arc-gas-usdc",
      question: (levelLabel, variant) =>
        `${levelLabel}: Which asset pays gas on Arc in draft ${variant + 1}?`,
      options: () => [
        "USDC",
        "ETH",
        "BTC",
        "MATIC",
      ],
      correctAnswer: "USDC",
      explanation: () =>
        "Arc's stablecoin-native design uses USDC for gas in the MVP.",
      sourceHint: "Arc docs: gas and fees",
    },
    {
      key: "arc-gas-why",
      question: (levelLabel, variant) =>
        `${levelLabel}: Why is Arc's USDC gas model useful in draft ${variant + 1}?`,
      options: () => [
        "It keeps fees in a familiar stablecoin",
        "It removes all security checks",
        "It enables automatic mainnet rewards",
        "It hides transaction data from the explorer",
      ],
      correctAnswer: "It keeps fees in a familiar stablecoin",
      explanation: () =>
        "Stablecoin-native gas is simpler for learners and payments flow.",
      sourceHint: "Arc stablecoin-native design",
    },
    {
      key: "arc-gas-testnet",
      question: (levelLabel, variant) =>
        `${levelLabel}: What should happen if a draft says Arc gas requires real money in ${variant + 1}?`,
      options: () => [
        "Reject it as unsafe",
        "Treat it as guaranteed",
        "Store a private key instead",
        "Send a reward automatically",
      ],
      correctAnswer: "Reject it as unsafe",
      explanation: () =>
        "Testnet gas guidance must stay clearly separated from real value.",
      sourceHint: "Arc Academy safety notes",
    },
  ],
  evm: [
    {
      key: "arc-evm-compat",
      question: (levelLabel, variant) =>
        `${levelLabel}: What does Arc EVM compatibility let developers reuse in draft ${variant + 1}?`,
      options: () => [
        "Solidity tools and Ethereum workflows",
        "Bitcoin script wallets",
        "Private-key export tools",
        "Mainnet reward contracts",
      ],
      correctAnswer: "Solidity tools and Ethereum workflows",
      explanation: () =>
        "EVM compatibility keeps familiar Ethereum tooling relevant on Arc.",
      sourceHint: "Arc docs: EVM compatibility",
    },
    {
      key: "arc-evm-contract",
      question: (levelLabel) =>
        `${levelLabel}: In an Arc draft, what is the safest assumption about a contract that uses EVM tooling?`,
      options: () => [
        "It can run with Ethereum-compatible workflows",
        "It must expose private keys",
        "It cannot be tested on a testnet",
        "It automatically sends rewards",
      ],
      correctAnswer: "It can run with Ethereum-compatible workflows",
      explanation: () =>
        "EVM-compatible environments accept familiar dev workflows.",
      sourceHint: "Arc developer docs",
    },
    {
      key: "arc-evm-safety",
      question: (levelLabel, variant) =>
        `${levelLabel}: What is the best safety rule for EVM-style drafts in Arc ${variant + 1}?`,
      options: () => [
        "Treat testnet actions as read-only until verified",
        "Share private keys to speed up testing",
        "Assume all transactions are irreversible on testnet",
        "Skip explanations for learners",
      ],
      correctAnswer: "Treat testnet actions as read-only until verified",
      explanation: () =>
        "Safe testnet learning should stay read-only unless the user acts.",
      sourceHint: "Arc Academy safety notes",
    },
  ],
  agents: [
    {
      key: "arc-agents-archie",
      question: (levelLabel, variant) =>
        `${levelLabel}: What is Archie allowed to do in draft ${variant + 1}?`,
      options: () => [
        "Guide learners and explain concepts",
        "Send transactions automatically",
        "Handle private keys",
        "Bypass anti-abuse checks",
      ],
      correctAnswer: "Guide learners and explain concepts",
      explanation: () =>
        "Archie is a safe teacher agent, not a wallet operator.",
      sourceHint: "Archie agent profile",
    },
    {
      key: "arc-agents-questions",
      question: (levelLabel, variant) =>
        `${levelLabel}: Why does Archie select quiz questions on the server in draft ${variant + 1}?`,
      options: () => [
        "To keep safe answers off the client",
        "To reveal answers faster",
        "To replace all quiz logic",
        "To send rewards automatically",
      ],
      correctAnswer: "To keep safe answers off the client",
      explanation: () =>
        "Server-side selection helps protect the quiz flow.",
      sourceHint: "Server-side question agent",
    },
    {
      key: "arc-agents-guidance",
      question: (levelLabel, variant) =>
        `${levelLabel}: What should an Arc agent recommend after a wrong answer in draft ${variant + 1}?`,
      options: () => [
        "A short topic explanation and retry guidance",
        "The correct answer before submission",
        "A private key reset",
        "A transaction signature flow",
      ],
      correctAnswer: "A short topic explanation and retry guidance",
      explanation: () =>
        "Guidance should help the learner without leaking future answers.",
      sourceHint: "Archie guidance rules",
    },
  ],
  security: [
    {
      key: "arc-security-private-keys",
      question: (levelLabel, variant) =>
        `${levelLabel}: What should Arc never ask for in draft ${variant + 1}?`,
      options: () => [
        "Private keys",
        "A quiz answer",
        "A level name",
        "A source hint",
      ],
      correctAnswer: "Private keys",
      explanation: () =>
        "Arc MVP never needs private keys from learners.",
      sourceHint: "Arc Academy safety notes",
    },
    {
      key: "arc-security-testnet",
      question: (levelLabel, variant) =>
        `${levelLabel}: Why is Arc Testnet safer for practice in draft ${variant + 1}?`,
      options: () => [
        "It is for learning and testing, not real funds",
        "It stores real salaries",
        "It bypasses all anti-abuse checks",
        "It deletes explorer history",
      ],
      correctAnswer: "It is for learning and testing, not real funds",
      explanation: () =>
        "Testnet keeps learning separate from real value.",
      sourceHint: "Arc Testnet safety guide",
    },
    {
      key: "arc-security-abuse",
      question: (levelLabel, variant) =>
        `${levelLabel}: Which Arc safeguard matters for drafts in ${variant + 1}?`,
      options: () => [
        "Blocking duplicate claims and reused hashes",
        "Publishing private keys",
        "Auto-sending rewards",
        "Hiding the explorer",
      ],
      correctAnswer: "Blocking duplicate claims and reused hashes",
      explanation: () =>
        "Anti-abuse controls keep the MVP from being exploited.",
      sourceHint: "Anti-abuse foundation",
    },
  ],
};

function normalizeQuestionText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeQuestionText(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function similarity(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;

  return intersection / union;
}

export function questionTextSimilarity(left: string, right: string) {
  return similarity(left, right);
}

export function isArcRelevantQuestion(question: {
  question: string;
  explanation?: string;
  sourceHint?: string;
  category?: QuizCategory;
}) {
  const haystack = `${question.question} ${question.explanation ?? ""} ${question.sourceHint ?? ""}`.toLowerCase();
  const hasArcSignal = ARC_RELEVANT_KEYWORDS.some((keyword) => haystack.includes(keyword));
  const hasKnownArcConstant = ARC_CONSTANTS.some((keyword) => haystack.includes(keyword));
  const hasGenericOnlySignal =
    GENERIC_BLOCKCHAIN_TERMS.some((term) => haystack.includes(term)) &&
    !hasArcSignal &&
    !hasKnownArcConstant;

  return (hasArcSignal || hasKnownArcConstant) && !hasGenericOnlySignal;
}

export function validateGeneratedQuestion(question: GeneratedQuestionDraft) {
  if (!question.id.trim()) {
    throw new Error("Draft question id is required.");
  }

  if (question.status !== QUESTION_DRAFT_STATUS) {
    throw new Error(`Draft question ${question.id} must be marked as draft.`);
  }

  if (!question.question.trim()) {
    throw new Error(`Draft question ${question.id} is missing question text.`);
  }

  if (question.options.length < 4) {
    throw new Error(`Draft question ${question.id} needs four options.`);
  }

  if (!question.options.includes(question.correctAnswer)) {
    throw new Error(`Draft question ${question.id} must include the correct answer.`);
  }

  if (!question.explanation.trim()) {
    throw new Error(`Draft question ${question.id} is missing an explanation.`);
  }

  if (!question.sourceHint?.trim()) {
    throw new Error(`Draft question ${question.id} is missing a source hint.`);
  }

  if (!isArcRelevantQuestion(question)) {
    throw new Error(`Draft question ${question.id} is not Arc relevant.`);
  }

  return true;
}

function hasStrongExplanation(explanation: string) {
  const cleaned = explanation.trim();

  if (!cleaned) {
    return false;
  }

  return cleaned.length >= 24 && cleaned.split(/\s+/).length >= 4;
}

function hasSourceSupport(question: GeneratedQuestionDraft) {
  return Boolean(question.sourceHint?.trim()) || isArcRelevantQuestion(question);
}

function isEnglishQuestionDraft(question: GeneratedQuestionDraft) {
  return (
    isEnglishVisibleText(question.question) &&
    isEnglishVisibleText(question.explanation) &&
    isEnglishVisibleText(question.sourceTopic ?? "") &&
    isEnglishVisibleText(question.sourceHint ?? "") &&
    question.options.every((option) => isEnglishVisibleText(option))
  );
}

export function validateGeneratedQuestionDraft(question: GeneratedQuestionDraft) {
  const normalizedQuestion = normalizeQuestionText(question.question);
  const genericOnly = GENERIC_BLOCKCHAIN_TERMS.some((term) =>
    normalizedQuestion.includes(term),
  );

  if (!isArcRelevantQuestion(question)) {
    throw new Error(`Draft question ${question.id} is not clearly Arc-related.`);
  }

  if (genericOnly && !question.question.toLowerCase().includes("arc")) {
    throw new Error(`Draft question ${question.id} is too generic.`);
  }

  if (question.options.length !== 4) {
    throw new Error(`Draft question ${question.id} must have exactly four options.`);
  }

  if (!question.options.includes(question.correctAnswer)) {
    throw new Error(`Draft question ${question.id} must include the correct answer.`);
  }

  if (!hasStrongExplanation(question.explanation)) {
    throw new Error(`Draft question ${question.id} has a weak explanation.`);
  }

  if (!hasSourceSupport(question)) {
    throw new Error(`Draft question ${question.id} needs a source hint or Arc constant support.`);
  }

  if (!isEnglishQuestionDraft(question)) {
    throw new Error(`Draft question ${question.id} must be written in English.`);
  }

  return true;
}

export function detectDuplicateQuestion(
  question: Pick<GeneratedQuestionDraft, "id" | "question">,
  existing: Array<Pick<GeneratedQuestionDraft, "id" | "question">>,
) {
  const normalizedQuestion = normalizeQuestionText(question.question);

  return existing.some((candidate) => {
    if (candidate.id === question.id) {
      return true;
    }

    const normalizedCandidate = normalizeQuestionText(candidate.question);

    if (normalizedCandidate === normalizedQuestion) {
      return true;
    }

    return similarity(normalizedQuestion, normalizedCandidate) >= 0.8;
  });
}

function toReviewedDraft(
  draft: GeneratedQuestionDraft,
  existing: Array<Pick<GeneratedQuestionDraft, "id" | "question">>,
) {
  try {
    validateGeneratedQuestionDraft(draft);

    if (detectDuplicateQuestion(draft, existing)) {
      return {
        ...draft,
        status: QUESTION_REJECTED_STATUS,
        rejectionReason: "Duplicate or near-duplicate question text.",
      };
    }

    return {
      ...draft,
      status: QUESTION_APPROVED_STATUS,
      rejectionReason: null,
    };
  } catch (error) {
    return {
      ...draft,
      status: QUESTION_REJECTED_STATUS,
      rejectionReason:
        error instanceof Error ? error.message : "Question failed validation.",
    };
  }
}

export function autoValidateAndApproveDrafts(
  drafts: GeneratedQuestionDraft[],
  existing: Array<Pick<GeneratedQuestionDraft, "id" | "question">> = existingQuestions.map((question) => ({
    id: question.id,
    question: question.question,
  })),
) {
  const reviewed: GeneratedQuestionDraft[] = [];
  const seen = new Set<string>(existing.map((item) => item.id));

  for (const draft of drafts) {
    const duplicate = seen.has(draft.id) || detectDuplicateQuestion(draft, [...existing, ...reviewed]);
    const reviewedDraft = duplicate
      ? {
          ...draft,
          status: QUESTION_REJECTED_STATUS,
          rejectionReason: "Duplicate or near-duplicate question text.",
        }
      : toReviewedDraft(draft, [...existing, ...reviewed]);

    reviewed.push(reviewedDraft);
    seen.add(reviewedDraft.id);
  }

  return {
    approved: reviewed.filter((draft) => draft.status === QUESTION_APPROVED_STATUS),
    rejected: reviewed.filter((draft) => draft.status === QUESTION_REJECTED_STATUS),
    reviewed,
  };
}

function buildQuestionText(
  levelId: QuizLevel,
  template: DraftTemplate,
  index: number,
) {
  const levelLabel = LEVEL_LABELS[levelId];
  return template.question(levelLabel, index);
}

function buildDraftId(levelId: QuizLevel, category: QuizCategory, templateKey: string, index: number) {
  return `draft-${levelId}-${category}-${templateKey}-${index + 1}`;
}

export function generateQuestionDrafts(
  levelId: QuizLevel,
  category: QuizCategory,
  count: number,
) {
  const templates = CATEGORY_TEMPLATES[category];
  const drafts: GeneratedQuestionDraft[] = [];
  const existing = existingQuestions.map((question) => ({
    id: question.id,
    question: question.question,
  }));

  if (!templates.length || count <= 0) {
    return drafts;
  }

  let templateIndex = 0;
  let variant = 0;

  while (drafts.length < count) {
    const template = templates[templateIndex % templates.length];
    const draft: GeneratedQuestionDraft = {
      id: buildDraftId(levelId, category, template.key, variant),
      level: levelId,
      category,
      question: buildQuestionText(levelId, template, variant),
      options: [...template.options(LEVEL_LABELS[levelId], variant)],
      correctAnswer: template.correctAnswer,
      explanation: template.explanation(LEVEL_LABELS[levelId], variant),
      sourceHint: template.sourceHint,
      status: QUESTION_DRAFT_STATUS,
    };

    if (!detectDuplicateQuestion(draft, [...existing, ...drafts])) {
      validateGeneratedQuestion(draft);
      drafts.push(draft);
    }

    templateIndex += 1;

    if (templateIndex % templates.length === 0) {
      variant += 1;
    }

    if (templateIndex > count * 5) {
      break;
    }
  }

  return drafts.slice(0, count);
}

type SessionTopic = {
  category: QuizCategory;
  subject: string;
  answer: string;
  wrongs: [string, string, string];
  sourceHint: string;
  explanation: string;
};

type SessionBand = "basics" | "transactions" | "security" | "builders" | "advanced";

export type QuestionGenerationProvider = {
  name: string;
  generateDrafts(input: {
    level: QuizLevel;
    count: number;
    previousQuestionIds?: string[];
    existingQuestions?: QuestionGenerationContext["existingQuestions"];
  }): Promise<GeneratedQuestionDraft[]>;
};

const SESSION_BAND_BLUEPRINTS: Record<SessionBand, SessionTopic[]> = {
  basics: [
    {
      category: "network",
      subject: "Arc RPC read-only requests",
      answer: "Read chain data without exposing secrets",
      wrongs: [
        "Store private keys in the browser",
        "Send automatic rewards",
        "Disable the explorer",
      ],
      sourceHint: "Arc docs: connect to Arc",
      explanation: "Arc RPC is used for safe, read-only chain access.",
    },
    {
      category: "network",
      subject: "the Arc Testnet explorer",
      answer: "Inspect blocks, addresses, and transactions",
      wrongs: [
        "Publish private keys",
        "Mint test rewards automatically",
        "Hide transaction history",
      ],
      sourceHint: "Arc Testnet explorer",
      explanation: "The explorer is for reading onchain activity.",
    },
    {
      category: "basics",
      subject: "the Visitor level",
      answer: "Start with 20 quiz questions and a passing score",
      wrongs: [
        "Skip the quiz and claim rewards",
        "Send a transaction to unlock",
        "Reveal answers before play",
      ],
      sourceHint: "Arc levels overview",
      explanation: "Arc uses level-based quiz progression.",
    },
    {
      category: "basics",
      subject: "wallet identity in Arc",
      answer: "A wallet address can identify a learner",
      wrongs: [
        "A seed phrase must be shared",
        "A private key is required",
        "No identity is needed at all",
      ],
      sourceHint: "Identity flow",
      explanation: "Wallet login is read-only and never asks for private keys.",
    },
    {
      category: "basics",
      subject: "email identity in Arc",
      answer: "An email can identify a learner profile",
      wrongs: [
        "An email sends rewards automatically",
        "An email replaces testnet verification",
        "An email unlocks private keys",
      ],
      sourceHint: "Identity flow",
      explanation: "Email login is supported, but it does not prove ownership yet.",
    },
    {
      category: "security",
      subject: "Arc source hints",
      answer: "Use them to check where a question came from",
      wrongs: [
        "Use them to reveal private keys",
        "Ignore them because testnet is unsafe",
        "Treat them as reward wallet secrets",
      ],
      sourceHint: "Arc Academy safety notes",
      explanation: "Source hints help learners verify the lesson.",
    },
    {
      category: "security",
      subject: "the Arc quiz pass rule",
      answer: "It controls when the next level unlocks",
      wrongs: [
        "It sends gas to a wallet",
        "It reveals all future answers",
        "It removes all anti-abuse checks",
      ],
      sourceHint: "Arc levels overview",
      explanation: "Passing a level unlocks the next level in the journey.",
    },
    {
      category: "security",
      subject: "Archie in read-only mode",
      answer: "Guide learners without handling private keys",
      wrongs: [
        "Sign transactions on behalf of users",
        "Bypass validation rules",
        "Send rewards without review",
      ],
      sourceHint: "Archie agent profile",
      explanation: "Archie teaches and guides, but never signs.",
    },
    {
      category: "basics",
      subject: "Arc Testnet safety",
      answer: "Practice should stay separate from real funds",
      wrongs: [
        "Testnet means real money is required",
        "Safety rules can be skipped",
        "Private keys should be shared for speed",
      ],
      sourceHint: "Arc Academy safety notes",
      explanation: "Testnet is for learning, not for real value.",
    },
    {
      category: "basics",
      subject: "quiz feedback in Arc",
      answer: "Short explanations should help the learner retry",
      wrongs: [
        "Full answer leaks should happen first",
        "All feedback should be silent",
        "Rewards should be sent immediately",
      ],
      sourceHint: "Archie guidance rules",
      explanation: "Feedback should teach without leaking future answers.",
    },
  ],
  transactions: [
    {
      category: "gas",
      subject: "Arc gas",
      answer: "USDC pays gas on Arc",
      wrongs: [
        "ETH pays gas on Arc",
        "BTC pays gas on Arc",
        "Gas is always free",
      ],
      sourceHint: "Arc docs: gas and fees",
      explanation: "Arc is stablecoin-native and uses USDC for gas.",
    },
    {
      category: "gas",
      subject: "a reused transaction hash",
      answer: "It should be blocked by anti-abuse checks",
      wrongs: [
        "It should unlock a badge twice",
        "It should auto-send rewards",
        "It should be ignored by validation",
      ],
      sourceHint: "Anti-abuse foundation",
      explanation: "A tx hash can only be used once per mission flow.",
    },
    {
      category: "network",
      subject: "Arc transaction lookup",
      answer: "A transaction not found on Arc Testnet is not a valid proof",
      wrongs: [
        "It proves the wallet is owned",
        "It means the reward is already sent",
        "It should be hidden from the explorer",
      ],
      sourceHint: "Mission verification flow",
      explanation: "Verification depends on a real Arc Testnet transaction.",
    },
    {
      category: "network",
      subject: "an invalid transaction hash",
      answer: "It should be rejected before verification",
      wrongs: [
        "It should be auto-corrected",
        "It should unlock the next level",
        "It should be sent to the wallet",
      ],
      sourceHint: "API validation",
      explanation: "Bad transaction hashes should fail fast.",
    },
    {
      category: "evm",
      subject: "Arc EVM compatibility",
      answer: "Solidity tools can still be useful",
      wrongs: [
        "Only Bitcoin tools work",
        "No developer tools are supported",
        "Private keys must be shared",
      ],
      sourceHint: "Arc docs: EVM compatibility",
      explanation: "Arc keeps familiar Ethereum-style workflows usable.",
    },
    {
      category: "evm",
      subject: "wallet address proof",
      answer: "It is needed when a transaction proof is verified",
      wrongs: [
        "It replaces the transaction hash",
        "It sends rewards automatically",
        "It hides the explorer data",
      ],
      sourceHint: "Mission verification flow",
      explanation: "Wallet identity and tx proof are separate checks.",
    },
    {
      category: "gas",
      subject: "Arc 50:50 joker",
      answer: "It should remove two wrong options and keep the correct one",
      wrongs: [
        "It should reveal every answer",
        "It should skip answer checking",
        "It should send a transaction",
      ],
      sourceHint: "Quiz joker rules",
      explanation: "The joker helps without leaking the answer.",
    },
    {
      category: "network",
      subject: "API quiz mode",
      answer: "Joker usage should happen server-side",
      wrongs: [
        "Correct answers should be sent to the client",
        "Private keys should be exposed",
        "Rewards should be sent automatically",
      ],
      sourceHint: "API quiz flow",
      explanation: "Server-side joker handling keeps answers safe.",
    },
    {
      category: "security",
      subject: "mission verification",
      answer: "It should stay read-only until the proof is validated",
      wrongs: [
        "It should reveal private keys",
        "It should auto-send funds",
        "It should bypass duplicate checks",
      ],
      sourceHint: "Mission verification flow",
      explanation: "Verification is a read-only safety check first.",
    },
    {
      category: "security",
      subject: "Arc tx hash validation",
      answer: "It should accept only properly formatted hashes",
      wrongs: [
        "It should accept any text",
        "It should accept an email address",
        "It should accept a seed phrase",
      ],
      sourceHint: "API validation",
      explanation: "Validation protects the verification workflow.",
    },
  ],
  security: [
    {
      category: "security",
      subject: "private keys in Arc Academy",
      answer: "They should never be requested",
      wrongs: [
        "They should be required for login",
        "They should be stored in the browser",
        "They should be sent to Archie",
      ],
      sourceHint: "Arc Academy safety notes",
      explanation: "The MVP never needs private keys from learners.",
    },
    {
      category: "security",
      subject: "duplicate claims",
      answer: "They should be blocked by anti-abuse rules",
      wrongs: [
        "They should award extra XP",
        "They should auto-send rewards",
        "They should bypass verification",
      ],
      sourceHint: "Anti-abuse foundation",
      explanation: "Duplicate claims are not allowed.",
    },
    {
      category: "security",
      subject: "reward eligibility",
      answer: "It should require both quiz pass and verified proof",
      wrongs: [
        "It should happen for every answer",
        "It should ignore verification",
        "It should send funds automatically",
      ],
      sourceHint: "Reward queue behavior",
      explanation: "Eligibility is a safe, non-sending queue step.",
    },
    {
      category: "security",
      subject: "automatic reward sending",
      answer: "It should stay disabled in the MVP",
      wrongs: [
        "It should be required for login",
        "It should run before verification",
        "It should expose private keys",
      ],
      sourceHint: "Reward queue behavior",
      explanation: "The project records eligibility only.",
    },
    {
      category: "agents",
      subject: "Archie guidance",
      answer: "It should be short and beginner-friendly",
      wrongs: [
        "It should leak future answers",
        "It should request private keys",
        "It should send transactions",
      ],
      sourceHint: "Archie guidance rules",
      explanation: "Archie guides without exposing protected details.",
    },
    {
      category: "agents",
      subject: "identity ownership",
      answer: "Wallet and email ownership are not verified yet",
      wrongs: [
        "They are fully proven by default",
        "They require private keys in the UI",
        "They are tied to automatic reward sending",
      ],
      sourceHint: "Identity flow safety note",
      explanation: "Identity is convenient, not yet ownership-proof.",
    },
    {
      category: "security",
      subject: "safe client output",
      answer: "Only safe fields should reach the browser",
      wrongs: [
        "Correct answers should be exposed first",
        "Private keys should be shown",
        "Database stack traces should be rendered",
      ],
      sourceHint: "API quiz flow",
      explanation: "Client responses should stay limited and safe.",
    },
    {
      category: "security",
      subject: "Arc login",
      answer: "It should work without passwords",
      wrongs: [
        "It should require a seed phrase",
        "It should require a private key",
        "It should send a transaction",
      ],
      sourceHint: "Identity flow",
      explanation: "The MVP supports wallet or email without passwords.",
    },
    {
      category: "security",
      subject: "quiz answer checking",
      answer: "It should stay authoritative on the server",
      wrongs: [
        "It should happen only in the browser",
        "It should reveal the explanation early",
        "It should store private keys",
      ],
      sourceHint: "Quiz answer flow",
      explanation: "Server-side checks keep the quiz honest and safe.",
    },
    {
      category: "security",
      subject: "Arc Testnet practice",
      answer: "It should remain separate from real value",
      wrongs: [
        "It should use real mainnet funds",
        "It should hide validation",
        "It should remove anti-abuse logic",
      ],
      sourceHint: "Arc Academy safety notes",
      explanation: "Testnet practice should not touch real funds.",
    },
  ],
  builders: [
    {
      category: "agents",
      subject: "Archie as a teacher agent",
      answer: "It should explain concepts and guide progress",
      wrongs: [
        "It should manage private keys",
        "It should send automatic rewards",
        "It should bypass validation",
      ],
      sourceHint: "Archie agent profile",
      explanation: "Archie teaches without taking custody of anything.",
    },
    {
      category: "agents",
      subject: "server-side question selection",
      answer: "It protects correct answers from the client",
      wrongs: [
        "It reveals all answers early",
        "It sends transactions",
        "It removes level progression",
      ],
      sourceHint: "Server-side question agent",
      explanation: "Server selection keeps the quiz safe.",
    },
    {
      category: "agents",
      subject: "topic guidance after a wrong answer",
      answer: "It should be short and point to the weak topic",
      wrongs: [
        "It should reveal the next answer",
        "It should show private keys",
        "It should send a reward",
      ],
      sourceHint: "Archie guidance rules",
      explanation: "Guidance should help the learner retry.",
    },
    {
      category: "agents",
      subject: "question drafts",
      answer: "They should be reviewed before live use",
      wrongs: [
        "They should ship without validation",
        "They should expose the answer to the client",
        "They should replace all server logic",
      ],
      sourceHint: "Question draft workflow",
      explanation: "Drafts are safe only after validation and approval.",
    },
    {
      category: "network",
      subject: "Arc explorer integrations",
      answer: "They should help learners inspect chain activity",
      wrongs: [
        "They should hide transactions",
        "They should store private keys",
        "They should send automatic rewards",
      ],
      sourceHint: "Arc Testnet explorer",
      explanation: "Explorer views support safe learning.",
    },
    {
      category: "network",
      subject: "read-only network calls",
      answer: "They are the safe default for the MVP",
      wrongs: [
        "They require private keys",
        "They must send rewards",
        "They should bypass checks",
      ],
      sourceHint: "Arc docs: connect to Arc",
      explanation: "Read-only access keeps the app safe.",
    },
    {
      category: "security",
      subject: "duplicate question checks",
      answer: "They help keep quizzes fresh",
      wrongs: [
        "They should be removed",
        "They should leak answers",
        "They should send funds",
      ],
      sourceHint: "Question generation workflow",
      explanation: "Duplicate checks reduce repetition.",
    },
    {
      category: "security",
      subject: "question source hints",
      answer: "They help admins and learners trace content",
      wrongs: [
        "They should contain private keys",
        "They should replace the question",
        "They should award XP directly",
      ],
      sourceHint: "Arc Academy content workflow",
      explanation: "Source hints are a traceability aid.",
    },
    {
      category: "security",
      subject: "external AI calls",
      answer: "They should stay disabled until explicitly configured",
      wrongs: [
        "They should run by default",
        "They should replace the browser",
        "They should sign transactions",
      ],
      sourceHint: "RAG and generation plan",
      explanation: "The MVP is safe without external AI.",
    },
    {
      category: "agents",
      subject: "reward eligibility preparation",
      answer: "It should happen without sending funds",
      wrongs: [
        "It should sign a transfer",
        "It should expose private keys",
        "It should skip verification",
      ],
      sourceHint: "Reward queue behavior",
      explanation: "Preparation is not the same as distribution.",
    },
  ],
  advanced: [
    {
      category: "agents",
      subject: "advanced Arc architecture",
      answer: "It should keep learning, reward, and verification paths separate",
      wrongs: [
        "It should merge private keys into the UI",
        "It should send rewards automatically",
        "It should hide the session state",
      ],
      sourceHint: "Arc Academy architecture",
      explanation: "Separating concerns keeps the MVP safe.",
    },
    {
      category: "agents",
      subject: "agentic economy design",
      answer: "It should stay read-only until later controls exist",
      wrongs: [
        "It should auto-sign transfers",
        "It should expose all answers",
        "It should remove validation",
      ],
      sourceHint: "Archie and reward roadmap",
      explanation: "Agentic features need guardrails before action.",
    },
    {
      category: "security",
      subject: "edge-case quiz sessions",
      answer: "They should still avoid duplicate questions when possible",
      wrongs: [
        "They should ignore history",
        "They should leak the next answer",
        "They should require a private key",
      ],
      sourceHint: "Question agent",
      explanation: "The selector should prefer fresh material.",
    },
    {
      category: "security",
      subject: "fallback behavior",
      answer: "It should keep the quiz running if generation fails",
      wrongs: [
        "It should crash the page",
        "It should reveal correct answers",
        "It should send a transaction",
      ],
      sourceHint: "Quiz start flow",
      explanation: "Fallbacks keep the learning flow reliable.",
    },
    {
      category: "network",
      subject: "least recently seen questions",
      answer: "They are the best fallback when unseen questions are scarce",
      wrongs: [
        "They should never be used",
        "They should always be first",
        "They should bypass the server",
      ],
      sourceHint: "Question agent selection",
      explanation: "Least-recently-seen keeps repetition lower.",
    },
    {
      category: "network",
      subject: "approved question drafts",
      answer: "They can join the live quiz bank after approval",
      wrongs: [
        "They should be shown as secrets",
        "They should bypass validation",
        "They should auto-send rewards",
      ],
      sourceHint: "Question draft workflow",
      explanation: "Approved drafts are safe to include in quizzes.",
    },
    {
      category: "gas",
      subject: "Arc USDC gas edge cases",
      answer: "They should still respect validation and anti-abuse rules",
      wrongs: [
        "They should ignore validation",
        "They should reveal private keys",
        "They should skip the explorer",
      ],
      sourceHint: "Arc docs: gas and fees",
      explanation: "Even advanced flows must stay safe.",
    },
    {
      category: "evm",
      subject: "protocol concepts on Arc",
      answer: "They should map cleanly to EVM-compatible developer workflows",
      wrongs: [
        "They should break Solidity tooling",
        "They should disable read-only calls",
        "They should require a seed phrase",
      ],
      sourceHint: "Arc docs: EVM compatibility",
      explanation: "Arc keeps the workflow familiar for builders.",
    },
    {
      category: "agents",
      subject: "future AI/RAG integration",
      answer: "It should stay behind a safe provider interface",
      wrongs: [
        "It should be required for login",
        "It should replace all validation",
        "It should send transactions automatically",
      ],
      sourceHint: "RAG plan",
      explanation: "The code should be ready without enabling AI by default.",
    },
    {
      category: "security",
      subject: "near-duplicate question detection",
      answer: "It should compare normalized question text",
      wrongs: [
        "It should compare private keys",
        "It should skip all duplicates",
        "It should expose answers first",
      ],
      sourceHint: "Question generation workflow",
      explanation: "Normalized text helps catch repeated wording.",
    },
  ],
};

function getSessionBand(level: QuizLevel): SessionBand {
  switch (level) {
    case "visitor":
    case "explorer":
      return "basics";
    case "pathfinder":
    case "builder":
      return "transactions";
    case "operator":
    case "strategist":
      return "security";
    case "architect":
    case "protocolist":
      return "builders";
    case "arc_sage":
    case "arc_master":
      return "advanced";
  }
}

function slugifyQuestionPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildSessionQuestionText(
  levelId: QuizLevel,
  subject: string,
  variant: number,
) {
  const levelLabel = LEVEL_LABELS[levelId];

  return variant % 2 === 0
    ? `${levelLabel}: Which Arc idea best matches ${subject}?`
    : `${levelLabel}: What should a learner remember about ${subject}?`;
}

function buildSessionQuestionId(
  levelId: QuizLevel,
  subject: string,
  variant: number,
) {
  return `session-${levelId}-${slugifyQuestionPart(subject)}-${variant + 1}`;
}

function getSessionDifficulty(levelId: QuizLevel, variant: number): "easy" | "medium" | "hard" {
  switch (levelId) {
    case "visitor":
    case "explorer":
      return "easy";
    case "pathfinder":
    case "builder":
      return "medium";
    case "operator":
      return variant % 2 === 0 ? "medium" : "hard";
    case "strategist":
    case "architect":
    case "protocolist":
    case "arc_sage":
    case "arc_master":
      return "hard";
  }
}

function buildSessionDraft(
  levelId: QuizLevel,
  topic: SessionTopic,
  variant: number,
) {
  const options = shuffleItems([
    topic.answer,
    ...topic.wrongs,
  ]);

  return {
    id: buildSessionQuestionId(levelId, topic.subject, variant),
    level: levelId,
    category: topic.category,
    question: buildSessionQuestionText(levelId, topic.subject, variant),
    options,
    correctAnswer: topic.answer,
    explanation: topic.explanation,
    sourceHint: topic.sourceHint,
    sourceTopic: topic.subject,
    difficulty: getSessionDifficulty(levelId, variant),
    uniquenessReason: `Arc-specific session blueprint for ${LEVEL_LABELS[levelId]} about ${topic.subject}.`,
    questionNormalized: normalizeGeneratedQuestionText(
      buildSessionQuestionText(levelId, topic.subject, variant),
    ),
    questionHash: hashGeneratedQuestionText(
      buildSessionQuestionText(levelId, topic.subject, variant),
    ),
    modelUsed: "local-deterministic",
    status: QUESTION_DRAFT_STATUS,
  } satisfies GeneratedQuestionDraft;
}

function orderSessionTopics(
  levelId: QuizLevel,
  previousQuestionIds: string[] = [],
  existingQuestions: Array<Pick<GeneratedQuestionDraft, "id" | "question">> = [],
) {
  const band = getSessionBand(levelId);
  const topics = [...SESSION_BAND_BLUEPRINTS[band]];
  const previous = new Set(previousQuestionIds);

  return shuffleItems(topics).sort((left, right) => {
    const leftSeen = previous.has(buildSessionQuestionId(levelId, left.subject, 0))
      || previous.has(buildSessionQuestionId(levelId, left.subject, 1));
    const rightSeen = previous.has(buildSessionQuestionId(levelId, right.subject, 0))
      || previous.has(buildSessionQuestionId(levelId, right.subject, 1));

    if (leftSeen !== rightSeen) {
      return leftSeen ? 1 : -1;
    }

    const leftDuplicate = detectDuplicateQuestion(
      buildSessionDraft(levelId, left, 0),
      existingQuestions,
    ) || detectDuplicateQuestion(buildSessionDraft(levelId, left, 1), existingQuestions);
    const rightDuplicate = detectDuplicateQuestion(
      buildSessionDraft(levelId, right, 0),
      existingQuestions,
    ) || detectDuplicateQuestion(buildSessionDraft(levelId, right, 1), existingQuestions);

    if (leftDuplicate !== rightDuplicate) {
      return leftDuplicate ? 1 : -1;
    }

    return left.subject.localeCompare(right.subject);
  });
}

function generateLocalLevelQuizDrafts(
  levelId: QuizLevel,
  count: number,
  options: {
    previousQuestionIds?: string[];
    existingQuestions?: Array<Pick<GeneratedQuestionDraft, "id" | "question">>;
  } = {},
) {
  const orderedTopics = orderSessionTopics(
    levelId,
    options.previousQuestionIds,
    options.existingQuestions,
  );
  const drafts: GeneratedQuestionDraft[] = [];
  const existing = options.existingQuestions ?? [];
  const seenIds = new Set(existing.map((item) => item.id));

  for (const topic of orderedTopics) {
    for (const variant of [0, 1]) {
      const draft = buildSessionDraft(levelId, topic, variant);

      if (seenIds.has(draft.id)) {
        continue;
      }

      if (detectDuplicateQuestion(draft, [...existing, ...drafts])) {
        continue;
      }

      try {
        validateGeneratedQuestionDraft(draft);
        drafts.push(draft);
        seenIds.add(draft.id);
      } catch {
        // Skip invalid drafts and keep generating until the requested count is met.
      }

      if (drafts.length >= count) {
        return drafts.slice(0, count);
      }
    }
  }

  return drafts.slice(0, count);
}

export function buildOpenRouterModelSequence() {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const openRouterPrimary = process.env.OPENROUTER_PRIMARY_MODEL?.trim();
  const openRouterModel = process.env.OPENROUTER_MODEL?.trim();
  const fallback1 = process.env.OPENROUTER_FALLBACK_MODEL_1?.trim();
  const fallback2 = process.env.OPENROUTER_FALLBACK_MODEL_2?.trim();

  if (provider !== "openrouter") {
    return [];
  }

  const ordered = [
    openRouterPrimary || openRouterModel,
    fallback1,
    fallback2,
  ].filter((model): model is string => Boolean(model));

  return [...new Set(ordered)];
}

function buildOpenRouterPrompt(
  levelId: QuizLevel,
  count: number,
  context: QuestionGenerationContext,
) {
  const levelLabel = LEVEL_LABELS[levelId];
  const recent = (context.previousQuestionIds ?? []).slice(0, 30);
  const existing = (context.existingQuestions ?? []).slice(0, 30);
  const existingSummary = existing.length
    ? existing
        .map((item) => {
          const topic = item.sourceTopic ?? "unknown-topic";
          const hash = item.questionHash ?? hashGeneratedQuestionText(item.question);
          const difficulty = item.difficulty ?? "unknown";
          return `${item.id}|${topic}|${difficulty}|${hash}`;
        })
        .join(" || ")
    : "none";

  return [
    "You are Archie, the Arc Academy question generation agent.",
    `Generate exactly ${count} JSON quiz questions for the ${levelLabel} level.`,
    'Return JSON only with this exact shape: {"questions":[{"difficulty":"easy|medium|hard","sourceTopic":"string","question":"string","options":["A","B","C","D"],"correctAnswer":"string","explanation":"string","uniquenessReason":"string"}]}.',
    "Questions must be only about Arc, Archie, Arc Network, Arc testnet, contributor tasks, campaigns, community features, developer features, ecosystem concepts, or official/project-provided documentation.",
    "All questions, options, explanations, source topics, and UI-visible text must be written in English only.",
    "Do not generate generic crypto or unrelated blockchain questions.",
    "Do not repeat previous questions or reuse wording with tiny edits.",
    "Do not reuse the same answer pattern or test the exact same fact twice.",
    "Difficulty must be meaningfully different between easy, medium, and hard.",
    "Hard questions must combine multiple documentation details.",
    `Recent question ids or hashes to avoid: ${recent.length ? recent.join(", ") : "none"}.`,
    `Compact existing question history to avoid (id|topic|difficulty|hash): ${existingSummary}.`,
    "Every question must include a clear sourceTopic and explanation.",
    "Exactly 4 options are required and the correctAnswer must match one option exactly.",
    "Output must be valid JSON only, no markdown, no commentary.",
  ].join("\n");
}

function getOpenRouterTimeoutMs() {
  const parsed = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 30000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
}

function getOpenRouterTotalTimeoutMs() {
  const parsed = Number(process.env.OPENROUTER_TOTAL_TIMEOUT_MS ?? 90000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90000;
}

function parseProviderQuestions(value: unknown) {
  if (value == null) {
    return [];
  }

  const raw = typeof value === "string" ? value : JSON.stringify(value);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(stripCodeFence(raw)) as {
      questions?: Array<Record<string, unknown>>;
    };

    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
}

function filterUniqueProviderDrafts(
  drafts: GeneratedQuestionDraft[],
  existingQuestions: Array<Pick<GeneratedQuestionDraft, "id" | "question">>,
) {
  const seenIds = new Set(existingQuestions.map((item) => item.id));
  const accepted: GeneratedQuestionDraft[] = [];
  const seenHashes = new Set(
    existingQuestions.map((item) => hashGeneratedQuestionText(item.question)),
  );

  for (const draft of drafts) {
    const normalizedHash = draft.questionHash ?? hashGeneratedQuestionText(draft.question);
    const normalizedText = draft.questionNormalized ?? normalizeGeneratedQuestionText(draft.question);

    if (seenIds.has(draft.id) || seenHashes.has(normalizedHash)) {
      continue;
    }

    const duplicate = accepted.some((candidate) => {
      const candidateHash = candidate.questionHash ?? hashGeneratedQuestionText(candidate.question);
      const candidateText = candidate.questionNormalized ?? normalizeGeneratedQuestionText(candidate.question);
      return (
        candidateHash === normalizedHash ||
        candidateText === normalizedText ||
        questionTextSimilarity(candidateText, normalizedText) >= 0.82
      );
    });

    if (duplicate) {
      continue;
    }

    accepted.push({
      ...draft,
      questionNormalized: normalizedText,
      questionHash: normalizedHash,
    });
    seenIds.add(draft.id);
    seenHashes.add(normalizedHash);
  }

  return accepted;
}

function filterUniqueProviderDraftsWithStats(
  drafts: GeneratedQuestionDraft[],
  existingQuestions: Array<Pick<GeneratedQuestionDraft, "id" | "question">>,
) {
  const seenIds = new Set(existingQuestions.map((item) => item.id));
  const accepted: GeneratedQuestionDraft[] = [];
  const seenHashes = new Set(
    existingQuestions.map((item) => hashGeneratedQuestionText(item.question)),
  );
  let duplicateRejected = 0;
  let unrelatedRejected = 0;

  for (const draft of drafts) {
    const normalizedHash = draft.questionHash ?? hashGeneratedQuestionText(draft.question);
    const normalizedText = draft.questionNormalized ?? normalizeGeneratedQuestionText(draft.question);

    if (seenIds.has(draft.id) || seenHashes.has(normalizedHash)) {
      duplicateRejected += 1;
      continue;
    }

    const duplicate = accepted.some((candidate) => {
      const candidateHash = candidate.questionHash ?? hashGeneratedQuestionText(candidate.question);
      const candidateText = candidate.questionNormalized ?? normalizeGeneratedQuestionText(candidate.question);
      return (
        candidateHash === normalizedHash ||
        candidateText === normalizedText ||
        questionTextSimilarity(candidateText, normalizedText) >= 0.82
      );
    });

    if (duplicate) {
      duplicateRejected += 1;
      continue;
    }

    try {
      validateGeneratedQuestionDraft(draft);
    } catch {
      unrelatedRejected += 1;
      continue;
    }

    accepted.push({
      ...draft,
      questionNormalized: normalizedText,
      questionHash: normalizedHash,
    });
    seenIds.add(draft.id);
    seenHashes.add(normalizedHash);
  }

  return { accepted, duplicateRejected, unrelatedRejected };
}

function logModelMessage(message: string) {
  console.info(message);
}

async function callOpenRouterForModel(
  model: string,
  levelId: QuizLevel,
  count: number,
  context: QuestionGenerationContext,
  timeoutBudgetMs = getOpenRouterTimeoutMs(),
) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return { questions: [], reason: "missing api key" as const };
  }

  logModelMessage(`Trying OpenRouter model: ${model}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutBudgetMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost",
        "X-Title": "Arc Academy Agent",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You generate only safe Arc Academy question JSON. Output only JSON and no markdown.",
          },
          {
            role: "user",
            content: buildOpenRouterPrompt(levelId, count, context),
          },
        ],
        max_tokens: Math.max(1200, count * 350),
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const snippet = body.trim().replace(/\s+/g, " ").slice(0, 180);
      return {
        questions: [],
        reason: snippet ? `http ${response.status}: ${snippet}` : `http ${response.status}`,
      } as const;
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

    const questions = parseProviderQuestions(payload.choices?.[0]?.message?.content);

    if (!questions.length) {
      return { questions: [], reason: "empty response" as const };
    }

    const normalized = questions
      .map((question) => {
        const sourceTopic = typeof question.sourceTopic === "string"
          ? question.sourceTopic
          : typeof question.sourceHint === "string"
            ? question.sourceHint
            : "";
        const difficulty = typeof question.difficulty === "string" ? question.difficulty.trim().toLowerCase() : "";
        const allowedDifficulty = ["easy", "medium", "hard"] as const;
        const options = Array.isArray(question.options) ? question.options : [];
        const category = typeof question.category === "string" ? question.category : undefined;
        if (!allowedDifficulty.includes(difficulty as (typeof allowedDifficulty)[number])) {
          return null;
        }
        const normalizedQuestion: GeneratedQuestionDraft = {
          id: typeof question.id === "string" && question.id.trim()
            ? question.id.trim()
            : `or-${model}-${hashGeneratedQuestionText(String(question.question ?? ""))}`,
          level: levelId,
          category: (category ? toQuestionCategory(category) : null) ?? "basics",
          question: typeof question.question === "string" ? question.question.trim() : "",
          options: options.filter((option): option is string => typeof option === "string").slice(0, 4),
          correctAnswer: typeof question.correctAnswer === "string" ? question.correctAnswer.trim() : "",
          explanation: typeof question.explanation === "string" ? question.explanation.trim() : "",
          sourceHint: sourceTopic.trim(),
          status: QUESTION_DRAFT_STATUS,
          sourceTopic: sourceTopic.trim(),
          difficulty: difficulty as (typeof allowedDifficulty)[number],
          uniquenessReason:
            typeof question.uniquenessReason === "string"
              ? question.uniquenessReason.trim()
              : "",
          modelUsed: model,
          questionNormalized: normalizeGeneratedQuestionText(String(question.question ?? "")),
          questionHash: hashGeneratedQuestionText(String(question.question ?? "")),
        } satisfies GeneratedQuestionDraft;

        return normalizedQuestion;
      })
      .filter((draft): draft is GeneratedQuestionDraft => {
        if (!draft) {
          return false;
        }
        return true;
      });

    const reviewed = normalized.filter((draft) => {
      try {
        validateGeneratedQuestionDraft(draft);
        return true;
      } catch {
        return false;
      }
    });

    const { accepted, duplicateRejected, unrelatedRejected } =
      filterUniqueProviderDraftsWithStats(reviewed, context.existingQuestions ?? []);

    if (accepted.length > 0) {
      logModelMessage(`Using OpenRouter model: ${model}`);
      logModelMessage(`Generated ${accepted.length} valid unique questions`);
    }

    if (accepted.length < count) {
      return {
        questions: accepted,
        reason: "insufficient valid unique questions",
        duplicateRejected,
        unrelatedRejected:
          unrelatedRejected + (reviewed.length - accepted.length - duplicateRejected),
      } as const;
    }
    return { questions: accepted, reason: null, duplicateRejected, unrelatedRejected };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return { questions: [], reason, duplicateRejected: 0, unrelatedRejected: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateOpenRouterQuestionDrafts(
  levelId: QuizLevel,
  count: number,
  context: QuestionGenerationContext,
) {
  const models = buildOpenRouterModelSequence();

  if (!models.length) {
    return {
      questions: [],
      source: "openrouter" as const,
      modelChain: [],
      fallbackUsed: true,
      duplicateRejected: 0,
      unrelatedRejected: 0,
      historyCount: context.existingQuestions?.length ?? 0,
      questionHashes: [],
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      questions: [],
      source: "openrouter" as const,
      modelChain: models,
      fallbackUsed: true,
      duplicateRejected: 0,
      unrelatedRejected: 0,
      historyCount: context.existingQuestions?.length ?? 0,
      questionHashes: [],
    };
  }

  const allExisting = context.existingQuestions ?? [];
  const collected: GeneratedQuestionDraft[] = [];
  let duplicateRejected = 0;
  let unrelatedRejected = 0;
  let modelUsed: string | undefined;
  const startedAt = Date.now();
  const totalTimeout = getOpenRouterTotalTimeoutMs();

  for (const model of models) {
    const elapsed = Date.now() - startedAt;
    const remaining = totalTimeout - elapsed;

    if (remaining <= 0) {
      logModelMessage("Model failed validation: total timeout reached");
      break;
    }

    const result = await callOpenRouterForModel(
      model,
      levelId,
      count,
      {
        previousQuestionIds: context.previousQuestionIds,
        existingQuestions: [
          ...allExisting,
          ...collected.map((question) => ({
            id: question.id,
            question: question.question,
          })),
        ],
      },
      remaining,
    );

    duplicateRejected += result.duplicateRejected ?? 0;
    unrelatedRejected += result.unrelatedRejected ?? 0;

    if (result.questions.length > 0) {
      modelUsed = model;
    }

    for (const question of result.questions) {
      if (!detectDuplicateQuestion(question, [...allExisting, ...collected])) {
        collected.push(question);
      }
    }

    if (collected.length >= count) {
      break;
    }

    logModelMessage(`Model failed validation: ${result.reason ?? "unknown reason"}`);
  }

  const unique = filterUniqueProviderDrafts(collected, allExisting);

  if (!unique.length) {
    return {
      questions: [],
      source: "openrouter" as const,
      modelChain: models,
      fallbackUsed: true,
      fallbackReason: "OpenRouter question generation failed across all configured models.",
      duplicateRejected,
      unrelatedRejected,
      historyCount: allExisting.length,
      questionHashes: [],
    };
  }

  return {
    questions: unique.slice(0, count),
    source: "openrouter" as const,
    modelChain: models,
    modelUsed: modelUsed ?? unique[0]?.modelUsed ?? models[0],
    fallbackUsed: unique.length < count,
    fallbackReason: unique.length < count ? "insufficient valid unique questions" : undefined,
    duplicateRejected,
    unrelatedRejected,
    historyCount: allExisting.length,
    questionHashes: unique.slice(0, count).map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)),
  };
}

export function getQuestionGenerationProvider(): QuestionGenerationProvider | null {
  const provider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());

  if (!provider || !hasOpenRouterKey) {
    return null;
  }

  if (provider === "openrouter") {
    return {
      name: "openrouter",
      generateDrafts: async ({ level, count, previousQuestionIds, existingQuestions }) =>
        (await generateOpenRouterQuestionDrafts(level, count, {
          previousQuestionIds,
          existingQuestions,
        })).questions,
    };
  }

  return null;
}

export async function generateQuestionsWithProvider(
  levelId: QuizLevel,
  count: number,
  context: QuestionGenerationContext = {},
) {
  const provider = getQuestionGenerationProvider();

  if (!provider) {
    return generateLocalLevelQuizDrafts(levelId, count, context);
  }

  const generated = await provider.generateDrafts({
    level: levelId,
    count,
    previousQuestionIds: context.previousQuestionIds,
    existingQuestions: context.existingQuestions,
  });

  if (generated.length < count) {
    throw new Error("OpenRouter returned insufficient valid unique questions.");
  }
  return generated.slice(0, count);
}

export async function generateFreshQuestionSessionDrafts(
  levelId: QuizLevel,
  count: number,
  context: QuestionGenerationContext = {},
): Promise<QuestionGenerationRun> {
  const provider = getQuestionGenerationProvider();
  const modelChain = buildOpenRouterModelSequence();
  const historyCount = context.existingQuestions?.length ?? 0;

  if (provider) {
    const openRouterResult = await generateOpenRouterQuestionDrafts(levelId, count, context);

    if (openRouterResult.questions.length >= count && !openRouterResult.fallbackUsed) {
      return {
        questions: openRouterResult.questions.slice(0, count),
        source: "openrouter",
        modelChain,
        modelUsed: openRouterResult.modelUsed ?? modelChain[0],
        fallbackUsed: false,
        duplicateRejected: openRouterResult.duplicateRejected,
        unrelatedRejected: openRouterResult.unrelatedRejected,
        historyCount,
        questionHashes: openRouterResult.questionHashes.slice(0, count),
      };
    }

    const localFallback = generateLocalLevelQuizDrafts(levelId, count, {
      previousQuestionIds: context.previousQuestionIds,
      existingQuestions: [
        ...(context.existingQuestions ?? []),
        ...openRouterResult.questions.map((question) => ({
          id: question.id,
          question: question.question,
        })),
      ],
    });

    const merged = filterUniqueProviderDrafts(
      [...openRouterResult.questions, ...localFallback],
      context.existingQuestions ?? [],
    ).slice(0, count);

    return {
      questions: merged,
      source: openRouterResult.questions.length ? "openrouter" : "local",
      modelChain,
      modelUsed: openRouterResult.modelUsed ?? modelChain[0],
      fallbackUsed: true,
      fallbackReason:
        openRouterResult.fallbackReason ?? "Using fallback questions because OpenRouter failed.",
      duplicateRejected: openRouterResult.duplicateRejected,
      unrelatedRejected: openRouterResult.unrelatedRejected,
      historyCount,
      questionHashes: merged.map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)),
    };
  }

  const localQuestions = generateLocalLevelQuizDrafts(levelId, count, context);

  return {
    questions: localQuestions.slice(0, count),
    source: "local",
    modelChain,
    fallbackUsed: true,
    fallbackReason: "Using fallback questions because OpenRouter failed.",
    duplicateRejected: 0,
    unrelatedRejected: 0,
    historyCount,
    questionHashes: localQuestions.slice(0, count).map((question) => question.questionHash ?? hashGeneratedQuestionText(question.question)),
  };
}

export async function generateLevelQuizDrafts(
  levelId: QuizLevel,
  count: number,
  options: {
    previousQuestionIds?: string[];
    existingQuestions?: QuestionGenerationContext["existingQuestions"];
    provider?: QuestionGenerationProvider | null;
  } = {},
) {
  const generated = options.provider
    ? await options.provider.generateDrafts({
        level: levelId,
        count,
        previousQuestionIds: options.previousQuestionIds,
        existingQuestions: options.existingQuestions,
      })
    : await generateQuestionsWithProvider(levelId, count, {
        previousQuestionIds: options.previousQuestionIds,
        existingQuestions: options.existingQuestions,
      });

  return generated.slice(0, count);
}
