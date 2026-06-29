# Implementation Plan — Lead Management App

> **Audience:** an implementing/verifying coding agent starting with NO prior context.
> Everything needed is in this file. Follow steps in order. Each step ends with a
> concrete verification command.

> ## ⏱️ STRATEGY: ~1 HOUR BUDGET — OPTIMIZE FOR A WORKING E2E DEMO
> The official window is 6h, but the working budget here is ~1 hour. Priorities in order:
> **(1) working end-to-end flow → (2) honest agent-usage docs → (3) clean structure → (4) everything else.**
> A simple app that *works* and is *documented honestly* beats a grand app that *almost* works.
> Automated tests are OPTIONAL under this budget (use the manual smoke test in §10 instead).
> See §12 (do-NOT-do list), §13 (agent-usage deliverables), §14 (Loom recording) — these are graded, not optional.
> Suggested clock: 0–35 build · 35–45 run & fix blockers · 45–52 docs+NOTES · 52–58 record Loom · 58–60 submit.

## 0. Goal & Scope

Build a lead-management app:

- **Public lead form** (no auth): prospect submits `first_name`, `last_name`, `email`, `resume` (file).
- On submit, the system **persists** the lead and **sends two emails** — one to the prospect (confirmation), one to a company attorney (notification). **For now email = console/log output only**, behind a swappable interface so a real SMTP backend can be added later.
- **Internal UI** (auth-guarded): list all leads with their data; mark a lead `REACHED_OUT`.
- A lead has `state`: starts `PENDING`, transitions to `REACHED_OUT` manually by an attorney.

### Tech (non-negotiable)
- Backend: **FastAPI** (Python 3.11+), SQLAlchemy 2.0, Pydantic v2.
- Frontend: **Next.js** (App Router, TypeScript).
- DB: **SQLite** (file `backend/leads.db`), via SQLAlchemy so it's swappable.
- Resume files: stored on local disk under `backend/uploads/`, path saved in DB.
- Email: **console backend** (logs the email) behind an `EmailService` interface.
- Auth: **JWT**. One seeded attorney user (env-configured). `POST /api/auth/login` → bearer token.

---

## 1. Repository Layout (create exactly this)

```
alma-forms/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, CORS, router includes
│   │   ├── config.py           # pydantic-settings (env vars)
│   │   ├── database.py         # engine, SessionLocal, Base, get_db dep
│   │   ├── models.py           # Lead ORM model + LeadState enum
│   │   ├── schemas.py          # Pydantic request/response models
│   │   ├── auth.py             # password hash, JWT create/verify, get_current_user
│   │   ├── email_service.py    # EmailService protocol + ConsoleEmailService + factory
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py         # POST /api/auth/login
│   │       └── leads.py        # leads CRUD + resume download
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py         # pytest, FastAPI TestClient
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore              # ignore *.db, uploads/, .env, __pycache__
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # public lead form
│   │   │   ├── login/page.tsx  # attorney login
│   │   │   └── leads/page.tsx  # internal leads list (guarded client-side)
│   │   └── lib/api.ts          # fetch helpers + token storage
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── .env.local.example      # NEXT_PUBLIC_API_URL=http://localhost:8000
├── docs/
│   ├── DESIGN.md               # design rationale
│   └── RUNNING.md              # how to run locally
├── NOTES.md                    # agent-vs-handwritten attribution
├── PLAN.md                     # this file
└── README.md
```

---

## 2. Data Model

`LeadState` = enum: `PENDING`, `REACHED_OUT`.

`Lead` table `leads`:
| column | type | notes |
|---|---|---|
| id | str (UUID) | primary key, generated server-side |
| first_name | str | required, non-empty |
| last_name | str | required, non-empty |
| email | str | required, valid email (Pydantic `EmailStr`) |
| resume_filename | str | original uploaded filename |
| resume_path | str | path on disk under uploads/ |
| state | enum | default `PENDING` |
| created_at | datetime | UTC, default now |
| updated_at | datetime | UTC, default now, updated on change |

---

## 3. API Contract

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/login` | none | JSON `{username, password}` | `{access_token, token_type}` |
| POST | `/api/leads` | none | `multipart/form-data`: first_name, last_name, email, resume(file) | `201` LeadOut |
| GET | `/api/leads` | bearer | — | `200` `[LeadOut]` |
| GET | `/api/leads/{id}` | bearer | — | `200` LeadOut / `404` |
| PATCH | `/api/leads/{id}` | bearer | JSON `{state: "REACHED_OUT"}` | `200` LeadOut |
| GET | `/api/leads/{id}/resume` | bearer | — | file download / `404` |
| GET | `/health` | none | — | `{"status":"ok"}` |

`LeadOut` = id, first_name, last_name, email, resume_filename, state, created_at, updated_at. (Do **not** expose raw disk path.)

**Validation rules:**
- Reject empty names. Reject invalid email (use `EmailStr`).
- Resume: accept `.pdf`, `.doc`, `.docx`; reject others with `400`. Cap size (e.g. 5 MB).
- Store file as `uploads/{lead_id}{ext}` to avoid collisions.

**On POST /api/leads (order matters):**
1. Validate inputs.
2. Save file to disk.
3. Insert Lead row (state=PENDING).
4. Send prospect email + attorney email via `EmailService`. Email failure must **not** fail the request (log it) — submission already persisted.
5. Return `201` with LeadOut.

---

## 4. Email Service (console backend only, for now)

`email_service.py`:
- `EmailService` — a Protocol/ABC with `send(to: str, subject: str, body: str) -> None`.
- `ConsoleEmailService` — implements `send` by logging a clearly formatted block (TO / SUBJECT / BODY) via `logging.info`.
- `get_email_service()` factory reads `EMAIL_BACKEND` env (default `console`). Leave a clear `# TODO: SMTPEmailService` branch so a real backend drops in later.
- **Wording for docs:** call this a *"development / console email backend,"* NOT a production email integration. In DESIGN.md add one line: *"Email delivery is represented by a swappable EmailService; production would use SMTP/Resend/SendGrid plus retries, an outbox, and a background job."* This frames the choice as a deliberate tradeoff, not a missing feature.
- Two helper functions: `send_prospect_confirmation(lead)` and `send_attorney_notification(lead, attorney_email)` that compose subject/body and call the service. `attorney_email` comes from config.

Verification: submitting a lead prints two formatted email blocks to the backend console.

---

## 5. Auth

- Config holds `ATTORNEY_USERNAME`, `ATTORNEY_PASSWORD` (plaintext in `.env` for the seed user is acceptable for this exercise; hash-compare at login), `JWT_SECRET`, `JWT_EXPIRE_MINUTES` (e.g. 60).
- `POST /api/auth/login`: compare creds; on success return JWT (`sub=username`, exp).
- `get_current_user` dependency: parse `Authorization: Bearer <token>`, verify signature+exp, else `401`. Apply to GET list, GET one, PATCH, GET resume.
- Use `python-jose[cryptography]` + `passlib[bcrypt]`. (If `passlib` adds friction, a stdlib `hmac`/`hashlib` compare of the plaintext env password is acceptable — keep it simple.)

---

## 6. Frontend (3 pages, plain fetch)

- `lib/api.ts`: base URL from `NEXT_PUBLIC_API_URL`; `getToken()/setToken()` in `localStorage`; helpers `submitLead(formData)`, `login(u,p)`, `listLeads()`, `markReachedOut(id)`, `resumeUrl(id)`.
- `app/page.tsx` (public): form with the 4 fields + file input → POST `/api/leads`. Show success/error. No auth.
- `app/login/page.tsx`: username/password → store token → redirect to `/leads`.
- `app/leads/page.tsx`: on mount, if no token → redirect to `/login`. Fetch leads, render a table (name, email, state, created, resume link, action). "Mark Reached Out" button calls PATCH and refreshes; hide/disable when already `REACHED_OUT`. Resume link must send the bearer token (fetch the file as a blob with the Authorization header, then open it — a plain `<a href>` won't carry the token).
- Keep styling minimal (inline or a tiny CSS file). No component libraries required.

---

## 7. Build Order (one small step at a time)

1. **Backend scaffold:** `requirements.txt`, `config.py`, `database.py`, `models.py`, `schemas.py`. Verify: `python -c "from app.database import Base; import app.models"` imports clean.
2. **Email service:** `email_service.py`. Verify: a quick `get_email_service().send(...)` logs a block.
3. **Leads router:** create/list/get/patch/resume + wire email on create. Verify with curl (below).
4. **Auth:** login route + `get_current_user`; guard the protected routes. Verify list returns `401` without token, `200` with.
5. **Frontend:** the 3 pages + `lib/api.ts`. Verify manually end-to-end against running backend (this is the demo — prioritize over tests).
6. **Docs:** fill `docs/DESIGN.md`, `docs/RUNNING.md`, `README.md`, `NOTES.md` (see §13). Add the email-tradeoff line from §4.
7. **Loom recording** (§14) → then submit.
8. **(OPTIONAL, only if time remains)** `tests/test_api.py` — login, create lead (multipart with a tiny fake PDF), list (auth), patch→REACHED_OUT, resume download, `401` case. `pytest -q` green. Under the 1-hour budget, the §10 manual smoke test substitutes for this.

---

## 8. requirements.txt (pin loosely)

```
fastapi
uvicorn[standard]
sqlalchemy>=2.0
pydantic>=2
pydantic-settings
email-validator
python-multipart
python-jose[cryptography]
passlib[bcrypt]
pytest
httpx
```

`python-multipart` is required for file/form uploads — easy to forget.

---

## 9. .env.example (backend)

```
DATABASE_URL=sqlite:///./leads.db
UPLOAD_DIR=./uploads
EMAIL_BACKEND=console
ATTORNEY_EMAIL=attorney@example.com
ATTORNEY_USERNAME=attorney
ATTORNEY_PASSWORD=changeme
JWT_SECRET=dev-secret-change-me
JWT_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:3000
```

---

## 10. Verification Checklist (end-to-end smoke test)

Run backend (`uvicorn app.main:app --reload --port 8000`) then:

```bash
# health
curl localhost:8000/health

# create a lead (public) — make a dummy file first
echo "%PDF-1.4 dummy" > /tmp/cv.pdf
curl -i -X POST localhost:8000/api/leads \
  -F first_name=Ada -F last_name=Lovelace -F email=ada@example.com \
  -F resume=@/tmp/cv.pdf
#  -> 201, and backend console shows TWO email blocks (prospect + attorney)

# login (attorney)
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"attorney","password":"changeme"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# list requires auth
curl -i localhost:8000/api/leads                      # -> 401
curl -s localhost:8000/api/leads -H "Authorization: Bearer $TOKEN"   # -> [ {state:"PENDING"...} ]

# mark reached out
LEAD_ID=...   # copy id from list
curl -s -X PATCH localhost:8000/api/leads/$LEAD_ID \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"state":"REACHED_OUT"}'                          # -> state REACHED_OUT
```

**Pass criteria:**
- [ ] Public POST creates a lead, returns 201, persists across restarts (SQLite file).
- [ ] Two email blocks logged on submit.
- [ ] Invalid email / missing field / bad file type → 4xx with clear message.
- [ ] Protected endpoints return 401 without a valid token.
- [ ] Login returns a working token; list/get/patch/resume work with it.
- [ ] PATCH moves PENDING → REACHED_OUT and persists.
- [ ] `pytest -q` passes.
- [ ] Frontend: form submits; login works; leads table renders; "Mark Reached Out" updates the row; resume link downloads the file.

---

## 11. NOTES.md requirement

While implementing, record in `NOTES.md` which files/sections were agent-generated vs. hand-edited, and note any spot where generated code was wrong/subtly buggy and how it was fixed. (Submission requires this attribution.)

---

## 12. Scope guardrail — do NOT do these (under the time budget)

Do **not** add any of the following unless the core E2E flow is already green and demoed:
Postgres, OAuth/social login, message queues or Celery, real SMTP/Resend, Docker/deployment,
fancy CSS or component libraries, pagination, search, role hierarchies, refresh tokens.
If tempted, write it as "Future Work" in DESIGN.md instead of building it.

---

## 13. Agent-usage deliverables (GRADED — the assignment evaluates *how* you use agents)

The assignment requires THREE separate artifacts. Produce all three:

1. **`docs/AGENT_USAGE.md` — ½-page max writeup** covering:
   - Which tools/agents were used (e.g. Opus 4.8 = architect/plan; Sonnet = implementation; Gemini + Codex = independent plan review; chat = debugging partner).
   - What was **delegated vs. hand-written**, and **why**.
   - **One concrete example** of where an agent produced wrong or subtly-bad code — how it was caught and fixed. *(Capture this DURING the build; don't reconstruct it after.)*
2. **`docs/prompts/` — representative prompt logs / transcript excerpts.** Save the real prompts you fed Sonnet, plus the existing `PLAN.md`, `Gemini Pro Review.pdf`, and `Codex Review.txt` — the multi-agent **plan → cross-review → implement** loop IS the story; keep it as evidence.
3. **`NOTES.md` — per-file attribution** (agent-generated vs. hand-written vs. agent-then-hand-edited). Also reflect this in commit messages where practical.

> Narrative to make explicit: you used a **planning model (Opus) + cheaper implementer (Sonnet) + two independent reviewers (Gemini, Codex)**. That deliberate division of labor is exactly what "we're evaluating how you use agents" is asking for.

---

## 14. Loom / screen recording (REQUIRED submission artifact)

Record a short (~2 min) screen capture of the E2E workflow, in this order:
1. Open public form → submit a lead (name, email, resume file).
2. Show the **backend console** printing the two email blocks (prospect + attorney).
3. Go to `/login` → log in as the attorney.
4. Show the lead in the internal list (state `PENDING`).
5. Click **Mark Reached Out** → row updates to `REACHED_OUT`.
6. (Optional) Open the resume download.

Keep it unedited and honest. Put the link in the README and the assignment submission.

---

## 15. Final submission checklist
- [ ] Public GitHub repo pushed (code + all docs).
- [ ] `docs/RUNNING.md` — verified by following it from scratch.
- [ ] `docs/DESIGN.md` — choices + tradeoffs + Future Work (incl. real email).
- [ ] `docs/AGENT_USAGE.md` (½ page) + `docs/prompts/` + `NOTES.md`.
- [ ] Loom link in README.
- [ ] Submit GitHub link in the assignment form within the 6-hour window.
```
