  # SyntaxTime

SyntaxTime is a personal desktop-first study application for tracking focused
study sessions. It is built mainly for Windows laptop and desktop use.

## Current phase

**Phase 15 — Study leaderboard.**

The focus timer, dashboard, study history, friends and the friend leaderboard
are all in place. See the API sections below for the endpoints behind them.

Note: the project structure section further down still describes the Phase 1
layout and has not been refreshed.

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

## Leaderboard API

The leaderboard ranks the signed-in user and their accepted friends by how many
focused minutes each of them has actually recorded.

**There is no leaderboard table.** A ranking is not a fact worth storing - it is
a question asked of two things that already exist, `Friendship` and
`StudySession`. A stored copy would go stale the moment anyone finished a
session. `apps/leaderboard/` therefore has no `models.py` and no migrations.

### Endpoints

Both require authentication and are read-only.

| Method | Path | Period |
| --- | --- | --- |
| `GET` | `/api/leaderboard/weekly/` | the current Monday-to-Sunday week |
| `GET` | `/api/leaderboard/monthly/` | the current calendar month |

### Response

```json
{
  "period": "weekly",
  "start_date": "2026-08-24",
  "end_date": "2026-08-30",
  "entries": [
    {"rank": 1, "user_id": 2, "username": "nandhu",
     "focused_minutes": 250, "is_current_user": true}
  ]
}
```

### Rules

- Only `status = "completed"` sessions count. Cancelled sessions, break time and
  a timer still running all contribute nothing.
- Only `focused_minutes` counts, never the planned length of a session.
- Only accepted friendships qualify; the list of people is read from the
  database, never from the request.
- A friend who studied nothing still appears, at `0`.
- The signed-in user is always on their own board, however far down.
- Ties are broken by username, so the same question always gets the same order.
- An entry carries a rank, an id, a username and a number of minutes. No notes,
  subjects, timestamps or email addresses leave this endpoint.

## Not implemented yet

These belong to later phases and are intentionally absent:

- Profile statistics
- Notifications
