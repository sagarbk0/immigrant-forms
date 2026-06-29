# Claude Code — Session Transcript (representative excerpts)

> Agent-usage evidence for the assignment. These are the real prompts used to drive
> the coding agents in this build. Workflow: **Opus 4.8 (architect/reviewer) →
> Sonnet 4.6 (implementer)**, with **Gemini Pro + Codex** as independent plan reviewers
> (their outputs are the sibling files in this folder). Excerpted for brevity.

---

## 1. Initial design request (→ Opus 4.8)

> "Develop an application to support creating, getting and updating leads … [full
> assignment] … Come up with a design for this that even sonnet can implement because
> I don't wanna use up tokens too fast."

**Why this prompt:** deliberately asked the expensive model (Opus) to *plan*, optimizing
the plan for a cheaper model (Sonnet) to *execute* — to conserve the $20-plan token budget.
Output: `PLAN.md`.

---

## 2. Scoping decision — email integration (Opus Q&A)

User asked whether real SMTP was worth it under a tight time budget. Decision reached:

> "Maybe we can defer it later on … For now, use the local logging."

**Resulting design choice:** a swappable `EmailService` protocol with a `ConsoleEmailService`
default and an SMTP backend stubbed behind `EMAIL_BACKEND=smtp`. Satisfies "integrate with
an email service" architecturally without credential/deliverability risk.

---

## 3. Cross-review of the plan (→ Gemini Pro, → Codex)

The plan + assignment were handed to two *other* vendors' models for independent review
(see `Gemini Pro Review.md`, `Codex Review.txt`, `codex_suggestion.txt`). Their feedback
was folded back into `PLAN.md` by Opus:
- Reframed console email as a deliberate "development backend," not a missing feature.
- Added explicit agent-usage deliverables (§13), Loom step (§14), and a scope-creep
  guardrail (§12).
- Confirmed time strategy: optimize for a working E2E demo over completeness.

---

## 4. Backend implementation (→ Sonnet 4.6)

> "You are now implementing the app defined in `PLAN.md` … Build the BACKEND only —
> steps 1–4 of §7. Do not touch the frontend or write tests yet. … Follow the validation
> rules in §3 … and the POST ordering (persist before email; email failure must NOT fail
> the request). Hard guardrails (§12): no Postgres, OAuth, queues, real SMTP, Docker …
> When done, run the §10 manual smoke test yourself … Then STOP and wait."

**Delegated to Sonnet:** all FastAPI code (config, models, schemas, routers, auth, email
service). **Verified by Opus:** full curl smoke test — all §10 criteria green, two email
blocks logged on submit.

---

## 5. Frontend implementation (→ Sonnet 4.6)

> "You're resuming the build … The backend is complete and smoke-tested green — do NOT
> modify anything under `backend/`. Build the frontend only (PLAN.md §6) … Critical detail
> (§6): the resume download MUST use `fetch` with the `Authorization: Bearer` header, then
> `response.blob()` → object URL → click — a plain `<a href>` will 401. … Commits — one per
> logical step … `Co-Authored-By: Claude Sonnet 4.6`."

**Delegated to Sonnet:** all Next.js code (3 pages + API client). **Verified by Opus:**
`npm run build` clean; all three routes render 200 at runtime; API client matches the
verified backend contract.

---

## 6. Mid-build process corrections (→ Opus)

Representative of how the human steered the agents:
- "I have to make commits along the way" → switched to per-step commits with model attribution.
- "I want to avoid posting Question.pdf in any git commit at all" → history rebuilt; assignment
  brief and interviewer profile removed from tree and history before any push.
- "remove the references to [interviewer] in the prompts" → Gemini review PDF converted to a
  redacted markdown transcript.

---

## 7. Review findings fed back (→ NOTES.md)

Opus review of Sonnet's output flagged a subtle timezone-serialization nit (naive UTC
datetimes parsed as local time in the browser) — recorded in `NOTES.md` as a caught issue.
