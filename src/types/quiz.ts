export type QuizLevel =
  | "visitor"
  | "explorer"
  | "pathfinder"
  | "builder"
  | "operator"
  | "strategist"
  | "architect"
  | "protocolist"
  | "arc_sage"
  | "arc_master";

export type QuizCategory =
  | "basics"
  | "network"
  | "gas"
  | "evm"
  | "agents"
  | "security";

export type QuizQuestion = {
  id: string;
  level: QuizLevel;
  category: QuizCategory;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceHint?: string;
  sourceTopic?: string;
  difficulty?: "easy" | "medium" | "hard";
  questionHash?: string;
  questionNormalized?: string;
  modelUsed?: string;
  uniquenessReason?: string;
  status?: string;
};

export type PublicQuizQuestion = Omit<
  QuizQuestion,
  "correctAnswer" | "explanation"
>;

export type AnswerResult = {
  questionId: string;
  selectedAnswer: string;
  correct: boolean;
  explanation: string;
};

export type QuizScore = {
  correct: number;
  total: number;
  percentage: number;
};
