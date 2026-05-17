import type { PublicQuizQuestion } from "@/types/quiz";

type QuestionCardProps = {
  question: PublicQuizQuestion;
  selectedAnswer?: string;
  locked: boolean;
  onAnswer: (answer: string) => void;
};

export function QuestionCard({
  question,
  selectedAnswer,
  locked,
  onAnswer,
}: QuestionCardProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-black/25">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
          {question.level}
        </span>
        <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
          {question.category}
        </span>
      </div>
      <h1 className="text-2xl font-semibold leading-9 text-white">
        {question.question}
      </h1>
      <div className="mt-6 grid gap-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;

          return (
            <button
              key={option}
              type="button"
              disabled={locked}
              onClick={() => onAnswer(option)}
              className={`flex min-h-14 items-center gap-3 rounded-md border px-4 py-3 text-left text-base font-medium transition ${
                isSelected
                  ? "border-cyan-200 bg-cyan-300/15 text-cyan-50"
                  : "border-white/10 bg-white/[0.03] text-slate-100 hover:border-cyan-200/50 hover:bg-cyan-300/10"
              } disabled:cursor-default`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 font-mono text-sm text-cyan-100">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
