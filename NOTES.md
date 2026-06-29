# Agent Attribution Notes

## Process Overview

- **Architect / planner:** Claude Opus 4.8 — produced `PLAN.md`, the system design, and all strategic decisions (tech stack, email abstraction, auth approach, build order).
- **Plan reviewers:** Gemini Pro + OpenAI Codex — independently reviewed `PLAN.md` against the assignment. Outputs in `docs/prompts/`.
- **Implementer:** Claude Sonnet 4.6 — implemented all backend and frontend code from the plan.
- **Code reviewer:** Claude Opus 4.8 — reviewed Sonnet's output after each phase.

## File Attribution

| File | Agent-generated | Hand-edited | Notes |
|---|---|---|---|
| `PLAN.md` | Opus 4.8 | Minor updates after Codex/Gemini review | |
| `backend/app/config.py` | Sonnet 4.6 | No | |
| `backend/app/database.py` | Sonnet 4.6 | No | |
| `backend/app/models.py` | Sonnet 4.6 | No | |
| `backend/app/schemas.py` | Sonnet 4.6 | No | |
| `backend/app/auth.py` | Sonnet 4.6 | No | |
| `backend/app/email_service.py` | Sonnet 4.6 | No | |
| `backend/app/routers/auth.py` | Sonnet 4.6 | No | |
| `backend/app/routers/leads.py` | Sonnet 4.6 | No | |
| `backend/app/main.py` | Sonnet 4.6 | No | |
| `frontend/src/app/layout.tsx` | Sonnet 4.6 | No | |
| `frontend/src/app/page.tsx` | Sonnet 4.6 | No | Public lead form |
| `frontend/src/app/login/page.tsx` | Sonnet 4.6 | No | Attorney login |
| `frontend/src/app/leads/page.tsx` | Sonnet 4.6 | No | Internal dashboard |
| `frontend/src/lib/api.ts` | Sonnet 4.6 | No | Fetch helpers + token storage |
| `docs/DESIGN.md` | Sonnet 4.6 | TBD | |
| `docs/RUNNING.md` | Sonnet 4.6 | TBD | |

## Bugs Caught / Fixed

*(Fill in during the build — required by the assignment. Note any place Sonnet produced wrong or subtly bad code and how it was caught.)*

- TBD — capture during Opus review pass
