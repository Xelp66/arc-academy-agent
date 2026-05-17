import type { AgentContext, AgentResponse } from "@/lib/archie";

export const RAG_ENABLED = false;

export type RagSource = {
  id: string;
  title: string;
  url: string;
  retrievedAt?: string;
  sourceType: "docs" | "guide" | "release_notes" | "explorer" | "other";
};

export type SourceDocument = RagSource;

export type RagChunk = {
  id: string;
  source: RagSource;
  heading?: string;
  content: string;
  tokenCount?: number;
};

export type Citation = {
  sourceId: string;
  quote: string;
  location?: string;
  confidence?: ConfidenceScore;
};

export type ConfidenceScore = number;

export type ReviewStatus = "draft" | "in_review" | "approved" | "rejected";

export type GeneratedQuestion = {
  id: string;
  level: string;
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  confidence: ConfidenceScore;
  reviewStatus: ReviewStatus;
  citations: Citation[];
  sourceDocuments: SourceDocument[];
  createdAt: string;
};

export type RagRetrievalQuery = {
  question: string;
  context?: AgentContext;
  maxChunks?: number;
};

export type RagRetrievalResult = {
  chunk: RagChunk;
  score: number;
  reason?: string;
};

export type RagAnswerInput = {
  question: string;
  context?: AgentContext;
  results: RagRetrievalResult[];
};

export type RagAnswer = AgentResponse & {
  citations: RagSource[];
};

export type RagRetriever = {
  retrieve(query: RagRetrievalQuery): Promise<RagRetrievalResult[]>;
};

export type RagAnswerer = {
  answer(input: RagAnswerInput): Promise<RagAnswer>;
};

export function isRagEnabled() {
  return RAG_ENABLED;
}

export function createDraftGeneratedQuestion(input: {
  id: string;
  level: string;
  category: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  citations?: Citation[];
  sourceDocuments?: SourceDocument[];
  confidence?: ConfidenceScore;
}): GeneratedQuestion {
  return {
    id: input.id,
    level: input.level,
    category: input.category,
    question: input.question,
    options: input.options,
    correctAnswer: input.correctAnswer,
    explanation: input.explanation,
    confidence: input.confidence ?? 0.5,
    reviewStatus: "draft",
    citations: input.citations ?? [],
    sourceDocuments: input.sourceDocuments ?? [],
    createdAt: new Date().toISOString(),
  };
}

export async function retrieveArcDocs(): Promise<RagRetrievalResult[]> {
  // RAG is intentionally disabled for the MVP. Future implementations should
  // retrieve from an approved Arc docs index and must not scrape automatically.
  return [];
}

export function createRagUnavailableResponse(): RagAnswer {
  return {
    speaker: "Archie",
    tone: "neutral",
    message:
      "Arc docs retrieval is not configured yet. I can still guide you with the built-in lesson rules.",
    citations: [],
  };
}

export function assertQuizAnswerSafeResponse(
  response: RagAnswer,
  options: { quizAnswered: boolean },
) {
  if (options.quizAnswered) {
    return response;
  }

  return {
    ...response,
    message:
      "I can explain the concept before you answer, but I will not reveal the exact quiz option.",
  };
}
