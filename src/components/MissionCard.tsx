"use client";

import { useEffect, useMemo, useState } from "react";
import { getMissionVerifiedMessage } from "@/lib/archie";
import { ARC_TESTNET } from "@/lib/arc";
import {
  identityLabel,
  inferIdentityType,
  readSelectedIdentity,
  type SelectedIdentity,
} from "@/lib/identity";
import { appendArchieLogEntry, maskIdentity } from "@/lib/archieLog";
import { missionErrorMessages, safeMissionMessage } from "@/lib/missionErrors";
import { updateLocalProgress, upsertBadge } from "@/lib/localProgress";
import type { Mission } from "@/types/mission";

type MissionCardProps = {
  mission: Mission;
};

type SubmitStatus = "idle" | "checking" | "verified" | "invalid";

type VerificationResult = {
  valid: boolean;
  txHash: string;
  blockNumber?: string;
  from?: string;
  to?: string | null;
  error?: string;
  status:
    | "rpc_verified"
    | "tx_not_found"
    | "rpc_failed"
    | "already_verified"
    | "reused_tx_hash"
    | "submission_error";
};

type VerificationDetails = Omit<VerificationResult, "valid" | "error" | "status">;

type MissionVerifyResponse = {
  verified: boolean;
  xpAwarded: number;
  badgeAwarded: string | null;
  rewardEligible: boolean;
  rewardStatus?: "not_eligible" | "eligible" | "queued" | "sent" | "rejected";
  rewardMessage?: string;
  verification?: VerificationDetails;
  error?: string;
};

const walletPattern = /^0x[a-fA-F0-9]{40}$/;
const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
const missionVerifiedMessage = getMissionVerifiedMessage();

function classifyMissionError(error?: string): VerificationResult["status"] {
  if (error?.includes("Transaction was not found")) {
    return "tx_not_found";
  }

  if (error?.includes("already verified")) {
    return "already_verified";
  }

  if (error?.includes("already used")) {
    return "reused_tx_hash";
  }

  if (error?.includes("valid wallet address")) {
    return "submission_error";
  }

  if (error?.includes("valid transaction hash")) {
    return "submission_error";
  }

  return "rpc_failed";
}

function statusCopy(verification: VerificationResult) {
  switch (verification.status) {
    case "rpc_verified":
      return {
        eyebrow: "RPC verification",
        label: "Verified",
        className: "text-emerald-100",
      };
    case "tx_not_found":
      return {
        eyebrow: "RPC verification",
        label: "Transaction was not found on Arc Testnet.",
        className: "text-amber-100",
      };
    case "already_verified":
      return {
        eyebrow: "Mission status",
        label: "This mission is already verified for this identity.",
        className: "text-cyan-100",
      };
    case "reused_tx_hash":
      return {
        eyebrow: "Anti-abuse check",
        label: "Transaction hash already used",
        className: "text-amber-100",
      };
    case "submission_error":
      return {
        eyebrow: "Submission status",
        label: "Submission failed",
        className: "text-amber-100",
      };
    case "rpc_failed":
      return {
        eyebrow: "RPC verification",
        label: "Not verified",
        className: "text-amber-100",
      };
  }
}

export function MissionCard({ mission }: MissionCardProps) {
  const [identity, setIdentity] = useState<SelectedIdentity | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [verification, setVerification] = useState<VerificationResult | null>(
    null,
  );
  const [rewardState, setRewardState] = useState<{
    eligible: boolean;
    status: MissionVerifyResponse["rewardStatus"];
    message?: string;
  } | null>(null);

  const trimmedWallet = walletAddress.trim();
  const trimmedTxHash = txHash.trim();
  const walletValid = walletPattern.test(trimmedWallet);
  const txHashValid = txHashPattern.test(trimmedTxHash);
  const canSubmit = walletValid && txHashValid;

  const validationMessage = useMemo(() => {
    if (status === "idle") {
      return "Submit a wallet address and transaction hash to verify the proof against Arc Testnet RPC.";
    }

    if (status === "checking") {
      return "Checking Arc Testnet RPC for this transaction hash.";
    }

    if (status === "verified") {
      return missionVerifiedMessage.message;
    }

    if (verification?.status === "already_verified") {
      return "This mission is already verified for this identity. RPC check skipped.";
    }

    if (verification?.status === "reused_tx_hash") {
      return "This transaction hash was already used.";
    }

    if (verification?.status === "tx_not_found") {
      return "Transaction was not found on Arc Testnet.";
    }

    if (verification?.status === "rpc_failed" || verification?.status === "submission_error") {
      return "Verification failed. Please try again later.";
    }

    if (!walletValid && !txHashValid) {
      return "Enter a valid EVM wallet address and a 66-character transaction hash starting with 0x.";
    }

    if (!walletValid) {
      return "Wallet address must start with 0x and contain 40 hexadecimal characters.";
    }

    return "Transaction hash must start with 0x and contain 64 hexadecimal characters.";
  }, [status, txHashValid, verification?.status, walletValid]);

  useEffect(() => {
    function syncIdentity() {
      const saved = readSelectedIdentity();
      setIdentity(saved);

      if (saved?.walletAddress) {
        setWalletAddress(saved.walletAddress);
      }
    }

    syncIdentity();
    window.addEventListener("storage", syncIdentity);
    window.addEventListener("arc-academy-identity-updated", syncIdentity);

    return () => {
      window.removeEventListener("storage", syncIdentity);
      window.removeEventListener("arc-academy-identity-updated", syncIdentity);
    };
  }, []);

  async function submitMission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerification(null);
    setRewardState(null);
    const selectedIdentityType = inferIdentityType(identity);

    if (!canSubmit) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");
    const submitResponse = await fetch("/api/missions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityType:
          selectedIdentityType === "guest" ? undefined : selectedIdentityType,
        email: identity?.email,
        walletAddress: trimmedWallet,
        missionId: mission.id,
        txHash: trimmedTxHash,
      }),
    });

    if (!submitResponse.ok && submitResponse.status !== 409) {
      const submitError = (await submitResponse.json()) as { error?: string };
      setVerification({
        valid: false,
        txHash: trimmedTxHash,
        error: submitError.error ?? missionErrorMessages.internal,
        status: "submission_error",
      });
      setStatus("invalid");
      return;
    }

    const verifyResponse = await fetch("/api/missions/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityType:
          selectedIdentityType === "guest" ? undefined : selectedIdentityType,
        email: identity?.email,
        walletAddress: trimmedWallet,
        missionId: mission.id,
        txHash: trimmedTxHash,
      }),
    });
    const verifyData = (await verifyResponse.json()) as MissionVerifyResponse;
    const result: VerificationResult =
      verifyResponse.ok && verifyData.verified && verifyData.verification
      ? {
            valid: true,
            status: "rpc_verified",
            ...verifyData.verification,
          }
        : {
            valid: false,
            txHash: trimmedTxHash,
            error: verifyData.error ?? missionErrorMessages.internal,
            status: classifyMissionError(verifyData.error),
          };

    setVerification(result);
    setStatus(result.valid ? "verified" : "invalid");
    appendArchieLogEntry(
      "mission_verified",
      result.valid ? "Mission verified" : "Mission verification failed",
      result.valid
        ? `Mission ${mission.title} verified for ${maskIdentity(identity)}`
        : safeMissionMessage(verifyData.error),
    );
    setRewardState(
      result.valid || verifyData.rewardStatus || verifyData.rewardMessage
        ? {
            eligible: verifyData.rewardEligible,
            status: verifyData.rewardStatus,
            message: verifyData.rewardMessage,
          }
        : null,
    );

    if (result.valid) {
      if (verifyData.rewardEligible || verifyData.rewardStatus) {
        appendArchieLogEntry(
          "reward_eligibility_prepared",
          "Reward eligibility prepared",
          verifyData.rewardMessage ?? "No automatic reward was sent.",
        );
      }
      updateLocalProgress((current) => ({
        ...current,
        identity: identity ?? current.identity,
        email: identity?.email ?? current.email,
        walletAddress: trimmedWallet,
        missionVerification: {
          missionId: mission.id,
          txHash: result.txHash,
          walletAddress: trimmedWallet,
          verifiedAt: new Date().toISOString(),
          blockNumber: result.blockNumber,
          from: result.from,
          to: result.to,
        },
        badges: verifyData.badgeAwarded
          ? upsertBadge(current.badges, verifyData.badgeAwarded)
          : current.badges,
      }));
    }
  }

  const explorerLink = verification?.valid
    ? `${ARC_TESTNET.explorerUrl}/tx/${verification.txHash}`
    : null;

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/85 p-5 shadow-2xl shadow-black/30 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
              {mission.level}
            </span>
            <span className="rounded-md border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              {mission.xpReward} XP
            </span>
            {mission.badgeReward ? (
              <span className="rounded-md border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                {mission.badgeReward}
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-2xl font-semibold leading-8 text-white sm:text-3xl">
            {mission.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {mission.description}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
          Read-only RPC check
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-[1fr_0.85fr]">
        <form onSubmit={submitMission} className="space-y-4">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              Selected identity
            </p>
            <p className="mt-1 break-all text-sm text-slate-300">
              {identityLabel(identity)}
            </p>
          </div>

          <label className="block text-sm font-medium text-slate-300">
            Wallet address for transaction proof
            <input
              value={walletAddress}
              onChange={(event) => {
                setWalletAddress(event.target.value);
                setStatus("idle");
                setVerification(null);
                setRewardState(null);
              }}
              placeholder="0x1234..."
              spellCheck={false}
              className="mt-2 min-h-12 w-full rounded-md border border-white/10 bg-black/35 px-4 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/60"
            />
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Arc Testnet transaction hash
            <input
              value={txHash}
              onChange={(event) => {
                setTxHash(event.target.value);
                setStatus("idle");
                setVerification(null);
                setRewardState(null);
              }}
              placeholder="0xabcd..."
              spellCheck={false}
              className="mt-2 min-h-12 w-full rounded-md border border-white/10 bg-black/35 px-4 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/60"
            />
          </label>

          <button
            type="submit"
            disabled={status === "checking"}
            className="min-h-12 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
          >
            {status === "checking" ? "Verifying..." : "Verify Proof"}
          </button>
        </form>

        <aside
          className={`rounded-lg border p-4 ${
            status === "verified"
              ? "border-emerald-300/30 bg-emerald-300/10"
            : status === "invalid"
                ? "border-amber-300/30 bg-amber-300/10"
                : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <p className="text-sm font-semibold text-cyan-100">
            Verification status
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {validationMessage}
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-slate-500">Wallet format</p>
              <p className={walletValid ? "text-emerald-100" : "text-slate-300"}>
                {walletValid ? "Valid" : "Waiting for valid address"}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-slate-500">Transaction hash format</p>
              <p className={txHashValid ? "text-emerald-100" : "text-slate-300"}>
                {txHashValid ? "Valid" : "Waiting for valid tx hash"}
              </p>
            </div>
              {verification ? (
                <div className="rounded-md border border-white/10 bg-black/20 p-3">
                  {(() => {
                    const copy = statusCopy(verification);

                    return (
                      <>
                        <p className="text-slate-500">{copy.eyebrow}</p>
                        <p className={copy.className}>{copy.label}</p>
                        {verification.status === "already_verified" ? (
                          <p className="mt-1 text-xs text-slate-400">
                            RPC check skipped
                          </p>
                        ) : null}
                        {verification.status === "submission_error" ||
                        verification.status === "rpc_failed" ||
                        verification.status === "tx_not_found" ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {safeMissionMessage(verification.error)}
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ) : null}
          </div>

          {verification?.valid ? (
            <div className="mt-4 space-y-3 rounded-md border border-emerald-300/20 bg-black/20 p-3 text-sm">
              <div>
                <p className="text-slate-500">Transaction hash</p>
                <p className="break-all font-mono text-slate-200">
                  {verification.txHash}
                </p>
              </div>
              <div>
                <p className="text-slate-500">From</p>
                <p className="break-all font-mono text-slate-200">
                  {verification.from}
                </p>
              </div>
              <div>
                <p className="text-slate-500">To</p>
                <p className="break-all font-mono text-slate-200">
                  {verification.to ?? "Contract creation or unavailable"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Block number</p>
                <p className="font-mono text-slate-200">
                  {verification.blockNumber ?? "Pending"}
                </p>
              </div>
              {explorerLink ? (
                <a
                  href={explorerLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-md border border-cyan-200/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10"
                >
                  Open in Arc Explorer
                </a>
              ) : null}
            </div>
          ) : null}

          {rewardState ? (
            <div
              className={`mt-4 rounded-md border p-3 text-sm ${
                rewardState.eligible
                  ? "border-emerald-300/30 bg-emerald-300/10"
                  : "border-amber-300/30 bg-amber-300/10"
              }`}
            >
              <p
                className={
                  rewardState.eligible ? "text-emerald-100" : "text-amber-100"
                }
              >
                Reward status: {rewardState.status ?? "not_eligible"}
              </p>
              <p className="mt-2 leading-6 text-slate-300">
                {rewardState.message ??
                  "No automatic reward is sent in this MVP."}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
