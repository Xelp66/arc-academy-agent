type BadgeProps = {
  label: string;
  tone?: "cyan" | "amber" | "emerald" | "slate";
};

const toneClasses = {
  cyan: "border-cyan-200/25 bg-cyan-300/10 text-cyan-50",
  amber: "border-amber-200/25 bg-amber-300/10 text-amber-50",
  emerald: "border-emerald-200/25 bg-emerald-300/10 text-emerald-50",
  slate: "border-white/10 bg-white/[0.04] text-slate-200",
};

export function Badge({ label, tone = "cyan" }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.12em] ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
