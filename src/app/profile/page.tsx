"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArchieMessage } from "@/components/ArchieMessage";
import { Badge } from "@/components/Badge";
import { IdentityCard } from "@/components/IdentityCard";
import { getProfileSummaryMessage } from "@/lib/archie";
import { identityLabel } from "@/lib/identity";
import {
  emptyLocalProgress,
  getLocalLevelConfig,
  getLocalXp,
  readLocalProgress,
  type LocalProgress,
} from "@/lib/localProgress";
import { getLevelConfig, getNextLevel } from "@/lib/levels";

export default function ProfilePage() {
  const [progress, setProgress] =
    useState<LocalProgress>(emptyLocalProgress);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function syncProgress() {
      setProgress(readLocalProgress());
      setLoaded(true);
    }

    syncProgress();
    window.addEventListener("storage", syncProgress);
    window.addEventListener("arc-academy-progress-updated", syncProgress);

    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener("arc-academy-progress-updated", syncProgress);
    };
  }, []);

  const xp = useMemo(() => getLocalXp(progress), [progress]);
  const level = useMemo(() => getLocalLevelConfig(progress), [progress]);
  const score = progress.latestQuizScore;
  const profileSummary = getProfileSummaryMessage(
    level.id,
    (progress.completedLevelIds ?? []).length,
    progress.badges.length,
    xp,
  );

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-0 bg-[linear-gradient(rgba(71,180,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(71,180,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-cyan-100">
            Arc Academy Agent
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/play"
              className="rounded-md border border-cyan-200/30 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/10"
            >
              Play Quiz
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Leaderboard
            </Link>
          </div>
        </nav>

        <ArchieMessage
          message={profileSummary.message}
          tone={profileSummary.tone}
        />

        {!loaded ? (
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-sm leading-6 text-slate-300">
            Loading local profile...
          </section>
        ) : null}

        <IdentityCard />

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/85 p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Local Profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              {progress.identity || progress.walletAddress || progress.email
                ? "Local Arc learner"
                : "Guest Arc learner"}
            </h1>
            <p className="mt-3 break-all font-mono text-sm text-slate-400">
              {progress.identity
                ? identityLabel(progress.identity)
                : progress.walletAddress ?? progress.email ?? "No identity saved yet"}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-500">XP</p>
                <p className="mt-2 text-3xl font-semibold text-white">{xp}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-500">Current level</p>
                <p className="mt-2 text-3xl font-semibold text-cyan-100">
                  {level.name}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              {level.order}/10 unlocked levels. Next up:{" "}
              {getNextLevel(progress.currentLevelId)?.name ?? "Arc Master"}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Badges
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {progress.badges.length > 0 ? (
                progress.badges.map((badge) => (
                  <Badge key={badge} label={badge} tone="amber" />
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  Complete quiz levels to earn local MVP badges.
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Completed levels
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(progress.completedLevelIds ?? []).length > 0 ? (
                  (progress.completedLevelIds ?? []).map((levelId) => {
                    const level = getLevelConfig(levelId);

                    return (
                      <span
                        key={levelId}
                        className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50"
                      >
                        {level.order}. {level.name}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-sm leading-6 text-slate-400">
                    No completed levels saved in this browser yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-cyan-100">
                  Latest quiz
                </p>
                {score ? (
                  <>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {score.correct}/{score.total}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {score.percentage}% correct,{" "}
                      {progress.latestQuizPassed ? "passed" : "not passed"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    No quiz result saved in this browser.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-cyan-100">
                  Legacy proof
                </p>
                {progress.missionVerification ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-emerald-100">
                      Legacy proof saved
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-400">
                      {progress.missionVerification.txHash}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    No legacy proof saved in this browser.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-cyan-200/20 bg-cyan-300/10 p-4">
          <p className="text-sm leading-6 text-cyan-50/80">
            MVP note: wallet and email ownership are not verified yet. No
            private keys are requested, no transactions are sent, and rewards
            remain eligibility-only.
          </p>
        </section>
      </div>
    </main>
  );
}
