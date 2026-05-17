import "dotenv/config";

import { getRewardEligibility } from "../src/lib/antiAbuse";
import {
  completeQuizSession,
  approveQuestionDraft,
  createRewardEligibility,
  createQuestionDrafts,
  createQuizSession,
  createIdentityInput,
  getOrCreateUser,
  getRewardForMission,
  listQuestionDrafts,
  markMissionVerified,
  recordAnswer,
  recordMissionSubmission,
  rejectQuestionDraft,
} from "../src/lib/persistence";
import { prisma } from "../src/lib/prisma";
import {
  autoValidateAndApproveDrafts,
  generateQuestionDrafts,
} from "../src/lib/questionGenerator";
import { loadApprovedQuestionPool } from "../src/lib/questionBank";
import { fiftyFifty } from "../src/lib/jokers";
import { checkAnswer } from "../src/lib/quiz";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeWallet(seed: string) {
  return `0x${seed.padStart(40, "0").slice(-40)}`;
}

function makeTxHash(seed: string) {
  return `0x${seed.padStart(64, "0").slice(-64)}`;
}

async function expectDuplicateBlocked(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes("Duplicate"),
      "Expected duplicate submission to return the duplicate-blocked error.",
    );
    return;
  }

  throw new Error("Expected duplicate submission to be blocked.");
}

const runSeed = Date.now().toString(16);
const wallet = makeWallet(runSeed);
const secondWallet = makeWallet(`${runSeed}2`);
const passedWallet = makeWallet(`${runSeed}3`);
const email = `learner-${runSeed}@example.com`;
const txHash = makeTxHash(`${runSeed}abc`);
const passedTxHash = makeTxHash(`${runSeed}fed`);

async function main() {
  const user = await getOrCreateUser(wallet);
  const walletOnlyUser = await getOrCreateUser({ walletAddress: wallet });
  const walletObjectUser = await getOrCreateUser({
    identityType: "wallet",
    walletAddress: wallet,
  });
  const sameUser = await getOrCreateUser(`0x${wallet.slice(2).toUpperCase()}`);
  assert(
    user.id === sameUser.id,
    "Reusing the same wallet should load the same user.",
  );
  assert(
    user.id === walletObjectUser.id,
    "Reusing the same wallet object should load the same user.",
  );
  assert(
    user.id === walletOnlyUser.id,
    "Reusing the same wallet fields should load the same user.",
  );
  const emailUser = await getOrCreateUser({
    identityType: "email",
    email,
  });
  const emailOnlyUser = await getOrCreateUser({ email });
  const sameEmailUser = await getOrCreateUser({
    identityType: "email",
    email: email.toUpperCase(),
  });
  assert(
    emailUser.id === sameEmailUser.id,
    "Reusing the same email should load the same user.",
  );
  assert(
    emailUser.id === emailOnlyUser.id,
    "Reusing the same email fields should load the same user.",
  );

  const maybeIdentity = createIdentityInput({ walletAddress: wallet });
  assert(
    maybeIdentity?.identityType === "wallet",
    "Wallet identity input should be created for wallet addresses.",
  );

  const session = await createQuizSession(user.id);
  await recordAnswer(session.id, "arc-gas-token", "USDC", true);
  await recordAnswer(session.id, "arc-testnet-chain-id", "5042002", true);
  const completed = await completeQuizSession(session.id);
  assert(completed.status === "completed", "Quiz session should complete.");
  assert(completed.score === 2, "Completed quiz session should persist score.");

  const jokerSession = await createQuizSession(user.id);
  await prisma.jokerUsage.create({
    data: {
      sessionId: jokerSession.id,
      jokerType: "fiftyFifty",
      questionId: "arc-gas-token",
    },
  });
  await expectDuplicateBlocked(async () => {
    try {
      await prisma.jokerUsage.create({
        data: {
          sessionId: jokerSession.id,
          jokerType: "fiftyFifty",
          questionId: "arc-testnet-chain-id",
        },
      });
    } catch {
      throw new Error("Duplicate joker usage blocked.");
    }
  });

  const submission = await recordMissionSubmission(
    user.id,
    "first-arc-testnet-tx",
    txHash,
  );
  assert(submission.status === "pending", "Mission submission should start pending.");

  await expectDuplicateBlocked(() =>
    recordMissionSubmission(
      user.id,
      "first-arc-testnet-tx",
      makeTxHash(`${runSeed}def`),
    ),
  );

  const secondUser = await getOrCreateUser(secondWallet);
  await expectDuplicateBlocked(() =>
    recordMissionSubmission(secondUser.id, "first-contract-deploy", txHash),
  );

  const verified = await markMissionVerified({
    userId: user.id,
    missionId: "first-arc-testnet-tx",
    txHash,
  });
  assert(verified.submission.status === "verified", "Mission should mark verified.");
  assert(verified.user.xp >= 100, "Verified mission should persist XP.");

  const notEligible = await getRewardEligibility(wallet, "first-arc-testnet-tx");
  assert(
    notEligible.status === "not_eligible",
    "Verified mission without quiz pass should not be reward eligible.",
  );

  const xpAfterFirstVerify = verified.user.xp;
  try {
    await markMissionVerified({
      userId: user.id,
      missionId: "first-arc-testnet-tx",
      txHash,
    });
    throw new Error("Expected repeated mission verification to be blocked.");
  } catch (error) {
    assert(
      error instanceof Error &&
        error.message.includes("already verified this mission"),
      "Repeated mission verification should return the anti-abuse error.",
    );
  }

  const userAfterBlockedVerify = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { xp: true },
  });
  assert(
    userAfterBlockedVerify.xp === xpAfterFirstVerify,
    "Blocked repeated mission verification must not increment XP.",
  );

  const passedUser = await getOrCreateUser(passedWallet);
  const passedSession = await createQuizSession(passedUser.id);

  for (let index = 0; index < 14; index += 1) {
    await recordAnswer(
      passedSession.id,
      `phase-11-pass-${index}`,
      "USDC",
      true,
    );
  }

  await completeQuizSession(passedSession.id);
  await recordMissionSubmission(
    passedUser.id,
    "first-arc-testnet-tx",
    passedTxHash,
  );
  await markMissionVerified({
    userId: passedUser.id,
    missionId: "first-arc-testnet-tx",
    txHash: passedTxHash,
  });
  const eligible = await getRewardEligibility(
    passedWallet,
    "first-arc-testnet-tx",
  );
  assert(
    eligible.status === "eligible",
    "Quiz pass plus verified mission should be reward eligible.",
  );
  const reward = await createRewardEligibility({
    userId: passedUser.id,
    missionId: "first-arc-testnet-tx",
    txHash: passedTxHash,
  });
  const duplicateReward = await createRewardEligibility({
    userId: passedUser.id,
    missionId: "first-arc-testnet-tx",
    txHash: passedTxHash,
  });
  assert(reward.id === duplicateReward.id, "Reward creation should be idempotent.");
  assert(reward.status === "eligible", "New reward should be recorded as eligible.");

  const persistedReward = await getRewardForMission(
    passedUser.id,
    "first-arc-testnet-tx",
  );
  assert(Boolean(persistedReward), "Eligible reward should persist.");

  const draft = generateQuestionDrafts("builder", "basics", 1)[0];
  const savedDrafts = await createQuestionDrafts([draft]);
  assert(savedDrafts.length === 1, "Question draft should persist.");

  const listedDrafts = await listQuestionDrafts();
  assert(
    listedDrafts.some((item) => item.id === draft.id),
    "Persisted draft should be listable.",
  );

  const approvedDraft = await approveQuestionDraft(draft.id);
  assert(approvedDraft.status === "approved", "Draft should approve.");

  const rejectedDraft = await rejectQuestionDraft(
    draft.id,
    "Needs more Arc-specific context.",
  );
  assert(rejectedDraft.status === "rejected", "Draft should reject.");
  assert(
    rejectedDraft.rejectionReason === "Needs more Arc-specific context.",
    "Draft rejection reason should persist.",
  );

  const autoReviewed = autoValidateAndApproveDrafts([
    draft,
    {
      id: "draft-invalid-generic",
      level: "builder",
      category: "basics",
      question: "What is blockchain?",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
      explanation: "It is a generic question.",
      status: "draft",
    },
  ]);
  assert(
    autoReviewed.approved.length === 1,
    "One draft should be auto-approved.",
  );
  assert(
    autoReviewed.rejected.length === 1,
    "One draft should be auto-rejected.",
  );

  await createQuestionDrafts(autoReviewed.reviewed);
  const approvedPool = await loadApprovedQuestionPool();
  const approvedQuestion = approvedPool.find((item) => item.id === draft.id);
  assert(
    approvedQuestion !== undefined,
    "Approved draft should be available in the merged pool.",
  );
  const approvedAnswer = checkAnswer(draft.id, draft.correctAnswer, approvedPool);
  assert(approvedAnswer.correct === true, "Approved draft should be answerable.");
  const approvedJoker = fiftyFifty(approvedQuestion!);
  assert(
    Boolean(
      approvedJoker.remainingOptions?.includes(approvedQuestion!.correctAnswer),
    ),
    "50:50 should preserve the approved draft correct answer.",
  );

  console.log("Persistence checks passed:");
  console.log(`- Same wallet resolves to user ${user.id}`);
  console.log(`- Same email resolves to user ${emailUser.id}`);
  console.log(`- Quiz session ${session.id} completed with score ${completed.score}`);
  console.log("- Duplicate 50:50 joker usage blocked");
  console.log("- Duplicate wallet mission submission blocked");
  console.log("- Duplicate transaction hash blocked");
  console.log(`- Mission ${verified.submission.id} marked verified`);
  console.log("- Repeated verified mission claim blocked without XP increment");
  console.log("- Reward eligibility requires quiz pass and verified mission");
  console.log("- Eligible reward record created without duplicates");
  console.log("- Question drafts can be created, listed, approved, and rejected");
  console.log("- Auto-approval approves valid Arc drafts and rejects generic ones");
  console.log("- Approved drafts are included in the live answer pool");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
