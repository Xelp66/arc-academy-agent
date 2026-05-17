"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getWelcomeMessage } from "@/lib/archie";
import { getNextLevel, LEVELS, type LevelId } from "@/lib/levels";
import { emptyLocalProgress, getLocalLevelConfig, readLocalProgress, type LocalProgress } from "@/lib/localProgress";

const archieWelcome = getWelcomeMessage();

const statusTone: Record<"locked" | "unlocked" | "completed", string> = {
  locked: "border-amber-300/20 bg-amber-300/10 text-amber-50",
  unlocked: "border-cyan-300/20 bg-cyan-300/10 text-cyan-50",
  completed: "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",
};

function getLevelStatus(progress: LocalProgress, levelId: LevelId, levelOrder: number) {
  const completed = new Set(progress.completedLevelIds ?? []);
  const currentLevel = getLocalLevelConfig(progress);

  if (completed.has(levelId)) {
    return "completed" as const;
  }

  return levelOrder <= currentLevel.order ? ("unlocked" as const) : ("locked" as const);
}

function JourneyPreview({ progress, onOpenLevels }: { progress: LocalProgress; onOpenLevels: () => void }) {
  const currentLevel = getLocalLevelConfig(progress);
  const nextLevel = getNextLevel(currentLevel.id);
  const completed = new Set(progress.completedLevelIds ?? []);

  return (
    <aside className="rounded-xl border border-white/10 bg-slate-950/85 p-5 shadow-2xl shadow-black/30 backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
        Your Arc Journey
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">
        {currentLevel.name}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        10 levels. 20 questions per session. Archie keeps the path read-only,
        fast, and focused on quiz progression.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Current unlocked level
          </p>
          <p className="mt-2 text-lg font-semibold text-cyan-100">
            {currentLevel.name}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Questions per session
          </p>
          <p className="mt-2 text-lg font-semibold text-white">20</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Completed levels
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {completed.size}/10
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            Next badge preview
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {nextLevel?.badgeReward ?? currentLevel.badgeReward}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-500">
          <span>Path</span>
          <span>{currentLevel.order}/10</span>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {LEVELS.map((level) => {
            const status = getLevelStatus(progress, level.id, level.order);
            return (
              <div
                key={level.id}
                className={`flex aspect-square items-center justify-center rounded-md border text-[11px] font-semibold uppercase tracking-[0.12em] ${statusTone[status]}`}
                title={`${level.name} - ${status}`}
              >
                {level.order}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onOpenLevels}
          className="inline-flex min-h-11 items-center rounded-md border border-cyan-200/30 px-5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/10"
        >
          View all levels
        </button>
        <Link
          href="/play"
          className="inline-flex min-h-11 items-center rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Start Level Quiz
        </Link>
      </div>
    </aside>
  );
}

function LevelsModal({
  progress,
  onClose,
}: {
  progress: LocalProgress;
  onClose: () => void;
}) {
  const completed = new Set(progress.completedLevelIds ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close levels modal"
        className="absolute inset-0 bg-slate-950/80"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl rounded-xl border border-white/10 bg-[#07101b] p-5 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Arc levels
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Level progression
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Ten compact level cards, each with its question count, passing
              score, XP reward, and badge.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center rounded-md border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {LEVELS.map((level) => {
            const status = getLevelStatus(progress, level.id, level.order);
            const unlocked = status !== "locked";

            return (
              <article
                key={level.id}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Level {level.order}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {level.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusTone[status]}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Questions
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {level.questionCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Pass
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {level.passingScore}/{level.questionCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      XP
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {level.xpReward}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Badge
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {level.badgeReward}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {completed.has(level.id)
                    ? "Completed."
                    : unlocked
                      ? "Unlocked and ready."
                      : "Locked until the previous level is completed."}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  const [progress, setProgress] = useState<LocalProgress>(emptyLocalProgress);
  const [loaded, setLoaded] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

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

  const journeyProgress = useMemo(() => (loaded ? progress : emptyLocalProgress), [loaded, progress]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <section className="relative isolate min-h-screen px-6 py-10 sm:px-10 lg:px-16">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(71,180,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71,180,255,0.08)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(47,128,237,0.36),transparent_60%)]" />

        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:pt-6">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">
              Arc Academy Agent
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-7xl">
              Who Wants to Be an Arc Master?
            </h1>
            <p className="mt-4 text-2xl font-semibold text-cyan-100">
              10 quiz levels, one progression path.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Learn Arc. Answer questions. Climb ten levels. Archie keeps the
              guidance read-only and the journey focused on quiz progression.
            </p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
              Learn Arc. Answer questions. Clear levels and track your progress.
            </p>
            <p className="mt-5 max-w-2xl rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
              Archie: {archieWelcome.message}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/play"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-cyan-300 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Start Level Quiz
              </Link>
              <button
                type="button"
                onClick={() => setShowLevels(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/15 px-6 py-3 text-base font-semibold text-slate-100 transition hover:border-cyan-200/60 hover:bg-white/5"
              >
                View Levels
              </button>
              <Link
                href="/leaderboard"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/15 px-6 py-3 text-base font-semibold text-slate-100 transition hover:border-cyan-200/60 hover:bg-white/5"
              >
                Leaderboard
              </Link>
              <Link
                href="/agent"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/15 px-6 py-3 text-base font-semibold text-slate-100 transition hover:border-cyan-200/60 hover:bg-white/5"
              >
                Archie
              </Link>
            </div>
          </div>

          <JourneyPreview
            progress={journeyProgress}
            onOpenLevels={() => setShowLevels(true)}
          />
        </div>
      </section>

      {showLevels ? (
        <LevelsModal progress={journeyProgress} onClose={() => setShowLevels(false)} />
      ) : null}
    </main>
  );
}

