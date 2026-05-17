import { missionSubmitSchema, validationError } from "@/lib/apiValidation";
import { canSubmitMissionProofForUser } from "@/lib/antiAbuse";
import { missions } from "@/lib/data/missions";
import { missionErrorMessages } from "@/lib/missionErrors";
import {
  createIdentityInput,
  getOrCreateUser,
  recordMissionSubmission,
} from "@/lib/persistence";

export async function POST(request: Request) {
  const parsed = missionSubmitSchema.safeParse(
    await request.json().catch(() => ({})),
  );

  if (!parsed.success) {
    return Response.json(
      { error: validationError(parsed.error) },
      { status: 400 },
    );
  }

  const { walletAddress, missionId, txHash } = parsed.data;
  const mission = missions.find((item) => item.id === missionId);

  if (!mission) {
    return Response.json({ error: "Mission not found." }, { status: 404 });
  }

  try {
    const identity = createIdentityInput(parsed.data) ?? {
      identityType: "wallet" as const,
      walletAddress,
    };
    const user = await getOrCreateUser(identity);
    const antiAbuse = await canSubmitMissionProofForUser(
      user.id,
      walletAddress,
      missionId,
      txHash,
    );

    if (!antiAbuse.allowed) {
      return Response.json(
        { error: antiAbuse.message },
        { status: antiAbuse.status },
      );
    }

    await recordMissionSubmission(user.id, missionId, txHash);

    return Response.json({
      status: "pending-verification",
    });
  } catch (error) {
    console.error("[/api/missions/submit]", error);

    return Response.json(
      { error: missionErrorMessages.internal },
      { status: 500 },
    );
  }
}
