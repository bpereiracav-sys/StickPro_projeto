# Phase E1 — Resend Production Readiness

**Branch:** `feature/security-email-auth-flow` (continuation after Phase 0)
**Status:** ✅ Implemented locally. Lint clean, 19/19 Phase E1 tests passing
(plus 4/4 Phase 0 = **23/23 total**), backend boots OK.
**Scope:** plumbing only — no activation or password-reset email flows yet.

> Companion documents:
> - **`docs/EMAIL_PRODUCTION_SETUP.md`** — operational/deployment guide.
> - **`docs/PHASE0_IMPLEMENTATION.md`** — Phase 0 (JWT_SECRET hardening).

---

## 1. Objective

Stand up a clean, testable email service for Stick Pro built on top of
**Resend**, so that Phases E2 (activation) and E3 (password reset) can be
implemented as small, focused additions on top of a known-good foundation.

Concretely Phase E1 delivers:

1. A **service module** `backend/services/emails.py` with:
   * `EmailMessage` / `EmailAttachment` / `EmailResult` dataclasses.
   * `send_email()` — async, retry with exponential backoff, dry-run-in-dev.
   * `validate_email_config()` — fail-fast in production, lenient in dev.
   * `is_retryable_error()` — classifies Resend SDK exceptions.
2. A **CLI validator** `backend/scripts/validate_email_config.py` returning
   exit code 0/1 for use in CI and pre-deploy checks.
3. **Tests** at `backend/tests/test_phase_e1_emails.py` covering config
   validation, retry, no-retry-on-permanent-error and CLI exit codes.
4. **Docs** describing production setup (`EMAIL_PRODUCTION_SETUP.md`) and
   the implementation (this file).

Out of scope (deliberately):
* Wiring `validate_email_config()` into the FastAPI startup event.
* Touching the legacy `send_email_notification` in `server.py` or any of the
  ~10 callsites that use it. Migration happens flow-by-flow in E2/E3.
* Activation, password reset or any actual template.
* Resend webhooks / `email_log` collection (Phase E4).

---

## 2. Files Changed in Phase E1 (8 files)

| Status | Path | Lines | Purpose |
|---|---|---|---|
| `A` | `backend/services/__init__.py` | +1 | Make `services` a Python package |
| `A` | `backend/services/emails.py` | +325 | Resend service module (Phase E1 core) |
| `A` | `backend/scripts/__init__.py` | +1 | Make `scripts` a Python package |
| `A` | `backend/scripts/validate_email_config.py` | +83 | CLI validator |
| `A` | `backend/tests/test_phase_e1_emails.py` | +330 | 19 pytest cases |
| `A` | `docs/EMAIL_PRODUCTION_SETUP.md` | +200 | Operational guide |
| `A` | `docs/PHASE_E1_IMPLEMENTATION.md` | (this file) | Reconstruction record |

No existing file in `backend/` or `frontend/` was modified by Phase E1.

---

## 3. Architecture

```
                  ┌────────────────────────────────────────┐
                  │  caller (future activation/reset code) │
                  └────────────────┬───────────────────────┘
                                   │ send_email(EmailMessage(...))
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │       backend/services/emails.py                       │
        │                                                        │
        │  • validate_email_config()  (also exposed as CLI)      │
        │  • is_retryable_error(exc)                             │
        │  • _build_params(message, sender)  → dict for SDK      │
        │  • _compute_backoff(attempt, base, jitter)             │
        │  • send_email(...)            ← public async entrypoint │
        │       │                                                │
        │       ├── no RESEND_API_KEY + prod  → EmailConfigError │
        │       ├── no RESEND_API_KEY + dev   → DRY-RUN return   │
        │       ├── permanent err (4xx/auth)  → EmailDeliveryError│
        │       │                                                │
        │       └── transient err (5xx/429/  → retry with        │
        │                          network)    exp backoff        │
        └────────────────────────┬───────────────────────────────┘
                                 │  asyncio.to_thread
                                 ▼
                       resend.Emails.send (sync SDK)
```

All inputs to the SDK go through `_build_params()` so attachments, tags and
custom headers are translated consistently. The async/sync boundary is
handled by `asyncio.to_thread`, keeping FastAPI's event loop non-blocking.

---

## 4. Public API of `services.emails`

### 4.1 Dataclasses

```python
@dataclass
class EmailAttachment:
    filename: str
    content: bytes                       # raw bytes; service base64-encodes
    content_type: Optional[str] = None

@dataclass
class EmailMessage:
    to: Sequence[str]                    # accepts a single string or a list
    subject: str
    html: str
    text: Optional[str] = None
    reply_to: Optional[str] = None
    tags: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None  # e.g. X-Idempotency-Key
    attachments: List[EmailAttachment] = field(default_factory=list)

@dataclass
class EmailResult:
    success: bool
    message_id: Optional[str]
    attempts: int
    dry_run: bool = False
    error: Optional[str] = None
```

### 4.2 Exceptions

* `EmailConfigError(RuntimeError)` — required env vars missing in production.
* `EmailDeliveryError(RuntimeError)` — send failed permanently
  (exhausted retries or permanent 4xx).

### 4.3 Functions

```python
def is_production() -> bool: ...

def validate_email_config(strict: Optional[bool] = None) -> dict: ...
    # Returns {"ok": bool, "environment": str, "missing": [...],
    #          "present": [...], "strict": bool}
    # Raises EmailConfigError when strict=True and missing != [].

def is_retryable_error(exc: BaseException) -> bool: ...

async def send_email(
    message: EmailMessage,
    *,
    max_attempts: int = 3,
    base_delay: float = 0.5,
    jitter: bool = True,
    sleep=None,                          # test seam for asyncio.sleep
) -> EmailResult: ...
```

### 4.4 Required env vars (production)

```
ENVIRONMENT=production
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=no-reply@yourdomain
FRONTEND_URL=https://app.example.com
```

---

## 5. Retry policy

Classification implemented by `is_retryable_error`:

| Exception | Retryable | Notes |
|---|---|---|
| `resend.exceptions.ApplicationError` | ✅ | 5xx server errors |
| `resend.exceptions.RateLimitError` | ✅ | 429 |
| `resend.exceptions.ValidationError` | ❌ | 422 — fix payload |
| `resend.exceptions.InvalidApiKeyError` | ❌ | 401 — config error |
| `resend.exceptions.MissingApiKeyError` | ❌ | config error |
| `resend.exceptions.MissingRequiredFieldsError` | ❌ | code bug |
| Other `ResendError` subclasses | ❌ | conservative default |
| Any other `Exception` (`TimeoutError`, `ConnectionError`, …) | ✅ | network |

Backoff: `delay = base_delay * 2 ** (attempt - 1)`, optionally plus up to
`base_delay` seconds of jitter. With defaults (`base_delay=0.5`,
`max_attempts=3`), worst-case wait is ~3 seconds before final failure.

---

## 6. Dry-run behaviour

When `RESEND_API_KEY` is not set:

* In **production** → `EmailConfigError` is raised immediately. No call made.
* In **development / staging / unknown** → `send_email` returns
  `EmailResult(success=True, dry_run=True, message_id="dryrun-<hex>",
  attempts=0)` and a `WARNING` log line records the attempted recipient and
  subject. This keeps local development unblocked when no Resend account is
  available, and is also what powers the test suite for the dry-run path.

---

## 7. CLI validator

```bash
$ cd backend
$ python scripts/validate_email_config.py
Environment: development
Required vars: RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL
Present: (none)
Missing: RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL
[WARN] Configuration incomplete — dry-run mode will be used for outbound mail.
$ echo $?
0
```

| Command | Exit |
|---|---|
| `python scripts/validate_email_config.py` (dev, missing) | 0 with warning |
| `ENVIRONMENT=production python scripts/validate_email_config.py` (missing) | 1 |
| All three vars set, any environment | 0 |
| `python scripts/validate_email_config.py --strict` (dev, missing) | 1 |

The script is suitable as a step in CI pipelines.

---

## 8. Verification

### 8.1 Lint

```bash
$ ruff backend/services/emails.py \
        backend/scripts/validate_email_config.py \
        backend/tests/test_phase_e1_emails.py
No blocking issues.
```

### 8.2 Tests (19 new Phase E1 + 4 Phase 0)

```bash
$ cd backend && python -m pytest tests/test_phase_e1_emails.py tests/test_jwt_secret_validation.py
============================ 23 passed in 1.64s ============================
```

Phase E1 test inventory:

| Group | Test | Asserts |
|---|---|---|
| EmailMessage | `accepts_single_string_recipient` | `to="x"` becomes `["x"]` |
| | `rejects_empty_recipients` | `ValueError` |
| | `requires_subject_and_html` | `ValueError` |
| Builder | `build_params_includes_optional_fields` | tags, headers, base64-attachment |
| Config | `dev_lenient` | missing → returns `ok=False`, no raise |
| | `production_missing_raises` | `EmailConfigError` |
| | `production_complete_ok` | `ok=True`, all three present |
| | `strict_override` | dev + strict → raises |
| Classifier | `is_retryable_error_classification` | 5xx/429/network=retry, 4xx=no |
| Send (dry) | `dry_run_in_development` | synthetic `dryrun-*` id |
| | `dry_run_blocked_in_production` | `EmailConfigError` |
| Send (live) | `retries_then_succeeds` | 2 transient errors → 3rd attempt OK |
| | `exhausts_retries_and_raises` | 3 transient → `EmailDeliveryError` |
| | `does_not_retry_on_validation_error` | 1 attempt only |
| | `does_not_retry_on_invalid_api_key` | 1 attempt only |
| | `retries_on_generic_network_error` | ConnectionError → retried |
| CLI | `production_missing_returns_1` | exit 1 + FAIL msg |
| | `production_complete_returns_0` | exit 0 + `[OK]` |
| | `development_missing_returns_0_with_warning` | exit 0 + `[WARN]` |

### 8.3 Manual smoke

```bash
$ sudo supervisorctl status backend
backend                          RUNNING   pid 42, uptime 0:20:06
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/
200
```

Backend continues to boot cleanly with Phase 0 + Phase E1 applied; the legacy
`send_email_notification` is untouched.

---

## 9. Design decisions worth recording

### 9.1 Why a new module instead of patching `server.py`?

The legacy helper `server.send_email_notification` is invoked from ~10
places in the 8 383-line monolith. Replacing it in-place during a *readiness*
phase would expand the blast radius far beyond Phase E1's scope. Instead we
introduce a parallel, well-tested entry point. Future phases migrate
callsite by callsite, never breaking an existing flow while the new path is
adopted.

### 9.2 Why `dataclass`, not Pydantic?

Pydantic is already pulled in by FastAPI but using a plain `dataclass` for
the internal email payload:

* avoids paying for validation twice (FastAPI request bodies validate at the
  edge; this is the post-edge representation),
* keeps `services.emails` importable from non-FastAPI contexts such as CLI
  scripts and unit tests with zero startup cost,
* makes the test suite trivially fast (no model rebuilds).

### 9.3 Test isolation strategy

The Resend SDK is patched via `unittest.mock.patch("resend.Emails.send", ...)`.
`asyncio.sleep` is replaced via the `sleep=` keyword on `send_email` so tests
do not wait. `RESEND_API_KEY` etc are scoped with the `clean_env` fixture
(monkeypatch-based) to prevent leakage between test functions.

The Resend SDK exception classes require non-trivial constructor arguments
(`message`, `error_type`, `code`); the helper `_make_resend_error()` in the
test module standardises construction across subclasses.

### 9.4 Why `headers` and `tags` exposed in `EmailMessage`?

Phase E4 will introduce an `email_log` collection populated from Resend
webhooks. Correlating a webhook event back to an application action requires
an idempotency key. Reserving `X-Idempotency-Key` / `tags` plumbing now means
E4 needs **no** breaking change to `EmailMessage`.

---

## 10. How to apply this work to a fresh clone

If this pod is lost and only the GitHub remote remains (which currently does
not have Phase 0 or E1 pushed because of the Save-to-GitHub anomaly), the
work can be reconstructed with two patches:

```bash
git checkout main && git pull origin main
git checkout -b feature/security-email-auth-flow

# Phase 0
git am /path/to/stickpro_phase0_jwt_secret_only.patch

# Phase E1 — generate the same patch from this pod, or re-create the files
# listed in section 2 from this document + EMAIL_PRODUCTION_SETUP.md.
```

A Phase E1 patch can be exported on demand with:

```bash
cd /app && git format-patch -1 HEAD --stdout > \
    /app/stickpro_phase_e1_emails.patch
```

---

## 11. Pointers to next phases

* **Phase E2 (next):** create `backend/services/activation_emails.py`, wire
  `validate_email_config()` into `server.py`'s `startup` event, add an
  endpoint `POST /api/auth/request-new-activation-link`, patch the 3 member
  creation flows to dispatch activation emails via `send_email`, and rewrite
  `frontend/src/pages/ActivateAccount.jsx` in Tailwind.
* **Phase E3:** create `backend/services/password_reset_emails.py`,
  endpoints `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`,
  plus the React pages `ForgotPassword.jsx` and `ResetPassword.jsx`.
* **Phase E4:** Resend webhooks → `email_log` collection → admin dashboard
  widget for delivery monitoring.
