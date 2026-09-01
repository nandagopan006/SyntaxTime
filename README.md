# SyntaxTime

> A personal study application built around one focus timer, with a native
> Windows window that stays visible above your work.

## Overview

SyntaxTime records focused study time and makes it reviewable. You start a
session with a chosen length and, optionally, a subject and topic. When it
ends, the session is saved with optional notes about what you learned.
Everything after that — daily totals, the weekly chart, the month archive,
streaks and the friend leaderboard — is derived from those saved sessions.

It is built for people who study at a computer and want a record of the work
rather than a stopwatch they forget about.

The desktop build exists for one reason a web page cannot cover: a compact
timer that floats above VS Code, the browser and everything else, so a session
can be watched without leaving the work. The same React code also runs in a
browser, where every feature except the floating window behaves identically.

## Features

- Focus sessions with configurable duration (presets 15–120 min, custom 1–600)
- Optional subject and topic — only the duration is required
- Pause, resume, reset and finish, with a spacebar shortcut
- Sessions save themselves the moment they end; notes are added afterwards
- Optional break timer that never counts as study time
- Daily goals with live progress
- Home dashboard: today, this week, today's subjects, recent sessions
- Study history, browsed one month at a time, with search and subject filter
- Editable session notes from history
- Friends, friend requests and user search
- Weekly and monthly leaderboards
- Profile statistics: lifetime totals, current and longest streak, study days
- Email-verified registration with a six-digit code
- Password reset by signed, expiring link
- Native always-on-top focus window (desktop)
- System tray, so closing a window does not quit (desktop)
- Notifications when a session or break ends
- Session recovery after a restart

## How It Works

```
Prepare  →  Focus  →  Reflect  →  Break
```

**Prepare** — choose a duration; optionally name a subject and topic, and
decide whether a break follows.

**Focus** — a clock showing the time remaining, inside a ring that fills as the
session is worked through. Pause, resume, reset or finish at any point.

**Reflect** — the session is already recorded by the time this appears.
Subject, topic and notes are optional and are written onto the saved record.

**Break** — offered afterwards, 5/10/15 minutes. A break is the same countdown
with none of the meaning: its minutes never become study time.

## Architecture

```
React 19 + Vite
      │
Redux Toolkit  ·  hooks  ·  services
      │
      ▼
Django REST Framework          Django ──▶ Brevo ──▶ inbox
      │
      ▼
  PostgreSQL
```

React components read shared state from Redux and never call HTTP directly —
every request goes through a service in `src/services/`. Django owns
validation, ownership and every business rule, so the frontend cannot disagree
with the database.

On the desktop, Tauri opens two native windows:

```
Tauri 2 / Rust
├── Main Window     the application; owns the timer
└── Focus Window    a compact always-on-top clock
```

### One timer

**SyntaxTime has one logical timer.** `features/timer/timerSlice.js` holds the
running session and `hooks/useTimer.js` is the only countdown. Home, the
in-page popup, Focus Mode and the native focus window are four views of that
one state.

Each Tauri window has its own webview, so the focus window has its own React
tree — which is why only the main window is allowed to count. It runs the
countdown, holds the state and calls the API. The focus window draws what it
is sent and sends back one of four intentions: pause, resume, reset, finish.
`hooks/useFocusWindowBridge.js` turns each into the same Redux action the main
window's own buttons dispatch.

Time is measured from a timestamp rather than by counting ticks, because an
interval that fires late would slowly lose real study time.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8 |
| State | Redux Toolkit 2, React Context (auth) |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| Icons | Lucide |
| HTTP | Axios |
| Linting | oxlint |
| Desktop | Tauri 2, Rust |
| Backend | Django 6.1 |
| API | Django REST Framework 3.18 |
| Auth | djangorestframework-simplejwt 5.5 |
| Database | PostgreSQL (via psycopg 3, dj-database-url) |
| Email | Brevo HTTP API |
| Production serving | gunicorn, WhiteNoise |

Application version is **0.1.0** (`tauri.conf.json`, `Cargo.toml`).

## Project Structure

```
frontend/
├── index.html              main window entry
├── focus-window.html       focus window entry (a second Vite entry)
├── vercel.json             SPA rewrite for static hosting
├── src-tauri/              desktop shell
│   ├── src/main.rs         windows, tray, close handling — no study logic
│   ├── tauri.conf.json     both windows, sizes, always-on-top, NSIS bundle
│   └── capabilities/       windows, events and notifications only
└── src/
    ├── app/store.js        Redux store
    ├── features/           timer, statistics, ui slices
    ├── desktop/            Tauri-only helpers; no-ops in a browser
    ├── components/         ui, layout, auth, timer, dashboard,
    │                       history, friends, leaderboard, profile
    ├── context/            AuthContext, useAuth
    ├── hooks/              useTimer, useTimerPersistence, useTimerShortcuts,
    │                       useFocusWindowBridge, useSessionNotifications,
    │                       usePaginatedList
    ├── pages/              Home, History, Friends, Profile, Login, Register,
    │                       VerifyEmail, ForgotPassword, ResetPassword,
    │                       FocusWindow
    ├── services/           one file per API area
    └── utils/              time, date and session formatting

backend/
├── manage.py
├── build.sh                install → collectstatic → migrate (deployment)
├── config/                 settings, root URLs, WSGI/ASGI
└── apps/
    ├── accounts/           registration, OTP, login, password reset
    ├── study/              StudySession, DailyGoal, all statistics
    ├── friends/            Friendship and friend requests
    └── leaderboard/        ranking; no models — it reads the other two
```

## Authentication

```
Register  →  PendingRegistration + emailed code  →  Verify  →  User created  →  Login
```

Registration takes two steps. Details are held in `PendingRegistration` with
the password and a six-digit code both hashed — **no `User` row exists until
the code comes back**. Verification creates the user and deletes the pending
row in one transaction.

| Rule | Value |
| --- | --- |
| Code length / lifetime | 6 digits / 10 minutes |
| Wrong attempts allowed | 5 |
| Resend cooldown | 60 seconds |
| Pending registration expiry | 30 minutes |

Requests carry a JWT in the `Authorization` header. Access tokens last 30
minutes, refresh tokens 7 days; `services/api.js` refreshes once on a `401` and
replays the request.

**Password reset** uses Django's `PasswordResetTokenGenerator`, which signs the
user id, their current password hash and a timestamp. That makes the link
unguessable, expiring (30 minutes) and single-use, with no token table. The
link points at `FRONTEND_URL`, and `forgot-password` always answers the same
way so it cannot be used to discover which addresses have accounts.

Brevo sends both emails, called from Django over HTTP. With `BREVO_API_KEY`
empty and `DEBUG=True`, the email is printed to the console instead, so the
flow can be worked through without an inbox.

## Study System

`StudySession` records `subject`, `topic`, `notes`, `planned_minutes`,
`focused_minutes`, `started_at`, `completed_at` and `status`
(`completed` / `cancelled`). `focused_minutes` is usually lower than
`planned_minutes`: paused time is excluded, break time never counts, and
finishing early stops it where it stopped. Every statistic is built on it.

`DailyGoal` holds one target per user per date.

**Statistics are derived, never stored.** Streaks, leaderboards and profile
totals are calculated from `StudySession` on request, so there is no
precomputed table to go stale. Study days are unique calendar dates — three
sessions in one evening count as one.

Home shows today and this week. History is browsed one month at a time, with a
summary counted by the database over the whole selection rather than the page
on screen.

## Friends & Leaderboard

A `Friendship` row records the connection between two users and its status
(`pending`, `accepted`, `rejected`). One row covers a pair for good: accepting
changes that row rather than creating a second, and database constraints make
self-friendship and duplicate pairs impossible.

Friendship shares a **username and an id**. Study notes, session history,
subjects and email addresses are never part of any friends, search or
leaderboard response.

There is no leaderboard table. Rankings are computed from `Friendship` and
`StudySession` on request — weekly (Mon–Sun) and monthly, ordered by focused
minutes with ties broken by username. Only completed sessions count, and the
signed-in user always appears on their own board.

## Windows Desktop App

Tauri wraps the same React build in a native shell. Rust opens windows, holds
the tray icon and decides what closing a window means; no study logic lives in
it.

**Focus window** — 300×360 by default, resizable 240×210 to 560×720,
undecorated and off the taskbar. Always-on-top is set in the configuration and
re-asserted in Rust, because Windows can drop the flag. It is draggable by its
header and positions itself in the lower right of the current monitor. Closing
it hides the window and never ends the session.

**System tray** — closing the main window hides it rather than quitting, so a
running session survives. The tray menu has three items: Open SyntaxTime,
Focus timer, and Quit.

**Notifications** — a native notification when a focus session or break ends,
suppressed while the application has focus.

**Session recovery** — a snapshot is written to local storage every five
seconds while a session runs. A restored session comes back **paused**, holding
exactly the time it had, and only on the day it began. The application cannot
know whether it was closed for two minutes or overnight, and counting that gap
would invent study time.

| | Desktop | Browser |
| --- | --- | --- |
| Focus window | native, always on top | in-page panel |
| System tray | yes | no |
| Notifications | native Windows | web notifications |
| Everything else | identical | identical |

## Getting Started

### Prerequisites

Node.js, Python, PostgreSQL (or a hosted equivalent), and — for the desktop
build only — the Rust toolchain, Visual Studio C++ Build Tools and WebView2.
`backend/.python-version` pins the interpreter to 3.14.1; Django 6.1 supports
3.12–3.14.

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
```

## Environment Variables

`backend/.env`:

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Signs sessions and password reset tokens |
| `DJANGO_DEBUG` | Detailed errors during development |
| `DJANGO_ALLOWED_HOSTS` | Hostnames Django will answer to |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_URL_POOLED` | Pooled connection string, unused by Django |
| `BREVO_API_KEY` | Sends verification and reset email |
| `BREVO_SENDER_EMAIL` | Verified sender address |
| `BREVO_SENDER_NAME` | Name shown as the sender |
| `FRONTEND_URL` | Where password reset links point |
| `CORS_ALLOWED_ORIGINS` | Extra origins allowed to call the API, comma-separated |

With `DATABASE_URL` unset, settings fall back to `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_HOST` and `DB_PORT`.

`frontend/.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API root, e.g. `http://localhost:8001/api` |

## Running

The project uses non-default ports: backend `8001`, frontend `5180`
(`strictPort`, so Vite fails rather than switching).

**Backend**

```bash
cd backend
venv\Scripts\activate
python manage.py runserver 8001
```

**Browser**

```bash
cd frontend
npm run dev
```

**Desktop**

```bash
cd frontend
npm run desktop
```

Tauri starts Vite itself, so do not run `npm run dev` separately — port 5180
would already be taken.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build of both entries |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |
| `npm run desktop` | `tauri dev` |
| `npm run desktop:build` | `tauri build` |

## Building for Windows

```bash
cd frontend
npm run desktop:build
```

Produces `syntaxtime.exe` and an NSIS installer under
`src-tauri/target/release/`. The installer needs nothing else present, but the
application still needs a reachable backend.

The installer is not code-signed, so Windows shows a SmartScreen warning on
first run.

## Deployment

`localhost` only works on the machine running the backend. For anyone else to
use SyntaxTime, the API needs a public HTTPS address.

**`VITE_API_BASE_URL` is compiled into the bundle at build time**, not read at
runtime. The order therefore matters:

```
1. Deploy the backend            → get its URL
2. Set VITE_API_BASE_URL to it
3. THEN build the frontend and the installer
```

Building first ships an application permanently pointed at your own machine.

For production, set `DJANGO_DEBUG=False`, a fresh `DJANGO_SECRET_KEY`, the real
`DJANGO_ALLOWED_HOSTS`, `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS`. With
`DEBUG=False`, HTTPS redirects, secure cookies, HSTS and
`SECURE_PROXY_SSL_HEADER` switch on, and a missing `BREVO_API_KEY` becomes an
error rather than a silent skip.

`backend/build.sh` runs install, `collectstatic` and `migrate` for a host.
`frontend/vercel.json` and `frontend/public/_redirects` provide the SPA rewrite
a static host needs, without which the password reset link would 404.

## Security

- Passwords hashed with Django's hashers, plus the four standard validators
- The OTP is hashed too; the raw code is never stored, returned or logged
- No `User` row exists before successful email verification
- Reset tokens are signed, expiring and single-use, with no token table
- Every study query is scoped to `request.user`; identity comes from the JWT,
  never the request body
- Rate limits on the open endpoints: 10/h register, 20/h verify, 5/h
  forgot-password, 20/h reset-password
- `forgot-password` answers identically whether or not the account exists
- Secrets live in `.env`, which is gitignored; the Brevo key is read only by
  the backend and never reaches the browser
- Tauri capabilities grant windows, events and notifications only — no
  filesystem, shell, process or HTTP access

This is a personal project. The protections above are implemented and tested,
but it has not had a security review and the installer is unsigned.

## Scalability

The question these answer is what happens after years of daily study.

- **Home is bounded** — recent sessions requested with `limit=5`, subjects
  folded to 5, leaderboard preview 3 places. Home costs the same on day one and
  in year three.
- **History is period-based** — one month at a time, 20 sessions per page.
- **Friends, requests and search are paginated** — 20, 20 and 10, capped at 100.
- **Aggregation happens in the database** — totals, streaks and study days are
  computed by Django, not by summing rows in the browser.
- **The interface never renders the whole dataset.** Every list paginates or
  folds.

`Friendship` is indexed on `(receiver, status)` and `(sender, status)`, which
are the two questions the friends pages ask.

## Testing

```bash
cd backend
venv\Scripts\activate
python manage.py test
```

277 tests across the four Django apps — `study` 119, `accounts` 62,
`friends` 58, `leaderboard` 38 — covering ownership on every endpoint, the OTP
and password-reset rules, the statistics definitions, pagination, and that
break minutes never reach a study total.

The frontend has no automated test suite. It is checked with `npm run lint` and
`npm run build`.

## Known Limitations

| Limitation | Detail |
| --- | --- |
| Notes typed but not saved are lost on restart | The session itself is safe; only the completion form's contents are unsaved |
| A session left running overnight is not restored | Deliberate — restoring it would add yesterday's minutes to today |
| Signing in elsewhere survives a password reset | SimpleJWT tokens are signed, not stored, and the blacklist app is not installed |
| History search covers the selected month only | Finding an older note means navigating to that month |
| The unsigned installer triggers SmartScreen | Removing the warning needs a paid certificate |
| Windows only | Only the NSIS bundle is configured |
| No offline use | Every page needs the API |
| Server timezone is fixed | `TIME_ZONE` is `Asia/Kolkata`, so study days are counted in that timezone for all users |

## Project Status

Feature-complete for its own purpose and in personal use. Every feature listed
above is implemented and working.

Not implemented: changing a known password while signed in, offline support,
and builds for platforms other than Windows.
