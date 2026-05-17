import { quizAnswerSchema, validationError } from "@/lib/apiValidation";
import { loadApprovedQuestionPool } from "@/lib/questionBank";
import { getLevelConfig, type LevelId } from "@/lib/levels";
import { prisma } from "@/lib/prisma";
import { calculateScore, checkAnswer } from "@/lib/quiz";

export async function POST(request: Request) {
  const parsed = quizAnswerSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json(
      { error: validationError(parsed.error) },
      { status: 400 },
    );
  }

  const { sessionId, questionId, selectedAnswer } = parsed.data;

  try {
    const pool = await loadApprovedQuestionPool();
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (!session) {
      return Response.json({ error: "Quiz session not found." }, { status: 404 });
    }

    const levelConfig = getLevelConfig(session.levelId as LevelId);

    if (session.status !== "active") {
      return Response.json(
        { error: "Quiz session is no longer active." },
        { status: 409 },
      );
    }

    const existingAnswer = session.answers.find(
      (answer) => answer.questionId === questionId,
    );

    if (existingAnswer) {
      return Response.json(
        { error: "This question has already been answered in this session." },
        { status: 409 },
      );
    }

    const result = checkAnswer(questionId, selectedAnswer, pool);

    if (result.explanation === "Question not found.") {
      return Response.json({ error: result.explanation }, { status: 404 });
    }

    await prisma.answer.create({
      data: {
        sessionId,
        questionId,
        selectedAnswer,
        isCorrect: result.correct,
      },
    });

    const answers = await prisma.answer.findMany({
      where: { sessionId },
      select: { questionId: true, selectedAnswer: true, isCorrect: true },
    });
    const score = calculateScore(
      answers.map((answer) => ({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correct: answer.isCorrect,
        explanation: "",
      })),
    );
    const completed = score.total >= session.total;

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        score: score.correct,
        total: session.total,
        status: completed ? "completed" : "active",
        completedAt: completed ? new Date() : undefined,
      },
    });

    return Response.json({
      correct: result.correct,
      explanation: result.explanation,
      score,
      completed,
      passed: completed ? score.correct >= levelConfig.passingScore : false,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not record answer.",
      },
      { status: 500 },
    );
  }
}
