import { missionVerifySchema, validationError } from "@/lib/apiValidation";
import {
  canVerifyMissionProofForUser,
  getRewardEligibilityForUser,
} from "@/lib/antiAbuse";
import { verifyArcTestnetTx } from "@/lib/arc";
import { missions } from "@/lib/data/missions";
import { missionErrorMessages, safeMissionMessage } from "@/lib/missionErrors";
import {
  createIdentityInput,
  createRewardEligibility,
  getOrCreateUser,
  getRewardForMission,
  markMissionVerified,
} from "@/lib/persistence";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const parsed = missionVerifySchema.safeParse(
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
    const antiAbuse = await canVerifyMissionProofForUser(
      user.id,
      walletAddress,
      missionId,
      txHash,
    );

    if (!antiAbuse.allowed) {
      const existingReward = await getRewardForMission(user.id, missionId);

      return Response.json(
        {
          verified: false,
          xpAwarded: 0,
          badgeAwarded: null,
          rewardEligible:
            existingReward?.status === "eligible" ||
            existingReward?.status === "queued" ||
            existingReward?.status === "sent",
          rewardStatus: existingReward?.status ?? "not_eligible",
          rewardMessage: existingReward
            ? "This mission is already in the reward queue. No duplicate reward was created."
            : undefined,
          error: safeMissionMessage(antiAbuse.message),
        },
        { status: antiAbuse.status },
      );
    }

    const verification = await verifyArcTestnetTx(txHash as `0x${string}`);

    if (!verification.valid) {
      return Response.json(
        {
          verified: false,
          xpAwarded: 0,
          badgeAwarded: null,
          rewardEligible: false,
          rewardStatus: "not_eligible",
          error: safeMissionMessage(verification.error),
        },
        { status: 400 },
      );
    }

    await prisma.missionSubmission.upsert({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId,
        },
      },
      update: {
        txHash: txHash.toLowerCase(),
      },
      create: {
        userId: user.id,
        missionId,
        txHash: txHash.toLowerCase(),
      },
    });

    await markMissionVerified({
      userId: user.id,
      missionId,
      txHash,
    });

    const rewardEligibility = await getRewardEligibilityForUser(user.id, missionId);
    const reward = rewardEligibility.eligible
      ? await createRewardEligibility({
          userId: user.id,
          missionId,
          txHash,
        })
      : null;
    const rewardStatus = reward?.status ?? rewardEligibility.status;
    const rewardMessage = reward
      ? "Eligible for testnet USDC reward. Added to the admin reward queue; no funds have been sent."
      : rewardEligibility.message;

    return Response.json({
      verified: true,
      xpAwarded: mission.xpReward,
      badgeAwarded: mission.badgeReward ?? null,
      rewardEligible:
        Boolean(mission.rewardEligibility) && rewardEligibility.eligible,
      rewardStatus,
      rewardMessage,
      verification: {
        txHash: verification.txHash,
        blockNumber: verification.blockNumber?.toString(),
        from: verification.from,
        to: verification.to,
      },
    });
  } catch (error) {
    console.error("[/api/missions/verify]", error);

    return Response.json(
      {
        error: missionErrorMessages.internal,
      },
      { status: 500 },
    );
  }
}
