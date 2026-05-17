import { Badge } from "@/components/Badge";

export type LeaderboardUser = {
  rank: number;
  name: string;
  identity?: string;
  walletAddress?: string;
  xp: number;
  level: string;
  badges: string[];
  isCurrentUser?: boolean;
};

type LeaderboardTableProps = {
  users: LeaderboardUser[];
};

export function LeaderboardTable({ users }: LeaderboardTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/85 shadow-2xl shadow-black/30">
      <div className="grid grid-cols-[64px_1.4fr_0.7fr_0.8fr] gap-3 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 max-md:hidden">
        <span>Rank</span>
        <span>Architect</span>
        <span>XP</span>
        <span>Level</span>
      </div>
      <div className="divide-y divide-white/10">
        {users.map((user) => (
          <article
            key={`${user.rank}-${user.name}`}
            className={`grid gap-3 px-4 py-4 md:grid-cols-[64px_1.4fr_0.7fr_0.8fr] md:items-center ${
              user.isCurrentUser ? "bg-cyan-300/10" : "bg-white/[0.02]"
            }`}
          >
            <div className="text-2xl font-semibold text-cyan-100">
              #{user.rank}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  {user.name}
                </h2>
                {user.isCurrentUser ? (
                  <Badge label="You" tone="emerald" />
                ) : null}
              </div>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {user.identity ?? user.walletAddress ?? "Guest learning profile"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.badges.length > 0 ? (
                  user.badges.map((badge) => (
                    <Badge key={badge} label={badge} tone="amber" />
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    No badges yet
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 md:hidden">
                XP
              </p>
              <p className="text-xl font-semibold text-white">{user.xp}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 md:hidden">
                Level
              </p>
              <p className="text-sm font-semibold text-cyan-100">
                {user.level}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
