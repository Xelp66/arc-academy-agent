"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IdentityCard } from "@/components/IdentityCard";
import {
  LeaderboardTable,
  type LeaderboardUser,
} from "@/components/LeaderboardTable";
import { identityLabel } from "@/lib/identity";
import {
  emptyLocalProgress,
  getLocalLevelConfig,
  getLocalXp,
  readLocalProgress,
  type LocalProgress,
} from "@/lib/localProgress";

const mockUsers: Omit<LeaderboardUser, "rank">[] = [
  {
    name: "Blueprint Runner",
    walletAddress: "0x8f12...a941",
    xp: 380,
    level: "Builder",
    badges: ["Arc Explorer", "Quiz Streak"],
  },
  {
    name: "Stablecoin Scout",
    walletAddress: "0x3c44...19ef",
    xp: 270,
    level: "Builder",
    badges: ["Arc Explorer"],
  },
  {
    name: "Testnet Cartographer",
    walletAddress: "0x72ab...6002",
    xp: 180,
    level: "Explorer",
    badges: ["Arc Explorer"],
  },
  {
    name: "Visitor Prime",
    xp: 80,
    level: "Visitor",
    badges: [],
  },
];

export default function LeaderboardPage() {
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

  const users = useMemo(() => {
    const localXp = getLocalXp(progress);
    const localLevel = getLocalLevelConfig(progress);
    const localUser: Omit<LeaderboardUser, "rank"> | null =
      progress.latestQuizScore || progress.missionVerification
        ? {
            name: progress.identity || progress.walletAddress || progress.email
              ? "Local Arc learner"
              : "Guest Arc learner",
            identity: progress.identity
              ? identityLabel(progress.identity)
              : progress.walletAddress ?? progress.email,
            walletAddress: progress.walletAddress,
            xp: localXp,
            level: localLevel.name,
            badges: progress.badges,
            isCurrentUser: true,
          }
        : null;

    return [...mockUsers, ...(localUser ? [localUser] : [])]
      .sort((left, right) => right.xp - left.xp)
      .map((user, index) => ({ ...user, rank: index + 1 }));
  }, [progress]);

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
          </div>
        </nav>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Leaderboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Arc Academy standings
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            Mock MVP rankings are mixed with your latest browser-saved quiz and
            level progress. Legacy mission proof remains separate. Real
            persistence and duplicate protection arrive in later phases.
          </p>
        </section>

        {!loaded ? (
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-sm leading-6 text-slate-300">
            Loading local leaderboard progress...
          </section>
        ) : null}

        <IdentityCard />

        <LeaderboardTable users={users} />
      </div>
    </main>
  );
}
