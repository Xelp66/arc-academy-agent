"use client";

import { useEffect, useState } from "react";
import { ArchieMessage } from "@/components/ArchieMessage";
import { getMissionPageGuidanceMessage } from "@/lib/archie";
import {
  identityLabel,
  inferIdentityType,
  readSelectedIdentity,
  type SelectedIdentity,
} from "@/lib/identity";
import { readLocalProgress, type LocalProgress, emptyLocalProgress } from "@/lib/localProgress";

export function MissionGuidance() {
  const [identity, setIdentity] = useState<SelectedIdentity | null>(null);
  const [progress, setProgress] = useState<LocalProgress>(emptyLocalProgress);

  useEffect(() => {
    function sync() {
      setIdentity(readSelectedIdentity());
      setProgress(readLocalProgress());
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("arc-academy-identity-updated", sync);
    window.addEventListener("arc-academy-progress-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("arc-academy-identity-updated", sync);
      window.removeEventListener("arc-academy-progress-updated", sync);
    };
  }, []);

  const guidance = getMissionPageGuidanceMessage(
    inferIdentityType(identity),
    Boolean(progress.missionVerification),
  );

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <ArchieMessage message={guidance.message} tone={guidance.tone} />
      <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
          Mission context
        </p>
        <p className="mt-2 break-all">
          {identity ? identityLabel(identity) : "No identity selected"}
        </p>
        <p className="mt-2 text-slate-400">
          {progress.missionVerification
            ? "Mission proof already exists in this browser."
            : "Mission proof has not been saved in this browser yet."}
        </p>
      </div>
    </section>
  );
}
