# ADR-0005: AI insights with database-level cache (cache-first strategy)

## Status
Accepted

## Context
The app offers an "AI Co-Pilot" feature on each match detail page: a structured analysis of the upcoming match (predicted winner, win probabilities, tactical breakdown). Generating this with an LLM on every page view would be expensive (thousands of requests per match during peak traffic) and slow (LLM latency adds 2–5 seconds to the page load).

## Decision
Use a **cache-first strategy with staleness TTL backed by the `ai_match_insights` table**:

1. `insightsRepository.getOrGenerate(matchId)` fetches both the cached insight and the match record in parallel via `Promise.all`.
2. If a fresh cached row exists, return it — no LLM call. A row is **fresh** if `generatedAt >= matchDate − 24h` or the match is already completed.
3. If the cache misses or the row is **stale** (generated before the 24h-before-kickoff window for a scheduled match), call the LLM and upsert the result via `INSERT … ON CONFLICT (match_id) DO UPDATE SET …`.
4. The match fetch and cache lookup always run in parallel — this ensures the staleness verdict is available without a second round-trip even on a cache hit.

The 24h staleness threshold was chosen to refresh insights with late team news (injuries, lineup changes) that typically emerge in the day before kickoff. Completed matches are never regenerated.

The AI provider is configurable via `AI_PROVIDER` (`google` | `openai`) and `AI_MODEL` environment variables, with Gemini as the default. The model factory in `src/ai/index.ts` abstracts the provider choice from the rest of the codebase.

Structured output (Zod schema → `generateObject`) ensures the LLM returns machine-readable win probabilities and draw probability alongside the text analysis, not free-form prose.

## Consequences
- **Positive**: LLM cost per match is bounded — a single call per 24h window before kickoff, regardless of how many users view the match detail page.
- **Positive**: response time for fresh cached insights is two parallel DB reads (~10 ms each), not an LLM call (~2–5 s).
- **Positive**: swapping AI providers (Google → OpenAI) requires only an env var change, not a code change.
- **Positive**: stale insights are automatically refreshed within the 24h pre-kickoff window, picking up late team news.
- **Negative**: every `getOrGenerate` call issues two parallel DB reads (cache + match), even on a fresh cache hit. This is one extra round-trip vs. a sequential early-return, traded for simpler code and the staleness check.
- **Negative**: the first user to request insights for a given match (or after a staleness reset) pays the LLM latency. A background pre-generation job could warm the cache in advance.
- **Negative**: the `ai_match_insights` table is now mutable (upsert on regenerate), not append-only. Schema constraints or triggers that assume write-once would break regeneration.
