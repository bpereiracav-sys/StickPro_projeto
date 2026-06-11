# Phase E3 — Password Reset Flow

**Branch:** `feature/security-email-auth-flow`
**Status:** ✅ Implemented locally. Lint clean. **63/63 backend tests passing**
(4 Phase 0 + 19 Phase E1 + 19 Phase E2 + 21 Phase E3). Backend boots OK.
Frontend builds OK and both `/forgot-password` and `/reset-password` render.

> Companion docs: `PHASE0_IMPLEMENTATION.md`, `PHASE_E1_IMPLEMENTATION.md`,
> `PHASE_E2_IMPLEMENTATION.md`, `EMAIL_PRODUCTION_SETUP.md`.

---

## 1. Objective

Provide a complete, secure self-service password recovery flow:

1. A user requests reset via `POST /api/auth/forgot-password` with their email.
2. They receive an email with a single-use, 1-hour token.
3. They click the link → `<FRONTEND_URL>/reset-password?token=...`.
4. They set a new password → `POST /api/auth/reset-password`.
5. They are redirected to `/login` and can log in with the new password.

The whole flow is **enumeration-safe**, **rate-limited**, **audit-logged**,
stores **only the SHA-256 hash** of the reset token in MongoDB, and uses
the existing `bcrypt`-based password hash on success.

---

## 2. Files Changed in Phase E3 (8 files)

| Status | Path | Lines | Purpose |
|---|---|---|---|
| `A` | `backend/services/password_reset_emails.py` | +175 | Link builder, HTML/text bodies (escape-safe), `send_password_reset_email` |
| `A` | `backend/tests/test_phase_e3_password_reset.py` | +395 | **21 pytest cases** (unit + endpoint via TestClient) |
| `M` | `backend/server.py` | +185 / -1 | `import hashlib`, helper, 2 new endpoints, audit collection |
| `A` | `frontend/src/pages/ForgotPassword.jsx` | +130 | Tailwind UI, success state, error states |
| `A` | `frontend/src/pages/ResetPassword.jsx` | +210 | Tailwind UI, strength meter, confirm-password, auto-redirect |
| `M` | `frontend/src/App.js` | +18 | Add `/forgot-password` and `/reset-password` routes |
| `M` | `frontend/src/pages/Login.jsx` | +10 | Add "Esqueceste a palavra-passe?" link |
| `A` | `docs/PHASE_E3_IMPLEMENTATION.md` | (this file) | Reconstruction record |

Nothing in `core/`, `routes/`, `models/`, `permissions.py`, the existing
auth helpers, Family Accounts, Season Core, or Phase 0/E1/E2 code was
modified.

---

## 3. Backend endpoints

### 3.1 `POST /api/auth/forgot-password`

**Request:**
```json
{ "email": "user@example.com" }
```

**Response (always):**
```json
{ "message": "Se existir uma conta associada a este email, enviámos um link para redefinir a palavra-passe." }
```
Status: `200 OK`.

**Behaviour matrix:**

| State | Email sent? | Audit outcome |
|---|---|---|
| Email not found | ❌ | `ignored / unknown_email` |
| Account exists but `is_activated=False` | ❌ | `ignored / account_not_activated` |
| Last send < 60 s ago | ❌ | `ignored / throttled` |
| Active account, eligible | ✅ | `email_sent` |
| Active account, eligible, send failed | ❌ | `email_failed / delivery_failed` |
| Malformed email body | n/a — `422` from Pydantic | — |

### 3.2 `POST /api/auth/reset-password`

**Request:**
```json
{ "token": "<raw token from email>", "password": "newpassword" }
```
* `token` must be at least 10 chars (Pydantic guard).
* `password` must be at least 8 chars (Pydantic guard — see `PASSWORD_RESET_MIN_LEN`).

**Responses:**

| Status | Meaning |
|---|---|
| `204 No Content` | Password updated; token consumed; `is_activated` set to True; audit row `reset_succeeded`. |
| `400 Bad Request` | Token unknown / expired / already used. Body: `{ "detail": "Link inválido ou já utilizado" }` (or `"Link expirado"`). |
| `422` | Body schema failure (e.g. short password / short token). |

**Single-use guarantee:** the consume step is an atomic Mongo update with
`{"id": user_id, "password_reset_token_hash": token_hash}` in the filter
and `$unset` on the hash field in the update — only one caller can succeed.

### 3.3 Stored fields on the user document

```
password_reset_token_hash         hex SHA-256 of the raw token; cleared on
                                  success and on expiry.
password_reset_expires_at         ISO-8601 UTC; 1 hour TTL.
last_password_reset_email_sent_at ISO-8601 UTC; updated only on successful
                                  send (failed sends do not block retries).
password_reset_used_at            ISO-8601 UTC; set only on successful reset.
```

### 3.4 Audit collection `password_reset_audit`

Each row:
```json
{
  "id": "<uuid>",
  "email_masked": "j***@example.com",
  "user_id": "<uuid|null>",
  "outcome": "email_sent|ignored|email_failed|reset_succeeded|reset_rejected",
  "reason": "unknown_email|throttled|invalid_token|expired|already_used|...",
  "timestamp": "<iso8601 UTC>"
}
```
Emails are never stored in clear in the audit log. Writes are
fire-and-forget — failures inside the audit path never abort the user-facing
flow.

---

## 4. `services.password_reset_emails`

```python
def build_reset_link(token, *, frontend_url=None) -> str
async def send_password_reset_email(*, to_email, name, token,
                                    frontend_url=None,
                                    idempotency_key=None) -> bool
```

* Link shape: `<FRONTEND_URL>/reset-password?token=<url-encoded>`.
* HTML template uses `html.escape(..., quote=True)` for the user name and
  the reset link — prevents `<script>` and double-quote attribute breakouts.
* Plain-text fallback is generated alongside (no HTML tags).
* `tags={"category": "password_reset"}` plus `X-Idempotency-Key` header for
  Phase E4 webhook correlation.
* Returns `False` on delivery failure — never raises on a delivery error;
  raises `ValueError` only on programming errors (missing inputs).

---

## 5. Frontend pages

### `/forgot-password` (`ForgotPassword.jsx`)
* Tailwind-only styling, mobile-friendly, consistent with the rest of the app.
* Client-side email regex sanity check; backend is the source of truth.
* Loading state on the submit button; success state replaces the form.
* `data-testid` on every interactive element:
  `forgot-password-page`, `forgot-back-to-login`, `forgot-email-input`,
  `forgot-error-message`, `forgot-submit-button`, `forgot-success-state`,
  `forgot-back-link`.

### `/reset-password` (`ResetPassword.jsx`)
* Reads `?token=` from the URL via `useSearchParams`.
* Renders a dedicated "link em falta" state if the token query param is
  missing.
* Password strength bar (length / mixed case / digit / symbol).
* Confirm-password field with mismatch error.
* Translates `400` from the backend into "este link já não é válido — pede
  um novo email", and offers a link back to `/forgot-password`.
* On `204`, switches to a success state and auto-redirects to `/login`
  after 2.2 s.
* `data-testid`s:
  `reset-password-page`, `reset-back-to-login`, `reset-password-input`,
  `reset-confirm-password-input`, `reset-password-strength`,
  `reset-error-message`, `reset-submit-button`, `reset-success-state`,
  `reset-go-login-link`, `reset-missing-token-state`, `reset-request-new-link`.

### `Login.jsx`
* Added `Esqueceste a palavra-passe?` link below the password field with
  `data-testid="login-forgot-password-link"`. No other change to the page.

### `App.js`
* Added two public routes under the existing `PublicRoute` pattern:
  `/forgot-password` → `ForgotPassword`, `/reset-password` → `ResetPassword`.

---

## 6. Verification

### 6.1 Lint
```
backend/services/password_reset_emails.py      ✓
backend/tests/test_phase_e3_password_reset.py  ✓
frontend ForgotPassword.jsx / ResetPassword.jsx / Login.jsx / App.js  ✓
```

### 6.2 Pytest — 63 / 63
```
$ cd backend && python -m pytest \
    tests/test_jwt_secret_validation.py \
    tests/test_phase_e1_emails.py \
    tests/test_phase_e2_activation.py \
    tests/test_phase_e3_password_reset.py
======================= 63 passed in 8.94s =======================
```

Phase E3 test inventory (21 cases):

| Group | Test | Covers |
|---|---|---|
| Link | `uses_frontend_url`, `url_encodes_token`, `rejects_missing_token`, `rejects_missing_frontend_url` | Builder contract |
| Template | `html_body_escapes_user_controlled_values`, `plain_text_body_has_no_html` | XSS-style escape; plain-text fallback |
| Helper | `calls_send_email`, `returns_false_on_exception`, `rejects_invalid_inputs` | Orchestration through `services.emails.send_email` |
| forgot-password | `generic_for_unknown_email`, `generic_for_inactive_account`, `sends_and_persists_hash`, `throttle_blocks_repeat`, `invalid_email_returns_422`, `writes_audit_log` | Non-enumeration, hash-only storage, throttle, audit |
| reset-password | `rejects_invalid_token`, `rejects_expired_token`, `short_password_returns_422`, `success_changes_password_and_logs_audit`, `token_is_single_use`, `after_reset_allows_login` | Validation, expiry, single-use, full E2E with login |

### 6.3 Backend boot
```
backend                          RUNNING   pid 2266, uptime 0:06:19
GET /api/                                  -> 200
POST /api/auth/forgot-password {x@y.z}     -> 200 (generic msg)
POST /api/auth/reset-password {bad-token}  -> 400
```

### 6.4 Frontend build
```
$ cd frontend && DISABLE_ESLINT_PLUGIN=true CI=false yarn build
Compiled successfully.
  309.93 kB  build/static/js/main.9094c3da.js
  16.16 kB   build/static/css/main.48464a9e.css
```

### 6.5 Visual smoke (Playwright)
`/forgot-password` and `/reset-password?token=test-token-123` both render
correctly. Screenshot captured during validation.

---

## 7. Security properties summary

| Requirement | Implementation |
|---|---|
| Generic success for forgot-password | Single response string used for **all** code paths (200) |
| Do not leak whether email exists | All branches return the same `{ "message": ... }` body |
| Secure random token | `secrets.token_urlsafe(32)` → 256 bits of entropy |
| Hashed token at rest | SHA-256 hex stored in `password_reset_token_hash`; raw token never persisted |
| Expiration time | 1 hour TTL (`PASSWORD_RESET_TOKEN_TTL`) |
| Single-use token | Atomic Mongo update with the hash in the filter and `$unset` on success |
| Throttle | 60 s between successful sends per account (`PASSWORD_RESET_THROTTLE_SECONDS`) |
| Reject invalid/expired/used tokens | Three explicit checks before consume; expired tokens are cleared from DB |
| Existing password hashing | Reuses `hash_password()` → `bcrypt.hashpw` |
| Audit logging | Collection `password_reset_audit` with masked email, outcome, reason, timestamp |

---

## 8. Known follow-ups (deliberately out of scope)

1. **Server-side rate-limit per IP** — currently throttle is per account.
   An attacker could enumerate emails through Pydantic 422 vs 200 timing.
   The 200/422 split is intentional (Pydantic is structural validation),
   but a global IP-based rate-limit middleware would be a useful hardening
   step before pilot launch.
2. **Wiring `validate_email_config()` into the FastAPI startup event** —
   recommended for Phase E4 alongside the webhooks ingestion.
3. **Replace `send_email_notification` callsites** with `services.emails.send_email`.
4. **Frontend i18n** — strings are PT-PT only for now; matches the
   existing `ActivateAccount.jsx` baseline. P1 follow-up to translate to
   ES/FR/IT/EN.
5. **Cleanup of orphaned reset tokens** — a background job to clear
   `password_reset_token_hash` from users where `password_reset_expires_at`
   is in the past. Currently the reset endpoint clears its own row on
   expiry; orphan accumulation is bounded by the throttle.

---

## 9. Reconstruction instructions

```bash
git checkout main && git pull origin main
git checkout -b feature/security-email-auth-flow
git am stickpro_phase0_jwt_secret_only.patch
git am stickpro_phase_e1_emails.patch
git am stickpro_phase_e2_activation.patch
git am stickpro_phase_e3_password_reset.patch
git push -u origin feature/security-email-auth-flow
```
