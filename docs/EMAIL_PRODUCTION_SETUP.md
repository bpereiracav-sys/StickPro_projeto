# Email Production Setup — Stick Pro

This document is the operational guide for getting **transactional email**
(account activation, password reset, notifications) working in production
through **Resend**. It is the deployment-side counterpart of the code in
``backend/services/emails.py`` (Phase E1).

> Scope of Phase E1: the **plumbing** only — service module, validator, retry
> policy, tests. The actual activation and password reset emails are
> implemented in Phase E2 and Phase E3.

---

## 1. Prerequisites

| What | Where |
|---|---|
| Resend account | <https://resend.com> (free tier covers pilots) |
| Verified sending domain | Resend dashboard → **Domains** → **Add Domain** |
| API key | Resend dashboard → **API Keys** → **Create API Key** |
| Sender address on the verified domain | e.g. `no-reply@stickpro.app` |

### 1.1 Verify the sending domain

Resend will display the DNS records you must add at your registrar:

* **SPF** — TXT record allowing `_spf.resend.com` to send on your behalf.
* **DKIM** — CNAME / TXT record(s) Resend pre-generates.
* **MX** for `bounces.<your-domain>` (or similar) for bounce processing.
* Optional but recommended: **DMARC** policy
  (`v=DMARC1; p=quarantine; rua=mailto:postmaster@<your-domain>`).

Until the domain status in Resend reads **Verified**, only the test sender
(`onboarding@resend.dev`) and recipients on your Resend account will receive
mail.

### 1.2 Pick a sender identity

Use a dedicated, descriptive address that matches the product. Examples:

* `no-reply@stickpro.app` — for one-way notifications (recommended default)
* `contas@stickpro.app` — for account-related messages
* `support@stickpro.app` — only if the inbox is actually monitored

The `from` value is supplied via the ``SENDER_EMAIL`` environment variable and
is shared by all flows for now. Per-flow overrides will land with Phase E4
(per-template metadata).

---

## 2. Environment Variables

| Variable | Required | Notes |
|---|---|---|
| ``ENVIRONMENT`` | yes | One of ``development``, ``staging``, ``production``. Validation is strict only in ``production``. |
| ``RESEND_API_KEY`` | yes (prod) | Starts with ``re_…``. |
| ``SENDER_EMAIL`` | yes (prod) | Verified-domain address. |
| ``FRONTEND_URL`` | yes (prod) | Used by future activation / reset templates to build absolute links. Example: ``https://app.stickpro.com``. |

A complete template is checked in at ``backend/.env.example``.

In non-production environments, missing variables degrade the email service to
**dry-run mode** — no network call is made and a synthetic message id of the
form ``dryrun-<hex>`` is returned. This lets local development and CI proceed
without a Resend account.

---

## 3. Validation Tooling

### 3.1 Manual / CI check

Run before deploy:

```bash
cd /app/backend
python scripts/validate_email_config.py
```

Exit codes:

| Code | Meaning |
|---|---|
| `0` | OK (or non-production with warnings) |
| `1` | Missing required variables in production (or `--strict`) |

Sample output (production with missing keys):

```
Environment: production
Required vars: RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL
[FAIL] Missing required email configuration: RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL. Set these variables before starting the app in production.
```

Sample output (development, no keys):

```
Environment: development
Required vars: RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL
Present: (none)
Missing: RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL
[WARN] Configuration incomplete — dry-run mode will be used for outbound mail.
```

### 3.2 Programmatic check (recommended for app startup)

In a future phase, wire ``services.emails.validate_email_config()`` into the
FastAPI ``startup`` event so that misconfigured production deployments fail
fast at boot — same pattern as the JWT_SECRET guard from Phase 0.

```python
from services.emails import validate_email_config

@app.on_event("startup")
async def _check_email_config():
    validate_email_config()  # raises EmailConfigError in production if missing
```

(This wiring is deliberately not done in Phase E1 to avoid touching
``server.py``. It will land in Phase E2 alongside the first real outbound
flow.)

---

## 4. Sending an Email From Code (new API)

```python
from services.emails import EmailMessage, send_email

result = await send_email(
    EmailMessage(
        to="user@example.com",
        subject="Welcome to Stick Pro",
        html="<p>Hello!</p>",
        tags={"category": "welcome"},
        headers={"X-Idempotency-Key": "user-42-welcome"},
    )
)
print(result.message_id, result.attempts, result.dry_run)
```

Behaviour:

* On success → ``EmailResult(success=True, message_id="...", attempts=N)``.
* On a permanent error (4xx, invalid API key, validation) → raises
  ``EmailDeliveryError`` after a single attempt.
* On a transient error (5xx, 429, network) → retries up to ``max_attempts``
  (default 3) with exponential backoff (default 0.5s → 1s → 2s, with jitter).
* If ``RESEND_API_KEY`` is missing **and** ``ENVIRONMENT != "production"`` →
  returns ``EmailResult(dry_run=True, …)`` without calling Resend.
* If ``RESEND_API_KEY`` is missing **and** ``ENVIRONMENT == "production"`` →
  raises ``EmailConfigError`` immediately.

The legacy helper ``server.send_email_notification`` is intentionally left in
place. New flows must use ``services.emails.send_email``; existing flows will
be migrated module by module in later phases.

---

## 5. Retry Policy

| Exception | Retryable | Why |
|---|---|---|
| ``resend.exceptions.ApplicationError`` | ✅ | Resend signals 5xx as ``ApplicationError``. |
| ``resend.exceptions.RateLimitError`` | ✅ | HTTP 429 — short transient. |
| ``resend.exceptions.ValidationError`` | ❌ | HTTP 422 — fix the payload. |
| ``resend.exceptions.InvalidApiKeyError`` | ❌ | Config error — fix the key. |
| ``resend.exceptions.MissingApiKeyError`` | ❌ | Config error — fix env. |
| ``resend.exceptions.MissingRequiredFieldsError`` | ❌ | Code bug — fix payload. |
| Other ``ResendError`` subclasses | ❌ | Conservative default. |
| Any other ``Exception`` (timeout, network, DNS) | ✅ | Probably transient. |

Backoff is ``base_delay * 2 ** (attempt - 1)`` seconds, plus up to
``base_delay`` seconds of jitter. Defaults: ``base_delay=0.5``,
``max_attempts=3``. Override per call when needed (e.g. for low-latency UI
flows, drop ``max_attempts=1``).

---

## 6. Deployment Checklist

Before the first pilot club is onboarded:

- [ ] Domain verified in Resend (SPF, DKIM, DMARC green).
- [ ] ``RESEND_API_KEY`` set on the production environment (production key,
      not the test key).
- [ ] ``SENDER_EMAIL`` set to a verified-domain address.
- [ ] ``FRONTEND_URL`` set to the canonical app URL (no trailing slash).
- [ ] ``ENVIRONMENT=production`` set.
- [ ] ``python backend/scripts/validate_email_config.py`` exits 0 on the
      target host.
- [ ] ``backend/tests/test_phase_e1_emails.py`` passes in CI.

---

## 7. Roadmap Hooks (forward references)

These are **not** part of Phase E1 but the service is designed to support
them without breaking changes:

* **Phase E2 — Account activation.** Will introduce
  ``services/activation_emails.py`` that builds an ``EmailMessage`` and calls
  ``send_email``. Server-side activation token lifecycle is already in
  place; only the email plumbing changes.
* **Phase E3 — Password reset.** Same pattern as E2 with a different
  template and a separate token collection.
* **Phase E4 — Monitoring & webhooks.** Resend webhooks (delivered, bounced,
  complained) will be ingested into a ``email_log`` collection. The
  ``headers`` / ``tags`` arguments on ``EmailMessage`` are already plumbed
  through to allow correlation by idempotency key and category.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Boot fails with ``EmailConfigError`` | Missing env var in production | Set ``RESEND_API_KEY`` / ``SENDER_EMAIL`` / ``FRONTEND_URL`` and redeploy. |
| All emails fail with ``InvalidApiKeyError`` | Wrong key or revoked | Rotate in Resend dashboard, update env. |
| Emails go to the test sender only | Domain not verified | Complete DNS verification. |
| ``EmailDeliveryError`` after 3 attempts | Resend outage or rate-limited | Check Resend status; consider raising ``max_attempts`` temporarily. |
| Dry-run id appears in logs in production | ``RESEND_API_KEY`` not loaded | Check env var injection; restart backend. |
