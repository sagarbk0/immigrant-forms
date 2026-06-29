# Coding-Agent Usage

## Tools

- **Claude Code — Opus 4.8** as the *architect and reviewer*: produced the system design and `PLAN.md`, reviewed each phase of the implementer's output, and handled git hygiene.
- **Claude Code — Sonnet 4.6** as the *implementer*: wrote essentially all of the backend and frontend code from `PLAN.md`. Running the cheap model for execution and the expensive model for planning/review was a deliberate cost choice on a limited token budget.
- **Gemini Pro** and **OpenAI Codex** as *independent plan reviewers*: each was given the assignment + `PLAN.md` and critiqued it before any code was written. Their reviews are in `docs/prompts/`.

## Delegated vs. written by hand

- **Delegated to Sonnet:** all application code — FastAPI config/models/schemas/routers/auth/email service, and the Next.js form, login, dashboard, and API client. Driven by scoped, one-phase-at-a-time prompts (backend steps 1–4, then frontend), each ending in a self-verification step.
- **Done by Opus (me, with the human steering):** the architecture and `PLAN.md`; folding the Gemini/Codex feedback into the plan; the end-to-end smoke test of the backend; reviewing Sonnet's code; per-step commits with model attribution; scrubbing the assignment brief and interviewer profile out of git history before any push.
- **Human decisions:** scope and time-budget calls (e.g. console email now, SMTP deferred), and process corrections (commit-as-you-go, privacy of source documents).

Representative prompts are in `docs/prompts/claude-session-transcript.md`; the cross-model reviews are alongside it.

## One place the agent produced subtly bad code

The backend stored timestamps as naive UTC and serialized them **without a timezone marker** (e.g. `2026-06-29T02:37:33.597830`). On the dashboard, the frontend rendered them with `new Date(lead.created_at)` — and JavaScript parses an ISO string **with no offset as local time**, not UTC. The result: dates that silently shift by the viewer's UTC offset, which can show the wrong calendar day near midnight.

This wasn't caught by `npm run build` (it compiles and types fine) — it surfaced during the Opus review when cross-checking the smoke-test JSON and noticing `created_at` carried no `Z`/offset. **Fix:** a Pydantic `field_serializer` on `LeadOut` now marks the timestamps as UTC and emits ISO‑8601 with an explicit offset, so the browser parses them unambiguously (`backend/app/schemas.py`).

It's a good example of the class of bug agents produce: not a crash, but a plausible-looking line that's wrong only under specific conditions — exactly what human/second-model review is for.
