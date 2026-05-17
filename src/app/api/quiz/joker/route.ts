import { quizJokerSchema, validationError } from "@/lib/apiValidation";
import { fiftyFifty } from "@/lib/jokers";
import { loadApprovedQuestionPool } from "@/lib/questionBank";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = quizJokerSchema.safeParse(
    await request.json().catch(() => ({})),
  );

  if (!parsed.success) {
    return Response.json(
      { error: validationError(parsed.error) },
      { status: 400 },
    );
  }

  const { sessionId, questionId, jokerType } = parsed.data;

  try {
    const pool = await loadApprovedQuestionPool();
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true },
    });

    if (!session) {
      return Response.json({ error: "Quiz session not found." }, { status: 404 });
    }

    if (session.status !== "active") {
      return Response.json(
        { error: "Quiz session is no longer active." },
        { status: 409 },
      );
    }

    const [existingAnswer, existingJokerUsage] = await Promise.all([
      prisma.answer.findFirst({
        where: { sessionId, questionId },
        select: { id: true },
      }),
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "JokerUsage"
        WHERE "sessionId" = ${sessionId}
          AND "jokerType" = ${jokerType}
        LIMIT 1
      `,
    ]);

    if (existingAnswer) {
      return Response.json(
        { error: "This question has already been answered." },
        { status: 409 },
      );
    }

    if (existingJokerUsage.length > 0) {
      return Response.json(
        { error: "50:50 has already been used in this quiz session." },
        { status: 409 },
      );
    }

    const question = pool.find((item) => item.id === questionId);

    if (!question) {
      return Response.json({ error: "Question not found." }, { status: 404 });
    }

    const result = fiftyFifty(question);

    if (!result.remainingOptions) {
      return Response.json(
        { error: "50:50 could not be applied to this question." },
        { status: 500 },
      );
    }

    const inserted = await prisma.$executeRaw`
      INSERT OR IGNORE INTO "JokerUsage" ("id", "sessionId", "jokerType", "questionId")
      VALUES (${crypto.randomUUID()}, ${sessionId}, ${jokerType}, ${questionId})
    `;

    if (inserted === 0) {
      return Response.json(
        { error: "50:50 has already been used in this quiz session." },
        { status: 409 },
      );
    }

    return Response.json({
      jokerType,
      remainingOptions: result.remainingOptions,
      message: result.message,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not apply joker.",
      },
      { status: 500 },
    );
  }
}
