# Arc Docs RAG Plan

This document describes a future optional Retrieval Augmented Generation layer for Archie. It is not required for the MVP and must remain disabled until explicitly configured.

## Goals

- Help Archie answer Arc documentation questions with grounded citations.
- Keep quiz answer safety intact: Archie may teach concepts, but must not reveal a live quiz answer before answer submission.
- Keep the app usable without embeddings, vector storage, API keys, or external AI services.

## Source Ingestion

- Accept explicit documentation sources from a trusted allowlist.
- Prefer official Arc documentation, developer guides, explorer references, and release notes.
- Store source metadata: title, canonical URL, retrieval date, section heading, and source type.
- Do not scrape documentation automatically in the MVP.
- Do not ingest private user data, wallet secrets, seed phrases, private keys, or reward-operation material.

## Chunking

- Split documents by semantic section first, then by token length.
- Preserve headings and nearby context in each chunk.
- Target chunks should be small enough for focused retrieval but large enough to avoid losing definitions.
- Store a stable chunk ID derived from source URL plus heading/offset.
- Keep code examples and warning blocks intact when possible.

## Embeddings

- Embeddings are optional and disabled by default.
- A future implementation may generate embeddings only from approved public documentation chunks.
- Embedding generation should be performed by a server-side job, never in the browser.
- No API key should be required to run the MVP.

## Vector Store

- The MVP does not require a vector database.
- Future options can include Postgres vector extensions, a hosted vector store, or local file-backed indexes for development.
- Store chunk text, metadata, embedding vector, source URL, and last indexed timestamp.
- Re-indexing should be explicit and auditable.

## Retrieval

- Retrieval should accept an `AgentContext` and a user question.
- The retriever should filter by source allowlist and optional topic category.
- Results should return ranked chunks with source metadata and confidence signals.
- Retrieval should fail closed: if no relevant sources are found, Archie should say it cannot ground the answer.

## Citation Handling

- Archie should cite source titles and URLs for factual claims.
- Citations should point to the specific source section when possible.
- If sources conflict, Archie should mention uncertainty and prefer newer official documentation.
- Do not fabricate citations.

## Answer Safety Rules

- Archie must not invent unsupported Arc facts.
- Archie must distinguish testnet behavior from mainnet behavior.
- Archie must not ask for or store private keys, seed phrases, or wallet secrets.
- Archie must not provide transaction-sending or reward-distribution instructions unless a later approved phase explicitly enables that workflow.
- Archie must not claim that rewards were sent when the system only records eligibility.

## Quiz-Answer Safety Rules

- Before a quiz question is answered, Archie can explain the topic category and provide hints.
- Before answer submission, Archie must not reveal the exact correct option.
- After answer submission, Archie can explain why the selected answer was correct or incorrect.
- Joker-style help must keep the current Phase 5 behavior: conceptual hints are allowed, direct answer leakage is not.

## Future Archie Integration

- `src/lib/rag.ts` defines placeholder interfaces for source documents, chunks, retrieval results, and a disabled retriever.
- Future Archie integration can adapt retrieved chunks into `AgentResponse.sources`.
- RAG should remain optional: if no retriever is configured, Archie should continue using the rule-based Phase 13 behavior.
- External AI calls should be added only in a later explicit phase, server-side, with environment-based configuration and clear fallback behavior.

## Operational Notes

- Keep ingestion, embedding, retrieval, and answer generation separate.
- Log indexing jobs and source versions.
- Add tests that confirm disabled RAG returns no results and does not call external services.
- Add review gates before enabling any live AI provider.
