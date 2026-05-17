import Link from "next/link";
import { getRewardQueue } from "@/lib/persistence";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  eligible: "border-emerald-300/25 bg-emerald-300/10 text-emerald-50",
  queued: "border-cyan-300/25 bg-cyan-300/10 text-cyan-50",
  sent: "border-slate-300/25 bg-slate-300/10 text-slate-50",
  rejected: "border-rose-300/25 bg-rose-300/10 text-rose-50",
  not_eligible: "border-amber-300/25 bg-amber-300/10 text-amber-50",
};

export default async function AdminRewardsPage() {
  const rewards = await getRewardQueue();

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
              href="/levels"
              className="rounded-md border border-cyan-200/30 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/10"
            >
              Levels
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Leaderboard
            </Link>
          </div>
        </nav>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Admin Reward Queue
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Eligible testnet USDC rewards
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            This queue is read-only in the MVP. Automatic reward distribution is
            intentionally disabled until later abuse controls, manual review,
            and secure backend-only wallet handling are added.
          </p>
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/85 shadow-2xl shadow-black/30">
          <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 max-lg:hidden">
            <span>Identity</span>
            <span>Mission</span>
            <span>Tx Hash</span>
            <span>Status</span>
          </div>

          {rewards.length > 0 ? (
            <div className="divide-y divide-white/10">
              {rewards.map((reward) => (
                <article
                  key={reward.id}
                  className="grid gap-3 bg-white/[0.02] px-4 py-4 lg:grid-cols-[1fr_0.8fr_0.8fr_0.7fr] lg:items-center"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 lg:hidden">
                      Identity
                    </p>
                    <p className="break-all font-mono text-sm text-slate-200">
                      {reward.user.walletAddress ?? reward.user.email ?? "No identity"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      XP {reward.user.xp} / {reward.user.level}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 lg:hidden">
                      Level / legacy proof
                    </p>
                    <p className="break-all text-sm text-slate-200">
                      {reward.missionId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {reward.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 lg:hidden">
                      Tx Hash
                    </p>
                    <p className="break-all font-mono text-xs text-slate-400">
                      {reward.txHash ?? "No tx hash recorded"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 lg:hidden">
                      Status
                    </p>
                    <span
                      className={`inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.12em] ${
                        statusTone[reward.status] ?? statusTone.not_eligible
                      }`}
                    >
                      {reward.status}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">
                      {reward.createdAt.toLocaleString()}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm font-semibold text-cyan-100">
                No eligible rewards yet
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Users appear here only after they pass the current quiz level,
                verify the legacy proof flow when needed, and pass anti-abuse
                checks. This page never sends funds.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
