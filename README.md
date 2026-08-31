# SyntaxTime

A personal study application built around one focus timer, with a real Windows
desktop window that stays visible above everything else while you work.

SyntaxTime is a Tauri desktop application for Windows. The same React code also
runs in a browser during development, which is how most of it is built — but the
reason the desktop build exists is one thing a web page cannot do: float a
compact timer above VS Code, the browser and everything else, so a session can
be watched without leaving the work.

```
Focus  →  Study  →  Record  →  Review  →  Improve
```

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Timer architecture](#timer-architecture)
- [Desktop architecture](#desktop-architecture)
- [User flows](#user-flows)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Running it](#running-it)
- [Building for Windows](#building-for-windows)
- [Authentication](#authentication)
- [Email verification](#email-verification)
- [Password reset](#password-reset)
- [Study data model](#study-data-model)
- [Home dashboard](#home-dashboard)
- [Study history](#study-history)
- [Friends and leaderboard](#friends-and-leaderboard)
- [Profile](#profile)
- [API reference](#api-reference)
- [Privacy and security](#privacy-and-security)
- [Scalability principles](#scalability-principles)
- [Deployment](#deployment)
- [Testing](#testing)
- [Project status](#project-status)
- [Known limitations](#known-limitations)
- [Development guidelines](#development-guidelines)

---

## Overview

SyntaxTime records focused study time and then makes it reviewable. A session is
started with a chosen length and, optionally, a subject and topic; the timer
counts down; when it ends the session is saved with optional notes about what
was learned. Everything after that — the daily total, the weekly chart, the
month archive, streaks, and the friend leaderboard — is derived from those saved
sessions.

Three ideas shape the whole application:

| Rule | What it means |
| --- | --- |
| **One timer** | `timerSlice` holds the running session and `useTimer` is the only countdown. Home, the popup, Focus Mode and the native focus window are four views of that one state, never four timers. |
| **Statistics are derived, never stored** | Streaks, leaderboards and profile totals are calculated from `StudySession` on request. There is no table of precomputed figures to go stale. |
| **Every page is a summary, never an archive** | Home shows today and this week, History opens one month at a time, and friends, requests and search all arrive a page at a time. Nothing grows without limit as the years pass. |

---

## Features

| Feature | Description |
| --- | --- |
| **Focus sessions** | A countdown of a chosen length, with optional subject and topic. Pause, resume, reset or finish early. |
| **Focus Window** | A compact native window that stays above every other application. Resizable, draggable, and a view of the same timer. |
| **Focus Mode** | A full-screen in-page version of the same clock, for when the whole screen is available. |
| **Break timer** | The same countdown with none of the meaning: break minutes are never study time. |
| **Session completion** | A finished session records itself, with nothing to press. Optional notes on what was studied and learned are then written onto the saved record. |
| **Daily goals** | A target for today, with live progress against it. |
| **Home dashboard** | Today, this week, today's subjects, recent sessions and a leaderboard preview. |
| **Study history** | A month-at-a-time archive with search, subject filter, day grouping and editable notes. |
| **Friends** | User search, friend requests in both directions, and accepted friendships. |
| **Leaderboard** | Weekly and monthly focused-minute rankings among accepted friends. |
| **Profile** | Lifetime totals, current and longest streak, study days and a subject breakdown. |
| **Email verification** | Registration completed by a six-digit code sent through Brevo. No account exists until the code comes back. |
| **Password reset** | A signed, expiring, single-use link emailed to the address on the account. |
| **System tray** | Closing a window hides it; SyntaxTime keeps running in the notification area. |
| **Restart recovery** | A session running when the application closed comes back — paused, holding exactly the time it had. |
| **Notifications** | Native Windows notifications when a focus session or break ends, suppressed while you are looking at the application. |

---

## Architecture

```
┌───────────────────────────────────────────────┐
│              SyntaxTime Desktop               │
│                                               │
│   React 19 + Vite                             │
│        │                                      │
│        ├── Redux Toolkit   timer, ui, stats   │
│        ├── AuthContext     the signed-in user │
│        │                                      │
│        ├── Main Window     index.html         │
│        └── Focus Window    focus-window.html  │
│                                               │
│              Tauri 2 / Rust                   │
│              windows, tray, notifications     │
└───────────────────────┬───────────────────────┘
                        │  axios + JWT
                        ▼
┌───────────────────────────────────────────────┐
│              Django REST API                  │
│                                               │
│   accounts     registration, OTP, login,      │
│                password reset, current user   │
│   study        StudySession, DailyGoal,       │
│                all study statistics           │
│   friends      Friendship and requests        │
│   leaderboard  ranking; no models of its own  │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
                 Neon PostgreSQL

           Django ──▶ Brevo ──▶ user's inbox
           (the API key never leaves the backend)
```

Layer by layer:

```
React components        what the user sees
        │
Redux (timer, ui, statistics)
        │               the running session, shared across every view
services/*.js           every HTTP call, one function per endpoint
        │
Django REST             validation, ownership, business rules
        │
PostgreSQL              the only place anything is stored
```

Rust is only the desktop shell: it opens windows, holds the tray icon and
decides what closing a window means. No study logic lives in it — that would
give SyntaxTime two places to disagree with itself about how long somebody has
been working.

---

## Timer architecture

### Where the time comes from

The timer does **not** count ticks. `setInterval` is not precise — a background
window can fire it far less often than asked — so counting callbacks would
slowly lose real study time. Instead the state holds `runningSince`, a
millisecond timestamp, and every tick recalculates from it:

```js
const elapsed = Math.floor((now - state.runningSince) / 1000);
state.remainingSeconds = Math.max(state.durationSeconds - elapsed, 0);
if (state.mode === "focus") {
  state.elapsedFocusSeconds = Math.min(elapsed, state.durationSeconds);
}
```

`useTimer` dispatches a tick every **250 ms** — faster than once a second, so the
display never visibly skips a number when an interval fires late.

### State, and what each action does

`features/timer/timerSlice.js` holds one session:

| Field | Meaning |
| --- | --- |
| `mode` | `"focus"` or `"break"` |
| `durationSeconds` | the chosen length |
| `remainingSeconds` | what the clock face shows |
| `elapsedFocusSeconds` | focused time, written only in focus mode |
| `isRunning` / `isPaused` / `isCompleted` | which state it is in |
| `subject` / `topic` | optional; empty strings are valid |
| `startedAt` | ISO timestamp, the session's identity when saved |
| `runningSince` | the millisecond point time is measured from |

| Action | Behaviour |
| --- | --- |
| `setDuration` | sets the length and puts the countdown at its start |
| `startTimer` | begins; the caller passes `now`, so the reducer stays pure |
| `tickTimer` | recalculates from `runningSince` |
| `pauseTimer` | applies elapsed time, then clears `runningSince` so nothing accrues |
| `resumeTimer` | shifts `runningSince` forward by the pause, so paused seconds are never counted. Refuses unless the timer is actually paused |
| `resetTimer` | back to the chosen duration; a reset never produces a saved session |
| `finishTimer` | ends it, early or at zero, keeping `elapsedFocusSeconds` for the save. Does nothing if already completed |
| `restoreTimer` | brings back a snapshot, always paused |
| `clearTimer` | back to the initial state; also how a break ends |

Reaching zero dispatches the **same** `finishTimer` action the Finish button
does, so there is only one way for a session to complete.

A saved session clears the timer through `saveStudySession.fulfilled` rather
than a separate dispatch — the minutes leave the timer and arrive in today's
total in one state change, so they are never counted in both at once.

### Why break time is guarded in the reducer

`elapsedFocusSeconds` is only written when `mode === "focus"`. Guarding it there,
rather than in every view, is what keeps break minutes out of every total,
streak and leaderboard in the application.

### The progress ring fills, it does not drain

The clock face answers two different questions on purpose:

```
   the ring says how much of the session is behind you
   the numerals say how much time is left

        ╭───────────────╮
        │  ▓▓▓▓▓▓░░░░░  │   ring:   36% elapsed
        │    32:18      │   centre: 32:18 remaining
        │    RUNNING    │
        ╰───────────────╯
```

```js
const progress = Math.min(Math.max(elapsedSeconds / durationSeconds, 0), 1);
strokeDashoffset = CIRCUMFERENCE * (1 - progress);
```

Watching a ring drain is watching something run out, which is the opposite of
the feeling this application is for. The ring transition matches the 250 ms tick,
so it creeps rather than stepping.

`FocusClock` holds no timing of its own — it is handed seconds and draws them.
That is why the same component appears on Home, in the popup, in Focus Mode and
in the native focus window without those views ever disagreeing.

### Choosing a duration

`DurationPicker` is a dial rather than a row of buttons: the lengths are one
number that goes up and down, and the value sits where the time will sit once
the session starts.

| | |
| --- | --- |
| Presets | 15, 25, 30, 45, 50, 60, 70, 90, 120 minutes |
| Default | 25 minutes |
| Custom range | 1 to 600 minutes |
| Custom step | 5 minutes per arrow press |
| Break lengths | 5, 10, 15 minutes (default 5) |

The arrows step along the preset ladder and stop at each end rather than
wrapping, which would surprise anyone who clicked once too often. A typed length
is not on the ladder, so the arrows step it by 5 instead of jumping to the
nearest preset and losing what was typed.

The picker only selects. It never starts, times or saves anything — it calls
`setDuration`, and once the session is running the control is gone and the clock
shows the time left instead.

---

## Desktop architecture

### Two windows, one timer

Tauri gives each window its own webview, which means its own React tree and its
own Redux store. Two stores would be two timers, so only one of them is allowed
to count.

```
      main window                              focus window
      the whole application                    a compact always-on-top clock
      the countdown runs here   ── state ──▶   draws what it is sent
      dispatches Redux actions  ◀ command ──   Pause / Resume / Reset / Finish
```

| | Main window | Focus window |
| --- | --- | --- |
| Runs the countdown | yes | never |
| Holds Redux state | yes | no |
| Calls the API | yes | no |
| Draws the timer | yes | yes |
| Sends commands | — | yes |

`hooks/useFocusWindowBridge.js` sits beside `useTimer` in the main window. It
broadcasts the timer **once a second** while a session runs, and immediately on
any change so pausing looks instant. The focus window sends back one of four
intentions, and the bridge turns each into the same Redux action the main
window's own buttons dispatch. There is no second implementation of anything.

Three events carry it, in `desktop/desktopEvents.js`:

| Event | Direction | Purpose |
| --- | --- | --- |
| `syntaxtime://timer-state` | main → focus | what to draw |
| `syntaxtime://timer-command` | focus → main | `pause`, `resume`, `reset`, `finish` |
| `syntaxtime://timer-state-request` | focus → main | a reopened window asking for the state now, rather than waiting up to a second |

The payload is a plain object of numbers and strings — including `status` and
`phase`, worked out in the main window. The focus window is told what to draw
and is never given anything to decide.

### The focus window

```
┌──────────────────────────┐
│ SyntaxTime            ×  │  ← drag anywhere on this bar
├──────────────────────────┤
│          FOCUS           │
│          42:18           │
│        JavaScript        │
│         Promises         │
│       Today 2h 43m       │
│        [  Pause  ]       │
│    [Finish]   [Reset]    │
└──────────────────────────┘
```

- **Always on top**, set in `tauri.conf.json`, re-asserted in Rust at startup and
  again every time the window is opened, because Windows can drop the flag.
- **Resizable**, 240×210 to 560×720, opening at 300×360. Everything inside is
  measured against the window rather than fixed, so the clock, the type and the
  controls scale with it.
- **Undecorated and off the taskbar** — an instrument, not a second application.
- **Draggable** by its header, via `startDragging()`. The header ignores presses
  on the close button, because starting a native drag swallows the click that
  would have closed the window.
- **Positioned** in the lower right of the current monitor, 24 px from the edge,
  scale-factor aware.
- **Closing it closes a view, never a timer.** The window is hidden rather than
  destroyed, enforced in Rust by intercepting `CloseRequested`.

Both windows are **declared** in `tauri.conf.json` rather than created at
runtime. That means there can only ever be one focus window, and the frontend
never needs permission to create windows at all.

The focus window has its **own Vite entry** (`focus-window.html` →
`src/focusWindow.main.jsx`). The Tauri asset protocol has no single-page
fallback, so the packaged application needs a real file to load.

### The system tray

Closing the main window does not quit SyntaxTime. Both windows hide instead and
the application carries on in the notification area — a study timer that stops
because its window was tidied away is not a study timer.

| Tray item | Action |
| --- | --- |
| **Open SyntaxTime** | shows, unminimizes and focuses the main window |
| **Focus timer** | re-asserts always-on-top, then shows the focus window |
| **Quit** | `app.exit(0)` |

A left click on the icon just reopens the main window; the menu is on the right
button. Quit is deliberately the only exit: every window hides rather than
closes, so without it the application could not be quit at all.

### Surviving a restart

`features/timer/timerStorage.js` writes a snapshot to `localStorage` under
`syntaxtime_active_timer`, refreshed every **5 seconds** while a session runs and
again on `beforeunload`. Only a running or paused session with real elapsed time
is kept; anything else clears the snapshot instead.

**A restored session comes back paused**, holding exactly the time it had.

> The application cannot tell whether it was closed for two minutes or
> overnight, and counting that gap as study time would feed invented minutes
> into every total, streak and leaderboard that reads from the timer. Restoring
> loses at most a few seconds; resuming blindly could gain hours.

A session is only restored on **the day it began** — taken from `startedAt`, not
from when the snapshot was written, because those differ for a session running
through midnight. A snapshot is discarded if it is malformed, from an older
version, from another day, or describes a session that could not have happened
(more time remaining than the session was long, or one never started).

### Notifications

A countdown reaching zero in a hidden window tells nobody anything, so a native
notification is sent when a focus session or a break finishes.

- **Not while you are looking at it.** Nothing is sent when the application has
  focus (`isFocused()` on the desktop, `document.visibilityState` in a browser).
- **Once per ending.** `useSessionNotifications` remembers *which* session was
  announced, keyed on mode, `startedAt` and duration, because the completion
  flag stays true while the completion form is open.
- **Never in the way of the timer.** Permission is asked for when a session
  starts, not when the application opens — being asked by something you have not
  used yet is the surest way to have it refused — and a refused or unavailable
  permission costs a notification and nothing else.

### Tauri capabilities

`src-tauri/capabilities/default.json` grants only what the two windows use:

```
core:default
core:event      listen, unlisten, emit, emit-to
core:window     show, hide, set-focus, unminimize, is-visible, is-focused,
                set-always-on-top, set-position, outer-size, scale-factor,
                current-monitor, primary-monitor, start-dragging
notification    is-permission-granted, request-permission, notify
```

**No filesystem, no shell, no process control, no HTTP capability.** This is
least privilege for what the application actually does, not a claim that the
desktop shell is beyond attack.

### Desktop versus browser

`desktop/isDesktop.js` checks for `__TAURI_INTERNALS__`. Every desktop-only
feature checks there first and falls back to something honest.

| | Desktop (Tauri) | Browser |
| --- | --- | --- |
| Focus window | native, floats above everything | falls back to an in-page panel |
| Always on top | yes | not possible for a web page |
| System tray | yes | no |
| Notifications | native Windows notifications | web notifications, need the tab open |
| Restart recovery | yes | yes (same `localStorage`) |
| Everything else | identical | identical |

---

## User flows

**New user**

```
Register  →  PendingRegistration + 6-digit code emailed
          →  /verify-email  →  User created  →  Login  →  Home
```

**A study session**

```
Home
 └─ Get ready to focus
     ├─ duration      (required — the one thing that must be chosen)
     ├─ subject       (optional)
     ├─ topic         (optional)
     └─ break length  (optional, offered again afterwards)
 └─ Start focus
     └─ Running ── Pause / Resume / Reset / Finish ──┐
                                                     │
 └─ Session complete  ◀───── reaches zero, or Finish ┘
     └─ SAVED IMMEDIATELY, with nothing pressed
 └─ Add details?  (all optional, written onto the saved session)
     ├─ subject / topic / notes  →  Save details
     └─ or Done, which changes nothing
 └─ Take a break?  →  5 / 10 / 15 min, or skip
 └─ Ready for the next session
```

The save is not something the user does. A session that reaches zero while its
owner is working in another window — which is most of them, since that is what
the focus window is for — used to sit unsaved in the browser until somebody
came back and pressed a button, and closing SyntaxTime before then lost work
that had genuinely been done. Now the record exists first and the details are
an edit of it.

**Account recovery**

```
Login  →  Forgot password?  →  email  →  signed link emailed
       →  /reset-password/:uid/:token  →  new password  →  Login
```

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2, Rust (edition 2021, `rust-version` 1.77.2) |
| Frontend | React 19, Vite 8, JavaScript |
| State | Redux Toolkit 2 (`timer`, `ui`, `statistics`) + React Context (auth) |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4, via `@tailwindcss/vite` |
| Charts | Recharts 3 |
| Icons | Lucide React |
| HTTP | Axios, with a JWT request interceptor and a refresh-on-401 response interceptor |
| Linting | oxlint |
| Backend | Django 6.1, Django REST Framework 3.18 |
| Auth | `djangorestframework-simplejwt` 5.5 |
| Database | Neon (hosted PostgreSQL), via `psycopg` 3 and `dj-database-url` |
| Transactional email | Brevo, over its HTTP API using `requests` |
| Production serving | gunicorn (WSGI server) and WhiteNoise (static files) — neither is used by `runserver`, so development is unaffected |

Application version is **0.1.0** (`tauri.conf.json` and `Cargo.toml`). The
frontend `package.json` is private and unversioned.

---

## Project structure

```
SyntaxTime/
├── frontend/
│   ├── index.html              the main window's page
│   ├── focus-window.html       the focus window's page — a second Vite entry
│   ├── vite.config.js          two entries, port 5180, src-tauri watch exclusion
│   ├── vercel.json             SPA rewrite, so deep links do not 404 when hosted
│   ├── src-tauri/              the desktop shell
│   │   ├── src/main.rs         windows, tray, close interception. No study logic
│   │   ├── tauri.conf.json     both windows, their sizes, always-on-top, NSIS
│   │   ├── capabilities/       what the windows may do: windows and events only
│   │   └── icons/              generated from icons/source.svg
│   └── src/
│       ├── app/store.js        the Redux store
│       ├── features/           Redux slices and the state they own
│       │   ├── timer/          slice, derived status helpers, restart snapshot
│       │   ├── statistics/     saved study data shared across pages
│       │   └── ui/             popup and focus-mode visibility
│       ├── desktop/            everything that only exists on the desktop
│       │   ├── isDesktop.js      Tauri present, or an ordinary browser?
│       │   ├── focusWindow.js    showing, hiding and placing the focus window
│       │   ├── desktopEvents.js  the state and command channel between windows
│       │   └── notifications.js  permission and sending, desktop or browser
│       ├── components/
│       │   ├── ui/             Button, Section, PageHeader, Empty/LoadingState
│       │   ├── layout/         shell, sidebar, top bar, error boundary
│       │   ├── auth/           PasswordInput, ProtectedRoute
│       │   ├── timer/          clock, setup, duration picker, controls,
│       │   │                   completion, break, popup, focus mode
│       │   ├── dashboard/      Home sections
│       │   ├── history/        month navigator, summary, list, detail, edit
│       │   ├── friends/        search, requests, friends, load more
│       │   ├── leaderboard/    the friend ranking
│       │   └── profile/        personal overview
│       ├── context/            AuthContext.jsx, useAuth.js
│       ├── hooks/              useTimer, useTimerShortcuts, useTimerPersistence,
│       │                       useFocusWindowBridge, useSessionNotifications,
│       │                       usePaginatedList
│       ├── pages/              Home, History, Friends, Profile, Login, Register,
│       │                       VerifyEmail, ForgotPassword, ResetPassword,
│       │                       FocusWindow
│       ├── services/           one file per API area
│       └── utils/              time, date, history filters, session payloads
│
└── backend/
    ├── manage.py
    ├── build.sh                what the host runs to prepare a deployment
    ├── .python-version         the interpreter the host should use
    ├── config/                 settings, root URLs, WSGI/ASGI
    └── apps/
        ├── accounts/           registration, OTP verification, login,
        │                       password reset, the current user
        ├── study/              StudySession, DailyGoal, all study statistics
        ├── friends/            Friendship and friend requests
        └── leaderboard/        ranking; no models.py, it only reads the other two
```

**What each area is for**

| Directory | Role |
| --- | --- |
| `src/features/` | Shared state owned by Redux slices. If only one component needs it, it does not belong here. |
| `src/services/` | Every HTTP call, one function per endpoint, grouped by domain. Components never call axios directly. |
| `src/desktop/` | Tauri-only helpers. Each checks `isDesktopApp()` and no-ops in a browser. |
| `src/hooks/` | Behaviour mounted once in `AppShell`: the countdown, the window bridge, persistence, notifications, shortcuts. |
| `src/utils/` | Pure formatting and payload-building, shared so eight screens cannot word the same thing differently. |
| `apps/study/services.py` | The statistics definitions — streaks, study days, subject totals — so views stay thin and the dashboard and profile always agree. |
| `apps/leaderboard/` | No models and no migrations. A ranking is a question asked of `Friendship` and `StudySession`, not a fact worth storing. |

---

## Getting started

### Prerequisites

| | Why |
| --- | --- |
| **Node.js** | the frontend and the Tauri CLI |
| **Python** | the Django backend |
| **Rust toolchain** | only for the desktop build. `Cargo.toml` sets `rust-version = "1.77.2"` as the minimum |
| **Microsoft Visual Studio C++ Build Tools** | Tauri links against the MSVC toolchain on Windows |
| **WebView2** | the runtime Tauri renders in. Present on current Windows 11 |
| **A Neon database** | or any PostgreSQL server |
| **A Brevo account** | optional in development — see [Email verification](#email-verification) |

Beyond the Rust minimum above, no exact toolchain versions are pinned by this
repository. Follow the
[Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for the
Windows setup.

### Clone

```bash
git clone https://github.com/nandagopan006/SyntaxTime.git
cd SyntaxTime
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
```

Fill in `backend/.env` before migrating — it needs a database to connect to.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
```

---

## Environment variables

Both `.env` files are ignored by Git. Each has a `.env.example` beside it.

### `backend/.env`

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Signs sessions and password reset tokens |
| `DJANGO_DEBUG` | Detailed errors during development |
| `DJANGO_ALLOWED_HOSTS` | Hostnames Django will answer to |
| `DATABASE_URL` | Neon connection string (direct) |
| `DATABASE_URL_POOLED` | Neon pooled connection string, kept for later |
| `BREVO_API_KEY` | Sends verification and password reset email |
| `BREVO_SENDER_EMAIL` | The verified address the email comes from |
| `BREVO_SENDER_NAME` | The name shown as the sender |
| `FRONTEND_URL` | Where password reset links point |
| `CORS_ALLOWED_ORIGINS` | Extra origins allowed to call the API, comma-separated. Only needed once the web frontend is hosted |

If `DATABASE_URL` is unset, settings fall back to `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_HOST` and `DB_PORT` for a local PostgreSQL server.

`FRONTEND_URL` is the React application, not Django: the reset screen lives in
the frontend. It is `http://localhost:5180` in development and the real domain
in production, so reset links never send anybody to their own machine.

### `frontend/.env`

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | The API root, e.g. `http://localhost:8001/api` |

> **`VITE_API_BASE_URL` is read by Vite at build time and compiled into the
> bundle.** It is not read when the application runs. See
> [Deployment](#deployment).

### Database

SyntaxTime uses **Neon**, hosted PostgreSQL, so there is nothing local to
install or start. Neon offers two connection strings: the **direct** one, used
by Django because it holds a connection open between requests, and the
**pooled** one through PgBouncer, useful for serverless functions that open many
short-lived connections.

```bash
cd backend
venv\Scripts\activate
python manage.py migrate
```

There is no separate development database configured — the same `DATABASE_URL`
is used wherever the backend runs. Tests create and destroy their own `test_`
database automatically.

---

## Running it

Other projects on this machine already use the default ports, so SyntaxTime uses
its own. `strictPort` is set, so Vite fails rather than quietly switching.

| Service | URL |
| --- | --- |
| Backend | `http://localhost:8001` |
| Frontend | `http://localhost:5180` |

### The backend

```bash
cd backend
venv\Scripts\activate
python manage.py runserver 8001
```

### The desktop application

```bash
cd frontend
npm run desktop
```

This is the real thing. Tauri starts Vite itself, compiles the Rust shell and
opens the application in its own window — **do not run `npm run dev` separately**,
or port 5180 will already be taken and Tauri will refuse to start. The first run
compiles Rust and takes a minute or two; later runs are seconds.

The backend still has to be running on port 8001.

### In a browser

```bash
cd frontend
npm run dev
```

Then open `http://localhost:5180`. Everything works except the native focus
window, the tray and always-on-top behaviour — see
[Desktop versus browser](#desktop-versus-browser).

### All scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on 5180 |
| `npm run build` | production build of both entries |
| `npm run preview` | serve the production build |
| `npm run lint` | oxlint |
| `npm run desktop` | `tauri dev` — the desktop application |
| `npm run desktop:build` | `tauri build` — the Windows executable and installer |
| `npm run tauri` | the raw Tauri CLI |

---

## Building for Windows

```bash
cd frontend
npm run desktop:build
```

The bundle target is **NSIS**, producing two things under
`frontend/src-tauri/target/release/`:

| File | What it is |
| --- | --- |
| `syntaxtime.exe` | the application itself |
| `bundle/nsis/SyntaxTime_0.1.0_x64-setup.exe` | a Windows installer |

The first build downloads the NSIS toolchain, so it takes longer than later
ones. The Rust `target/` directory is large and is not committed.

The installer needs nothing else present — no Node, no Python, no Rust — but the
installed application still needs the Django backend reachable at whatever
address it was **built** with. SyntaxTime is a desktop client for its own API,
not a self-contained program.

Windows will show a **"Windows protected your PC"** warning, because the
installer is not code-signed. *More info → Run anyway* gets past it. Removing
the warning needs a paid signing certificate.

---

## Authentication

```
React  ──JWT in the Authorization header──▶  Django REST API
```

Every API endpoint requires an authenticated user unless it explicitly says
otherwise. Tokens are held in `localStorage`; `services/api.js` attaches the
access token on every request and, on a `401`, tries the refresh token once and
replays the original request. Failing that, a registered handler signs the user
out rather than leaving the interface in a broken half-signed-in state. The
login, register and refresh endpoints are excluded from that path — a `401` there
is a failed attempt, not an expired session.

| | Lifetime |
| --- | --- |
| Access token | 30 minutes |
| Refresh token | 7 days |

Passwords go through Django's own validators — user-attribute similarity,
minimum length, common-password and numeric checks — and are stored hashed by
`set_password` / `make_password`, never in plaintext.

Authentication state lives in `AuthContext`, deliberately **not** in Redux. A
second copy in the store would be one more place for "is somebody signed in" to
be wrong.

`components/auth/PasswordInput.jsx` is the one password field used by the login,
register and reset screens, with a show/hide toggle, so the same behaviour and
labelling appear everywhere rather than being rebuilt three times.

---

## Email verification

An address nobody can receive mail at is not an account anybody can recover, so
creating an account takes two steps.

```
Register form
    │  POST /api/auth/register/
    ▼
PendingRegistration          password hashed, OTP hashed
    │                        ── no User row exists yet ──
    ▼
Brevo  ──▶  the user's inbox   (6-digit code)
    │
    │  POST /api/auth/verify-email/
    ▼
User created + PendingRegistration deleted, in one transaction
    │
    ▼
/login
```

**The final Django `User` does not exist before successful verification.**
`PendingRegistration` holds the details in the meantime and is deleted the moment
the real user is created.

`POST /api/auth/resend-otp/` sends a new code, replacing the old one.

### The rules

| Rule | Value |
| --- | --- |
| Code length | 6 digits, from `secrets.randbelow` |
| Code lifetime | 10 minutes |
| Wrong attempts allowed | 5, after which the code is dead |
| Resend cooldown | 60 seconds |
| Pending registration expiry | 30 minutes |
| Register requests | 10 per hour |
| Verify and resend requests | 20 per hour |

The raw code is **never stored, never returned by the API and never logged**.
Only a hash is kept — `make_password`, the same hasher used for passwords — and
only long enough to check one answer against it. One live registration per
address: a second attempt updates the row rather than piling up rows nobody will
finish.

### Brevo

```
Django  ──▶  https://api.brevo.com/v3/smtp/email  ──▶  the user's inbox
```

Never React → Brevo. The API key lives in `backend/.env` and nowhere else: it is
never sent to the frontend, never put in a URL or an API response, and never
committed.

**Setting it up**

1. Create an account at [brevo.com](https://www.brevo.com).
2. Verify a sender address under **Senders, Domains & Dedicated IPs**. Mail from
   an unverified address is rejected.
3. Create an API key under **SMTP & API → API Keys**.
4. Put the key, the verified address and a sender name in `backend/.env`.
5. Restart Django — settings are read once at startup.

**Local development without a key**

With `BREVO_API_KEY` empty and `DJANGO_DEBUG=True`, nothing is sent: Django
prints the whole verification email, code included, to the console running
`runserver`, so the flow can be worked through without an inbox. With
`DJANGO_DEBUG=False` a missing key is an error instead, so production can never
silently stop sending.

---

## Password reset

Somebody who cannot sign in cannot prove who they are, so the proof is a link
sent to the address already on the account.

```
Login  →  Forgot password?  →  POST /api/auth/forgot-password/
                                   │
                    Brevo ──▶ FRONTEND_URL/reset-password/<uid>/<token>/
                                   │
                    /reset-password/:uid/:token in React
                                   │
                        POST /api/auth/reset-password/
                                   │
                                 /login
```

### The token

Django's `PasswordResetTokenGenerator` signs the user's id, their current
password hash and a timestamp. Three properties follow, none of which needs a
table:

| Property | Why it holds |
| --- | --- |
| Unguessable | signed with `SECRET_KEY` |
| Expires | `PASSWORD_RESET_TIMEOUT`, set to 30 minutes |
| Used once | the password hash is part of the token, so changing the password breaks every link built from the old one |

There is no `PasswordResetToken` model and no migration for this feature.

### Not saying who has an account

`POST /api/auth/forgot-password/` always answers `200` with the same sentence:

```
If an account exists for that email, a password reset link has been sent.
```

An address with an account, an address without one, and an address already sent
a link in the last minute are indistinguishable from outside. A pending
registration is not an account and never receives a reset link; that flow has its
own code.

### Limits

| Rule | Value |
| --- | --- |
| Link lifetime | 30 minutes |
| Resend cooldown, per address | 60 seconds |
| Forgot-password requests | 5 per hour |
| Reset-password requests | 20 per hour |

The resend cooldown is held in Django's cache rather than a table. On the default
local-memory cache that means per process, forgotten on restart — enough for one
development server; a shared cache would be needed before running several
workers.

---

## Study data model

### `StudySession`

One finished focus session.

| Field | Type | Notes |
| --- | --- | --- |
| `user` | FK → `User` | `related_name="study_sessions"` |
| `subject` | char(100) | optional, `blank=True`, defaults to `""` |
| `topic` | char(200) | optional |
| `notes` | text | optional — what was studied and learned |
| `planned_minutes` | positive int | the length chosen before starting, minimum 1 |
| `focused_minutes` | positive int | time actually focused. **Every statistic is built on this field** |
| `started_at` | datetime | |
| `completed_at` | datetime, nullable | left empty for a session that never reached an end |
| `status` | `completed` / `cancelled` | |
| `created_at` | datetime | |

Ordered `-started_at`, so history shows the most recent first.

`focused_minutes` is usually **lower** than `planned_minutes`: paused time is
excluded, break time is never counted, and finishing early stops it where it
stopped. The three are deliberately different numbers.

Subject, topic and notes use `blank=True` with an empty-string default rather
than `null=True`, so "no subject" has exactly one representation in the database
instead of two.

### `DailyGoal`

| Field | Type | Notes |
| --- | --- | --- |
| `user` | FK → `User` | |
| `date` | date | |
| `target_minutes` | positive int | |

A `UniqueConstraint` on `(user, date)` means setting a new target updates the
existing row instead of quietly creating a second, conflicting goal.

### Subject and topic are optional

Only **duration** is required to start a session. A session can be started, run
and saved with neither a subject nor a topic, and neither blocks anything.

| Missing value | Shown as |
| --- | --- |
| No subject | **General Study** |
| No topic | **No topic added** |

Both labels are defined once in `utils/studySession.js`, because eight screens
have to say the same thing and hand-written copies drift apart. The same file
mirrors the database's 100- and 200-character limits, so every form that writes a
session agrees with Django rather than each one guessing.

### Notes are private

Notes are part of the user's own learning record. They are never included in any
friends, search or leaderboard response — see
[Privacy and security](#privacy-and-security).

---

## Home dashboard

Home answers one question: *what should I know right now?* Today and this week
only. The long record is in History, the full ranking is in Friends, and lifetime
figures are in Profile.

| Section | What it shows |
| --- | --- |
| Focus session | the timer, setup or completion form |
| Today | focused time, live — the saved total plus what the running session has earned |
| Daily target | progress against today's goal |
| This week | focused minutes per day, Monday to Sunday |
| Subjects today | where today's time went |
| Recent sessions | the last few saved sessions |
| Leaderboard preview | the top places, plus your own |

### It costs the same however large the account

| Section | Bound |
| --- | --- |
| Recent sessions | requested with `limit=5`, applied by the API |
| Subjects today | top **5** shown, the rest behind a toggle |
| Leaderboard preview | **3** places, plus the user's own row if they rank below that |
| Today / This week | aggregated by Django, not by the browser |

While a session is running the supporting sections dim slightly and lift again
when reached for, so a bar chart is not competing with the countdown.

---

## Study history

History is an archive rather than a feed. A user who has studied for three years
should open it as fast as one who started last week, so it is read **one month at
a time**.

### Navigating

It opens on the current month and moves with the arrows either side of the
title, or with the month and year selects for longer jumps. The year picker
offers only the years the user actually studied in — `archive_start_date` comes
back from the API for exactly this. The next-month arrow is disabled on the
current month: there is no history in a month that has not happened.

### Filtering

Search, subject filter and date range are all sent to the API, never applied in
the browser to a page of already-fetched results.

### The month summary

```
AUGUST 2026

Focused        Sessions      Study days
18h 42m        32            18
```

Counted by Django, so the totals cover the whole month rather than the page of it
that has been fetched. **Study days are unique calendar dates** — three sessions
in one evening are one study day. A search or subject filter narrows the totals
too, because numbers that do not describe what is on screen are worse than no
numbers.

### Within a month

Sessions are grouped by day, newest first, each day carrying its own count and
total:

```
29 AUGUST ─────────────── 3 sessions · 2h 15m
  JavaScript · Promises                   47m
  React · Hooks                           48m
```

**Twenty sessions per page**, with *Load older sessions* for the rest.

Opening one shows its full detail, and `PATCH` can fill in subject, topic or
notes later — a session started without them is not stuck without them. How long
it ran and when are read-only: those were measured, not typed.

---

## Friends and leaderboard

### Friendship has a lifecycle

```
search  →  send request  →  pending  →  receiver accepts  →  friends
```

A `Friendship` row records the connection between two users and how it came
about. It is its own table rather than a field on `User`, because being someone's
friend is not a property of an account — it is asked for, then answered.

| Field | Meaning |
| --- | --- |
| `sender` | who asked |
| `receiver` | who was asked, and the only one who may answer |
| `status` | `pending`, `accepted` or `rejected` |

One row covers a pair for good. Accepting changes that row's status; a second row
is never created, so nobody appears twice in anybody's friends list. Two database
constraints enforce it rather than trusting every view:

- a check constraint, so nobody can befriend themselves;
- a unique constraint on the **sorted** pair of ids, so A→B and B→A cannot both
  exist.

Rejecting sets the status to `rejected` and nothing more. It declines one
request; the pair can ask again later, because a rejection is not a block.

Either person can end an accepted friendship.

### Scale

| List | Page size |
| --- | --- |
| Friends | 20 |
| Requests (incoming and outgoing) | 20 |
| User search | 10 |

Each has its own *Load more* and a `Showing 20 of 45` line. `max_page_size` is
100, so a caller cannot ask for everything at once.

The leaderboard folds to the top **10** with *Show all*, and somebody ranked
twenty-fifth still gets their own row below the fold — folding may hide places,
never the user's own.

### The leaderboard is computed, never stored

**There is no leaderboard table.** A ranking is a question asked of two things
that already exist, `Friendship` and `StudySession`. A stored copy would go stale
the moment anyone finished a session. `apps/leaderboard/` has no `models.py` and
no migrations.

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

Rules:

- Only `status = "completed"` sessions count. Cancelled sessions, break time and
  a timer still running contribute nothing.
- Only `focused_minutes` counts, never the planned length.
- Only accepted friendships qualify, and the list of people is read from the
  database, never from the request.
- A friend who studied nothing still appears, at `0`.
- The signed-in user is always on their own board, however far down.
- Ties are broken by username, so the same question always gets the same order.

---

## Profile

The user's own study history in summary. Always the signed-in user, never
anybody else, and there is no `ProfileStatistics` table — every figure is derived
from `StudySession` on request.

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

| Figure | Definition |
| --- | --- |
| `total_focused_minutes` / `total_sessions` | every completed session, ever |
| `current_streak_days` | consecutive days up to today with at least one completed session — the same function the dashboard uses, so the two always agree |
| `longest_streak_days` | the best run ever. Not the same as `total_study_days`: studying on 1 January and again on 1 June is two runs of one day, not a run of two |
| `total_study_days` | unique calendar dates. Three sessions in one evening are one study day |
| `average_session_minutes` | mean focused minutes per completed session |
| `most_studied_subject` | the busiest *named* subject. Sessions saved with no subject are time, not a subject, so they are skipped here; their minutes still appear in `subjects` under `""`, which the interface labels General Study |

Cancelled sessions, break minutes and a running timer contribute to none of it.

---

## API reference

Base path `/api/`. Everything requires a JWT unless marked **public**.

### Authentication — `/api/auth/`

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `register/` | **public** — start a registration, email a code |
| `POST` | `verify-email/` | **public** — check the code, create the `User` |
| `POST` | `resend-otp/` | **public** — send a fresh code |
| `POST` | `forgot-password/` | **public** — email a reset link |
| `POST` | `reset-password/` | **public** — set a new password from uid + token |
| `POST` | `login/` | **public** — exchange credentials for tokens |
| `POST` | `refresh/` | **public** — a new access token |
| `GET` | `me/` | the signed-in user (`id`, `username`, `email`) |

### Study — `/api/study/` and `/api/goals/`

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` `POST` | `/api/study/sessions/` | list sessions; save a finished one |
| `GET` `PATCH` | `/api/study/sessions/<id>/` | one session; fill in subject, topic or notes |
| `GET` | `/api/study/history/` | one page of completed history |
| `GET` | `/api/study/history/summary/` | totals for the same selection |
| `GET` | `/api/study/statistics/` | today's saved totals |
| `GET` | `/api/study/statistics/weekly/` | focused minutes per day, Mon–Sun |
| `GET` | `/api/study/subjects/` | every subject the user has studied |
| `GET` | `/api/study/profile/` | lifetime totals, streaks, subject breakdown |
| `GET` `PUT` | `/api/goals/today/` | read and set today's target |

`history/` and `history/summary/` take the same parameters — `start_date`,
`end_date`, `subject`, `search` — and are requested together, so the figures
above the archive always describe the sessions listed below them.

### Friends — `/api/friends/`

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/friends/` | accepted friendships |
| `DELETE` | `/api/friends/<id>/` | end a friendship (either person) |
| `GET` | `/api/friends/search/?search=abh` | find users, with your relationship to each |
| `GET` | `/api/friends/requests/` | requests waiting for you |
| `GET` | `/api/friends/requests/?direction=outgoing` | requests you have sent |
| `POST` | `/api/friends/requests/` | send one — `{"receiver_id": 15}` |
| `PATCH` | `/api/friends/requests/<id>/` | answer one — `{"status": "accepted"}` |

The sender of a request is always taken from the JWT, never from the body.

### Leaderboard — `/api/leaderboard/`

| Method | Path | Period |
| --- | --- | --- |
| `GET` | `weekly/` | the current Monday-to-Sunday week |
| `GET` | `monthly/` | the current calendar month |

---

## Privacy and security

### What is protected, and how

| Practice | Where |
| --- | --- |
| Secrets in `.env`, never committed | `.gitignore` covers `.env` and `.env.*`, keeping only `.env.example` |
| The Brevo API key is backend-only | read from settings in `apps/accounts/services.py`; never sent to the frontend, a URL, or a response |
| Passwords hashed | Django's `make_password` / `set_password`, plus the four standard validators |
| The OTP is hashed | `make_password` on the code; the raw code is never stored, returned or logged |
| No `User` before verification | `PendingRegistration` holds it; creation and deletion happen in one transaction |
| Reset tokens signed, expiring, single-use | `PasswordResetTokenGenerator` with `PASSWORD_RESET_TIMEOUT` |
| Rate limits on every open endpoint | DRF `ScopedRateThrottle` — 10/h register, 20/h verify, 5/h forgot-password, 20/h reset |
| Ownership enforced server-side | every study query is scoped to `request.user`; the JWT is the only source of identity |
| Enumeration resistance | forgot-password always answers the same way |
| Least-privilege desktop shell | windows, events and notifications only — no filesystem, shell, process or HTTP capability |
| Nothing sensitive logged | the OTP, passwords and the API key are never written to logs |

### The privacy model

A user can read their own study records, and nothing else.

Friendship shares a **username and an id**. `PublicUserSerializer` exposes
`("id", "username")`; search adds a `relationship` field, and the friend and
request serializers add `status` and `created_at`. The leaderboard adds one
number: aggregate `focused_minutes`.

Never part of any friends, search or leaderboard response:

- study notes
- session history, subjects or topics
- email addresses
- timestamps of individual sessions

### A note on scope

This is a personal project. The protections above are real and tested, but the
application has not had a security review, the installer is unsigned, and it has
not been run in production. "Least privilege" describes an intent that is
verifiable in `capabilities/default.json`; it is not a claim that the desktop
shell is beyond attack.

---

## Scalability principles

The question each of these answers: *what happens after three years of daily
study?*

1. **Home is bounded.** Recent sessions `limit=5`, subjects folded to 5,
   leaderboard preview 3, totals aggregated by the database. Home costs the same
   on day one and in year three.
2. **History is read one month at a time**, 20 sessions per page, filters applied
   by the API.
3. **Friends, requests and search are paginated** — 20, 20 and 10, capped at 100.
4. **The leaderboard is derived, never stored**, so there is no ranking table to
   go stale.
5. **Statistics are computed on request** from `StudySession` — streaks, study
   days and subject totals have no precomputed copies to drift.
6. **The interface never renders thousands of rows.** Every list either
   paginates or folds.

Where indexes matter, they exist: `Friendship` is indexed on
`(receiver, status)` and `(sender, status)`, which are exactly the two questions
the friends pages ask.

---

## Deployment

**SyntaxTime is not deployed yet.** The repository is prepared for it: the
backend has a production server, static file handling, HTTPS settings and an
environment-driven CORS list, and the frontend has the rewrite rule a
single-page application needs on a static host. What remains is creating the
hosting accounts and running the steps below.

The intended shape is a Django API on **Render**, the React application on
**Vercel**, and the Windows installer shared from a GitHub Release. The
database needs nothing done to it: Neon is already hosted, and the same
`DATABASE_URL` works from anywhere.

### Why localhost is not enough

On another person's machine `localhost` is **their** computer, where no
SyntaxTime backend is running.

```
you       ──▶  localhost:8001  ──▶  Neon  ✓
a friend  ──▶  localhost:8001  ──▶  nothing  ✗
```

The database is already in the cloud. The server is not.

### The order matters

`VITE_API_BASE_URL` is compiled into the bundle at build time, so a packaged
installer points at whatever address it was built with, permanently.

```
1. Deploy the backend            → get the API URL
2. Deploy the web frontend       → get the web URL
3. Tell the backend about the web frontend  (CORS + reset links)
4. ONLY THEN rebuild the desktop installer
5. Share it from a GitHub Release
```

Building the installer before step 1 ships an application permanently pointed
at your own laptop.

### 1. The backend, on Render

Create a **Web Service** from this repository, with:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `./build.sh` |
| Start command | `gunicorn config.wsgi:application` |

`backend/build.sh` installs the dependencies, runs `collectstatic` and applies
migrations. `backend/.python-version` pins the interpreter to the version
development and the tests run on; if the host reports that version is
unavailable, `3.13` and `3.12` are both supported too.

Then set the environment variables. **Render's dashboard is the only place
these belong — never a committed file.**

| Variable | Value |
| --- | --- |
| `DJANGO_SECRET_KEY` | a **new** random value, never the development one |
| `DJANGO_DEBUG` | `False` |
| `DJANGO_ALLOWED_HOSTS` | the Render hostname, e.g. `syntaxtime-api.onrender.com` |
| `DATABASE_URL` | the same Neon connection string |
| `BREVO_API_KEY` | the real key — with `DEBUG=False` a missing key is an error, not a silent skip |
| `BREVO_SENDER_EMAIL` | the address verified with Brevo |
| `BREVO_SENDER_NAME` | `SyntaxTime` |
| `FRONTEND_URL` | filled in at step 3 |
| `CORS_ALLOWED_ORIGINS` | filled in at step 3 |

Generate a fresh secret key with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Setting `DJANGO_DEBUG=False` switches on HTTPS redirects, secure cookies, HSTS
and `SECURE_PROXY_SSL_HEADER`, which is what lets Django recognise a request as
secure behind the host's proxy. All of it is inert while `DEBUG` is on, so
development is unaffected.

### 2. The web frontend, on Vercel

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| `VITE_API_BASE_URL` | `https://<your-render-host>/api` |

`frontend/vercel.json` rewrites unknown paths to `index.html`. Without it a
static host answers `404` to `/reset-password/<uid>/<token>` — the one address
that arrives by email and is always opened cold — because no such file exists
on disk. `frontend/public/_redirects` does the same job on Netlify.

### 3. Introduce them to each other

Back in Render, now that the web address exists:

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | `https://<your-vercel-host>` — where reset links point |
| `CORS_ALLOWED_ORIGINS` | `https://<your-vercel-host>` — who may call the API |

Both are read from the environment precisely so that moving to a real domain
later is a dashboard change rather than a code change and a redeploy.

The desktop origins (`http://tauri.localhost` and `tauri://localhost`) are
already allowed in `settings.py` and need no configuration: they are the same
on every machine the installer is ever run on.

### 4. Rebuild and share the installer

```bash
cd frontend
# frontend/.env → VITE_API_BASE_URL=https://<your-render-host>/api
npm run desktop:build
```

Attach `src-tauri/target/release/bundle/nsis/SyntaxTime_0.1.0_x64-setup.exe` to
a GitHub Release. It needs nothing else present on the machine — no Node, no
Python, no Rust — and Windows will warn that the publisher is unrecognised,
because the installer is not code-signed.

### What to watch as more people join

- **Render's free tier sleeps when idle**, so the first request after a quiet
  period waits for the service to wake.
- **Brevo's free tier caps daily email**, and every registration and password
  reset sends one.
- **The resend cooldown lives in local-memory cache**, so it is per process and
  stops being reliable the moment more than one worker runs.
- **Signing in elsewhere survives a password reset**, for up to the seven-day
  life of a refresh token.

None of these matter for a handful of friends. All four want attention before
strangers use it.

### On the same network, without deploying

For trying it with somebody in the same room, skipping all of the above:

```bash
python manage.py runserver 0.0.0.0:8001
```

Build the installer against your machine's LAN address, and add that address to
`DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`.

This is a demonstration, not a deployment. It needs your machine awake and both
of you on the same network, and it breaks when the router hands out a different
address.

## Testing

```bash
cd backend
venv\Scripts\activate
python manage.py test
```

**277 tests** across the four Django apps:

| App | Tests |
| --- | --- |
| `study` | 119 |
| `accounts` | 62 |
| `friends` | 58 |
| `leaderboard` | 38 |

They cover ownership on every endpoint, the OTP and password-reset rules, the
statistics definitions, pagination, and that break minutes never reach a study
total.

> **There is no automated frontend test suite in this repository.** The frontend
> is checked with `npm run lint` (oxlint) and `npm run build`. Frontend behaviour
> has been verified manually and with throwaway harnesses that were not
> committed.

---

## Project status

A personal project, feature-complete for its own purpose and not deployed.

### Implemented

Focus sessions with configurable duration and optional subject and topic ·
pause, resume, reset, finish · session completion with optional notes · break
timer · daily goals · live daily tracking · weekly and subject analytics ·
month-based study history with search, filters and editing · friends and friend
requests · weekly and monthly leaderboards · profile statistics · email-verified
registration · password reset · the Tauri desktop application · the always-on-top
focus window · system tray · restart recovery · Windows notifications.

### Not implemented

| | |
| --- | --- |
| **Change password while signed in** | password *reset* exists; changing a known password from Profile does not |
| **Offline use** | every page needs the API |
| **Deployment** | the repository is prepared for it — production server, static files, HTTPS settings, environment-driven CORS and the SPA rewrite are all in place — but nothing is hosted yet. See [Deployment](#deployment) |
| **Frontend test suite** | see [Testing](#testing) |
| **macOS and Linux builds** | only the Windows NSIS bundle is configured |
| **Code signing** | the installer is unsigned |

---

## Known limitations

Honest gaps rather than absent features. Each is a deliberate stopping point.

| Limitation | Why it stands |
| --- | --- |
| Details typed into the completion form are lost on restart | The session itself is safe — it records itself the moment it ends — but the subject, topic and notes are only in the form until they are saved. They can be added later from History |
| A session left running overnight is not restored | Deliberate — restoring it would add yesterday's minutes to today |
| Signing in elsewhere survives a password reset | SimpleJWT tokens are signed, not stored, and the blacklist app is not installed. Adding it is a larger change than this feature justifies |
| History search covers the selected month only | Finding a note from six months ago means navigating to that month |
| The leaderboard fetches every entry to preview three | Bounded by friend count; fine to a few hundred |
| The resend cooldown lives in the default local-memory cache | Per process, forgotten on restart. A shared cache is needed before running several workers |
| The installer is unsigned | Windows SmartScreen warns on first run |

---

## Development guidelines

The project is meant to stay readable. It is not built to impress anybody with
its architecture.

- **Keep components focused.** A component that fetches and renders and decides
  is three components.
- **Reuse the existing services.** Every HTTP call goes through `src/services/`;
  components never call axios directly.
- **Keep business rules in the backend.** Ownership, validation and every
  statistic definition live in Django, so the frontend cannot disagree with the
  database.
- **Redux is for shared state only.** If one component needs it, `useState` is
  the right answer. Auth is in Context, not the store.
- **Never add a second timer.** Anything that needs the countdown reads
  `state.timer` or receives it over the desktop bridge.
- **Keep desktop permissions minimal.** Adding a capability to
  `capabilities/default.json` should need a reason written down.
- **Explain *why* in comments, not *what*.** The code already says what it does.

### Working on it

```bash
git checkout -b feat/your-change
# ...
cd frontend
npm run lint
npm run build
cd ../backend
venv\Scripts\activate
python manage.py test
```

---

## Repository

<https://github.com/nandagopan006/SyntaxTime>

No `LICENSE` file is present, so no licence is granted and all rights are
reserved by default until one is added.
