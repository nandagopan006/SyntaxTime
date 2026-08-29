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

## Friends API

A `Friendship` row records the connection between two users and how it came
about. It is a table of its own rather than a field on `User`, because being
someone's friend has a lifecycle: it is asked for, then answered.

| Field | Meaning |
| --- | --- |
| `sender` | who asked |
| `receiver` | who was asked, and the only one who may answer |
| `status` | `pending`, `accepted` or `rejected` |

One row covers a pair for good. Accepting changes that row's status; a second
row is never created, so nobody appears twice in anybody's friends list.

### Endpoints

All require authentication. The sender of a request is always taken from the
JWT, never from the request body.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/friends/` | accepted friendships |
| `DELETE` | `/api/friends/<id>/` | end a friendship (either person) |
| `GET` | `/api/friends/search/?search=abh` | find users, with your relationship to each |
| `GET` | `/api/friends/requests/` | requests waiting for you |
| `GET` | `/api/friends/requests/?direction=outgoing` | requests you have sent |
| `POST` | `/api/friends/requests/` | send one, body `{"receiver_id": 15}` |
| `PATCH` | `/api/friends/requests/<id>/` | answer one, body `{"status": "accepted"}` |

### Flow

    search -> send request -> pending -> receiver accepts -> friends

Rejecting sets the status to `rejected` and nothing more. It declines one
request; the pair can ask again later, because a rejection is not a block.

### Privacy

Friendship shares a username and an id, and nothing else. Study notes, session
history, subjects, topics and email addresses are never part of any friends
response. The leaderboard in a later phase needs only aggregate focused
minutes, so no further access is required.

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
- The friends leaderboard (the friendships behind it now exist)
- Profile
- Neo-classical visual design
