# Arc Academy Agent

**Arc Academy Agent** is an interactive quiz and learning platform designed to help users understand the Arc Network ecosystem in a fun, structured, and engaging way.

The project turns Arc learning into a level-based quiz experience where users can answer questions, use jokers, track progress, and move step by step toward becoming an **Arc Master**.

---

## Why This Project Exists

Learning a new ecosystem can be difficult, especially when it includes its own terminology, community structure, contributor tasks, campaigns, and technical concepts.

Arc Academy Agent was built to make Arc Network education:

- easier to understand
- more interactive
- more beginner-friendly
- more engaging than passive reading
- more useful for community onboarding

Instead of only reading documentation, users can actively test their knowledge through Arc-focused questions and progress through different learning levels.

---

## What It Does

Arc Academy Agent provides a gamified quiz experience focused on Arc Network and its ecosystem.

Users begin as a **Visitor** and progress through Arc-themed levels:

1. Visitor  
2. Explorer  
3. Pathfinder  
4. Builder  
5. Operator  
6. Strategist  
7. Architect  
8. Protocolist  
9. Arc Sage  
10. Arc Master  

Each level represents a deeper understanding of Arc. Early levels focus on basic concepts, while higher levels can include more detailed and challenging questions.

---

## Key Features

- Modern landing page
- Level-based quiz system
- Arc-focused question bank
- Difficulty-based questions
- Fast quiz loading from database
- Jokers to support learning during quizzes
- Action log for quiz history
- Result tracking
- English-only user interface
- Responsive desktop and mobile layout
- Production deployment with Vercel and PostgreSQL

---

## Jokers

To make the quiz more educational and interactive, Arc Academy Agent includes joker tools:

- **50:50**  
  Removes two incorrect options.

- **Ask the Docs**  
  Helps the user think through the question using a documentation-style hint.

- **Ask the Architect**  
  Provides a more advanced strategic hint.

- **Explain Like I’m New**  
  Explains the concept in a beginner-friendly way.

These tools are designed to help users learn, not just guess.

---

## Technical Stack

The project is built with a modern full-stack web architecture.

```txt
Next.js
React
TypeScript
Tailwind CSS
Prisma
PostgreSQL
Vercel
OpenRouter
```

### Frontend

The frontend is built with **Next.js**, **React**, and **TypeScript**.  
**Tailwind CSS** is used for styling and provides a clean dark/cyan Arc Academy visual identity.

### Backend

The backend uses **Next.js API routes** and server-side logic to manage quiz sessions, question selection, progress, and persistence.

### Database

The project uses **Prisma** as the ORM and **PostgreSQL** as the production database.

During development, the project initially used local storage/SQLite-style workflows, but production deployment was moved to PostgreSQL for reliability on Vercel.

### Deployment

The application is deployed on **Vercel**.

Production setup includes:

```txt
GitHub
Vercel
PostgreSQL
Prisma migrations
Environment variables
```

---

## Question Bank Strategy

The project originally tested live AI-based question generation through OpenRouter.

The goal was to generate fresh unique questions every time a user started a quiz. However, live generation caused some practical issues:

- long waiting times
- model timeouts
- inconsistent free model availability
- slower quiz start experience

To improve reliability and user experience, the architecture was changed.

### Current Strategy

```txt
OpenRouter = offline question generation tool
Database = large Arc-focused question bank
Live quiz = fast random selection from database
```

This means users do not wait for live AI generation during the quiz.  
Questions are generated, validated, stored, and served quickly from the database.

This approach gives the project:

- faster quiz start times
- more stable user experience
- better control over question quality
- better duplicate prevention
- easier difficulty balancing
- more reliable production deployment

---

## Question Quality and Duplicate Prevention

A major focus of Arc Academy Agent is avoiding repeated, generic, or low-quality questions.

The question bank is designed to focus only on Arc-related topics, such as:

- Arc Network
- Archie
- Arc Academy
- contributor tasks
- campaigns
- community features
- explorer features
- level progression
- ecosystem concepts
- official or project-provided Arc context

The system avoids generic crypto or generic blockchain questions.  
The goal is not to create a random Web3 quiz, but a focused learning experience for Arc Network.

Duplicate prevention is handled through normalized question hashes and validation checks before questions are saved or reused.

---

## User Experience

The interface is designed to be clean, readable, and focused.

Recent UX improvements include:

- cleaner homepage layout
- compact level presentation
- full English user interface
- faster quiz start flow
- better right-side quiz panel layout
- jokers placed above the action log
- clear loading and feedback states
- responsive layout for different screen sizes

The goal is to make the platform feel like an interactive learning game rather than a static quiz page.

---

## Project Goals

Arc Academy Agent aims to become an interactive education layer for the Arc ecosystem.

The main goals are:

- help new users understand Arc Network
- make learning more engaging
- support community onboarding
- create a structured quiz-based learning path
- encourage users to progress through Arc-themed levels
- provide a scalable Arc-focused question bank

---

## Roadmap

Planned improvements include:

- expanding the question bank across all 10 levels
- adding more advanced difficulty balancing
- improving user progress tracking
- improving leaderboard logic
- adding achievement and badge systems
- adding more Arc-specific learning paths
- improving question explanations
- adding source references for questions
- creating better admin/developer tools for question audits
- generating more offline questions with AI and validating them before production use

---

## Development

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

Check the question bank, if the script is available:

```bash
npm run check:question-bank
```

---

## Environment Variables

Create a `.env` file for local development.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
LLM_PROVIDER="local"
```

Optional OpenRouter variables for offline question generation:

```env
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_MODEL="openai/gpt-oss-120b:free"
OPENROUTER_PRIMARY_MODEL="openai/gpt-oss-120b:free"
OPENROUTER_FALLBACK_MODEL_1="z-ai/glm-4.5-air:free"
OPENROUTER_FALLBACK_MODEL_2="openrouter/free"
OPENROUTER_TIMEOUT_MS="30000"
OPENROUTER_TOTAL_TIMEOUT_MS="90000"
```

> Do not commit `.env` files or API keys.

---

## Deployment

The project is designed to run on Vercel.

Recommended production setup:

```txt
Vercel hosting
PostgreSQL database
Prisma migrations
DATABASE_URL environment variable
```

Vercel build command:

```bash
npm run vercel-build
```

Recommended deployment flow:

```txt
Push to GitHub
Vercel builds the project
Prisma generates the client
Prisma applies migrations
Next.js builds the app
```

---

## Vision

Arc Academy Agent is more than a quiz app.

The long-term vision is to build a gamified learning companion for Arc Network users. It helps users learn, test themselves, understand the ecosystem, and progress from **Visitor** to **Arc Master**.

The project was created to make Arc learning more accessible, more interactive, and more fun.
