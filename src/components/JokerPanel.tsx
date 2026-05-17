import type { JokerId } from "@/lib/jokers";

type JokerPanelProps = {
  usedJokers: JokerId[];
  disabled?: boolean;
  onUseJoker: (joker: JokerId) => void;
};

const jokers: { id: JokerId; label: string }[] = [
  { id: "fiftyFifty", label: "50:50" },
  { id: "askTheDocs", label: "Ask the Docs" },
  { id: "askTheArchitect", label: "Ask the Architect" },
  { id: "explainLikeNew", label: "Explain Like I'm New" },
];

export function JokerPanel({
  usedJokers,
  disabled = false,
  onUseJoker,
}: JokerPanelProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
          Jokers
        </h2>
        <span className="text-xs text-slate-500">One use each</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {jokers.map((joker) => {
          const used = usedJokers.includes(joker.id);

          return (
            <button
              key={joker.id}
              type="button"
              disabled={used || disabled}
              onClick={() => onUseJoker(joker.id)}
              className="min-h-11 rounded-md border border-cyan-200/20 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/60 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-600"
            >
              {joker.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
