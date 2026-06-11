# Phase E2 — Account Activation Email Flow

**Branch:** `feature/security-email-auth-flow` (continuation after Phase 0 + E1)
**Status:** ✅ Implemented locally. Lint clean. **42/42 tests passing**
(4 Phase 0 + 19 Phase E1 + 19 Phase E2). Backend boots OK.
**Scope:** wire real activation emails into 3 existing flows + add a public
self-service resend endpoint. Bulk-import flow documented as a deliberate
follow-up.

> Companion docs:
> - `docs/PHASE0_IMPLEMENTATION.md` — Phase 0 (JWT_SECRET hardening).
> - `docs/PHASE_E1_IMPLEMENTATION.md` — Phase E1 (Resend service).
> - `docs/EMAIL_PRODUCTION_SETUP.md` — operational/deployment guide.

---

## 1. Objective

Make sure activation emails actually go out when:

1. A new inactive member is created (`POST /api/members`).
2. An admin/manager re-sends an invite (`POST /api/members/{id}/send-invite`).
3. An admin sends an activation reminder
   (`POST /api/members/{id}/send-activation-reminder`).

And make sure end users can recover from a lost / expired link without
contacting support:

4. **NEW** `POST /api/auth/request-new-activation-link` — public,
   unauthenticated, enumeration-safe.

All mailing now goes through `services.activation_emails.send_activation_email`
which itself sits on top of `services.emails.send_email` (Phase E1). The
legacy `send_email_notification` helper in `server.py` is **untouched** —
it stays available for the ~9 unrelated callsites that use it today.

---

## 2. Files Changed in Phase E2 (3 files)

| Status | Path | Lines | Purpose |
|---|---|---|---|
| `A` | `backend/services/activation_emails.py` | +180 | Link builder + HTML/text templates + `send_activation_email` |
| `A` | `backend/tests/test_phase_e2_activation.py` | +320 | 19 pytest cases (unit + endpoint via TestClient) |
| `M` | `backend/server.py` | +96 / -23 | Import + 4 surgical patches |

`backend/services/__init__.py` and `backend/scripts/` from Phase E1 are
reused as-is. Nothing in `core/`, `routes/`, `models/`, `permissions.py` or
the frontend was touched.

### Surgical patches in `server.py`

| Patch | Anchor | Change | Lines |
|---|---|---|---|
| Import `secrets` | top imports (line ~13) | Add `import secrets` — used by the new endpoint and was already referenced by 3 legacy callsites that were silently broken on those code paths. | +1 |
| Import `send_activation_email` | after permissions import | Bring the new helper into scope. | +4 |
| `POST /api/members` | after activation-link build | Try/except `await send_activation_email(...)`; failure logged, response unchanged. | +13 |
| `POST /api/auth/request-new-activation-link` | between `/auth/activate` and `/auth/login` | New public endpoint (see §4). | +73 |
| `POST /api/members/{id}/send-invite` | after activation-link build | Same try/except pattern as `POST /members`. | +12 |
| `POST /api/members/{id}/send-activation-reminder` | replaces inline HTML block | Refreshes token if missing/expired, then calls `send_activation_email`. Legacy `send_email_notification` call removed from this single handler. | net ~+0 |

---

## 3. `services.activation_emails`

### 3.1 Public API

```python
def build_activation_link(token: str, *, frontend_url: Optional[str] = None) -> str: ...

async def send_activation_email(
    *,
    to_email: str,
    name: str,
    token: str,
    frontend_url: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> bool: ...
```

* `build_activation_link` always returns `<FRONTEND_URL>/activate-account?token=<URL-encoded token>`.
* `send_activation_email` returns `True` on a successful send (including
  dry-run in dev when `RESEND_API_KEY` is unset).
* It returns `False` on a transient/permanent delivery failure — it
  **never raises** on a delivery error, so HTTP handlers can call it safely
  inside a single `try/except` without aborting the user-facing flow.
* It **does raise** `ValueError` on programming errors (no recipient, no
  token, no `FRONTEND_URL`).

### 3.2 Template

* HTML body: table-based layout, inline CSS only, Stick Pro typography,
  button + visible fallback URL.
* Plain-text body always rendered alongside.
* All user-controlled values pass through `html.escape(…, quote=True)` so
  `<script>`, `"` and `&` are neutralised inside both `href` and visible
  text. The token in the URL is also percent-encoded via `urllib.parse.quote`.

### 3.3 Metadata for future webhook correlation (Phase E4)

Each email carries:

* `tags={"category": "activation"}`
* `headers={"X-Idempotency-Key": <flow-specific key>}` where the key shape is
  `member-create-<user_id>`, `send-invite-<member_id>-<tokenprefix>`,
  `reminder-<member_id>-<tokenprefix>`, or `resend-<user_id>-<tokenprefix>`.

This lets Phase E4 (Resend webhooks → `email_log` collection) trace a
delivery event back to the exact business action that triggered it.

---

## 4. Public endpoint `POST /api/auth/request-new-activation-link`

### Request

```json
{ "email": "user@example.com" }
```

### Response (always)

```json
{ "message": "Se existir uma conta inativa associada a este email, enviámos um novo link de ativação." }
```

### Behaviour matrix

| Database state | Outcome |
|---|---|
| Email not found | Generic 200 response, no email sent. |
| Email found, `is_activated=True` | Generic 200 response, no email sent. |
| Email found, `is_activated=False`, existing token valid | Reuse token, send email, update `last_activation_email_sent_at`. |
| Email found, `is_activated=False`, token missing/expired | Regenerate token (`secrets.token_urlsafe(32)`, 7-day TTL), persist, send. |
| Email found, `is_activated=False`, last send < 60 s ago | Generic 200 response, no email sent (throttle). |
| Body invalid (e.g. malformed email) | `422 Unprocessable Entity` from Pydantic (this is *before* the handler runs, so it doesn't leak existence either). |

### Security properties

* **No enumeration:** the response is identical for found vs unknown emails,
  for already-activated accounts and for throttled retries.
* **Token rotation bounded:** the same token is reused while still valid so
  callers refreshing the page (or rapidly retrying) don't invalidate the
  prior email already in their inbox.
* **Per-account throttle:** 60 seconds, stored in `users.last_activation_email_sent_at`.
  Failed sends do **not** update the timestamp — the user can retry.
* **Club isolation preserved:** the endpoint touches `users` keyed on
  `email` only; no cross-club fanout, no club_id assumption.

---

## 5. Activation flow audit

What was inspected before patching, where token creation/refresh happens
today:

| # | Endpoint | server.py line | Created/refreshed `invite_token`? | Sent email before E2? | After E2 |
|---|---|---|---|---|---|
| 1 | `POST /api/members` | ~2547 | yes (new user) | ❌ | ✅ via `send_activation_email` |
| 2 | `POST /api/members/{id}/send-invite` | ~2630 | yes (refresh) | ❌ | ✅ via `send_activation_email` |
| 3 | `POST /api/members/{id}/send-activation-reminder` | ~3537 | no (assumed token still valid) | ✅ via legacy `send_email_notification` | ✅ via `send_activation_email`, also auto-refreshes token if expired |
| 4 | `POST /api/members/import` (bulk) | ~2728 | yes (per row) | ❌ | ❌ — **deliberate follow-up** (see §7) |
| 5 | `POST /api/auth/request-new-activation-link` | new | yes (refresh if needed) | n/a | ✅ |

---

## 6. Verification

### 6.1 Lint (ruff)

```
backend/services/activation_emails.py     ✓
backend/tests/test_phase_e2_activation.py ✓
```

`backend/server.py` still carries its pre-existing 16 ruff issues that
existed in `origin/main` (3× `F821 secrets`, 13× `E722 bare except`). The
`F821 secrets` ones are now reduced to **0** because Phase E2 explicitly
adds the missing `import secrets`. The 13× bare-except issues are out of
scope and untouched.

### 6.2 Pytest

```
$ cd backend && python -m pytest \
    tests/test_jwt_secret_validation.py \
    tests/test_phase_e1_emails.py \
    tests/test_phase_e2_activation.py
======================= 42 passed in 2.92s =======================
```

Phase E2 test inventory (19 cases):

| Group | Test | Covers |
|---|---|---|
| Link builder | `uses_frontend_url` | FRONTEND_URL prepended |
| | `strips_trailing_slash` | url normalization |
| | `explicit_override` | explicit arg wins over env |
| | `url_encodes_token` | tokens with `/?&` safe |
| | `rejects_missing_token` | raise ValueError |
| | `rejects_missing_frontend_url` | raise ValueError |
| Template | `html_body_escapes_user_name` | XSS-style `<script>` neutralised |
| | `html_body_escapes_activation_link` | `&` and `"` escaped in `href` |
| | `plain_text_fallback_is_provided` | no HTML in plain body |
| Helper | `calls_send_email` | message wired with subject/tags/headers |
| | `returns_false_on_exception` | swallow + log |
| | `rejects_invalid_email` | raise ValueError |
| | `rejects_missing_token` | raise ValueError |
| | `dry_run_succeeds_without_resend_key` | dev mode survives |
| Public endpoint | `generic_for_unknown_email` | 200 generic + no send |
| | `generic_for_already_activated` | 200 generic + no send |
| | `sends_for_existing_inactive` | 200 generic + 1 send |
| | `throttle_blocks_second_immediate_call` | 60-s guard works |
| | `invalid_email_returns_422` | Pydantic validation |

### 6.3 Manual smoke

```
$ sudo supervisorctl status backend
backend                          RUNNING   pid 1359
$ curl -s http://localhost:8001/api/                           # 200
$ curl -s -X POST http://localhost:8001/api/auth/request-new-activation-link \
    -H "Content-Type: application/json" -d '{"email":"nope@x.y"}'
{"message":"Se existir uma conta inativa associada a este email, enviámos um novo link de ativação."}
```

---

## 7. Known follow-ups (deliberately out of scope)

1. **Bulk import `POST /api/members/import`** — creates up to N inactive
   users in one call, each with its own `invite_token`. Sending N emails
   synchronously inside a single HTTP request risks request-timeout and
   rate-limit issues. Recommended treatment: enqueue sends or fire-and-forget
   via `asyncio.create_task`, with backoff already provided by `services.emails`.
   Currently the response still includes one `activation_link` per row so the
   operator can drive the rollout manually.

2. **Frontend rewrite of `ActivateAccount.jsx`** — page still uses inline
   styles and hardcoded PT strings. The handoff calls this out as a P1 item;
   it's intentionally not part of Phase E2 because Phase E2's contract is
   purely "email actually goes out". The page already accepts the token query
   param and calls `POST /api/auth/activate` correctly.

3. **Wire `validate_email_config()` into FastAPI startup** — would refuse to
   start the app in production with missing email config. Phase E1 has the
   validator; Phase E2 intentionally does not touch `server.py`'s lifecycle.
   Suggest landing in Phase E3 alongside the password-reset endpoints.

4. **Resend webhooks → `email_log` collection** — Phase E4. The current
   `tags`/`headers` plumbing is forward-compatible.

5. **Replace the remaining ~9 callsites of `send_email_notification`** with
   the new service. Migrate one flow at a time; not urgent because the
   legacy helper still works.

---

## 8. How to reapply this work to a fresh clone

```bash
git checkout main && git pull origin main
git checkout -b feature/security-email-auth-flow
git am stickpro_phase0_jwt_secret_only.patch
git am stickpro_phase_e1_emails.patch
git am stickpro_phase_e2_activation.patch
git push -u origin feature/security-email-auth-flow
```

The Phase E2 patch only contains the diffs listed in §2 plus this document
itself.

---

## 9. Pointers to next phases

* **Phase E3:** `forgot-password` / `reset-password` backend endpoints and
  React pages. Reuses `services.emails.send_email` and follows the same
  no-enumeration / throttle pattern as `request-new-activation-link`.
* **Phase E4:** Resend webhooks ingestion → `email_log` MongoDB collection,
  Admin dashboard widget for delivery monitoring, idempotency-key correlation
  using the `X-Idempotency-Key` header already attached to every send.
