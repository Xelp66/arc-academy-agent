import { quizStartSchema, validationError } from "@/lib/apiValidation";
import { buildQuizSession } from "@/lib/questionAgent";
import { getLevelConfig, type LevelId } from "@/lib/levels";
import { createIdentityInput } from "@/lib/persistence";

export async function POST(request: Request) {
  const parsed = quizStartSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json(
      { error: validationError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const identity = createIdentityInput(parsed.data);

    const selectedLevelId = (parsed.data.levelId ?? parsed.data.level) as
      | LevelId
      | undefined;
    const levelConfig = getLevelConfig(selectedLevelId);

    const quizSession = await buildQuizSession(
      identity,
      levelConfig.id,
      levelConfig.questionCount,
      parsed.data.recentQuestionIds ?? [],
    );

    return Response.json({
      sessionId: quizSession.sessionId,
      questions: quizSession.questions,
      generation: quizSession.generation,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start quiz session.",
      },
      { status: 500 },
    );
  }
}
