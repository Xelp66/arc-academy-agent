import assert from "node:assert/strict";

import {
  buildOpenRouterModelSequence,
  generateQuestionsWithProvider,
  hashGeneratedQuestionText,
  isArcRelevantQuestion,
  normalizeGeneratedQuestionText,
  questionTextSimilarity,
} from "../src/lib/questionGenerator";

type FetchCall = {
  model: string | undefined;
};

const originalEnv = {
  LLM_PROVIDER: process.env.LLM_PROVIDER,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_PRIMARY_MODEL: process.env.OPENROUTER_PRIMARY_MODEL,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  OPENROUTER_FALLBACK_MODEL_1: process.env.OPENROUTER_FALLBACK_MODEL_1,
  OPENROUTER_FALLBACK_MODEL_2: process.env.OPENROUTER_FALLBACK_MODEL_2,
};

const originalFetch = globalThis.fetch;

function restoreEnv() {
  process.env.LLM_PROVIDER = originalEnv.LLM_PROVIDER;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
  process.env.OPENROUTER_PRIMARY_MODEL = originalEnv.OPENROUTER_PRIMARY_MODEL;
  process.env.OPENROUTER_MODEL = originalEnv.OPENROUTER_MODEL;
  process.env.OPENROUTER_FALLBACK_MODEL_1 = originalEnv.OPENROUTER_FALLBACK_MODEL_1;
  process.env.OPENROUTER_FALLBACK_MODEL_2 = originalEnv.OPENROUTER_FALLBACK_MODEL_2;
}

function installFetchMock(
  resolver: (model: string | undefined) => Response,
  calls: FetchCall[],
) {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    calls.push({ model: body.model });
    return resolver(body.model);
  }) as typeof fetch;
}

function openRouterChatResponse(content: unknown) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: typeof content === "string" ? content : JSON.stringify(content),
          },
        },
      ],
    }),
    { status: 200 },
  );
}

function makeQuestion(modelUsed: string, index: number, overrides?: Partial<{
  difficulty: string;
  sourceTopic: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  uniquenessReason: string;
  category: string;
  options: string[];
}>) {
  const difficulty = overrides?.difficulty ?? "easy";
  const sourceTopic = overrides?.sourceTopic ?? `Arc RPC detail ${index}`;
  const question = overrides?.question ?? `What is the Arc-specific detail ${index} about ${sourceTopic}?`;
  const options = overrides?.options ?? [
    `Correct ${index}`,
    `Wrong ${index}-A`,
    `Wrong ${index}-B`,
    `Wrong ${index}-C`,
  ];
  const correctAnswer = overrides?.correctAnswer ?? `Correct ${index}`;
  const explanation = overrides?.explanation ?? `This question checks Arc knowledge ${index}.`;

  return {
    id: `${modelUsed}-${index}`,
    difficulty,
    sourceTopic,
    question,
    options,
    correctAnswer,
    explanation,
    uniquenessReason: overrides?.uniquenessReason ?? `Unique Arc topic ${index}.`,
    category: overrides?.category ?? "network",
    sourceHint: sourceTopic,
  };
}

async function run() {
  process.env.LLM_PROVIDER = "openrouter";
  process.env.OPENROUTER_API_KEY = "sk-test";

  process.env.OPENROUTER_PRIMARY_MODEL = "deepseek/deepseek-v4-flash:free";
  process.env.OPENROUTER_MODEL = "fallback/ignored";
  process.env.OPENROUTER_FALLBACK_MODEL_1 = "nvidia/nemotron-3-super:free";
  process.env.OPENROUTER_FALLBACK_MODEL_2 = "google/gemma-4-31b:free";
  assert.deepEqual(
    buildOpenRouterModelSequence(),
    [
      "deepseek/deepseek-v4-flash:free",
      "nvidia/nemotron-3-super:free",
      "google/gemma-4-31b:free",
    ],
    "Primary model should lead the fallback chain.",
  );

  process.env.OPENROUTER_PRIMARY_MODEL = "";
  process.env.OPENROUTER_MODEL = "deepseek/deepseek-v4-flash:free";
  assert.deepEqual(
    buildOpenRouterModelSequence(),
    [
      "deepseek/deepseek-v4-flash:free",
      "nvidia/nemotron-3-super:free",
      "google/gemma-4-31b:free",
    ],
    "OPENROUTER_MODEL should be used when the primary model is missing.",
  );

  const stableHash = hashGeneratedQuestionText("  What is Arc RPC?  ");
  assert.equal(
    stableHash,
    hashGeneratedQuestionText("what is arc rpc"),
    "Question hashes should be stable after normalization.",
  );
  assert.equal(
    normalizeGeneratedQuestionText("  What is Arc RPC?  "),
    "what is arc rpc",
    "Question normalization should lowercase and strip punctuation.",
  );
  assert.equal(
    questionTextSimilarity("What is Arc RPC?", "What is the Arc RPC used for?") > 0.4,
    true,
    "Similar Arc questions should register as similar.",
  );

  const validModel = "deepseek/deepseek-v4-flash:free";
  const fallback1 = "nvidia/nemotron-3-super:free";
  const fallback2 = "google/gemma-4-31b:free";

  // invalid JSON -> fallback to model 2
  {
    const calls: FetchCall[] = [];
    installFetchMock((model) => {
      if (model === validModel) {
        return openRouterChatResponse("not json");
      }

      if (model === fallback1) {
        return openRouterChatResponse({
          questions: [
            makeQuestion(model ?? fallback1, 1, {
              question: "How does Arc RPC help a learner read chain data?",
              sourceTopic: "Arc RPC",
            }),
            makeQuestion(model ?? fallback1, 2, {
              question: "Why does the Arc explorer matter for transaction review?",
              sourceTopic: "Arc explorer",
            }),
          ],
        });
      }

      return openRouterChatResponse({
        questions: [
          makeQuestion(model ?? fallback2, 1, {
            question: "What makes USDC gas important in Arc?",
            sourceTopic: "Arc gas",
          }),
          makeQuestion(model ?? fallback2, 2, {
            question: "How does Arc keep reward eligibility separate from rewards?",
            sourceTopic: "Arc reward queue",
          }),
        ],
      });
    }, calls);

    const questions = await generateQuestionsWithProvider("visitor", 2, {
      previousQuestionIds: [],
      existingQuestions: [],
    });

    assert.equal(calls[0]?.model, validModel, "The primary model should be tried first.");
    assert.equal(calls[1]?.model, fallback1, "Invalid JSON should trigger fallback model 1.");
    assert.equal(questions.every((question) => question.modelUsed === fallback1), true, "Fallback model 1 should supply the valid batch.");
  }

  // model 1 and 2 fail -> model 3 succeeds
  {
    const calls: FetchCall[] = [];
    installFetchMock((model) => {
      if (model === validModel || model === fallback1) {
        return openRouterChatResponse({
          questions: [],
        });
      }

      return openRouterChatResponse({
        questions: [
          makeQuestion(model ?? fallback2, 1, {
            question: "What Arc feature keeps repeated claims from succeeding?",
            sourceTopic: "Arc anti-abuse",
          }),
          makeQuestion(model ?? fallback2, 2, {
            question: "Why does Archie log level progress on the server?",
            sourceTopic: "Archie action log",
          }),
        ],
      });
    }, calls);

    const questions = await generateQuestionsWithProvider("builder", 2, {
      previousQuestionIds: [],
      existingQuestions: [],
    });

    assert.equal(calls[0]?.model, validModel, "Primary model should be attempted first.");
    assert.equal(calls[1]?.model, fallback1, "Fallback 1 should be attempted after model 1 fails.");
    assert.equal(calls[2]?.model, fallback2, "Fallback 2 should be attempted after model 1 and 2 fail.");
    assert.equal(questions.every((question) => question.modelUsed === fallback2), true, "Fallback model 2 should supply the valid batch.");
  }

  // duplicate and generic rejection
  {
    const calls: FetchCall[] = [];
    installFetchMock((model) => {
      if (model === validModel) {
        return openRouterChatResponse({
          questions: [
            makeQuestion(model ?? validModel, 1, {
              question: "What is Arc RPC used for in the MVP?",
              sourceTopic: "Arc RPC",
            }),
            makeQuestion(model ?? validModel, 2, {
              question: "Which Arc safety rule stops duplicate reward claims?",
              sourceTopic: "Arc anti-abuse",
            }),
          ],
        });
      }

      return openRouterChatResponse({
        questions: [
          makeQuestion(model ?? fallback1, 1, {
            question: "What Arc feature keeps a learner profile safe?",
            sourceTopic: "Archie profile safety",
          }),
          makeQuestion(model ?? fallback1, 2, {
            question: "How does Archie guide a learner after a wrong answer?",
            sourceTopic: "Archie guidance",
          }),
        ],
      });
    }, calls);

    const questions = await generateQuestionsWithProvider("strategist", 2, {
      previousQuestionIds: [],
      existingQuestions: [],
    });

    const normalizedQuestions = questions.map((question) => normalizeGeneratedQuestionText(question.question));
    assert.equal(new Set(normalizedQuestions).size, questions.length, "Duplicate question text should be removed.");
  }

  {
    const calls: FetchCall[] = [];
    installFetchMock((model) => {
      if (model === validModel) {
        return openRouterChatResponse({
          questions: [
            makeQuestion(model ?? validModel, 1, {
              question: "What is blockchain?",
              sourceTopic: "crypto basics",
              category: "network",
              explanation: "Generic crypto wording should fail validation.",
            }),
          ],
        });
      }

      return openRouterChatResponse({
        questions: [
          makeQuestion(model ?? fallback1, 1, {
            question: "How does Archie keep Arc answers safe?",
            sourceTopic: "Archie prompt safety",
          }),
          makeQuestion(model ?? fallback1, 2, {
            question: "Why does Arc use source topics?",
            sourceTopic: "Arc docs",
          }),
        ],
      });
    }, calls);

    const questions = await generateQuestionsWithProvider("operator", 2, {
      previousQuestionIds: [],
      existingQuestions: [],
    });

    assert.equal(calls[0]?.model, validModel, "Generic questions should fail the first model.");
    assert.equal(questions.every((question) => isArcRelevantQuestion(question)), true, "Returned questions must be Arc relevant.");
  }

  {
    const validQuestions = [
      makeQuestion(validModel, 1, {
        question: "What does Arc RPC do for learners?",
        sourceTopic: "Arc RPC",
      }),
      makeQuestion(validModel, 2, {
        question: "How does Archie guide a learner after a wrong answer?",
        sourceTopic: "Archie guidance",
      }),
    ];
    const calls: FetchCall[] = [];
    installFetchMock(() => {
      return openRouterChatResponse({
        questions: validQuestions,
      });
    }, calls);

    const questions = await generateQuestionsWithProvider("explorer", 2, {
      previousQuestionIds: [],
      existingQuestions: [],
    });

    assert.equal(questions.length, 2, "Valid Arc questions should be accepted.");
    assert.equal(questions[0]?.modelUsed, validModel, "The valid model should be recorded on generated questions.");
    assert.equal(isArcRelevantQuestion(questions[0]), true, "Generated questions should be Arc relevant.");
  }

  restoreEnv();
  globalThis.fetch = originalFetch;

  console.log("Question generation provider checks passed.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    restoreEnv();
    globalThis.fetch = originalFetch;
  });
