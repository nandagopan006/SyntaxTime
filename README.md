# SyntaxTime

SyntaxTime is a personal desktop-first study application for tracking focused
study sessions. It is built mainly for Windows laptop and desktop use.

## Current phase

**Phase 1 — Project foundation.**

This phase sets up the project structure, the frontend, the backend, the
database connection and the development environment. No application features
are implemented yet.

## Technology stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Frontend         | React, Vite, JavaScript   |
| Styling          | Tailwind CSS              |
| Backend          | Python, Django            |
| API framework    | Django REST Framework     |
| Database         | Neon (PostgreSQL)         |
| Version control  | Git, GitHub               |

## Project structure

```
SyntaxTime-Project/
├── frontend/           React + Vite application
│   ├── src/
│   │   ├── App.jsx     placeholder screen
│   │   ├── main.jsx    React entry point
│   │   └── index.css   Tailwind import
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/            Django project
│   ├── config/         settings, URLs, WSGI/ASGI
│   ├── venv/           Python virtual environment (not committed)
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env            local secrets (not committed)
│   └── .env.example    template showing required variables
├── README.md
└── .gitignore
```

## Ports

Other projects on this machine already use the default ports, so SyntaxTime
uses its own:

| Service  | URL                     |
| -------- | ----------------------- |
| Backend  | http://localhost:8001   |
| Frontend | http://localhost:5180   |

## Database

SyntaxTime uses **Neon** (hosted PostgreSQL), project `SyntaxTime`. There is no
local database to install or start.

Django reads a single `DATABASE_URL` from `backend/.env`. Copy it from the Neon
console. If `DATABASE_URL` is missing, settings fall back to the `DB_*`
variables for a local PostgreSQL server instead.

Neon gives two connection strings:

- **`DATABASE_URL`** (direct) - used by Django, which holds a connection open
  between requests and so does not need the pooler.
- **`DATABASE_URL_POOLED`** - routed through PgBouncer. Useful for serverless
  functions that open many short-lived connections. Kept in `.env` for later.

Apply the schema once:

```
cd backend
venv\Scripts\activate
python manage.py migrate
```

## Environment variables

Backend configuration lives in `backend/.env`, which is ignored by Git.
Copy `backend/.env.example` to `backend/.env` and fill in real values.

| Variable               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `DJANGO_SECRET_KEY`    | Signs sessions and tokens                |
| `DJANGO_DEBUG`         | Detailed errors during development       |
| `DJANGO_ALLOWED_HOSTS` | Hostnames Django will answer to          |
| `DATABASE_URL`         | Neon connection string                   |
| `DATABASE_URL_POOLED`  | Neon pooled connection string            |

## Backend setup

```
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

## Running the backend

```
cd backend
venv\Scripts\activate
python manage.py runserver 8001
```

## Frontend setup

```
cd frontend
npm install
```

## Running the frontend

```
cd frontend
npm run dev
```

Then open http://localhost:5180.

## Phase 1 scope

Included in this phase:

- Project root with separated `frontend/` and `backend/`
- React + Vite frontend with Tailwind CSS
- Placeholder screen confirming the frontend renders
- Django project named `config`
- Django REST Framework installed
- PostgreSQL connection configured through environment variables
- `.env` for local secrets and `.env.example` as a committed template
- `.gitignore` covering dependencies, secrets and build output
- `requirements.txt` for backend dependencies

## Not implemented yet

These belong to later phases and are intentionally absent:

- Authentication and JWT
- React Router, Redux Toolkit, Axios
- Recharts and Lucide React
- Django apps for accounts, study and friends
- StudySession and DailyGoal models
- API endpoints
- Focus timer, Focus Mode and the timer popup
- History, statistics, streaks and live daily study time
- Friends and leaderboard
- Profile
- Neo-classical visual design
