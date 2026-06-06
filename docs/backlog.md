# Kickoff — Backlog

All planned features have been implemented. Outstanding infrastructure improvements:

- **CI/CD** — GitHub Actions pipeline for automated test runs on PR and push to main
- **Rate limiting** — per-user cooldown on the AI co-pilot endpoint to prevent LLM cost overruns
- **Structured logging** — `pino` with request IDs for production observability
- **Insight TTL** — regenerate `ai_match_insights` older than 24h before kickoff
