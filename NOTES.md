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
| `backend/app/schemas.py` | Sonnet 4.6 | Yes — Opus added UTC timezone serializer | See Bugs section |
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

- **Subtly bad code (Sonnet → fixed by Opus review): naive-UTC timestamps misread as local time.**
  The backend serialized `created_at`/`updated_at` with no timezone marker, and the
  frontend parsed them via `new Date(...)`, which treats an offset-less ISO string as
  *local* time — silently shifting displayed dates by the viewer's UTC offset. It passed
  `npm run build` and type-checking; caught during the Opus review by noticing the
  smoke-test JSON had no `Z`/offset on `created_at`. Fixed with a Pydantic
  `field_serializer` on `LeadOut` that marks timestamps as UTC and emits an explicit
  offset (`backend/app/schemas.py`). See `docs/AGENT_USAGE.md` for the full writeup.

- **Tooling gotcha (not app code): PowerShell mangled JSON in curl.**
  During the backend smoke test, `curl -d '{\"k\":\"v\"}'` arrived as malformed JSON
  because PowerShell rewrote the escaped quotes — the API correctly returned a 422. Not
  a code bug; fixed the test by writing JSON to a file and using `curl --data-binary @file`.
