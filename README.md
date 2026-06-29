# Lead Management

A full-stack application for immigration lead intake and internal follow-up.

- **Public lead form** — prospects submit first name, last name, email, and a resume/CV. On submit, a confirmation email is sent to the prospect and a notification email to an attorney.
- **Internal dashboard** — an auth-guarded UI where attorneys review all leads and mark a lead as reached out. Each lead starts `PENDING` and transitions to `REACHED_OUT`.

## Stack

| Layer | Tech |
|---|---|
| API | FastAPI (Python 3.11+), SQLAlchemy 2.0, Pydantic v2 |
| Web | Next.js 14 (App Router, TypeScript) |
| Storage | SQLite (file-based), resumes on local disk |
| Email | Swappable `EmailService` — console backend by default |
| Auth | JWT bearer tokens |

## Quickstart

See **[docs/RUNNING.md](docs/RUNNING.md)** for full local setup. In short:

```bash
# Backend  (http://localhost:8000)
cd backend
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env
.venv/Scripts/python -m uvicorn app.main:app --port 8000

# Frontend (http://localhost:3000)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Default attorney login: **`attorney` / `changeme`** (configurable in `backend/.env`).

API docs (Swagger) are auto-generated at http://localhost:8000/docs.

## Documentation

- [docs/RUNNING.md](docs/RUNNING.md) — how to run locally
- [docs/DESIGN.md](docs/DESIGN.md) — architecture and design decisions
- [docs/AGENT_USAGE.md](docs/AGENT_USAGE.md) — how coding agents were used
- [NOTES.md](NOTES.md) — per-file agent attribution
- [docs/prompts/](docs/prompts/) — representative agent prompt logs and reviews

## Demo

Screen recording of the end-to-end workflow: https://1drv.ms/v/c/f37fca3043e90ea1/IQDnST1BHWUBRLtd9emaV4ybAX_vZG0K9qNorjN4AcaN14I?e=jpKLa1

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Liveness |
| POST | `/api/auth/login` | — | Attorney login → JWT |
| POST | `/api/leads` | — | Create lead (multipart + resume) + send emails |
| GET | `/api/leads` | bearer | List leads |
| GET | `/api/leads/{id}` | bearer | Get lead |
| PATCH | `/api/leads/{id}` | bearer | Update state → `REACHED_OUT` |
| GET | `/api/leads/{id}/resume` | bearer | Download resume |
