# SyntaxTime API

All endpoints require a JWT access token:

```
Authorization: Bearer <access-token>
```

An unauthenticated request returns `401 Unauthorized`.

Base URL in development: `http://localhost:8001/api`

---

## Authentication

| Method | Endpoint              | Purpose                                |
| ------ | --------------------- | -------------------------------------- |
| POST   | `/api/auth/register/` | Create an account                      |
| POST   | `/api/auth/login/`    | Get access + refresh tokens and user   |
| POST   | `/api/auth/refresh/`  | Exchange a refresh token for an access |
| GET    | `/api/auth/me/`       | The signed-in user                     |

---

## Study sessions

### `GET /api/study/sessions/` and `GET /api/study/history/`

Returns the signed-in user's sessions, newest first. Both URLs return the same
data; `history/` exists because that is what the History page asks for.

Optional query parameters:

| Parameter    | Example        | Effect                            |
| ------------ | -------------- | --------------------------------- |
| `subject`    | `JavaScript`   | Case-insensitive exact match      |
| `date`       | `2026-08-29`   | Sessions started on that date     |
| `start_date` | `2026-08-01`   | Sessions on or after that date    |
| `end_date`   | `2026-08-31`   | Sessions on or before that date   |

### `POST /api/study/sessions/`

Saves a finished session. The owner is taken from the token — a `user` field in
the body is ignored.

```json
{
  "planned_minutes": 50,
  "focused_minutes": 47,
  "subject": "JavaScript",
  "topic": "Promises",
  "started_at": "2026-08-29T20:30:00+05:30",
  "completed_at": "2026-08-29T21:17:00+05:30",
  "status": "completed",
  "notes": "Learned Promise.all."
}
```

`subject`, `topic` and `notes` are optional. They may be omitted, sent as `""`,
or sent as `null` — all three are stored as an empty string. This is valid:

```json
{
  "planned_minutes": 25,
  "focused_minutes": 25,
  "started_at": "2026-08-29T18:00:00+05:30",
  "completed_at": "2026-08-29T18:25:00+05:30",
  "status": "completed"
}
```

Returns `201 Created` with the saved session, or `400 Bad Request` with field
errors.

### `GET /api/study/sessions/<id>/`

One session. Another user's session returns `404 Not Found`.

### `PATCH /api/study/sessions/<id>/`

Fills in the optional details afterwards from History:

```json
{
  "subject": "Python",
  "topic": "Django REST Authentication",
  "notes": "Learned the JWT flow."
}
```

Only `subject`, `topic` and `notes` can be changed. `planned_minutes`,
`focused_minutes`, `started_at`, `completed_at` and `status` are measured by the
timer and are not editable — sending them has no effect.

There is no `DELETE`. See the note at the end.

---

## Statistics

### `GET /api/study/statistics/`

Saved totals for the user's current local day.

```json
{
  "date": "2026-08-29",
  "today_focused_minutes": 126,
  "today_sessions_count": 3,
  "daily_target_minutes": 240
}
```

Cancelled sessions are excluded. **This is saved data only** — the running
timer is client-side, so the frontend adds the active session's elapsed seconds
on top of `today_focused_minutes` to display a live total.

### `GET /api/study/subjects/`

Completed focused minutes grouped by subject, largest first.

```json
[
  { "subject": "JavaScript", "focused_minutes": 100, "sessions_count": 2 },
  { "subject": "Django", "focused_minutes": 42, "sessions_count": 1 },
  { "subject": "", "focused_minutes": 25, "sessions_count": 1 }
]
```

Sessions with no subject come back as `""`. The frontend chooses the label to
display for them.

---

## Daily goal

### `GET /api/goals/today/`

```json
{ "id": 3, "date": "2026-08-29", "target_minutes": 240 }
```

If no goal is set, returns `target_minutes: 0` with `id: null` rather than a
404, so the frontend has one shape to render.

### `PUT /api/goals/today/`

```json
{ "target_minutes": 240 }
```

Creates today's goal, or updates it if one already exists. `target_minutes`
must be zero or greater.

---

## Validation rules

| Rule                                             | Response |
| ------------------------------------------------ | -------- |
| `planned_minutes` must be at least 1              | 400      |
| `focused_minutes` cannot be negative              | 400      |
| `focused_minutes` cannot exceed `planned_minutes` | 400      |
| `completed_at` cannot be before `started_at`      | 400      |
| A `completed` session needs a `completed_at`      | 400      |
| `status` must be `completed` or `cancelled`       | 400      |
| `target_minutes` cannot be negative               | 400      |

Errors use the standard DRF shape:

```json
{ "focused_minutes": ["Focused minutes cannot be negative."] }
```

---

## Notes on design

**Why there is no DELETE.** Deleting a session would silently change past
statistics and could break a streak the user earned. SyntaxTime is a record of
what happened, and nothing has asked to erase it. It can be added later if a
real need appears.

**Why another user's session returns 404, not 403.** A 403 would confirm the
session exists. A 404 reveals nothing at all.
