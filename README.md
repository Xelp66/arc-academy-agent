# Arc Academy Agent

Arc Academy Agent is a Next.js learning game for Arc Network. The MVP teaches Arc concepts through a quiz, asks users to complete a read-only verified Arc Testnet mission, records local persistence with SQLite, and tracks reward eligibility without sending funds.

## MVP Features

- Landing page for "Who Wants to Be an Architect?"
- `/play` quiz flow with server-authoritative answer checking.
- Archie rule-based teacher messages.
- Joker helpers: 50:50, Ask the Docs, Ask the Architect, and Explain Like I am New.
- `/missions` Explorer Mission proof form.
- Read-only Arc Testnet transaction verification through public RPC.
- Prisma SQLite persistence for users, quiz sessions, answers, mission submissions, and reward eligibility.
- Anti-abuse checks for duplicate wallet mission claims and reused transaction hashes.
- `/leaderboard` and `/profile` MVP views with local browser progress.
- `/admin/rewards` read-only reward eligibility queue.
- Optional RAG architecture plan and disabled placeholders.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run lint
npm run build
npm run test:quiz
npm run test:persistence
```

## Environment Variables

Create `.env` from `.env.example` for local development:

```bash
DATABASE_URL="file:./dev.db"
```

No private keys are required. No reward wallet, faucet key, seed phrase, or transaction-sending secret is used by the MVP.

## Arc Testnet Constants

The constants are centralized in `src/lib/arc.ts`:

- Chain ID: `5042002`
- RPC URL: `https://rpc.testnet.arc.network`
- Explorer URL: `https://testnet.arcscan.app`
- Native gas token metadata: `USDC`, 18 decimals

Arc RPC usage is read-only. The app verifies transactions with public RPC reads and never sends transactions.

## Quiz Flow

1. User starts a quiz from `/play`.
2. The API creates a persisted quiz session.
3. The client receives public question data only. Correct answers are not sent before submission.
4. Answers are checked by `POST /api/quiz/answer`.
5. Passing requires at least 7 correct answers out of 10.
6. Passing unlocks the Explorer Mission path in the UI.

## Mission Verification Flow

1. User opens `/missions`.
2. User submits a wallet address and Arc Testnet transaction hash.
3. The API validates formats and anti-abuse rules.
4. The app calls read-only Arc Testnet RPC to verify the transaction exists.
5. If valid, the mission submission is marked verified.
6. If the user also passed the quiz, reward eligibility can be recorded.

## Anti-Abuse Behavior

The MVP includes foundation checks:

- One verified submission per wallet per mission.
- One transaction hash can only be used once.
- Wallet and transaction hash format validation.
- Quiz pass required before reward eligibility.
- Re-verifying the same mission does not increment XP or create duplicate rewards.

TODOs remain for rate limiting, CAPTCHA, minimum quiz duration enforcement, and manual review queues.

## Reward Queue Behavior

The reward queue is eligibility-only.

- Eligible users are stored in the `Reward` table with status `eligible`.
- `/admin/rewards` displays queued eligibility records.
- No automatic reward sending exists.
- No funds are sent.
- No private keys are required.
- No faucet or reward wallet logic exists.

## Archie Placeholder

`src/lib/archie.ts` contains rule-based teacher messages and future integration interfaces:

- `AgentContext`
- `AgentResponse`
- `ArchieAgent`

The MVP does not call external AI APIs and does not require AI environment variables.

## Optional Future RAG Plan

`docs/ARC_RAG_PLAN.md` describes a future Arc docs retrieval architecture:

- source ingestion
- chunking
- embeddings
- vector store
- retrieval
- citations
- answer safety
- quiz-answer safety
- Archie integration

RAG is disabled by default in `src/lib/rag.ts`. The MVP works without RAG configured.

## Safety Notes

- No private keys are required.
- No seed phrases are requested.
- No automatic reward sending exists.
- Arc RPC usage is read-only.
- Reward queue is eligibility-only.
- Quiz answers are not revealed before answer submission.
- External AI APIs are not called.

## Roadmap

- Add stronger rate limiting and CAPTCHA for reward-sensitive actions.
- Add manual admin review for suspicious submissions.
- Add optional RAG-backed Archie responses with citations.
- Add reward queue operations without automatic sending.
- Add secure backend-only reward distribution only after abuse controls and manual review exist.
- Improve persistent profile and leaderboard views.
