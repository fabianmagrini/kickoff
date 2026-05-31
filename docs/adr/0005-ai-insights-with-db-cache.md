# ADR-0005: AI insights with database-level cache (cache-first strategy)

## Status
Accepted

## Context
The app offers an "AI Co-Pilot" feature on each match detail page: a structured analysis of the upcoming match (predicted winner, win probabilities, tactical breakdown). Generating this with an LLM on every page view would be expensive (thousands of requests per match during peak traffic) and slow (LLM latency adds 2–5 seconds to the page load).

## Decision
Use a **cache-first strategy backed by the `ai_match_insights` table**:

1. `insightsRepository.getCached(matchId)` checks the DB first.
2. If a row exists, return it immediately — no LLM call.
3. If not, `insightsRepository.getOrGenerate(matchId)` calls the LLM (via Vercel AI SDK with structured output), writes the result to `ai_match_insights`, and returns it.
4. Subsequent requests for the same match always hit the cache.

The AI provider is configurable via `AI_PROVIDER` (`google` | `openai`) and `AI_MODEL` environment variables, with Gemini as the default. The model factory in `src/ai/index.ts` abstracts the provider choice from the rest of the codebase.

Structured output (Zod schema → `generateObject`) ensures the LLM returns machine-readable win probabilities and draw probability alongside the text analysis, not free-form prose.

## Consequences
- **Positive**: LLM cost per match is bounded to one call, regardless of how many users view the match detail page.
- **Positive**: response time for cached insights is the same as a DB read (~10 ms), not an LLM call (~2–5 s).
- **Positive**: swapping AI providers (Google → OpenAI) requires only an env var change, not a code change.
- **Negative**: insights are generated once and never refreshed. If team form changes significantly after generation, the analysis becomes stale. A TTL or manual cache-bust mechanism would address this but is not yet implemented.
- **Negative**: the first user to request insights for a given match pays the LLM latency. A background pre-generation job (e.g. triggered when a match is seeded) could warm the cache in advance.
