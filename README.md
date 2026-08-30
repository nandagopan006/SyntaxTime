  # SyntaxTime

SyntaxTime is a personal study application for tracking focused study
sessions. It runs as a **Windows desktop application** built with Tauri, and
the same code runs in a browser for development.

The point of the desktop build is one thing a web page cannot do: a compact
timer window that stays visible above VS Code, the browser and everything
else, so a session can be watched without leaving the work.

## Current phase

**Phase 23 — Windows desktop application and the native focus window.**

Every planned feature is built: the focus timer, Home dashboard, study
history, friends, the leaderboard, the personal profile, email-verified
registration, password reset, and the desktop shell. See the sections below
for the endpoints and the desktop architecture behind them.

## Technology stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Desktop shell    | Tauri 2, Rust             |
| Frontend         | React, Vite, JavaScript   |
| State            | Redux Toolkit             |
| Styling          | Tailwind CSS              |
| Charts           | Recharts                  |
| Backend          | Python, Django            |
| API framework    | Django REST Framework     |
| Database         | Neon (PostgreSQL)         |
| Transactional email | Brevo                  |
| Version control  | Git, GitHub               |

Rust and Tauri are only the desktop shell: they open windows and nothing
else. No study logic lives in Rust.

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

On the desktop there are two native windows, and they are still one timer:

```
        main window                          focus window
        the whole application                a compact always-on-top clock
        the countdown runs here   ── state ──▶ draws what it is sent
        dispatches Redux actions  ◀ command ── Pause / Resume / Reset / Finish
```

Three rules hold the whole thing together:

- **One timer.** `features/timer/timerSlice.js` holds the running session and
  `hooks/useTimer.js` is the only countdown. Home, the popup, Focus Mode and
  the native focus window are four views of that one state, never four timers.
- **Statistics are derived, never stored.** Streaks, leaderboards and profile
  totals are calculated from `StudySession` on request. There is no table of
  precomputed figures to go stale.
- **Every page is a summary, never an archive.** Home shows today and this
  week, History opens one month at a time, and friends, requests and search
  all arrive a page at a time. Nothing grows without limit as the years pass.

## Project structure

```
frontend/
├── index.html              the main window's page
├── focus-window.html       the focus window's own page, a second Vite entry
├── src-tauri/              the desktop shell
│   ├── src/main.rs         opens windows; no study logic lives here
│   ├── tauri.conf.json     both windows, their sizes and always-on-top
│   ├── capabilities/       what the windows may do: windows and events only
│   └── icons/              generated from icons/source.svg
└── src/
    ├── app/store.js            the Redux store
    ├── features/               Redux slices and the state they own
    │   ├── timer/              the active session, its status and phase
    │   ├── statistics/         saved study data shared across pages
    │   └── ui/                 popup and focus-mode visibility
    ├── desktop/                everything that only exists on the desktop
    │   ├── isDesktop.js        Tauri present, or an ordinary browser?
    │   ├── focusWindow.js      showing, hiding and placing the focus window
    │   └── desktopEvents.js    the state and command channel between windows
    ├── components/
    │   ├── ui/                 Button, Section, PageHeader, Empty/LoadingState
    │   ├── layout/             shell, sidebar, top bar, error boundary
    │   ├── auth/               PasswordInput, ProtectedRoute
    │   ├── timer/              clock, setup, duration picker, controls,
    │   │                       completion, break, popup, focus mode
    │   ├── dashboard/          Home sections
    │   ├── history/            month navigator, summary, list, detail, edit
    │   ├── friends/            search, requests, friends, load more
    │   ├── leaderboard/        the friend ranking
    │   └── profile/            personal overview
    ├── context/AuthContext.jsx the signed-in user
    ├── hooks/                  useTimer, useTimerShortcuts,
    │                           useFocusWindowBridge, usePaginatedList
    ├── pages/                  Home, History, Friends, Profile, Login,
    │                           Register, VerifyEmail, ForgotPassword,
    │                           ResetPassword, FocusWindow
    ├── services/               one file per API area
    └── utils/                  time, date and session formatting

backend/
├── config/                 settings and root URLs
└── apps/
    ├── accounts/           registration, OTP verification, login,
    │                       password reset, the current user
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

## Running it

There are two ways to run SyntaxTime, and both use the same React code.

### As the desktop application

```
cd frontend
npm run desktop
```

This is the real thing. Tauri starts Vite itself, compiles the Rust shell and
opens the application in its own window - **do not start `npm run dev`
separately**, or port 5180 will already be taken and Tauri will refuse to
start. The first run compiles Rust and takes a minute or two; later runs are
seconds.

The backend still has to be running on port 8001.

### In a browser

```
cd frontend
npm run dev
```

Then open http://localhost:5180. Everything works except the native focus
window, which falls back to an in-page panel - a web page cannot float above
other applications, and SyntaxTime does not pretend otherwise.

## The desktop application

### The focus window

The reason the desktop build exists. Start a session, press **Focus timer** in
the top bar, and a small window appears in the lower right of the screen and
**stays above every other application**. Switch to VS Code and it is still
there.

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

- **Always on top**, set in the window configuration and re-asserted every
  time the window is opened, because Windows can drop the flag.
- **Resizable**, from 240x210 to 560x720. Everything inside is measured
  against the window rather than fixed, so the clock, the type and the
  controls all scale with it. Below 330px tall the subject, topic and daily
  total drop away; the clock and the controls never do.
- **Draggable** by its header. The header ignores presses on the close button,
  because starting a native drag swallows the click that would have closed the
  window.
- **Closing it closes a view, never a timer.** The window is hidden rather
  than destroyed, and that is enforced in Rust, where the operating system's
  close button is intercepted. Reopen it and it shows the session as it is
  now.

### How the two windows stay in step

Tauri gives each window its own webview, which means its own React tree and
its own Redux store. Two stores would be two timers, so only one of them
counts:

| | Main window | Focus window |
| --- | --- | --- |
| Runs the countdown | yes | never |
| Holds Redux state | yes | no |
| Calls the API | yes | no |
| Draws the timer | yes | yes |
| Sends commands | - | yes |

`hooks/useFocusWindowBridge.js` sits beside `useTimer` in the main window. It
broadcasts the timer once a second while a session runs, and immediately on
any change, so pausing looks instant. The focus window sends back one of four
intentions - pause, resume, reset, finish - and the bridge turns each into the
same Redux action the main window's own buttons dispatch. There is no second
implementation of anything.

A focus window that has just been reopened asks for the current state rather
than waiting up to a second for the next broadcast.

### Windows and permissions

Both windows are declared in `src-tauri/tauri.conf.json`. Declaring the focus
window rather than creating it at runtime means there can only ever be one of
it, and that the frontend never needs permission to create windows at all.

`src-tauri/capabilities/default.json` grants only what the two windows use:
showing, hiding, focusing, positioning, dragging, and sending and receiving
events. **No filesystem, no shell, no process control, no network
capability.**

### Building a Windows executable

```
cd frontend
npm run desktop:build
```

The binary lands in `frontend/src-tauri/target/release/`. The Rust build
directory is large and is not committed.

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

## Home

Home answers one question: what should I know right now? Today and this week
only - the long record is in History, the full ranking is in Friends, and the
lifetime figures are in Profile.

It asks for a fixed, small amount of data however large the account is: the
recent-sessions list is requested with a limit of five, today's subjects fold
to the top five, and the leaderboard preview shows three places plus the
user's own. While a session is running the supporting sections dim slightly
and lift again when reached for, so a bar chart is not competing with the
countdown.

## Study history

History is an archive rather than a feed. A user who studies for three years
should open it as fast as one who started last week, so it is read one month
at a time.

### Navigating

It opens on the current month and moves with the arrows either side of the
title, or with the month and year selects for longer jumps. The year picker
offers only the years the user actually studied in, and the next-month arrow
is disabled on the current month - there is no history in a month that has
not happened.

### Endpoints

| Method | Path                          | Purpose                          |
| ------ | ----------------------------- | -------------------------------- |
| GET    | `/api/study/history/`         | One page of completed sessions   |
| GET    | `/api/study/history/summary/` | Totals for the same selection    |
| GET    | `/api/study/sessions/<id>/`   | One session                      |
| PATCH  | `/api/study/sessions/<id>/`   | Fill in subject, topic or notes  |

Both list and summary take the same parameters - `start_date`, `end_date`,
`subject`, `search` - and are requested together, so the figures above the
archive always describe the sessions listed below them.

### The month summary

```
AUGUST 2026

Focused        Sessions      Study days
18h 42m        32            18
```

Counted by Django, not the browser, so the totals cover the whole month rather
than the page of it that has been fetched. **Study days are unique calendar
dates**: three sessions in one evening are one study day. A search or a subject
filter narrows the totals too, because numbers that do not describe what is on
screen are worse than no numbers.

### Within a month

Sessions are grouped by day, newest first, and each day carries its own count
and total:

```
29 AUGUST ─────────────── 3 sessions · 2h 15m
  JavaScript · Promises                   47m
  React · Hooks                           48m
```

Twenty sessions load at a time, with `Load older sessions` for the rest.

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

### Scale

Friends, pending requests and search results all grow without limit, so all
three are paginated: twenty at a time for friends and requests, ten for
search, each with its own `Load more` and a `Showing 20 of 45` line. The
leaderboard folds to the top ten with `Show all`, and somebody ranked
twenty-fifth still gets their own row below the fold - folding may hide
places, never the user's own.

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

## Development history

What was built, in the order it was built. Taken from the commit history
rather than a plan, so it says what actually happened.

| # | What it added | Commit |
| --- | --- | --- |
| 1 | Project foundation: Vite, Django, Neon | `79fe6ad`, `32041ca` |
| 2 | Authentication: JWT login, protected routes | `b7cb11b` |
| 3 | Application shell, sidebar and navigation | `74e185a` |
| 4 | Redux Toolkit state foundation | `70c0e13` |
| 5 | Study data models: `StudySession`, `DailyGoal` | `90977c4` |
| 6 | Study session APIs | `2501390` |
| 7 | The focus timer | `526ab2c` |
| 8 | Live daily focus tracking | `d033a67` |
| 9 | Session completion and the learning record | `e039258` |
| 10 | The compact in-page timer popup | `08b446a` |
| 11 | Focus Mode and the break timer | `56d1fc9` |
| 12 | Home analytics: weekly chart, subjects, recent sessions | `1531f0f` |
| 13 | Study history and learning memory | `40f37da` |
| 14 | Friends and friend requests | `ebd3756` |
| 15 | Weekly and monthly study leaderboard | `3c0a021` |
| 16 | Profile and personal study overview | `d71fe18` |
| 17 | Hardening: session recovery, loading, empty and error states | `c98a54a` |
| 18 | The Neo-classical visual language | `d37f9e4` |
| 19 | Desktop UX for Windows laptops | `4f6425f` |
| 20 | Code quality and architecture cleanup | folded into later work |
| 21 | Email-verified registration with a Brevo OTP | `6238758` |
| 22 | Forgot password and secure password reset | `6238758` |
| — | Focus session redesign: clock, setup, duration picker | `f82ff51` |

### Not yet committed

The most recent work is still in the working tree:

- **Application shell scroll fix.** An absolutely positioned element with no
  positioned ancestor escaped the scroll container and stretched the page,
  which put a second scrollbar on the window and a band of dead space under
  the whole application. `main` is now a containing block.
- **History as a month archive.** Month and year navigation, a summary
  endpoint, and per-day totals, so a year of study is twelve short pages
  instead of one endless scroll.
- **Friends pagination.** Friends, requests and user search all arrive a page
  at a time, and the leaderboard folds to the top ten.
- **Home scaling.** Today's subjects fold to the top five, and the supporting
  sections step back while a session runs.
- **Phase 23: the Windows desktop application.** Tauri 2, and the native
  always-on-top focus window.

## Not implemented yet

Deliberately absent:

- **Notifications** - the one planned feature never built.
- **Change password from Profile** - password *reset* exists; changing a known
  password while signed in does not.
- **Offline use** - every page needs the API.

## Known limitations

Honest gaps rather than absent features. Each one is a deliberate stopping
point, not an oversight:

| Limitation | Why it stands |
| --- | --- |
| A running session is lost if the application restarts | The timer lives in memory. Persisting it needs a decision about what "closed for six hours" should mean. |
| No system tray, so closing the main window quits | The focus window covers the common case of working elsewhere. |
| Signing in elsewhere survives a password reset | SimpleJWT tokens are signed, not stored, and the blacklist app is not installed. Access tokens last 30 minutes, refresh tokens 7 days. |
| History search covers the selected month only | Finding a note from six months ago means navigating to that month. |
| The leaderboard fetches every entry to preview three | Bounded by friend count; fine to a few hundred. |
| The resend cooldown lives in the default local-memory cache | Per process, forgotten on restart. A shared cache is needed before running several workers. |
| The Windows installer has not been built | `--no-bundle` produces a working `.exe`; the NSIS installer step is unproven. |

## Tests

```
cd backend
venv\Scripts\activate
python manage.py test
```

266 backend tests cover the study, accounts, friends and leaderboard apps:
ownership on every endpoint, the OTP and password-reset rules, the statistics
definitions, and that break minutes never reach a study total.
