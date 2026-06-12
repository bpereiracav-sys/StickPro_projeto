# Stripe Test Mode — Setup Guide (Phase S1)

> **Scope:** This guide covers the **Phase S1** infrastructure landed in
> branch `feature/stripe-s1-config-pricing` — config validation, pricing
> mapping, and the test-mode seed script. Checkout sessions (S2),
> webhooks (S3) and UI (S4) are not yet implemented.

---

## 1. Why this exists

StickPro's pilot subscription flow uses Stripe Checkout in **test mode**.
S1 lands the infrastructure so:

- Every Stripe env var lives in **one** place (`backend/.env`).
- The app boots cleanly in dev/test even without Stripe configured.
- The app **refuses** to boot in production if Stripe vars are missing.
- The app **always** refuses to boot if a `the live-mode prefix` key is loaded
  outside `ENVIRONMENT=production`, preventing accidental real-money
  charges from a developer pod.
- A single seed script provisions the test-mode Product + Prices the
  rest of the platform will reference.

---

## 2. Required environment variables

Add the following to `backend/.env` (`backend/.env.example` already
ships these as empty placeholders).

| Variable | Required when | Format |
|---|---|---|
| `STRIPE_API_KEY` | always (lenient in dev) | a test-mode key in dev/staging, a live-mode key only in production |
| `STRIPE_PRICE_CLUB_MONTHLY` | always (lenient in dev) | `price_...` (obtained from the seed script) |
| `STRIPE_PRICE_CLUB_YEARLY` | always (lenient in dev) | `price_...` (obtained from the seed script) |
| `STRIPE_WEBHOOK_SECRET` | required from **S3** onwards | webhook signing secret from Stripe Dashboard |

Validator behaviour:

- **`ENVIRONMENT=production`** → missing keys abort startup.
- **`ENVIRONMENT=development` / `test` / `staging`** → missing keys log
  a warning and the app keeps booting.
- A `the live-mode prefix` key with `ENVIRONMENT != production` is **fatal**
  regardless of environment.

---

## 3. Seed the StickPro Club product + prices

The script is idempotent — safe to re-run.

```bash
cd backend

# Use defaults: €19.90/month, €199.00/year, EUR.
python scripts/stripe_seed_test_mode.py

# Or override the amounts (cents):
python scripts/stripe_seed_test_mode.py --monthly 2500 --yearly 25000 --currency eur
```

What the script does (each step is idempotent and reuses existing
records when the metadata tag matches):

1. Looks up Product tagged `stickpro:club`. Creates **"StickPro Club"**
   if missing.
2. Looks up an existing recurring Price on the product tagged
   `stickpro:club:monthly`. Creates one if missing.
3. Same for `stickpro:club:yearly`.
4. Prints the two Price IDs you should paste into `backend/.env`.

The script **refuses to run with a `the live-mode prefix` key** — Stripe live mode
is a manual one-off via the dashboard.

Example output:

```
[stripe-seed] product CREATED: prod_QXxxxxxxxxxxxx (StickPro Club)
[stripe-seed] price CREATED [monthly]: price_1XxxxxxxxxxxxxxxxxxxxxxxxAB
[stripe-seed] price CREATED [yearly]: price_1XxxxxxxxxxxxxxxxxxxxxxxxCD

================================================================
Paste these into backend/.env:
================================================================
STRIPE_PRICE_CLUB_MONTHLY=price_1XxxxxxxxxxxxxxxxxxxxxxxxAB
STRIPE_PRICE_CLUB_YEARLY=price_1XxxxxxxxxxxxxxxxxxxxxxxxCD
================================================================
```

Restart the backend after pasting:

```bash
sudo supervisorctl restart backend
```

---

## 4. Validate the config

CLI wrapper around `services.stripe_config.validate_stripe_config`:

```bash
cd backend && python scripts/validate_stripe_config.py
```

Output (development with the key present but prices missing):

```
[STRIPE CONFIG] Missing Stripe variables: STRIPE_PRICE_CLUB_MONTHLY, STRIPE_PRICE_CLUB_YEARLY — running in lenient mode because ENVIRONMENT=development.
[STRIPE CONFIG] STRIPE_WEBHOOK_SECRET is not set. Required from S3 onwards before mounting the webhook handler.
[stripe-validate] environment : development
[stripe-validate] strict      : False
[stripe-validate] present     : STRIPE_API_KEY
[stripe-validate] missing     : STRIPE_PRICE_CLUB_MONTHLY, STRIPE_PRICE_CLUB_YEARLY
[stripe-validate] ok          : False
```

Use `--strict` in CI to fail on any missing variable regardless of
environment:

```bash
python scripts/validate_stripe_config.py --strict   # exit 1 on missing
```

---

## 5. Code surface added by S1

### Library code

| File | Purpose |
|---|---|
| `backend/services/stripe_config.py` | `validate_stripe_config()`, `get_stripe_api_key()`, live-key guard, `StripeConfigError`. |
| `backend/services/pricing.py` | `ClubPlan`, `BillingInterval`, `price_id_for()`, `require_price_id()`, `env_var_for()`, `PRICE_ENV_VARS`. |

### Scripts

| File | Purpose |
|---|---|
| `backend/scripts/stripe_seed_test_mode.py` | Idempotent product + price seeding for test mode. |
| `backend/scripts/validate_stripe_config.py` | CLI validator. |

### Server wiring

`server.py` calls `validate_stripe_config()` at module import — same
pattern as `validate_email_config()`. In production, this aborts boot
if the required vars are missing or a live key is misconfigured.

### Tests

| File | Cases |
|---|---|
| `backend/tests/test_stripe_config_validation.py` | 12 cases (lenient/strict, live-key guards, helpers, JSON-safe report). |
| `backend/tests/test_pricing_mapping.py` | 9 cases (`env_var_for`, `price_id_for`, `require_price_id`, `all_configured_prices`, constant integrity). |
| `backend/tests/test_startup_stripe_config_validation.py` | 5 cases (boot aborts/succeeds matrix). |

---

## 6. What's intentionally NOT in S1

- **No checkout session endpoint** — comes in **S2**.
- **No webhook handler** — comes in **S3**.
- **No frontend UI changes** — comes in **S4**.
- **No live-mode setup** — manual one-off via Stripe dashboard, not in
  this script.
- **No DB schema changes** — `Subscription` / `Club` get their
  `stripe_*` fields in **S2**.

---

## 7. Operator checklist (test mode)

- [ ] Confirm `STRIPE_API_KEY` (test-mode key) is set in `backend/.env`
      (or inherited from the pod env).
- [ ] Run `python scripts/stripe_seed_test_mode.py`.
- [ ] Paste the printed Price IDs into `backend/.env`.
- [ ] `sudo supervisorctl restart backend`.
- [ ] Run `python scripts/validate_stripe_config.py` — expect
      `ok: True` (warning about missing webhook secret is acceptable
      until S3).
- [ ] Backend logs show `[STRIPE CONFIG] STRIPE_API_KEY loaded
      (prefix=test-mode prefix, env=development)`.
