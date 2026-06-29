# Running Locally

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm

The backend runs on port **8000**, the frontend on **3000**.

---

## 1. Backend (FastAPI)

```bash
cd backend

# Create and use a virtual environment (recommended)
python -m venv .venv
```

Activate / use it:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1` — or call the venv Python directly: `.venv\Scripts\python -m ...`
- **macOS / Linux:** `source .venv/bin/activate`

Install dependencies and configure:

```bash
.venv/Scripts/python -m pip install -r requirements.txt   # or: pip install -r requirements.txt (if venv active)
cp .env.example .env                                       # adjust values if desired
```

Run the API:

```bash
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

- Health check: http://localhost:8000/health → `{"status":"ok"}`
- Interactive API docs: http://localhost:8000/docs

> **Note (Windows):** if a global `pip install` fails with a file-lock / permission
> error, use the virtual-environment approach above — it avoids writing to the
> system Python directory.

### Configuration (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./leads.db` | SQLAlchemy DB URL |
| `UPLOAD_DIR` | `./uploads` | Where resume files are stored |
| `EMAIL_BACKEND` | `console` | `console` logs emails; `smtp` is reserved for a future real backend |
| `ATTORNEY_EMAIL` | `attorney@example.com` | Recipient of new-lead notifications |
| `ATTORNEY_USERNAME` / `ATTORNEY_PASSWORD` | `attorney` / `changeme` | Internal login credentials |
| `JWT_SECRET` | `dev-secret-change-me` | Token signing secret |
| `JWT_EXPIRE_MINUTES` | `60` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed web origin |

The SQLite database and `uploads/` directory are created automatically on first run.

---

## 2. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open **http://localhost:3000**.

---

## 3. Try the end-to-end flow

1. Go to http://localhost:3000 and submit a lead (name, email, resume file).
2. Watch the **backend terminal** — two emails are logged (one to the prospect, one to the attorney).
3. Go to http://localhost:3000/login and sign in as `attorney` / `changeme`.
4. The lead appears in the dashboard with state `PENDING`.
5. Click **Mark Reached Out** — the state changes to `REACHED_OUT`.
6. Click **Download** to retrieve the resume (auth-guarded).

### Optional: backend smoke test via curl

```bash
curl localhost:8000/health

# create a lead
printf '%%PDF-1.4 dummy' > /tmp/cv.pdf
curl -i -X POST localhost:8000/api/leads \
  -F first_name=Ada -F last_name=Lovelace -F email=ada@example.com \
  -F resume=@/tmp/cv.pdf

# login, then list with the token
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"attorney","password":"changeme"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s localhost:8000/api/leads -H "Authorization: Bearer $TOKEN"
```
