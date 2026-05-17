# Arc Academy Agent — Codex Build Manifest

Project codename: `arc-academy-agent`  
Game mode: **Who Wants to Be an Architect? / Kim Architect Olmak İster?**  
Primary goal: Build an AI-powered Arc Network learning game where users learn Arc, answer questions, complete Arc Testnet missions, and earn testnet USDC / XP / badges.

---

## 0. Product Summary

We are building a web app that turns Arc Network documentation into an interactive learning game.

The app should include:

- A landing page explaining the product.
- A quiz game inspired by "Who Wants to Be a Millionaire?"
- An Arc teacher agent named `Archie`.
- User wallet address input.
- Beginner, Explorer, Builder, and Architect levels.
- Multiple-choice questions about Arc Network.
- Joker/help mechanics:
  - 50:50
  - Ask the Docs
  - Ask the Architect
  - Explain Like I’m New
- A mission system where users submit Arc Testnet transaction hashes.
- A verification system that checks whether a submitted transaction hash exists on Arc Testnet.
- Leaderboard.
- XP and badge system.
- Later: testnet USDC reward distribution.
- Later: RAG-powered Arc docs agent.
- Later: onchain badge minting.

Important: MVP must be safe. Do not include private keys in frontend code. Do not automate real rewards until abuse controls exist.

---

## 1. Recommended Tech Stack

Use this stack unless the existing repo already uses something else:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui if available
- viem for RPC reads
- Prisma for database
- PostgreSQL or SQLite for local MVP
- Zod for validation
- Zustand or React state for quiz session state
- Optional later: OpenAI / compatible LLM API for Archie agent

---

## 2. High-Level App Structure

Suggested routes:

```txt
/
  Landing page

/play
  Quiz game screen

/missions
  Mission list and mission submission

/leaderboard
  Leaderboard

/profile
  User profile, XP, level, badges

/admin/questions
  Optional local admin page for managing questions later
```

Suggested source structure:

```txt
src/
  app/
    page.tsx
    play/page.tsx
    missions/page.tsx
    leaderboard/page.tsx
    profile/page.tsx
    api/
      quiz/start/route.ts
      quiz/answer/route.ts
      missions/submit/route.ts
      missions/verify/route.ts
  components/
    LandingHero.tsx
    GameCard.tsx
    QuestionCard.tsx
    JokerPanel.tsx
    ArchieMessage.tsx
    MissionCard.tsx
    LeaderboardTable.tsx
    Badge.tsx
  lib/
    arc.ts
    quiz.ts
    missions.ts
    scoring.ts
    antiAbuse.ts
    data/questions.ts
    data/missions.ts
  types/
    quiz.ts
    mission.ts
    user.ts
  prisma/
    schema.prisma
```

If this exact structure conflicts with the actual repo, adapt it but keep the same conceptual separation.

---

## 3. Arc Testnet Constants

Create a single source of truth file, preferably:

```txt
src/lib/arc.ts
```

Include:

```ts
export const ARC_TESTNET = {
  chainId: 5042002,
  name: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
} as const;
```

Important notes:

- Native gas on Arc is USDC.
- Do not confuse native gas decimals with ERC-20 USDC decimals.
- Never hardcode private keys.
- Frontend may read public RPC data only.

---

## 4. MVP User Flow

MVP flow:

1. User opens landing page.
2. User clicks `Start Game`.
3. User enters wallet address or continues as guest.
4. Quiz starts with 10 questions.
5. User must answer at least 7 correctly.
6. If user passes, unlock Explorer Mission.
7. Explorer Mission asks user to submit an Arc Testnet tx hash.
8. App verifies tx hash via Arc RPC.
9. If valid, user receives:
   - XP
   - `Arc Explorer` badge
   - leaderboard entry
   - reward eligibility flag
10. Do not automatically distribute testnet USDC in MVP unless explicitly added in a later phase.

---

## 5. Initial Question Bank

Create this in:

```txt
src/lib/data/questions.ts
```

Question object shape:

```ts
export type QuizQuestion = {
  id: string;
  level: "visitor" | "explorer" | "builder" | "architect";
  category: "basics" | "network" | "gas" | "evm" | "agents" | "security";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceHint?: string;
};
```

Seed questions:

```ts
export const questions: QuizQuestion[] = [
  {
    id: "arc-gas-token",
    level: "visitor",
    category: "gas",
    question: "Arc Network'te gas fee hangi token ile ödenir?",
    options: ["ETH", "ARB", "USDC", "MATIC"],
    correctAnswer: "USDC",
    explanation: "Arc stablecoin-native bir ağdır ve gas fee USDC ile ödenir.",
    sourceHint: "Arc docs: gas and fees",
  },
  {
    id: "arc-testnet-chain-id",
    level: "explorer",
    category: "network",
    question: "Arc Testnet Chain ID nedir?",
    options: ["42161", "5042002", "84532", "11155111"],
    correctAnswer: "5042002",
    explanation: "Arc Testnet için kullanılan Chain ID 5042002'dir.",
    sourceHint: "Arc docs: connect to Arc",
  },
  {
    id: "arc-evm-compatible",
    level: "visitor",
    category: "evm",
    question: "Arc EVM uyumlu mudur?",
    options: ["Evet", "Hayır", "Sadece Solana uyumludur", "Sadece Bitcoin script destekler"],
    correctAnswer: "Evet",
    explanation: "Arc, EVM uyumlu bir Layer-1 ağı olarak geliştiricilerin Solidity araçlarını kullanmasını sağlar.",
    sourceHint: "Arc docs: EVM compatibility",
  },
  {
    id: "arc-rpc-purpose",
    level: "explorer",
    category: "network",
    question: "RPC URL ne işe yarar?",
    options: [
      "Wallet veya uygulamanın blockchain ağına bağlanmasını sağlar",
      "Sadece token fiyatını gösterir",
      "Sadece NFT görseli saklar",
      "Private key üretir"
    ],
    correctAnswer: "Wallet veya uygulamanın blockchain ağına bağlanmasını sağlar",
    explanation: "RPC endpoint, uygulamaların Arc ağına istek atmasını sağlar.",
    sourceHint: "Arc docs: connect to Arc",
  },
  {
    id: "arc-explorer-purpose",
    level: "explorer",
    category: "network",
    question: "Arc explorer ne için kullanılır?",
    options: [
      "Transaction, address ve contract kontrolü için",
      "Private key saklamak için",
      "Kod compile etmek için",
      "Wallet şifresi değiştirmek için"
    ],
    correctAnswer: "Transaction, address ve contract kontrolü için",
    explanation: "Explorer, ağdaki işlem, adres ve contract bilgilerini incelemek için kullanılır.",
    sourceHint: "Arc Testnet explorer",
  },
  {
    id: "testnet-usdc-real-money",
    level: "visitor",
    category: "security",
    question: "Testnet USDC gerçek para mıdır?",
    options: ["Evet", "Hayır, test amaçlıdır", "Sadece mainnet'te gerçek değildir", "Sadece NFT alırken gerçektir"],
    correctAnswer: "Hayır, test amaçlıdır",
    explanation: "Testnet tokenları geliştirme ve deneme amacıyla kullanılır; gerçek finansal değer taşımaz.",
    sourceHint: "Arc testnet docs",
  },
  {
    id: "foundry-deploy",
    level: "builder",
    category: "evm",
    question: "Arc Testnet'e Solidity contract deploy etmek için hangi araç kullanılabilir?",
    options: ["Foundry", "Photoshop", "Excel", "Blender"],
    correctAnswer: "Foundry",
    explanation: "Arc EVM uyumlu olduğu için Foundry gibi Ethereum geliştirme araçları kullanılabilir.",
    sourceHint: "Arc docs: deploy on Arc",
  },
  {
    id: "tx-hash-proof",
    level: "explorer",
    category: "network",
    question: "Explorer mission'da tx hash neden istenir?",
    options: [
      "Kullanıcının görevi gerçekten yaptığını doğrulamak için",
      "Kullanıcının private key'ini bulmak için",
      "Wallet şifresini değiştirmek için",
      "Token fiyatını sabitlemek için"
    ],
    correctAnswer: "Kullanıcının görevi gerçekten yaptığını doğrulamak için",
    explanation: "Tx hash, blockchain üzerinde gerçekleşmiş bir işlemin kanıtıdır.",
    sourceHint: "Arc explorer",
  },
  {
    id: "agent-reputation",
    level: "architect",
    category: "agents",
    question: "Agent economy'de reputation neden önemlidir?",
    options: [
      "Agent'ın güvenilirliğini göstermek için",
      "Gas fee'yi sıfırlamak için",
      "Private key paylaşmak için",
      "Chain ID değiştirmek için"
    ],
    correctAnswer: "Agent'ın güvenilirliğini göstermek için",
    explanation: "Agent reputation, agent'ın geçmiş performansı ve güvenilirliği hakkında sinyal verir.",
    sourceHint: "Arc agent economy docs",
  },
  {
    id: "arc-main-focus",
    level: "visitor",
    category: "basics",
    question: "Arc'ın ana odaklarından biri nedir?",
    options: [
      "Stablecoin-native finance",
      "Proof-of-work Bitcoin mining",
      "Only gaming NFTs",
      "Centralized database hosting"
    ],
    correctAnswer: "Stablecoin-native finance",
    explanation: "Arc stablecoin-native uygulamalar ve USDC tabanlı ödeme deneyimi üzerine odaklanır.",
    sourceHint: "Arc docs overview",
  },
];
```

---

## 6. Initial Mission Bank

Create this in:

```txt
src/lib/data/missions.ts
```

Mission object shape:

```ts
export type Mission = {
  id: string;
  level: "explorer" | "builder" | "architect";
  title: string;
  description: string;
  requiredInput: "txHash" | "contractAddress" | "walletAddress";
  xpReward: number;
  badgeReward?: string;
  rewardEligibility?: boolean;
};
```

Seed missions:

```ts
export const missions: Mission[] = [
  {
    id: "first-arc-testnet-tx",
    level: "explorer",
    title: "First Arc Testnet Transaction",
    description:
      "Arc Testnet üzerinde yaptığın bir işlemin transaction hash'ini gir. Sistem bu hash'in Arc Testnet RPC üzerinde var olup olmadığını kontrol edecek.",
    requiredInput: "txHash",
    xpReward: 100,
    badgeReward: "Arc Explorer",
    rewardEligibility: true,
  },
  {
    id: "first-contract-deploy",
    level: "builder",
    title: "Deploy Your First HelloArchitect Contract",
    description:
      "Arc Testnet üzerinde basit bir contract deploy et ve contract adresini gir. Bu görev MVP sonrası aktif edilecek.",
    requiredInput: "contractAddress",
    xpReward: 300,
    badgeReward: "Arc Builder",
    rewardEligibility: false,
  },
];
```

---

## 7. Quiz Engine Requirements

Implement pure functions in:

```txt
src/lib/quiz.ts
```

Required functions:

```ts
selectQuestions(level?: QuizLevel, count?: number): QuizQuestion[]
checkAnswer(questionId: string, selectedAnswer: string): AnswerResult
calculateScore(results: AnswerResult[]): QuizScore
hasPassed(score: QuizScore): boolean
```

Rules:

- Default quiz length: 10 questions.
- Passing score: 7 correct answers.
- Randomize question order.
- Randomize option order.
- Keep correct answer validation stable after shuffling.
- Return explanations after each answer or after quiz completion.
- Do not expose all correct answers to client before answer submission if using API routes.
- For first local MVP, client-side question data is acceptable, but mark server-side validation as TODO.

---

## 8. Joker Mechanics

Create in:

```txt
src/lib/jokers.ts
```

Jokers:

1. `fiftyFifty(question)`
   - Returns two wrong options removed.
   - Keeps the correct answer.

2. `askTheDocs(question)`
   - Returns sourceHint and a short pointer.
   - Must not reveal the exact answer.

3. `askTheArchitect(question)`
   - Returns a short hint.
   - Must not reveal the exact answer.

4. `explainLikeNew(question)`
   - Gives a beginner-friendly explanation of the topic.
   - Must not reveal the exact answer directly.

Each joker can be used once per quiz session.

---

## 9. Arc RPC Verification

Implement in:

```txt
src/lib/arc.ts
```

Use `viem` public client.

Required function:

```ts
export async function verifyArcTestnetTx(txHash: `0x${string}`): Promise<{
  valid: boolean;
  txHash: string;
  blockNumber?: bigint;
  from?: string;
  to?: string | null;
  error?: string;
}>
```

Behavior:

- Validate hash format before RPC call.
- Call Arc Testnet RPC.
- If transaction exists, return valid true.
- If transaction does not exist, return valid false with error.
- Do not require wallet match in first version.
- Later: if user wallet is provided, verify `from` equals wallet address.

Important:

- This function is read-only.
- It must never need or ask for private keys.
- It must never send transactions.

---

## 10. API Routes

Create these API routes:

```txt
src/app/api/quiz/start/route.ts
src/app/api/quiz/answer/route.ts
src/app/api/missions/submit/route.ts
src/app/api/missions/verify/route.ts
```

MVP behavior:

### POST `/api/quiz/start`

Input:

```json
{
  "walletAddress": "0x...",
  "level": "visitor"
}
```

Output:

```json
{
  "sessionId": "local-session-id",
  "questions": [...]
}
```

### POST `/api/quiz/answer`

Input:

```json
{
  "sessionId": "local-session-id",
  "questionId": "arc-gas-token",
  "selectedAnswer": "USDC"
}
```

Output:

```json
{
  "correct": true,
  "explanation": "..."
}
```

### POST `/api/missions/submit`

Input:

```json
{
  "walletAddress": "0x...",
  "missionId": "first-arc-testnet-tx",
  "txHash": "0x..."
}
```

Output:

```json
{
  "status": "pending-verification"
}
```

### POST `/api/missions/verify`

Input:

```json
{
  "walletAddress": "0x...",
  "missionId": "first-arc-testnet-tx",
  "txHash": "0x..."
}
```

Output:

```json
{
  "verified": true,
  "xpAwarded": 100,
  "badgeAwarded": "Arc Explorer",
  "rewardEligible": true
}
```

---

## 11. UI Requirements

Use a polished game-like interface.

Visual theme:

- Dark futuristic background.
- Arc / architecture / blueprint feeling.
- Cards with rounded corners.
- Clear question card.
- Large option buttons.
- Progress indicator: Question 1/10.
- XP and level indicator.
- Archie mentor message area.
- Joker buttons.
- Result screen with celebration.

Do not overcomplicate the UI in MVP.

Required components:

```txt
LandingHero
GameCard
QuestionCard
JokerPanel
ArchieMessage
MissionCard
LeaderboardTable
Badge
```

Landing page copy:

```txt
Who Wants to Be an Architect?

Learn Arc. Answer questions. Complete real testnet missions.
Prove your knowledge and become an Arc Architect.

Start as a Visitor.
Explore Arc Testnet.
Build your first onchain proof.
Climb the leaderboard.
```

Turkish variant:

```txt
Kim Architect Olmak İster?

Arc'ı öğren. Soruları cevapla. Gerçek testnet görevlerini tamamla.
Bilgini kanıtla ve Arc Architect seviyesine yüksel.
```

---

## 12. Database Schema — Later Phase

For MVP, static/local state is acceptable.

When adding persistence, use Prisma with these models:

```prisma
model User {
  id            String   @id @default(cuid())
  walletAddress String  @unique
  username      String?
  xp            Int      @default(0)
  level         String   @default("visitor")
  createdAt     DateTime @default(now())
  sessions      QuizSession[]
  submissions   MissionSubmission[]
  rewards       Reward[]
}

model QuizSession {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  status      String   @default("active")
  score       Int      @default(0)
  total       Int      @default(10)
  startedAt   DateTime @default(now())
  completedAt DateTime?
  answers     Answer[]
}

model Answer {
  id             String   @id @default(cuid())
  sessionId      String
  session        QuizSession @relation(fields: [sessionId], references: [id])
  questionId     String
  selectedAnswer String
  isCorrect      Boolean
  createdAt      DateTime @default(now())
}

model MissionSubmission {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  missionId   String
  txHash      String?
  status      String   @default("pending")
  verifiedAt  DateTime?
  createdAt   DateTime @default(now())

  @@unique([userId, missionId])
  @@unique([txHash])
}

model Reward {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  amount    String
  status    String   @default("eligible")
  txHash    String?
  createdAt DateTime @default(now())
}
```

---

## 13. Anti-Abuse Rules

Implement in later phase, but keep TODO markers now.

Rules:

- One reward per wallet per mission.
- One tx hash can only be used once.
- Rate limit mission verification.
- Require quiz pass before mission reward eligibility.
- Minimum quiz duration before pass is valid.
- Optional CAPTCHA before reward claim.
- Check wallet address format.
- Later: verify tx `from` equals connected wallet.
- Later: limit daily reward distribution.
- Later: admin review queue for suspicious submissions.

Create:

```txt
src/lib/antiAbuse.ts
```

with placeholder functions:

```ts
canStartQuiz(walletAddress: string): Promise<boolean>
canSubmitMission(walletAddress: string, missionId: string): Promise<boolean>
isSuspiciousQuizSession(sessionId: string): Promise<boolean>
```

---

## 14. Reward System Safety

Do not implement automatic transaction sending in MVP.

Reward status options:

```txt
not_eligible
eligible
queued
sent
rejected
```

MVP should only set:

```txt
eligible
```

Later, after abuse controls:

- Add backend-only reward wallet.
- Store private key only in server environment variable.
- Never expose private key to client.
- Add manual admin approval before sending rewards.
- Log all reward transactions.

---

## 15. Agent / Archie Behavior

For MVP, Archie can be rule-based.

Later, add LLM/RAG.

MVP Archie messages:

- On start:
  ```txt
  Hoş geldin Architect adayı. Bugün Arc'ı gerçekten anlayıp anlamadığını test edeceğiz.
  ```

- On correct answer:
  ```txt
  Doğru. Bir Architect gibi düşünmeye başlıyorsun.
  ```

- On wrong answer:
  ```txt
  Yaklaştın ama doğru cevap bu değil. Açıklamayı oku ve bir sonraki soruda toparlayalım.
  ```

- On quiz pass:
  ```txt
  Tebrikler. Explorer Mission kilidi açıldı. Şimdi Arc Testnet üzerinde gerçek bir kanıt bırakma zamanı.
  ```

- On mission verified:
  ```txt
  İşlem doğrulandı. Artık Arc Explorer badge kazandın.
  ```

Later RAG behavior:

- Agent must answer using Arc docs.
- Agent must not invent unsupported facts.
- Agent should teach before asking.
- Agent should not directly reveal quiz answers unless quiz is completed.
- Agent should provide source links after explanations.

---

## 16. Development Phases for Codex

Use the following prompts one by one.

---

# Phase 1 — Project Inspection / Setup

Codex prompt:

```txt
You are working on the Arc Academy Agent project.

Goal: Inspect the current repository and prepare it for a Next.js TypeScript app if it is empty or not initialized.

Tasks:
1. Inspect the current directory.
2. If no app exists, create a Next.js App Router TypeScript project in the current directory.
3. Add Tailwind CSS if not already configured.
4. Do not overwrite important existing files without checking.
5. Create a short PROJECT_STATUS.md describing what exists and what was initialized.
6. Do not add blockchain transaction sending.
7. Do not add any private keys.

Acceptance criteria:
- The app runs with npm run dev.
- TypeScript is enabled.
- Tailwind is working.
- PROJECT_STATUS.md exists.
```

---

# Phase 2 — Core Constants and Data

Codex prompt:

```txt
Implement the core data layer for Arc Academy Agent.

Tasks:
1. Create src/lib/arc.ts with Arc Testnet constants:
   - chainId 5042002
   - rpcUrl https://rpc.testnet.arc.network
   - explorerUrl https://testnet.arcscan.app
   - nativeCurrency USDC with 18 decimals
2. Create src/types/quiz.ts and src/types/mission.ts.
3. Create src/lib/data/questions.ts with the initial 10 questions from the manifest.
4. Create src/lib/data/missions.ts with the initial missions from the manifest.
5. Export everything cleanly.
6. Ensure npm run lint and npm run build pass.

Acceptance criteria:
- Questions are typed.
- Missions are typed.
- Arc constants are centralized.
- No private keys or send-transaction logic exists.
```

---

# Phase 3 — Quiz Engine

Codex prompt:

```txt
Build the quiz engine for Arc Academy Agent.

Tasks:
1. Create src/lib/quiz.ts.
2. Implement:
   - selectQuestions(level?, count?)
   - checkAnswer(questionId, selectedAnswer)
   - calculateScore(results)
   - hasPassed(score)
3. Quiz length defaults to 10.
4. Passing score is 7 correct answers.
5. Randomize question order.
6. Randomize option order while keeping answer validation correct.
7. Add basic unit-like tests or a small script if test framework is unavailable.
8. Keep the implementation pure and reusable.

Acceptance criteria:
- checkAnswer returns correct boolean and explanation.
- hasPassed returns true for 7/10 or higher.
- No React dependency inside quiz engine.
```

---

# Phase 4 — Game UI

Codex prompt:

```txt
Build the first playable UI for Who Wants to Be an Architect.

Tasks:
1. Create or update the landing page at src/app/page.tsx.
2. Create /play page.
3. Add components:
   - LandingHero
   - GameCard
   - QuestionCard
   - JokerPanel
   - ArchieMessage
4. User should be able to:
   - Start the game
   - Answer 10 questions
   - See progress
   - Use placeholder joker buttons
   - See explanations
   - See final score
   - See pass/fail status
5. Use polished Tailwind styling with a dark futuristic game feel.
6. Include Turkish and English title text where appropriate.
7. Do not add database yet.
8. Do not add wallet transaction sending.

Acceptance criteria:
- User can complete a full quiz in browser.
- Passing requires 7 correct answers.
- UI clearly shows "Explorer Mission unlocked" when passed.
- npm run build passes.
```

---

# Phase 5 — Joker Mechanics

Codex prompt:

```txt
Implement real joker mechanics.

Tasks:
1. Create src/lib/jokers.ts.
2. Implement:
   - fiftyFifty(question)
   - askTheDocs(question)
   - askTheArchitect(question)
   - explainLikeNew(question)
3. Each joker can be used once per quiz session.
4. 50:50 removes two wrong options while preserving the correct answer.
5. Ask the Docs should show sourceHint without revealing the answer.
6. Ask the Architect should provide a helpful hint without directly revealing the answer.
7. Explain Like I'm New should explain the concept without directly revealing the answer.
8. Wire these into the /play UI.

Acceptance criteria:
- Joker buttons work.
- Used jokers are disabled.
- No joker directly reveals the correct option before answering.
```

---

# Phase 6 — Mission UI

Codex prompt:

```txt
Build the Explorer Mission UI.

Tasks:
1. Create /missions page.
2. Add MissionCard component.
3. Show the first mission: First Arc Testnet Transaction.
4. Allow user to enter wallet address and tx hash.
5. Add validation for wallet address and tx hash format.
6. If quiz pass state is not persisted yet, show mission page as accessible but explain that full reward eligibility will require quiz pass in the persisted version.
7. Do not send transactions.
8. Do not require private keys.

Acceptance criteria:
- User can view mission.
- User can submit tx hash format locally.
- UI explains that tx hash will be verified on Arc Testnet.
```

---

# Phase 7 — Arc RPC Read Verification

Codex prompt:

```txt
Implement Arc Testnet read-only transaction verification.

Tasks:
1. Install viem if needed.
2. In src/lib/arc.ts, implement verifyArcTestnetTx(txHash).
3. Use Arc Testnet RPC public client.
4. Validate tx hash format.
5. Fetch transaction by hash.
6. Return valid true if found.
7. Return valid false with clear error if not found.
8. Wire verification into /missions.
9. Display:
   - verified status
   - tx hash
   - from address
   - to address
   - block number
   - explorer link

Security constraints:
- Read-only RPC only.
- Do not send transactions.
- Do not use private keys.
- Do not ask user for seed phrase or private key.

Acceptance criteria:
- A real Arc Testnet tx hash can be verified.
- Invalid hash shows friendly error.
- npm run build passes.
```

---

# Phase 8 — Leaderboard and Profile Mock

Codex prompt:

```txt
Add local/mock leaderboard and profile screens.

Tasks:
1. Create /leaderboard page.
2. Create /profile page.
3. Add LeaderboardTable and Badge components.
4. Show mock users with XP and badges.
5. Show current user's local quiz result if available in browser state/localStorage.
6. Store latest quiz score and mission verification result in localStorage for MVP.
7. Award local badge "Arc Explorer" after successful mission verification.
8. Do not add real database yet.

Acceptance criteria:
- Leaderboard page is visually polished.
- Profile page shows XP, level, and badges.
- Local state persists after refresh.
```

---

# Phase 9 — Persistence with Prisma

Codex prompt:

```txt
Add persistence using Prisma.

Tasks:
1. Add Prisma.
2. Use SQLite for local development unless DATABASE_URL is already configured.
3. Create models from the manifest:
   - User
   - QuizSession
   - Answer
   - MissionSubmission
   - Reward
4. Add migrations.
5. Add helper functions for:
   - getOrCreateUser(walletAddress)
   - createQuizSession(userId)
   - recordAnswer(sessionId, questionId, selectedAnswer, isCorrect)
   - completeQuizSession(sessionId)
   - recordMissionSubmission(userId, missionId, txHash)
   - markMissionVerified(...)
6. Wire API routes or server actions as appropriate.
7. Keep client UI working.

Acceptance criteria:
- Data persists locally.
- Reusing the same wallet loads same user.
- Duplicate mission submission for same wallet is blocked.
- Duplicate tx hash is blocked.
```

---

# Phase 10 — API Routes

Codex prompt:

```txt
Implement API routes for quiz and missions.

Tasks:
1. Create:
   - POST /api/quiz/start
   - POST /api/quiz/answer
   - POST /api/missions/submit
   - POST /api/missions/verify
2. Use Zod validation.
3. Use Prisma persistence if available.
4. Server-side answer checking must be authoritative.
5. Mission verify must call verifyArcTestnetTx.
6. Add clear error messages.
7. Update UI to use these APIs.

Acceptance criteria:
- Quiz session can start through API.
- Answers are checked through API.
- Mission verification is done through API.
- No correct answer list is leaked to the client before answering.
```

---

# Phase 11 — Anti-Abuse Foundation

Codex prompt:

```txt
Add anti-abuse foundation.

Tasks:
1. Create src/lib/antiAbuse.ts.
2. Implement basic checks:
   - one verified submission per wallet per mission
   - one tx hash can only be used once
   - wallet format validation
   - tx hash format validation
   - quiz pass required before reward eligibility
3. Add status values:
   - not_eligible
   - eligible
   - queued
   - sent
   - rejected
4. Add friendly UI states.
5. Add TODO comments for rate limiting and CAPTCHA.

Acceptance criteria:
- A wallet cannot claim the same mission twice.
- A tx hash cannot be reused.
- Reward eligibility only appears after quiz pass + verified mission.
```

---

# Phase 12 — Reward Queue, No Auto-Send

Codex prompt:

```txt
Add reward eligibility queue without automatic sending.

Tasks:
1. After verified mission and quiz pass, create Reward with status eligible.
2. Add admin-readable reward queue page or console output.
3. Show user "Eligible for testnet USDC reward" but do not send funds.
4. Add clear code comments explaining that automatic reward distribution will be added later only after abuse controls.
5. Do not add private key handling yet.
6. Do not send transactions.

Acceptance criteria:
- Eligible users are recorded.
- No funds are sent.
- No private key is needed.
```

---

# Phase 13 — Archie Agent Placeholder

Codex prompt:

```txt
Add Archie teacher agent placeholder.

Tasks:
1. Create src/lib/archie.ts.
2. Add rule-based functions:
   - getWelcomeMessage()
   - getCorrectAnswerMessage()
   - getWrongAnswerMessage()
   - getQuizPassMessage()
   - getMissionVerifiedMessage()
   - getTopicExplanation(category)
3. Use these messages in UI.
4. Prepare interfaces for future LLM/RAG integration:
   - AgentContext
   - AgentResponse
5. Do not call external AI APIs yet unless environment variables are explicitly present.

Acceptance criteria:
- UI feels like a teacher agent is guiding the user.
- Future LLM integration has clean interfaces.
```

---

# Phase 14 — Docs RAG Later

Codex prompt:

```txt
Prepare optional RAG architecture for Arc docs, but do not require it for MVP.

Tasks:
1. Create docs/ARC_RAG_PLAN.md.
2. Describe:
   - source ingestion
   - chunking
   - embeddings
   - vector store
   - retrieval
   - citation handling
   - answer safety rules
3. Add placeholder interfaces in src/lib/rag.ts.
4. Do not scrape docs automatically yet unless explicitly requested.
5. Do not block MVP if RAG is not configured.

Acceptance criteria:
- RAG plan exists.
- Codebase has clean placeholders.
- MVP still works without RAG.
```

---

# Phase 15 — Polish and README

Codex prompt:

```txt
Polish the project and write documentation.

Tasks:
1. Improve visual consistency.
2. Add loading and error states.
3. Add empty states.
4. Add README.md with:
   - project overview
   - MVP features
   - setup commands
   - environment variables
   - Arc Testnet constants
   - safety notes
   - roadmap
5. Add .env.example.
6. Ensure npm run lint and npm run build pass.
7. Add final PROJECT_STATUS.md.

Acceptance criteria:
- A new developer can run the project.
- README clearly explains what exists and what is planned.
- Build passes.
```

---

## 17. Suggested Local Commands

Use these manually or ask Codex to run them.

```bash
npm install
npm run dev
npm run lint
npm run build
```

If Prisma is added:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

---

## 18. Safety Rules for Codex

Codex must follow these rules at all times:

1. Never put private keys in frontend code.
2. Never ask for seed phrases.
3. Never send real transactions unless a later explicit task says so.
4. MVP uses read-only Arc RPC only.
5. Reward system starts as eligibility queue, not auto-send.
6. Do not overwrite existing user work without inspecting first.
7. Keep changes incremental and buildable.
8. After each phase, run lint/build if possible.
9. After each phase, update PROJECT_STATUS.md.
10. Always print changed files and next recommended step.

---

## 19. First Codex Command Example

From the repo directory:

```bash
codex exec --skip-git-repo-check --sandbox danger-full-access "Read ARC_ACADEMY_AGENT_MANIFEST.md. Execute Phase 1 only. Do not execute later phases. Follow all safety rules. When finished, print changed files, test results, and the next recommended Codex prompt."
```

Then continue phase by phase:

```bash
codex exec --skip-git-repo-check --sandbox danger-full-access "Read ARC_ACADEMY_AGENT_MANIFEST.md. Execute Phase 2 only. Do not execute later phases. Follow all safety rules. When finished, print changed files, test results, and the next recommended Codex prompt."
```

---

## 20. Project North Star

This project is not just a quiz.

It is an onboarding engine for Arc:

```txt
Learn Arc.
Answer questions.
Complete real testnet missions.
Prove your knowledge.
Become an Architect.
```
