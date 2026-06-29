# Design Document

## 1. Overview

The system has two surfaces over a single FastAPI backend:

1. A **public lead intake** form (no auth) that accepts a prospect's details + resume and triggers two emails.
2. An **internal, auth-guarded dashboard** for attorneys to review leads and advance their state.

```
 Prospect ─▶ Next.js public form ─▶ POST /api/leads ─▶ FastAPI
                                                         ├─ save resume to disk
                                                         ├─ insert Lead (PENDING)
                                                         └─ EmailService → prospect + attorney

 Attorney ─▶ Next.js /login ─▶ JWT ─▶ /leads dashboard ─▶ GET/PATCH /api/leads (bearer)
```

Monorepo layout: `backend/` (FastAPI) and `frontend/` (Next.js), kept independent with a clean HTTP boundary — the structure a real production repo would use.

## 2. Data model

A single `leads` table keeps the domain minimal and obvious:

| field | notes |
|---|---|
| `id` | server-generated UUID |
| `first_name`, `last_name`, `email` | required; `email` validated as `EmailStr` |
| `resume_filename` | original upload name (shown in UI / used for download) |
| `resume_path` | path on disk; **never exposed** in API responses |
| `state` | enum `PENDING` → `REACHED_OUT`, default `PENDING` |
| `created_at`, `updated_at` | UTC timestamps |

`LeadOut` (the response schema) deliberately omits `resume_path` so the internal file layout never leaks to clients.

## 3. Key decisions & trade-offs

**SQLite + SQLAlchemy.** Zero-setup, file-based persistence that satisfies "add a storage to persist data" without a database server. SQLAlchemy keeps it swappable — moving to Postgres is a `DATABASE_URL` change. Trade-off: SQLite isn't for high-concurrency production, but it's ideal for a self-contained deliverable.

**Resumes on local disk.** Files are written to `uploads/{lead_id}{ext}` (UUID-named to avoid collisions and path-traversal from user filenames) and served back through an auth-guarded endpoint. Trade-off: not horizontally scalable — object storage (S3) is the production path (see §5).

**Pluggable email service.** `EmailService` is a `Protocol` with a `ConsoleEmailService` implementation that logs a formatted block, selected by `get_email_service()` reading `EMAIL_BACKEND`. Email delivery here is represented by a swappable service; production would use SMTP / Resend / SendGrid plus retries, an outbox, and a background job. This proves the decoupling pattern without taking on credential and deliverability risk in a time-boxed build. Email failures are caught and logged — a delivery problem never fails a submission that was already persisted.

**JWT auth with a single seeded attorney.** The brief calls for "an internal UI guarded by auth," not full user management. A single env-configured attorney account issues a signed JWT on login; `get_current_user` validates the bearer token on every internal endpoint. Trade-off: no user table / roles / refresh tokens — intentionally out of scope (see §5).

**Submission ordering.** On `POST /api/leads`: validate → save file → insert row → send emails. Persistence happens before side effects, and email sending is best-effort, so the prospect's submission is never lost to an email hiccup.

## 4. API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Liveness |
| POST | `/api/auth/login` | — | Attorney login → JWT |
| POST | `/api/leads` | — | Create lead (multipart) + send emails |
| GET | `/api/leads` | bearer | List leads |
| GET | `/api/leads/{id}` | bearer | Get lead |
| PATCH | `/api/leads/{id}` | bearer | Transition state |
| GET | `/api/leads/{id}/resume` | bearer | Download resume |

Validation: non-empty names, valid email, resume restricted to `.pdf/.doc/.docx` and ≤ 5 MB.

## 5. Production considerations / future work

Deliberately deferred to keep the build focused; each is a clean extension of the current structure:

- **Real email backend** — implement `SMTPEmailService`, switch via `EMAIL_BACKEND=smtp`; add an outbox table + background worker + retries for reliable delivery.
- **Postgres** — change `DATABASE_URL`; add Alembic migrations.
- **Object storage** — store resumes in S3 and stream via presigned URLs instead of local disk.
- **Auth hardening** — real user table, hashed passwords (the code already pulls in `passlib`), roles, refresh tokens, and HTTP-only cookies instead of `localStorage`.
- **Abuse protection** — rate-limiting and file content/AV scanning on the public endpoint.
- **Scale-out reads** — pagination, filtering, and search on the leads list.
- **Timezone correctness** — timestamps are serialized as explicit UTC (ISO with offset) so clients render them unambiguously; a tz-aware column type would make this guaranteed at the storage layer.
