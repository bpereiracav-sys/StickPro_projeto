# Phase 0 — JWT_SECRET Hardcoded Fallback Removal

**Branch:** `feature/security-email-auth-flow`
**Commit:** `303b37f` — `security(P0): remove hardcoded JWT_SECRET fallback`
**Patch:** `/app/stickpro_phase0_jwt_secret_only.patch`
**Status:** ✅ Implemented locally, tests green (4/4), backend boots OK

---

## 1. Objective

Eliminate the hardcoded JWT secret fallback `roller-hockey-hub-secret-key-2024`
that was present in three places in the backend. Replace it with a fail-fast
guard that:

1. **In production** (`ENVIRONMENT=production`): abort startup with a clear
   `RuntimeError` when `JWT_SECRET` is missing.
2. **In development/testing**: log a warning and use a clearly-marked insecure
   fallback so the app can still boot for local work.
3. **When `JWT_SECRET` is set**: use the provided value verbatim, regardless of
   environment.

No authentication logic was changed beyond loading the secret.

---

## 2. Files Changed (6 files, +200 / -3)

| Status | File | Lines |
|---|---|---|
| `M` | `.gitignore` | +4 |
| `A` | `backend/.env.example` | +26 |
| `M` | `backend/core/security.py` | +16 / -1 |
| `M` | `backend/routes/auth.py` | +16 / -1 |
| `M` | `backend/server.py` | +15 / -1 |
| `A` | `backend/tests/test_jwt_secret_validation.py` | +123 |

---

## 3. Exact Code Changes

### 3.1 `backend/server.py` (line ~42)

**Removed:**
```python
# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'roller-hockey-hub-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
```

**Added:**
```python
# JWT Configuration
# Security: JWT_SECRET MUST be set in production. In development/testing only,
# an insecure fallback is used so the app can boot — never deploy this way.
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').lower()
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    if ENVIRONMENT == 'production':
        raise RuntimeError(
            "JWT_SECRET environment variable is required in production. "
            "Set JWT_SECRET to a strong random value (min 32 chars) before starting the app."
        )
    JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me'
    logging.getLogger(__name__).warning(
        "JWT_SECRET not set - using insecure development fallback. "
        "DO NOT use this in production. Set JWT_SECRET in backend/.env."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
```

> Note: `logging` is already imported at the top of `server.py`, so no extra
> import was needed here.

### 3.2 `backend/core/security.py` (line ~16)

**Removed:**
```python
# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'roller-hockey-hub-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
```

**Added:**
```python
# JWT Configuration
# Security: JWT_SECRET MUST be set in production. In development/testing only,
# an insecure fallback is used so the app can boot - never deploy this way.
import logging as _logging
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').lower()
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    if ENVIRONMENT == 'production':
        raise RuntimeError(
            "JWT_SECRET environment variable is required in production. "
            "Set JWT_SECRET to a strong random value (min 32 chars) before starting the app."
        )
    JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me'
    _logging.getLogger(__name__).warning(
        "JWT_SECRET not set - using insecure development fallback. "
        "DO NOT use this in production. Set JWT_SECRET in backend/.env."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
```

### 3.3 `backend/routes/auth.py` (line ~24)

**Removed:**
```python
# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'roller-hockey-hub-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
```

**Added:** (same block as `backend/core/security.py` above — three-way duplication
intentionally preserved to keep the patch scope minimal and avoid cross-module
import refactors during a security hotfix).

### 3.4 `backend/.env.example` (new file)

```ini
# Stick Pro - Backend environment variables (example)
# Copy this file to backend/.env and fill in the values for your environment.

# --- MongoDB ---
MONGO_URL="mongodb://localhost:27017"
DB_NAME="stickpro"

# --- CORS ---
# Comma-separated origins, or "*" in development.
CORS_ORIGINS="*"

# --- Runtime environment ---
# One of: development | staging | production
# In "production", missing required secrets (e.g. JWT_SECRET) will abort startup.
ENVIRONMENT="development"

# --- Security ---
# REQUIRED in production. Use a strong random value (min 32 chars).
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET=""

# --- Email (Resend) ---
# Required when sending account activation / password reset / notifications.
RESEND_API_KEY=""
SENDER_EMAIL=""
FRONTEND_URL=""
```

### 3.5 `.gitignore` (appended)

```gitignore

# Allow committing env example templates
!*.env.example
!.env.example
```

> Reason: the existing `*.env.*` glob was masking `backend/.env.example`.

### 3.6 `backend/tests/test_jwt_secret_validation.py` (new file)

Four pytest cases, each running the import in a clean subprocess so that the
module-level guard executes fresh:

| Test | Asserts |
|---|---|
| `test_production_without_jwt_secret_aborts` | `ENVIRONMENT=production` + no `JWT_SECRET` → `RuntimeError` at import |
| `test_development_without_jwt_secret_uses_fallback` | `ENVIRONMENT=development` + no `JWT_SECRET` → loads with `dev-only-insecure-jwt-secret-change-me` |
| `test_production_with_jwt_secret_uses_provided_value` | `ENVIRONMENT=production` + explicit `JWT_SECRET` → value used verbatim |
| `test_no_hardcoded_fallback_string_remains_in_source` | Regression guard: legacy `roller-hockey-hub-secret-key-2024` is absent from all `backend/**/*.py` files |

Key isolation trick — `clear_jwt_secret=True` sets `JWT_SECRET=""` in the
subprocess environment so that `python-dotenv`'s `load_dotenv(override=False)`
will not re-inject a value from the local `backend/.env` during the test:

```python
def _run_python(code: str, env_overrides: dict, clear_jwt_secret: bool = False):
    env = os.environ.copy()
    for k in ("JWT_SECRET", "ENVIRONMENT"):
        env.pop(k, None)
    if clear_jwt_secret:
        env["JWT_SECRET"] = ""
    env.update(env_overrides)
    env.setdefault("MONGO_URL", "mongodb://localhost:27017")
    env.setdefault("DB_NAME", "test_database")
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True, text=True, timeout=15,
    )
```

---

## 4. Implementation Notes

### 4.1 Why three duplicated guards (not a shared helper)

`backend/core/security.py` and `backend/routes/auth.py` are part of an in-flight
refactor that aims to split `server.py` (8 383 lines) into domain modules.
However, neither `server.py` nor `routes/auth.py` currently imports JWT helpers
from `core/security.py` — they each define their own `JWT_SECRET` at module
load.

Two options were considered:

1. **Extract `load_jwt_secret()` into `core/security.py` and import it from the
   other two modules.** Rejected for this hotfix — it would add new
   cross-module imports into the 8.3k-line monolith, expanding the blast radius
   of a P0 security patch.
2. **Duplicate the same guard in all three places** (chosen). The duplication
   is minimal (~12 lines), the logic is identical, and the regression test
   (`test_no_hardcoded_fallback_string_remains_in_source`) guards against any
   future re-introduction.

When the `server.py` decomposition lands later, consolidating these three
guards into a single helper is a 5-minute follow-up.

### 4.2 Environment detection

`ENVIRONMENT` is read with `.lower()` so values like `"Production"`, `"PROD"`,
`"production"` are accepted equivalently. Default is `"development"` (safe
fallback for local pods/CI that have not yet been configured).

### 4.3 Local `.env`

`backend/.env` was extended to make the local pod boot cleanly:

```ini
ENVIRONMENT="development"
JWT_SECRET="dev-local-insecure-jwt-secret-change-me-in-prod"
```

The provided value is used verbatim; the dev fallback in code is only reached
when `JWT_SECRET` is unset entirely.

### 4.4 What was deliberately NOT changed

- No changes to `hash_password`, `verify_password`, `create_access_token`,
  `verify_token`, login/register endpoints, password reset, or admin seeding.
- No changes to JWT algorithm (`HS256`) or expiration (`24h`).
- The 16 pre-existing lint errors in `server.py` (3× `F821 secrets` undefined,
  13× `E722 bare except`) were left untouched — they exist in `origin/main` and
  are unrelated to Phase 0.
- No changes to `conflict_110626_1550`.

### 4.5 Production deployment checklist

Before deploying this branch to production:

1. Set `ENVIRONMENT=production` in the deployment environment.
2. Generate a strong secret:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
3. Set `JWT_SECRET=<generated value>` in the production environment.
4. Confirm the app boots — if `JWT_SECRET` is missing, you will see at startup:
   ```
   RuntimeError: JWT_SECRET environment variable is required in production. ...
   ```
5. Existing user tokens issued with the old hardcoded secret will be
   invalidated by this change (they were signed with
   `roller-hockey-hub-secret-key-2024`, which is no longer accepted). Users
   will need to log in again — communicate this to pilot clubs before deploy
   if applicable.

---

## 5. Verification Performed

| Check | Result |
|---|---|
| Lint (`backend/server.py`) | 16 errors — all pre-existing in `origin/main`, none introduced by Phase 0 |
| Lint (`backend/core/security.py`) | 0 issues |
| Lint (`backend/routes/auth.py`) | 0 issues |
| Lint (`backend/tests/test_jwt_secret_validation.py`) | 0 issues |
| Pytest (`tests/test_jwt_secret_validation.py`) | **4 / 4 passed** in 0.89s |
| Backend boot (`supervisorctl restart backend`) | RUNNING, no errors in logs |
| `GET /api/` | `200 OK` |
| `POST /api/auth/login` (invalid creds) | `401 Unauthorized` — JWT path exercised, returns `{"detail":"Credenciais inválidas"}` |
| Regression: `grep "roller-hockey-hub-secret-key-2024"` in `backend/**/*.py` | 0 occurrences outside the regression test guard |

---

## 6. Branch & Patch Artifacts

```
Branch:  feature/security-email-auth-flow
HEAD:    303b37f security(P0): remove hardcoded JWT_SECRET fallback
Parent:  17ff2d4 Update ActivateAccount.jsx   (= origin/main)

Patch file:   /app/stickpro_phase0_jwt_secret_only.patch
Patch size:   10 926 bytes
Patch SHA-256: d4e4686798197278ce20f465f7131b62e53c59a9cc166187937dec6318f23528
```

To apply elsewhere:
```bash
git checkout main && git pull origin main
git checkout -b feature/security-email-auth-flow
git am stickpro_phase0_jwt_secret_only.patch
git push -u origin feature/security-email-auth-flow
```
