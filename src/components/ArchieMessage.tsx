type ArchieMessageProps = {
  message: string;
  tone?: "neutral" | "success" | "warning";
};

export function ArchieMessage({ message, tone = "neutral" }: ArchieMessageProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
      : tone === "warning"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-50"
        : "border-cyan-300/25 bg-cyan-300/10 text-cyan-50";

  return (
    <section className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/25 font-mono text-sm font-bold">
          A
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            Archie
          </p>
          <p className="mt-1 text-sm leading-6">{message}</p>
        </div>
      </div>
    </section>
  );
}
