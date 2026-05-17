"use client";

import { useEffect, useState } from "react";
import {
  ARCHIE_LOG_UPDATED_EVENT,
  getArchieLogEntries,
  type ArchieLogEntry,
} from "@/lib/archieLog";

const profileFacts = [
  { label: "Agent name", value: "Archie" },
  { label: "Role", value: "Arc Academy Teacher Agent" },
  {
    label: "Capabilities",
    value:
      "Question selection, topic explanation, level guidance, reward preparation",
  },
  {
    label: "Safety mode",
    value: "Read-only, no private keys, no transaction sending",
  },
];

const actionLabels: Record<ArchieLogEntry["type"], string> = {
  level_started: "Level started",
  questions_selected: "Questions selected",
  checked_answer: "Checked answer",
  answer_checked: "Checked answer",
  level_passed: "Level passed",
  level_failed: "Level failed",
  badge_awarded: "Badge awarded",
  next_level_unlocked: "Next level unlocked",
  mission_recommended: "Next step recommended",
  mission_verified: "Mission verified",
  reward_eligibility_prepared: "Reward eligibility prepared",
};

export function ArchieAgentProfile() {
  const [entries, setEntries] = useState<ArchieLogEntry[]>([]);

  useEffect(() => {
    function syncEntries() {
      setEntries(getArchieLogEntries());
    }

    syncEntries();
    window.addEventListener("storage", syncEntries);
    window.addEventListener(ARCHIE_LOG_UPDATED_EVENT, syncEntries);

    return () => {
      window.removeEventListener("storage", syncEntries);
      window.removeEventListener(ARCHIE_LOG_UPDATED_EVENT, syncEntries);
    };
  }, []);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Archie Agent
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Safe Arc Academy profile
          </h2>
        </div>
        <span className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100">
          Read only
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {profileFacts.map((fact) => (
          <div key={fact.label} className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
              {fact.label}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-200">{fact.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Action log
          </h3>
          <span className="text-xs text-slate-500">Recent safe actions</span>
        </div>

        <div className="mt-3 max-h-80 space-y-2 overflow-auto pr-1">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-md border border-white/10 bg-black/20 p-3"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
                  {actionLabels[entry.type]}
                </p>
                <p className="mt-1 text-sm text-slate-200">{entry.label}</p>
                {entry.detail ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {entry.detail}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
              Archie will log selected questions, checked answers, level
              guidance, and reward preparation here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
