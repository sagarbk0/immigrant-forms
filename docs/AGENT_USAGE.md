# Coding-Agent Usage

## Tools

- **Claude Code — Opus 4.8** as the *architect and reviewer*: produced the system design and `PLAN.md`, reviewed each phase of the implementer's output, and handled git hygiene.
- **Claude Code — Sonnet 4.6** as the *implementer*: wrote essentially all of the backend and frontend code from `PLAN.md`. Running the cheap model for execution and the expensive model for planning/review was a deliberate cost choice on a limited token budget.
- **Gemini Pro** and **OpenAI Codex** as *independent plan reviewers*: each was given the assignment + `PLAN.md` and critiqued it before any code was written. Their reviews are in `docs/prompts/`.

## How the work was divided

- **Delegated to Sonnet:** all application code — FastAPI config/models/schemas/routers/auth/email service, and the Next.js form, login, dashboard, and API client. Driven by scoped, one-phase-at-a-time prompts (backend steps 1–4, then frontend), each ending in a self-verification step.
- **Done by Opus:** the first-draft architecture and `PLAN.md`; the end-to-end smoke test of the backend; code review of Sonnet's output; per-step commits with model attribution; git hygiene.

## Human review and orchestration (my role)

I treated the plan as the most important artifact and drove its review before any code was written:

- **Reviewed `PLAN.md` directly.** I read the draft plan and pushed back on it — checking the hard requirements were actually covered (confirming FastAPI was used for the APIs and Next.js for the web app), questioning the email approach, and probing requirement coverage (e.g. where the auth-guarded internal UI lived, and the full endpoint list) before signing off.
- **Commissioned an independent cross-review.** Rather than trust a single model, I ran the assignment + `PLAN.md` through **two other vendors' models — Gemini Pro and OpenAI Codex** — to red-team the plan, then **adjudicated their feedback**: deciding what to fold in (reframing console email as a deliberate dev backend; adding explicit agent-usage deliverables and a scope guardrail) and what to ignore (e.g. skipping Deep Research as a time sink).
- **Made the scope and time-budget calls.** Console email now / SMTP deferred behind a swappable interface; optimize for a working E2E demo over completeness under the time limit.
- **Caught process and privacy gaps the agents missed.** That commits weren't being made along the way (switched to per-step, attributed commits); and that some private reference material shouldn't be published — directing its removal from the working tree *and* git history before any push.

Representative prompts and my plan-review exchanges are in `docs/prompts/claude-session-transcript.md`; the two commissioned cross-model reviews are alongside it.

## One place the agent produced subtly bad code

The backend stored timestamps as naive UTC and serialized them **without a timezone marker** (e.g. `2026-06-29T02:37:33.597830`). On the dashboard, the frontend rendered them with `new Date(lead.created_at)` — and JavaScript parses an ISO string **with no offset as local time**, not UTC. The result: dates that silently shift by the viewer's UTC offset, which can show the wrong calendar day near midnight.

This wasn't caught by `npm run build` (it compiles and types fine) — it surfaced during the Opus review when cross-checking the smoke-test JSON and noticing `created_at` carried no `Z`/offset. **Fix:** a Pydantic `field_serializer` on `LeadOut` now marks the timestamps as UTC and emits ISO‑8601 with an explicit offset, so the browser parses them unambiguously (`backend/app/schemas.py`).

It's a good example of the class of bug agents produce: not a crash, but a plausible-looking line that's wrong only under specific conditions — exactly what human/second-model review is for.
