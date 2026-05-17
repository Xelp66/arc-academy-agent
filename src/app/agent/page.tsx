import Link from "next/link";
import { ArchieAgentProfile } from "@/components/ArchieAgentProfile";

const links = [
  { href: "/play", label: "Play" },
  { href: "/levels", label: "Levels" },
  { href: "/profile", label: "Profile" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const capabilities = [
  "Question selection",
  "Topic explanation",
  "Mission guidance",
  "Reward eligibility preparation",
];

const safetyMode = [
  "Read-only",
  "No private keys",
  "No transaction sending",
  "No automatic rewards",
];

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-0 bg-[linear-gradient(rgba(71,180,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(71,180,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-cyan-100">
            Arc Academy Agent
          </Link>
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Archie Agent
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Safe teacher agent for Arc Academy
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            Archie helps with quiz selection, short topic guidance, mission
            direction, and reward eligibility preparation. It stays read-only
            in this MVP.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-lg border border-white/10 bg-slate-950/85 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Profile
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Agent name
                </p>
                <p className="mt-1 text-sm text-slate-200">Archie</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Role
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  Arc Academy Teacher Agent
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Capabilities
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {capabilities.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-50"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Safety mode
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {safetyMode.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-50"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <ArchieAgentProfile />
        </div>
      </div>
    </main>
  );
}
