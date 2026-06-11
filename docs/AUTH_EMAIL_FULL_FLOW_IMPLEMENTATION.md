# Auth & Email Full Flow — Consolidated Implementation Guide

**Branch:** `feature/security-email-auth-flow` (4 functional commits, on top of `origin/main` = `17ff2d4`)
**Phases included:** P0 (JWT_SECRET hardening), E1 (Resend service), E2 (Account activation), E3 (Password reset)
**Combined patch:** `/app/stickpro_auth_email_full_flow.patch`
**Validation status:** 63 / 63 backend tests passing, backend boots, frontend builds, patch verified clean against `origin/main`.

> **This is a recovery & deployment dossier.** It is the single source of
> truth required to:
> * reapply the entire Auth & Email flow from scratch on a fresh clone,
> * smoke-test end-to-end before exposing to pilot clubs,
> * roll back safely if something goes wrong post-deploy.

Per-phase deep-dive docs remain available alongside:
- `docs/PHASE0_IMPLEMENTATION.md` — JWT_SECRET hardening details.
- `docs/PHASE_E1_IMPLEMENTATION.md` — `services/emails.py` service contract.
- `docs/PHASE_E2_IMPLEMENTATION.md` — Activation flow audit and patches.
- `docs/PHASE_E3_IMPLEMENTATION.md` — Password reset flow.
- `docs/EMAIL_PRODUCTION_SETUP.md` — Resend operational guide.

---

## 1. Scope summary

| Phase | Adds | Removes / hardens |
|---|---|---|
| **P0** | `.env.example`, JWT validation guards in 3 modules | Hardcoded `JWT_SECRET` fallback in `server.py`, `core/security.py`, `routes/auth.py` |
| **E1** | `services/emails.py`, `scripts/validate_email_config.py`, retry/backoff, dry-run | — |
| **E2** | `services/activation_emails.py`, `POST /api/auth/request-new-activation-link`, activation send in 3 existing endpoints | — |
| **E3** | `services/password_reset_emails.py`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, frontend `/forgot-password` + `/reset-password` | — |

**Explicitly out of scope:** Family Accounts, Season Core, refactor of `server.py`, migration of the legacy `send_email_notification` callsites (~9 untouched), bulk-import email fan-out, frontend i18n for new pages, IP-level rate-limiting.

---

## 2. Files changed (consolidated, 23 files, +4088 / -20)

| Status | Path |
|---|---|
| `M` | `.gitignore` |
| `A` | `backend/.env.example` |
| `M` | `backend/core/security.py` |
| `M` | `backend/routes/auth.py` |
| `A` | `backend/scripts/__init__.py` |
| `A` | `backend/scripts/validate_email_config.py` |
| `M` | `backend/server.py` *(import + 6 surgical patches; no refactor)* |
| `A` | `backend/services/__init__.py` |
| `A` | `backend/services/activation_emails.py` |
| `A` | `backend/services/emails.py` |
| `A` | `backend/services/password_reset_emails.py` |
| `A` | `backend/tests/test_jwt_secret_validation.py` *(4 tests)* |
| `A` | `backend/tests/test_phase_e1_emails.py` *(19 tests)* |
| `A` | `backend/tests/test_phase_e2_activation.py` *(19 tests)* |
| `A` | `backend/tests/test_phase_e3_password_reset.py` *(21 tests)* |
| `A` | `docs/EMAIL_PRODUCTION_SETUP.md` |
| `A` | `docs/PHASE_E1_IMPLEMENTATION.md` |
| `A` | `docs/PHASE_E2_IMPLEMENTATION.md` |
| `A` | `docs/PHASE_E3_IMPLEMENTATION.md` |
| `M` | `frontend/src/App.js` *(2 new public routes)* |
| `A` | `frontend/src/pages/ForgotPassword.jsx` |
| `M` | `frontend/src/pages/Login.jsx` *(forgot-password link)* |
| `A` | `frontend/src/pages/ResetPassword.jsx` |

> Note: `docs/PHASE0_IMPLEMENTATION.md` already exists on `main` (from a
> previous platform auto-commit) and is therefore not in this consolidated
> patch.

---

## 3. Endpoints added

| Method | Path | Auth | Status codes | Notes |
|---|---|---|---|---|
| `POST` | `/api/auth/request-new-activation-link` | public | `200` always (generic msg) · `422` schema | Enumeration-safe; 60 s per-account throttle |
| `POST` | `/api/auth/forgot-password` | public | `200` always (generic msg) · `422` schema | Enumeration-safe; 60 s per-account throttle; only active accounts trigger an email |
| `POST` | `/api/auth/reset-password` | public | `204` success · `400` invalid/expired/used · `422` schema | Single-use; SHA-256-hashed token at rest; sets `is_activated=True` on success |

### Existing endpoints whose **behaviour now includes an email dispatch**

| Endpoint | Was | Now |
|---|---|---|
| `POST /api/members` | created inactive user, returned `activation_link` | + dispatches activation email via `services.activation_emails` (fire-and-forget try/except — response shape unchanged) |
| `POST /api/members/{id}/send-invite` | refreshed token, returned `activation_link` | + dispatches activation email |
| `POST /api/members/{id}/send-activation-reminder` | sent legacy email + push | switched to `services.activation_emails`; auto-refreshes expired tokens before sending |

---

## 4. Frontend routes added

| Path | Component | Access |
|---|---|---|
| `/forgot-password` | `frontend/src/pages/ForgotPassword.jsx` | Public |
| `/reset-password?token=...` | `frontend/src/pages/ResetPassword.jsx` | Public |

Plus a link `Esqueceste a palavra-passe?` on `/login`
(`data-testid="login-forgot-password-link"`).

All interactive elements carry `data-testid` for automation; see the
per-phase docs for the full inventory.

---

## 5. Environment variables

### 5.1 Required in production (`ENVIRONMENT=production`)
| Variable | Where it's read | Behaviour if missing |
|---|---|---|
| `ENVIRONMENT` | Auth guards, email service | Defaults to `development` (lenient) |
| `JWT_SECRET` | 3 modules (server, core, routes) | **`RuntimeError` at startup in production** |
| `RESEND_API_KEY` | `services/emails.py` | `EmailConfigError` raised on send in production; dry-run in dev |
| `SENDER_EMAIL` | `services/emails.py` | Falls back to `onboarding@resend.dev` in dev |
| `FRONTEND_URL` | `services/activation_emails.py`, `services/password_reset_emails.py` | `ValueError` raised when building links |
| `MONGO_URL` | `server.py` | KeyError at startup |
| `DB_NAME` | `server.py` | KeyError at startup |

### 5.2 Optional / unchanged
| Variable | Purpose |
|---|---|
| `CORS_ORIGINS` | Inherits previous default `*` |

A canonical template is checked in at **`backend/.env.example`**.

---

## 6. Test commands

```bash
# Backend (all 4 new suites — 63 tests)
cd /app/backend && python -m pytest \
    tests/test_jwt_secret_validation.py \
    tests/test_phase_e1_emails.py \
    tests/test_phase_e2_activation.py \
    tests/test_phase_e3_password_reset.py

# Email config validator (CLI; exit 0/1 for CI)
cd /app/backend && python scripts/validate_email_config.py

# Frontend build
cd /app/frontend && DISABLE_ESLINT_PLUGIN=true CI=false yarn build

# Backend boot check
sudo supervisorctl restart backend
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/
```

Expected results: 63 passed, exit 0, "Compiled successfully.", `200`.

---

## 7. Deploy checklist

Before tagging a release and shipping to a pilot environment:

- [ ] **Code in target environment**
  - [ ] Apply combined patch on top of `origin/main`:
        `git am stickpro_auth_email_full_flow.patch`
  - [ ] CI green on the 4 backend suites (63 tests).
  - [ ] Frontend builds without warnings (`yarn build`).

- [ ] **Resend domain readiness** (see `docs/EMAIL_PRODUCTION_SETUP.md`)
  - [ ] Sending domain status reads "Verified" in Resend dashboard.
  - [ ] DNS records present: SPF, DKIM, optional DMARC.
  - [ ] `SENDER_EMAIL` is on the verified domain.

- [ ] **Production environment variables**
  - [ ] `ENVIRONMENT=production`.
  - [ ] `JWT_SECRET` set to a fresh value generated with
        `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
  - [ ] `RESEND_API_KEY` is a **production** key (not the test one).
  - [ ] `SENDER_EMAIL` configured.
  - [ ] `FRONTEND_URL` is the canonical app URL with no trailing slash.

- [ ] **Pre-boot validation**
  - [ ] `python scripts/validate_email_config.py` exits 0 on the target host.

- [ ] **JWT rotation communication**
  - [ ] All currently active sessions will be invalidated because the
        production `JWT_SECRET` is rotated away from the legacy
        hardcoded fallback. Existing pilot users will be asked to log in
        again. Coordinate this if applicable.

- [ ] **Smoke test** — see section 9.

- [ ] **Monitoring**
  - [ ] Backend logs surface `[ACTIVATION EMAIL SENT]` / `[PASSWORD RESET EMAIL SENT]`
        for happy paths and `[… FAILED]` for transient errors.
  - [ ] `password_reset_audit` collection accumulates one row per attempt.

---

## 8. Rollback plan

The combined patch is **purely additive** at the file level (1 modified
config file, 4 modified Python modules, 2 modified frontend files, the
rest new). Two rollback modes are supported:

### 8.1 Soft rollback (recommended — feature toggle)

Disable the new flows without redeploying code:

| Action | Effect |
|---|---|
| Unset `RESEND_API_KEY` | All `send_email` calls switch to dev dry-run if `ENVIRONMENT != production`. In production the service raises `EmailConfigError` and the *legacy* callsites of `send_email_notification` (untouched) continue to work because they have their own fallback. The **new** endpoints will fail closed: `/auth/forgot-password` returns the generic 200 but no email goes out, `/auth/reset-password` continues to work because it doesn't need email at consume time, activation email dispatches inside `/members` and friends fall through their try/except. |
| Remove the new frontend routes by reverting `frontend/src/App.js` only | UI surface disappears; backend endpoints remain reachable for direct API clients. |

### 8.2 Full revert

```bash
# On the production server, in the deployment branch:
git revert --no-commit cb342ca 118147f 5f34a21 225ec4c     # or the SHAs your remote uses
git commit -m "revert: roll back auth & email full flow"
git push <remote> <branch>
# Redeploy.
```

The reverts will:

* Restore the hardcoded `JWT_SECRET` fallback (⚠️ security regression — only acceptable as an emergency stop).
* Delete the three new service modules.
* Remove the three new endpoints.
* Delete the two new frontend routes.

**Important:** if `JWT_SECRET` has been rotated in production, do **not** revert P0 in production — keep `JWT_SECRET` set so the rotated secret continues to validate tokens. P0 hardening removal is only meaningful in local/dev.

### 8.3 Data hygiene after rollback

| Field | Cleanup |
|---|---|
| `users.password_reset_token_hash` | leftover; harmless without endpoints |
| `users.password_reset_expires_at` | leftover; harmless |
| `users.password_reset_used_at` | history of past resets; keep |
| `users.last_password_reset_email_sent_at` | leftover; harmless |
| `users.last_activation_email_sent_at` | leftover; harmless |
| `password_reset_audit` collection | keep as historical audit log |

None of these break the legacy app; they simply become unused fields.

---

## 9. Smoke test checklist

Run after every deploy on the target environment. All steps assume a fresh
test email mailbox accessible to the operator.

### 9.1 Setup

- [ ] **0.1** `ENVIRONMENT=production`, all required env vars set
      (`JWT_SECRET`, `RESEND_API_KEY`, `SENDER_EMAIL`, `FRONTEND_URL`).
- [ ] **0.2** `python scripts/validate_email_config.py` exits 0.
- [ ] **0.3** `curl $FRONTEND_URL/api/ → 200`.

### 9.2 Activation flow

- [ ] **1.** **Create inactive member** — as an admin/manager,
      `POST /api/members { name, email, role, team_id }`.
      Expect `200` with `{ user, activation_link, invite_token }`.
- [ ] **2.** **Confirm activation email sent** — check the inbox for the
      target email. Subject **"Ativa a tua conta Stick Pro"**. Email contains
      a link to `<FRONTEND_URL>/activate-account?token=...` and a plain-text
      fallback. Backend log line `[ACTIVATION EMAIL SENT] to=...`.
- [ ] **3.** **Click activation link** — opens `/activate-account?token=...`
      in the browser. Page renders without console errors.
- [ ] **4.** **Activate account** — set a password (≥ 6 chars per legacy
      `/auth/activate`). Expect success message. Database: user's
      `is_activated=true`, `hashed_password` populated, `invite_token` /
      `invite_expires_at` cleared.
- [ ] **5.** **Login** — `POST /api/auth/login` with the same email +
      password. Expect `200` with `{ token, user, available_profiles }`.
      Frontend `/login` flow lands on `/dashboard`.

### 9.3 Password recovery flow

- [ ] **6.** **Click "Esqueceste a palavra-passe?"** on `/login`. Navigate
      to `/forgot-password`. Submit the same email from step 1.
- [ ] **7.** **Receive reset email** — subject **"Redefinir palavra-passe
      Stick Pro"**, body contains a link to
      `<FRONTEND_URL>/reset-password?token=...`. Backend log
      `[PASSWORD RESET EMAIL SENT] to=...`. MongoDB:
      `users.password_reset_token_hash` set,
      `users.password_reset_expires_at` ≈ now + 1 h.
- [ ] **8.** **Reset password** — open the reset link, choose a new
      password ≥ 8 chars, confirm, submit. Expect HTTP `204` and the page
      auto-redirects to `/login`. MongoDB: `hashed_password` changed,
      `password_reset_token_hash` cleared, `password_reset_used_at` set.
      `password_reset_audit` collection contains a `reset_succeeded` row.
- [ ] **9.** **Login with new password** — `POST /api/auth/login` with the
      new password. Expect `200`.
- [ ] **10.** **Confirm old password no longer works** —
      `POST /api/auth/login` with the *old* password. Expect `401
      Credenciais inválidas`.

### 9.4 Negative & enumeration safety

- [ ] **11.** `POST /api/auth/forgot-password { "email": "nonexistent@x.y" }` →
      `200` with the same generic message as step 6.
- [ ] **12.** `POST /api/auth/forgot-password` twice within 60 s for the
      same account → second call still returns `200` generic, but the
      backend log shows no second send (`outcome=ignored / reason=throttled`
      in `password_reset_audit`).
- [ ] **13.** `POST /api/auth/reset-password { "token": "garbage", … }` →
      `400 Link inválido ou já utilizado`. Audit row `reset_rejected /
      invalid_token`.
- [ ] **14.** Re-use the token from step 8 (already consumed) → `400`.
- [ ] **15.** `POST /api/auth/request-new-activation-link { "email": "x@y.z" }`
      for an unknown email → `200` generic, no email sent.

### 9.5 Configuration regression

- [ ] **16.** Restart the app with `JWT_SECRET` unset (in a staging pod) →
      backend refuses to start with `RuntimeError: JWT_SECRET environment
      variable is required in production. …`.

---

## 10. Recovery instructions (fresh clone)

If this pod is lost, the entire flow can be reconstructed from the single
combined patch:

```bash
# 1. Clone the repo and check out main
git clone https://github.com/bpereiracav-sys/StickPro_projeto.git
cd StickPro_projeto
git pull origin main

# 2. Create the feature branch and apply the combined patch
git checkout -b feature/security-email-auth-flow
git am /path/to/stickpro_auth_email_full_flow.patch

# 3. Verify
cd backend && python -m pytest \
    tests/test_jwt_secret_validation.py \
    tests/test_phase_e1_emails.py \
    tests/test_phase_e2_activation.py \
    tests/test_phase_e3_password_reset.py
# Expect: 63 passed

cd ../frontend && DISABLE_ESLINT_PLUGIN=true CI=false yarn build
# Expect: Compiled successfully.

# 4. Push (or use Save to GitHub)
git push -u origin feature/security-email-auth-flow
```

The 4 individual phase patches remain available in `/app/` for any
operator who wants to inspect or apply them separately:

- `stickpro_phase0_jwt_secret_only.patch`
- `stickpro_phase_e1_emails.patch`
- `stickpro_phase_e2_activation.patch`
- `stickpro_phase_e3_password_reset.patch`

---

## 11. Patch artifact summary

| | |
|---|---|
| **Combined patch** | `/app/stickpro_auth_email_full_flow.patch` |
| **Size** | 174 132 bytes |
| **SHA-256** | `a464b7c56e7cdbd506ac5b072628603a077fe66899f1c09e6fe9d8f91d7bee66` |
| **Format** | `git format-patch` (4 commits, `git am`-ready) |
| **Base** | `origin/main` (`17ff2d4`) |
| **Verified against** | Fresh worktree at `origin/main`; all 4 commits applied with `git am` cleanly; 63 / 63 tests passed inside the worktree |

---

## 12. Pointers to future work

These are explicitly *not* in this consolidation but are tracked for
follow-up:

* **Server-side rate-limit by IP** (vs per-account) — recommended pre-pilot.
* **Frontend i18n** for `ForgotPassword.jsx`, `ResetPassword.jsx` and
  `ActivateAccount.jsx` (currently PT-PT only).
* **Wire `validate_email_config()` into the FastAPI startup event** so the
  app refuses to boot in production with missing email config.
* **Resend webhooks → `email_log` collection** for delivery monitoring
  (the per-message `X-Idempotency-Key` plumbing is already in place).
* **Migrate remaining ~9 legacy `send_email_notification` callsites** to
  the new `services.emails.send_email` entry point.
* **Bulk import (`POST /api/members/import`) email fan-out** — currently
  documented as a high-risk follow-up in Phase E2.
* **Extract `server.py` into domain routers** — long-running refactor that
  unblocks several other items.
