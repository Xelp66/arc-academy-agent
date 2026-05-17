import { z } from "zod";
import type { QuizQuestion } from "@/types/quiz";
import { LEVEL_IDS, type LevelId } from "@/lib/levels";

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, {
    message: "Please enter a valid wallet address.",
  });

export const optionalWalletAddressSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(walletAddressSchema.optional());

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email address." });

export const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(emailSchema.optional());

export const txHashSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{64}$/, {
    message: "Please enter a valid transaction hash.",
  });

export const quizStartSchema = z.object({
  identityType: z.enum(["wallet", "email"]).optional(),
  walletAddress: optionalWalletAddressSchema,
  email: optionalEmailSchema,
  levelId: z.enum(LEVEL_IDS as [LevelId, ...LevelId[]]).optional(),
  level: z.enum(LEVEL_IDS as [LevelId, ...LevelId[]]).optional(),
  recentQuestionIds: z.array(z.string().min(1)).max(200).optional(),
  recentQuestionTexts: z.array(z.string().min(1)).max(200).optional(),
});

export const quizAnswerSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
  questionId: z.string().min(1, "Question id is required."),
  selectedAnswer: z.string().min(1, "Selected answer is required."),
});

export const quizJokerSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
  questionId: z.string().min(1, "Question id is required."),
  jokerType: z.literal("fiftyFifty"),
});

export const missionSubmitSchema = z.object({
  identityType: z.enum(["wallet", "email"]).optional(),
  email: optionalEmailSchema,
  walletAddress: walletAddressSchema,
  missionId: z.string().min(1, "Mission id is required."),
  txHash: txHashSchema,
});

export const missionVerifySchema = missionSubmitSchema;

export function publicQuestion(question: QuizQuestion) {
  return {
    id: question.id,
    level: question.level,
    category: question.category,
    question: question.question,
    options: question.options,
    sourceHint: question.sourceHint,
  };
}

export function validationError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(" ");
}
