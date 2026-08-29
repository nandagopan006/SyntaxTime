  # SyntaxTime

SyntaxTime is a personal desktop-first study application for tracking focused
study sessions. It is built mainly for Windows laptop and desktop use.

## Current phase

**Phase 22 — Forgot password and password reset.**

Every planned feature is built: the focus timer, Home dashboard, study
history, friends, the leaderboard and the personal profile. See the API
sections below for the endpoints behind them.

## Technology stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Frontend         | React, Vite, JavaScript   |
| Styling          | Tailwind CSS              |
| Backend          | Python, Django            |
| API framework    | Django REST Framework     |
| Database         | Neon (PostgreSQL)         |
| Version control  | Git, GitHub               |

## How it fits together

```
React components        what the user sees
        |
Redux (timer, ui)       the running session, shared across every view
        |
services/*.js           every HTTP call, one function per endpoint
        |
Django REST             validation, ownership, business rules
        |
PostgreSQL              the only place anything is stored
```

Two rules hold the whole thing together:

- **One timer.** `features/timer/timerSlice.js` holds the running session and
  `hooks/useTimer.js` is the only countdown. Home, the popup and Focus Mode are
  three views of that one state, never three timers.
- **Statistics are derived, never stored.** Streaks, leaderboards and profile
  totals are calculated from `StudySession` on request. There is no table of
  precomputed figures to go stale.

## Project structure

```
frontend/src/
├── app/store.js            the Redux store
├── features/               Redux slices and the state they own
│   ├── timer/              the active session, and its status wording
│   ├── statistics/         saved study data shared across pages
│   └── ui/                 popup and focus-mode visibility
├── components/
│   ├── ui/                 Button, Section, PageHeader, Empty/LoadingState
│   ├── layout/             shell, sidebar, top bar, error boundary
│   ├── timer/              focus timer, popup, focus mode, break
│   ├── dashboard/          Home sections
│   ├── history/            session list, detail, edit
│   ├── friends/            search, requests, friends
│   └── profile/            personal overview
├── context/AuthContext.jsx the signed-in user
├── hooks/                  useTimer, useTimerShortcuts
├── pages/                  Home, History, Friends, Profile, Login, Register
├── services/               one file per API area
└── utils/                  time, date and session formatting

backend/
├── config/                 settings and root URLs
└── apps/
    ├── accounts/           registration, login, the current user
    ├── study/              StudySession, DailyGoal, all study statistics
    ├── friends/            Friendship and friend requests
    └── leaderboard/        ranking; no models, it only reads the other two
```

Local secrets live in `backend/.env` and `frontend/.env`, neither of which is
committed. Both have a `.env.example` beside them.

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
| `BREVO_API_KEY`        | Sends the registration verification email |
| `BREVO_SENDER_EMAIL`   | The verified address the email comes from |
| `BREVO_SENDER_NAME`    | The name shown as the sender             |
| `FRONTEND_URL`         | Where password reset links point         |

`FRONTEND_URL` is the React application, not Django: the reset screen lives in
the frontend. It is `http://localhost:5180` in development and the real domain
in production, so reset links never send anybody to their own machine.

The Brevo key is a password. It lives in `backend/.env` and nowhere else: it
is never sent to the React frontend, never put in a URL or an API response,
and never committed.

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

## Registration and email verification

Creating an account takes two steps, because an address nobody can receive
mail at is not an account anybody can recover.

### Flow

1. The register form posts to `POST /api/auth/register/`.
2. Django validates the details and stores them in `PendingRegistration`:
   the password hashed, plus a hash of a freshly generated six-digit code.
   **No `User` row exists at this point.**
3. Brevo emails the code to the address given.
4. The visitor types the code on `/verify-email`, which posts to
   `POST /api/auth/verify-email/`.
5. If the code matches, Django creates the `User` and deletes the pending
   row, in one transaction. The visitor is sent to `/login` to sign in.

`POST /api/auth/resend-otp/` sends a new code, replacing the old one. It is
refused for 60 seconds after the previous send.

### What the rules are

| Rule                        | Value                                   |
| --------------------------- | --------------------------------------- |
| Code length                 | 6 digits                                |
| Code lifetime               | 10 minutes                              |
| Wrong attempts allowed      | 5, after which the code is dead         |
| Resend cooldown             | 60 seconds                              |
| Pending registration expiry | 30 minutes                              |
| Register requests           | 10 per hour                             |
| Verify and resend requests  | 20 per hour                             |

The raw code is never stored, never returned by the API and never logged.
Only its hash is kept, and only long enough to check one answer against it.

### Setting up Brevo

1. Create a free account at https://www.brevo.com.
2. Verify a sender address under **Senders, Domains & Dedicated IPs**. Mail
   sent from an unverified address is rejected.
3. Create an API key under **SMTP & API > API Keys**.
4. Put both in `backend/.env`:

   ```
   BREVO_API_KEY=the_key_from_brevo
   BREVO_SENDER_EMAIL=the_address_you_verified
   BREVO_SENDER_NAME=SyntaxTime
   ```

5. Restart Django. Settings are read once at startup.

### Local development without a key

With `BREVO_API_KEY` empty and `DJANGO_DEBUG=True`, nothing is sent. Django
prints the whole verification email, code included, to the console running
`runserver`, so the flow can be worked through without an inbox. With
`DJANGO_DEBUG=False` a missing key is an error instead, so production can
never silently stop sending.

## Password reset

Somebody who cannot sign in cannot prove who they are, so the proof is a link
sent to the address already on the account.

### Flow

1. `Forgot password?` on the sign-in screen leads to `/forgot-password`.
2. The address is posted to `POST /api/auth/forgot-password/`.
3. If an account exists for it, Django builds a signed token and Brevo emails
   a link to `FRONTEND_URL/reset-password/<uid>/<token>/`.
4. The link opens `/reset-password/:uid/:token` in React.
5. The new password is posted to `POST /api/auth/reset-password/` with the uid
   and token from the URL. Django validates the token, applies the same
   password rules registration uses, and calls `set_password`.
6. The user is sent to `/login` to sign in with the new password.

### The token

Django's `PasswordResetTokenGenerator` signs the user's id, their current
password hash and a timestamp. Three things follow from that, none of which
needs a table:

| Property     | Why it holds                                              |
| ------------ | --------------------------------------------------------- |
| Unguessable  | Signed with `SECRET_KEY`                                  |
| Expires      | `PASSWORD_RESET_TIMEOUT`, set to 30 minutes               |
| Used once    | The password hash is part of the token, so changing the password breaks every link built from the old one |

There is no `PasswordResetToken` model and no migration for this feature.

### Not saying who has an account

`POST /api/auth/forgot-password/` always answers `200` with the same sentence:

```
If an account exists for that email, a password reset link has been sent.
```

An address with an account, an address without one, and an address already
sent a link in the last minute are indistinguishable from outside. A pending
registration is not an account and never receives a reset link; that flow has
its own code.

### Limits

| Rule                          | Value                        |
| ----------------------------- | ---------------------------- |
| Link lifetime                 | 30 minutes                   |
| Resend cooldown, per address  | 60 seconds                   |
| Forgot-password requests      | 5 per hour                   |
| Reset-password requests       | 20 per hour                  |

The resend cooldown is held in Django's cache rather than a table. On the
default local-memory cache that means it is per process and is forgotten on
restart, which is enough for one development server; a shared cache would be
needed before running several workers.

### Known limitation: existing sessions

SimpleJWT tokens are signed, not stored, and the project does not install the
token blacklist app. A refresh token issued before a password reset therefore
keeps working until it expires, up to seven days. Revoking them would mean
adding token blacklisting, which is a larger change than this feature
justifies. Access tokens last 30 minutes.

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

## Profile API

The profile is the user's own study history in summary: totals, streaks and
where the time went. It is private - always the signed-in user, never anybody
else - and there is no `ProfileStatistics` table, because every figure is
derived from `StudySession` on request.

| Method | Path |
| --- | --- |
| `GET` | `/api/study/profile/` |

```json
{
  "total_focused_minutes": 1995,
  "total_sessions": 33,
  "current_streak_days": 12,
  "longest_streak_days": 21,
  "average_session_minutes": 60,
  "total_study_days": 33,
  "most_studied_subject": "JavaScript",
  "subjects": [{"subject": "JavaScript", "focused_minutes": 1200, "sessions_count": 24}]
}
```

### What the figures mean

- **total_focused_minutes / total_sessions** — every completed session, ever.
- **current_streak_days** — consecutive days up to today with at least one
  completed session. The same function the dashboard uses, so the two always
  agree.
- **longest_streak_days** — the best run the user has ever had. Not the same as
  `total_study_days`: studying on 1 January and again on 1 June is two runs of
  one day, not a run of two.
- **total_study_days** — unique calendar dates. Three sessions in one evening
  are one study day.
- **most_studied_subject** — the busiest *named* subject. Sessions saved with no
  subject are time, not a subject, so they are skipped here; their minutes still
  appear in `subjects` under `""`, which the interface labels General Study.

Cancelled sessions, break minutes and a timer still running contribute to none
of it. Notes, topics and timestamps never leave this endpoint.

## Not implemented yet

These belong to later phases and are intentionally absent:

- Notifications
