"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArchieMessage } from "@/components/ArchieMessage";
import { IdentityCard } from "@/components/IdentityCard";
import { getLevelPathMessage } from "@/lib/archie";
import { identityLabel } from "@/lib/identity";
import {
  emptyLocalProgress,
  getLocalLevelConfig,
  getLocalXp,
  readLocalProgress,
  type LocalProgress,
} from "@/lib/localProgress";
import { LEVELS, type LevelId } from "@/lib/levels";

const statusTone: Record<"locked" | "unlocked" | "completed", string> = {
  locked: "border-amber-300/20 bg-amber-300/10 text-amber-50",
  unlocked: "border-cyan-300/20 bg-cyan-300/10 text-cyan-50",
  completed: "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",
};

function getLevelStatus(
  progress: LocalProgress,
  levelId: LevelId,
  levelOrder: number,
) {
  const completed = new Set(progress.completedLevelIds ?? []);
  const currentLevel = getLocalLevelConfig(progress);

  if (completed.has(levelId)) {
    return "completed" as const;
  }

  return levelId === currentLevel.id || levelOrder <= currentLevel.order
    ? ("unlocked" as const)
    : ("locked" as const);
}

export function LevelsBoard() {
  const [progress, setProgress] = useState<LocalProgress>(emptyLocalProgress);
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

  const localLevel = useMemo(() => getLocalLevelConfig(progress), [progress]);
  const xp = useMemo(() => getLocalXp(progress), [progress]);
  const completed = useMemo(
    () => new Set(progress.completedLevelIds ?? []),
    [progress.completedLevelIds],
  );
  const archiePath = getLevelPathMessage(
    localLevel.id,
    completed.size,
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
              href="/profile"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Profile
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Leaderboard
            </Link>
            <Link
              href="/agent"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Archie
            </Link>
          </div>
        </nav>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Arc levels
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Ten level progression cards
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            Arc Academy now centers on quiz levels. The legacy proof page is
            kept only for compatibility and is no longer part of the main user
            journey.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            {loaded
              ? progress.identity
                ? `Current identity: ${identityLabel(progress.identity)}`
                : progress.walletAddress || progress.email
                  ? `Current identity: ${
                      progress.walletAddress ?? progress.email
                    }`
                  : "No identity selected yet. Pick wallet or email to save progress."
              : "Loading saved level progress..."}
          </p>
        </section>

        <IdentityCard />

        <ArchieMessage message={archiePath.message} tone={archiePath.tone} />

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/85 p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Your progress
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              {localLevel.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {localLevel.order}/10 levels unlocked. XP {xp}. Complete the
              current level to unlock the next one.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-500">Unlocked level</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-100">
                  {localLevel.name}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-500">Completed levels</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {completed.size}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Safety note
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              No private keys are requested, no transactions are sent, and the
              legacy proof flow remains read-only compatibility code.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/play"
                className="inline-flex min-h-11 items-center rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Start Level Quiz
              </Link>
              <Link
                href="/agent"
                className="inline-flex min-h-11 items-center rounded-md border border-cyan-200/30 px-5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/10"
              >
                Meet Archie
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LEVELS.map((level) => {
            const status = getLevelStatus(progress, level.id, level.order);
            const completedLevel = completed.has(level.id);

            return (
              <article
                key={level.id}
                className="flex h-full flex-col rounded-lg border border-white/10 bg-slate-950/85 p-5 shadow-2xl shadow-black/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Level {level.order}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {level.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusTone[status]}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-300">
                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Question count
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {level.questionCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Passing score
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {level.passingScore}/{level.questionCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      XP reward
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {level.xpReward} XP
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Badge reward
                    </p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {level.badgeReward}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {completedLevel
                    ? "Completed."
                    : status === "unlocked"
                      ? "Unlocked and ready to play."
                      : "Locked until the previous level is completed."}
                </p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
