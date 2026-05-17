"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArchieAgentProfile } from "@/components/ArchieAgentProfile";
import { ArchieMessage } from "@/components/ArchieMessage";
import { IdentityCard } from "@/components/IdentityCard";
import { JokerPanel } from "@/components/JokerPanel";
import { QuestionCard } from "@/components/QuestionCard";
import {
  getCorrectAnswerMessage,
  getLevelProgressMessage,
  getTopicExplanation,
  getWelcomeMessage,
  getWrongAnswerGuidanceMessage,
} from "@/lib/archie";
import { appendArchieLogEntry, maskIdentity } from "@/lib/archieLog";
import { askTheArchitect, askTheDocs, explainLikeNew, type JokerId } from "@/lib/jokers";
import {
  identityLabel,
  inferIdentityType,
  type SelectedIdentity,
} from "@/lib/identity";
import {
  advanceLocalProgress,
  emptyLocalProgress,
  getLocalLevelConfig,
  getLocalXp,
  readLocalProgress,
  upsertBadge,
  type LocalProgress,
  updateLocalProgress,
} from "@/lib/localProgress";
import { LEVELS, getLevelConfig, getNextLevel, type LevelId } from "@/lib/levels";
import type { AnswerResult, PublicQuizQuestion, QuizScore } from "@/types/quiz";

type QuizStartResponse = {
  sessionId: string;
  questions: PublicQuizQuestion[];
  generation?: {
    source: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
    selectedQuestionHashes?: string[];
  };
  error?: string;
};

type QuizAnswerResponse = {
  correct: boolean;
  explanation: string;
  score: QuizScore;
  completed: boolean;
  passed: boolean;
  error?: string;
};

type QuizJokerResponse = {
  jokerType: "fiftyFifty";
  remainingOptions?: string[];
  message?: string;
  error?: string;
};

function emptyScore(): QuizScore {
  return {
    correct: 0,
    total: 0,
    percentage: 0,
  };
}

const welcomeMessage = getWelcomeMessage();

export function GameCard() {
  const router = useRouter();
  const [identity, setIdentity] = useState<SelectedIdentity | null>(null);
  const [progress, setProgress] = useState<LocalProgress>(emptyLocalProgress);
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<PublicQuizQuestion[]>([]);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>();
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [score, setScore] = useState<QuizScore>(emptyScore());
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);
  const [feedback, setFeedback] = useState(welcomeMessage.message);
  const [feedbackTone, setFeedbackTone] =
    useState<"neutral" | "success" | "warning">("neutral");
  const [usedJokers, setUsedJokers] = useState<JokerId[]>([]);
  const [jokerNotice, setJokerNotice] = useState("");
  const [visibleOptions, setVisibleOptions] = useState<string[]>();
  const [error, setError] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");

  useEffect(() => {
    function syncProgress() {
      setProgress(readLocalProgress());
    }

    syncProgress();
    window.addEventListener("storage", syncProgress);
    window.addEventListener("arc-academy-progress-updated", syncProgress);

    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener("arc-academy-progress-updated", syncProgress);
    };
  }, []);

  const currentLevel = getLocalLevelConfig(progress);
  const selectedLevel = getLevelConfig(selectedLevelId ?? currentLevel.id);
  const nextLevel = getNextLevel(selectedLevel.id);
  const currentQuestion = questions[questionIndex];
  const playableQuestion =
    currentQuestion && visibleOptions
      ? { ...currentQuestion, options: visibleOptions }
      : currentQuestion;
  const answeredCurrent = results.some(
    (result) => result.questionId === currentQuestion?.id,
  );
  const complete = started && finished;
  const weakCategories = useMemo(() => {
    const missCounts = new Map<PublicQuizQuestion["category"], number>();

    for (const result of results) {
      if (result.correct) {
        continue;
      }

      const question = questions.find((item) => item.id === result.questionId);

      if (!question) {
        continue;
      }

      missCounts.set(question.category, (missCounts.get(question.category) ?? 0) + 1);
    }

    return [...missCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([category]) => category)
      .slice(0, 3);
  }, [questions, results]);

  const handleIdentityChange = useCallback((nextIdentity: SelectedIdentity | null) => {
    setIdentity(nextIdentity);
  }, []);

  async function startGame() {
    setStarting(true);
    setError("");
    const selectedIdentityType = inferIdentityType(identity);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityType:
            selectedIdentityType === "guest" ? undefined : selectedIdentityType,
          walletAddress: identity?.walletAddress,
          email: identity?.email,
          levelId: selectedLevel.id,
          level: selectedLevel.id,
          recentQuestionIds: progress.recentQuestionIds ?? [],
        }),
      });
      const data = (await response.json()) as QuizStartResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not start quiz session.");
      }

      if (!data.sessionId || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("The quiz session returned no questions.");
      }

      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setStarted(true);
      setFinished(false);
      setPassed(false);
      setQuestionIndex(0);
      setSelectedAnswer(undefined);
      setResults([]);
      setScore(emptyScore());
      setVisibleOptions(undefined);
      setJokerNotice("");
      setGenerationNotice("");
      setFeedback(welcomeMessage.message);
      setFeedbackTone(welcomeMessage.tone);
      appendArchieLogEntry(
        "level_started",
        "Level session started",
        `Level: ${selectedLevel.name} | Identity: ${maskIdentity(identity)}`,
      );
      appendArchieLogEntry(
        "questions_selected",
        `Selected ${data.questions.length} quiz questions`,
        identity ? `Identity: ${maskIdentity(identity)}` : "Guest session",
      );
      updateLocalProgress((current) => ({
        ...current,
        recentQuestionIds: [
          ...new Set([
            ...(current.recentQuestionIds ?? []),
            ...data.questions.map((question) => question.id),
          ]),
        ].slice(-200),
        recentQuestionTexts: [
          ...new Set([
            ...(current.recentQuestionTexts ?? []),
            ...data.questions.map((question) => question.question),
          ]),
        ].slice(-200),
      }));
      if (data.generation?.fallbackUsed) {
        setGenerationNotice(
          data.generation.fallbackReason ??
            "Question bank does not have enough questions for this level yet.",
        );
      }
      router.replace(
        `/play?sessionId=${encodeURIComponent(data.sessionId)}&levelId=${encodeURIComponent(selectedLevel.id)}`,
      );
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not start quiz session.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function answerQuestion(answer: string) {
    if (!currentQuestion || answeredCurrent || answering) {
      return;
    }

    setAnswering(true);
    setError("");

    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          selectedAnswer: answer,
        }),
      });
      const data = (await response.json()) as QuizAnswerResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not check answer.");
      }

      const result: AnswerResult = {
        questionId: currentQuestion.id,
        selectedAnswer: answer,
        correct: data.correct,
        explanation: data.explanation,
      };

      setSelectedAnswer(answer);
      setResults((current) => [...current, result]);
      setScore(data.score);
      setPassed(data.passed);
      appendArchieLogEntry(
        "answer_checked",
        result.correct ? "Answer checked: correct" : "Answer checked: incorrect",
        currentQuestion.category,
      );
      const archie = result.correct
        ? getCorrectAnswerMessage()
        : getWrongAnswerGuidanceMessage(currentQuestion.category);
      setFeedback(archie.message);
      setFeedbackTone(archie.tone);
    } catch (answerError) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : "Could not check answer.",
      );
    } finally {
      setAnswering(false);
    }
  }

  function goNext() {
    setSelectedAnswer(undefined);
    setJokerNotice("");
    setVisibleOptions(undefined);

    if (questionIndex < questions.length - 1) {
      const nextQuestion = questions[questionIndex + 1];
      const archie = nextQuestion
        ? getTopicExplanation(nextQuestion.category)
        : getWelcomeMessage();
      setQuestionIndex((current) => current + 1);
      setFeedback(archie.message);
      setFeedbackTone(archie.tone);
      return;
    }

    setFinished(true);
    if (passed) {
      appendArchieLogEntry(
        "level_passed",
        "Level passed",
        `Score: ${score.correct}/${score.total}`,
      );
      appendArchieLogEntry(
        "badge_awarded",
        "Badge awarded",
        selectedLevel.badgeReward,
      );
      if (nextLevel) {
        appendArchieLogEntry(
          "next_level_unlocked",
          "Next level unlocked",
          nextLevel.name,
        );
      }
    } else {
      appendArchieLogEntry(
        "level_failed",
        "Level failed",
        `Score: ${score.correct}/${score.total}`,
      );
    }

    updateLocalProgress((current) =>
      advanceLocalProgress(
        {
          ...current,
          identity: identity ?? current.identity,
          walletAddress: identity?.walletAddress ?? current.walletAddress,
          email: identity?.email ?? current.email,
          badges: passed
            ? upsertBadge(current.badges, selectedLevel.badgeReward)
            : current.badges,
          latestQuizScore: score,
          latestQuizLevelId: selectedLevel.id,
          latestQuizPassed: passed,
          latestQuizCompletedAt: new Date().toISOString(),
        },
        passed,
        selectedLevel.id,
      ),
    );

    const archie = getLevelProgressMessage(selectedLevel.id, passed, weakCategories);
    setFeedback(archie.message);
    setFeedbackTone(archie.tone);
  }

  function restart() {
    window.location.reload();
  }

  async function useJoker(joker: JokerId) {
    if (usedJokers.includes(joker) || answeredCurrent || !currentQuestion) {
      return;
    }

    if (joker === "fiftyFifty") {
      setError("");

      try {
        const response = await fetch("/api/quiz/joker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId: currentQuestion.id,
            jokerType: joker,
          }),
        });
        const data = (await response.json()) as QuizJokerResponse;

        if (!response.ok || !data.remainingOptions) {
          throw new Error(data.error ?? "Could not apply 50:50.");
        }

        setUsedJokers((current) => [...current, joker]);
        setJokerNotice(`50:50: ${data.message ?? "Two incorrect options were removed."}`);
        setVisibleOptions(data.remainingOptions);
      } catch (jokerError) {
        setError(
          jokerError instanceof Error
            ? jokerError.message
            : "Could not apply 50:50.",
        );
      }

      return;
    }

    const result =
      joker === "askTheDocs"
        ? askTheDocs(currentQuestion)
        : joker === "askTheArchitect"
          ? askTheArchitect(currentQuestion)
          : explainLikeNew(currentQuestion);

    setUsedJokers((current) => [...current, joker]);
    setJokerNotice(`${result.title}: ${result.message}`);

    if (result.remainingOptions) {
      setVisibleOptions(result.remainingOptions);
    }
  }

  const currentResult = currentQuestion
    ? results.find((result) => result.questionId === currentQuestion.id)
    : undefined;

  const localXp = getLocalXp(progress);

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-0 bg-[linear-gradient(rgba(71,180,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(71,180,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-cyan-100">
            Arc Academy Agent
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/agent"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Archie
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Profile
            </Link>
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
              {currentLevel.name} level | XP {localXp}
            </div>
          </div>
        </nav>

        {!started ? (
          <section className="grid gap-5 rounded-lg border border-white/10 bg-slate-950/85 p-5 shadow-2xl shadow-black/30 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Arc Academy progression
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Who Wants to Be an Arc Master?
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                Choose a wallet or email identity for persisted progress, or
                continue as a guest. Complete the current level to unlock the
                next one in the Arc Academy path.
              </p>
              <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Select level
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Archie will build a 20-question session for the level you choose.
                    </p>
                  </div>
                  <span className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    {selectedLevel.name}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {LEVELS.map((level) => {
                    const active = selectedLevelId === level.id;
                    const unlocked = level.order <= currentLevel.order;

                    return (
                      <button
                        key={level.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setSelectedLevelId(level.id)}
                        className={`rounded-md border p-4 text-left transition ${
                          active
                            ? "border-cyan-200 bg-cyan-300/10"
                            : unlocked
                              ? "border-white/10 bg-black/20 hover:border-cyan-200/40 hover:bg-white/[0.06]"
                              : "border-white/5 bg-black/10 text-slate-500"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Level {level.order}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {level.name}
                            </p>
                          </div>
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                            {unlocked ? "Unlocked" : "Locked"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {level.questionCount} questions, pass{" "}
                          {level.passingScore}/{level.questionCount}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-7">
                <IdentityCard onIdentityChange={handleIdentityChange} />
              </div>
              <button
                type="button"
                onClick={startGame}
                disabled={starting}
                className="mt-5 min-h-12 rounded-md bg-cyan-300 px-6 text-base font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
              >
                {starting ? "Preparing quiz..." : `Start ${selectedLevel.name}`}
              </button>
              {generationNotice ? (
                <p className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
                  {generationNotice}
                </p>
              ) : null}
              {error ? (
                <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                  {error}
                </p>
              ) : null}
            </div>
            <ArchieMessage
              message={welcomeMessage.message}
              tone={welcomeMessage.tone}
            />
          </section>
        ) : complete ? (
          <section className="rounded-lg border border-white/10 bg-slate-950/85 p-6 shadow-2xl shadow-black/30">
            <ArchieMessage message={feedback} tone={feedbackTone} />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-slate-400">Final score</p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  {score.correct}/{score.total}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {score.percentage}% correct
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  {passed ? `${selectedLevel.name} complete` : `${selectedLevel.name} locked`}
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  {passed
                    ? `Next level: ${nextLevel?.name ?? selectedLevel.name}`
                    : `Score ${selectedLevel.passingScore}/${selectedLevel.questionCount} to pass`}
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-300">
                  {passed
                    ? `You unlocked the next Arc Academy level, earned ${selectedLevel.xpReward} XP, and received ${selectedLevel.badgeReward}. No rewards or transactions are sent in this MVP UI.`
                    : "Review the explanations and replay the quiz to unlock the next level."}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex min-h-11 items-center rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    Play Again
                  </button>
                  <Link
                    href="/agent"
                    className="inline-flex min-h-11 items-center rounded-md border border-cyan-200/30 px-5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/10"
                  >
                    Meet Archie
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : playableQuestion ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-cyan-100">
                    Question {questionIndex + 1}/{questions.length}
                  </span>
                  <span className="text-slate-400">
                    Correct {score.correct}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{
                      width: `${((questionIndex + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <QuestionCard
                question={playableQuestion}
                selectedAnswer={selectedAnswer}
                locked={answeredCurrent || answering}
                onAnswer={answerQuestion}
              />

              {error ? (
                <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                  {error}
                </p>
              ) : null}

              {currentResult ? (
                <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-cyan-100">
                    Explanation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {currentResult.explanation}
                  </p>
                  <button
                    type="button"
                    onClick={goNext}
                    className="mt-4 min-h-11 rounded-md bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    {questionIndex === questions.length - 1
                      ? "Finish Quiz"
                      : "Next Question"}
                  </button>
                </section>
              ) : null}
            </div>

            <aside className="space-y-5">
              <ArchieMessage message={feedback} tone={feedbackTone} />
              <JokerPanel
                usedJokers={usedJokers}
                disabled={answeredCurrent}
                onUseJoker={useJoker}
              />
              {jokerNotice ? (
                <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  {jokerNotice}
                </p>
              ) : null}
              <ArchieAgentProfile />
              <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-slate-200">Identity</p>
                <p className="mt-2 break-all text-sm text-slate-400">
                  {identityLabel(identity)}
                </p>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
