# Stripe Checkout — Test Mode Implementation Plan

> **Status:** PLAN ONLY — no code changes in this document.
> **Target branch model:** one feature branch per phase (S1 … S5), each
> merged independently into `main` after validation. Same pattern used
> for the Onboarding O1 → O4 PRs.

---

## 0. Analysis of the current codebase

### 0.1 Existing subscription surface

**Frontend**
| Asset | Location |
|---|---|
| `/subscription` page | `frontend/src/pages/SubscriptionPage.jsx` |
| `subscriptionApi` client | `frontend/src/services/api.js` |
| Route registration | `frontend/src/App.js` (path `/subscription`) |

The page already shows current plan / status / billing period and a
table of local invoices. There is **no upgrade/checkout button wired
to Stripe** yet — plan changes go through `PATCH /api/subscription`
which today just writes to MongoDB.

**Backend (`backend/server.py`)**
8 manual endpoints — none of them currently talk to Stripe:

| Endpoint | Behaviour |
|---|---|
| `GET    /api/subscription` | Returns current Subscription row (creates default if missing) |
| `PATCH  /api/subscription` | Direct DB update of `plan_type`, `payment_method`, `status` |
| `POST   /api/subscription/cancel` | Sets `status = cancelled` |
| `GET    /api/subscription/invoices` | Lists `SubscriptionInvoice` rows |
| `POST   /api/subscription/invoices` | Manual invoice creation |
| `GET    /api/subscription/invoices/{id}` | Fetch one |
| `GET    /api/subscription/invoices/{id}/download` | PDF link (today: `file_url`) |
| `PATCH  /api/subscription/invoices/{id}` | Update local invoice |

### 0.2 Existing data models (server.py:480-545)

```python
class SubscriptionPlan(str, Enum):  # standard | plus
class SubscriptionStatus(str, Enum): # active | expired | cancelled | pending
class PaymentMethod(str, Enum):      # credit_card | bank_transfer

class Subscription(BaseModel):
    id: str                # uuid (not Stripe id)
    club_id: str
    plan_type: str         # "standard" or "plus"
    start_date: str
    end_date: str
    status: str
    payment_method: str
    member_count: int

class SubscriptionInvoice(BaseModel):
    id: str
    subscription_id: str
    club_id: str
    invoice_number: str
    start_date / end_date / paying_members / price_per_member
    total_due / total_paid / status / file_url / paid_at
```

**Missing for Stripe**: every `stripe_*_id` reference, period markers,
cancel-at-period-end flag, payment method id, hosted invoice URL.

### 0.3 Existing env / dependencies

| Var | Where | Notes |
|---|---|---|
| `STRIPE_API_KEY` | Pod env (already set per system prompt) | **Use as-is — do not ask the user.** |
| `stripe==14.4.0` | `backend/requirements.txt` | Already installed |
| `STRIPE_WEBHOOK_SECRET` | **NOT SET** | Will be required for S3 |
| `STRIPE_*_PRICE_ID` | **NOT SET** | Will be required for S1 once Products/Prices are seeded |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | **NOT SET** | Optional (only needed if we ever embed Stripe Elements) — not needed for hosted Checkout |
| `BILLING_SUCCESS_URL` / `BILLING_CANCEL_URL` | Derived from `FRONTEND_URL` | Hard-coded paths `/subscription?success=1` / `/subscription?cancelled=1` |

### 0.4 Required Stripe objects (test mode)

```
Account (test)
  └── Product: "StickPro Standard"
  │     ├── Price: monthly_standard   €X.XX EUR / month  (recurring)
  │     └── Price: yearly_standard    €X.XX EUR / year
  └── Product: "StickPro Plus"
        ├── Price: monthly_plus       €Y.YY EUR / month
        └── Price: yearly_plus        €Y.YY EUR / year
  └── Customer (per Club)
        └── Subscription (per Club)
              └── default_payment_method (Card)
              └── latest_invoice
  └── Checkout Session (ephemeral, created per upgrade attempt)
  └── Webhook Endpoint → POST {BACKEND_URL}/api/webhooks/stripe
```

Webhook events we will subscribe to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Out of scope (defer to later phase): trial periods, proration UX,
tax (Stripe Tax), promo codes, multi-currency.

---

## 1. Phased plan

### S1 — Stripe config + pricing model
**Goal:** Land the infrastructure to *talk to* Stripe without changing
any user-facing flow. Output of S1 is enough for an admin to manually
seed Products + Prices, and for the backend to read them at startup.

**Files affected**
- `backend/.env` — append `STRIPE_API_KEY` reference (already set in pod env), plus placeholders for `STRIPE_WEBHOOK_SECRET`, `STRIPE_STANDARD_MONTHLY_PRICE_ID`, `STRIPE_STANDARD_YEARLY_PRICE_ID`, `STRIPE_PLUS_MONTHLY_PRICE_ID`, `STRIPE_PLUS_YEARLY_PRICE_ID`.
- `backend/services/stripe_client.py` *(new)* — single `init_stripe()` that sets `stripe.api_key` from env once, plus typed wrapper functions (e.g. `get_or_create_customer(club)`).
- `backend/scripts/stripe_seed_test_mode.py` *(new)* — idempotent script: lists existing Products by metadata tag `stickpro:standard|plus`, creates them + Prices if missing, prints the IDs the operator must paste into `.env`.
- `backend/scripts/validate_stripe_config.py` *(new)* — startup-time validator. Behaviour mirrors the existing `validate_email_config.py`:
  - In `ENVIRONMENT=production` → fail-fast if any Stripe env is missing.
  - In dev → warn-and-continue (Stripe Checkout endpoint will refuse to mint sessions without keys).
- `backend/server.py` — call `validate_stripe_config()` in the existing startup block.
- `backend/services/pricing.py` *(new)* — single source of truth mapping `(plan_type, interval) → stripe_price_id`. No DB writes, just a pure function.

**Endpoints required**
- None yet (S1 is pure plumbing).

**Database fields required**
- None yet. Schema migration lands in S2.

**Tests**
- `backend/tests/test_stripe_config_validation.py` — startup behaviour
  (missing keys in prod → SystemExit; dev → warning).
- `backend/tests/test_pricing_mapping.py` — `(standard, monthly) → "price_xxx"` round-trips for every combination.
- Manual: run `python scripts/stripe_seed_test_mode.py` against test
  account, capture the printed IDs.

**Security risks**
- Leaking secret key: `STRIPE_API_KEY` must NEVER be exposed via API or
  served to the browser. We never log the key, only its `the test-mode prefix` /
  `the live-mode prefix` prefix.
- Wrong-mode keys: validator refuses `the live-mode prefix` when
  `ENVIRONMENT != production` so a stray production key in a dev pod
  can't accidentally bill real cards.

**Rollout checklist**
- [ ] PR merged to `main`.
- [ ] Operator runs the seed script in the test Stripe account.
- [ ] Operator pastes the 4 Price IDs into the production `.env`.
- [ ] Backend restart shows no validation warnings.

---

### S2 — Checkout Session endpoint
**Goal:** A logged-in admin can click "Upgrade" in the UI (S4) and be
redirected to a Stripe-hosted Checkout page that creates the
Subscription on success.

**Files affected**
- `backend/server.py` — add a small additive block (no refactor). The endpoint lives next to the existing `/subscription` routes.
- `backend/services/stripe_client.py` — helpers `create_checkout_session(...)`, `get_or_create_customer(club, email)`.
- `backend/services/pricing.py` — already in place from S1.

**Endpoints required**
| Method | Path | Auth | Body |
|---|---|---|---|
| `POST` | `/api/subscription/checkout-session` | admin / gestor_desportivo | `{ plan_type: "standard"\|"plus", interval: "monthly"\|"yearly" }` |
| `GET`  | `/api/subscription/portal-session` | admin / gestor_desportivo | — *(Stripe Customer Portal — defer if scope explodes; otherwise S4)* |

`POST /checkout-session` returns:
```json
{ "url": "https://checkout.stripe.com/c/pay/cs_test_…",
  "session_id": "cs_test_…",
  "expires_at": 1234567890 }
```

**Database fields required (additive)**
Append to `Subscription`:
```python
stripe_customer_id:        Optional[str] = None
stripe_subscription_id:    Optional[str] = None
stripe_price_id:           Optional[str] = None
stripe_status:             Optional[str] = None   # mirrors Stripe's
current_period_start:      Optional[str] = None   # ISO
current_period_end:        Optional[str] = None
cancel_at_period_end:      bool = False
stripe_latest_invoice_url: Optional[str] = None
```

Append to `Club` (only one new field — the rest stays on Subscription):
```python
stripe_customer_id: Optional[str] = None  # mirror for fast lookup
```

All fields default `None` / `False` → zero migration for existing
documents (Pydantic default handles legacy reads, MongoDB has no
ALTER TABLE).

**Tests**
- `backend/tests/test_stripe_checkout_session.py`:
  - RBAC: non-admin → 403.
  - Missing price IDs in env → 503.
  - Existing customer reused (only one Stripe customer per club).
  - Returned URL points at `checkout.stripe.com`.
  - Idempotency hint: use the club_id as `client_reference_id` so the
    webhook can map back even if our local row is missing.
- `backend/tests/test_stripe_customer_lookup.py`:
  - Creating a session on a club without a `stripe_customer_id` writes
    one back.
  - Two calls return the same customer id (mock stripe.Customer.create).

Mocking: patch `stripe.checkout.Session.create` and
`stripe.Customer.create` / `stripe.Customer.retrieve` with `AsyncMock`
returning canned dicts. No real network calls in CI.

**Security risks**
- A non-admin minting checkout sessions for someone else's club → RBAC
  + the endpoint always resolves club from `current_user`, never trusts
  a body-supplied `club_id`.
- Open redirect: the `success_url` / `cancel_url` are server-side
  constants derived from `FRONTEND_URL`, never from request body.
- Replay-spam: rate-limit by user id (1 active session per minute).
  *(Implementation can rely on existing throttle utility; if absent,
  ship the basic in-memory limiter shipped for Auth/Email.)*

**Rollout checklist**
- [ ] PR merged to `main`.
- [ ] `POST /checkout-session` returns 200 in test env from `/subscription` page.
- [ ] Stripe Dashboard test mode shows one Customer per club after the first checkout completes.

---

### S3 — Webhook handler
**Goal:** Stripe is the source of truth for subscription state. Our DB
mirrors it via webhooks; the frontend never trusts a redirect URL alone.

**Files affected**
- `backend/server.py` — single new route `POST /api/webhooks/stripe`,
  mounted *outside* `api_router`'s default JSON-validation pipeline so
  the raw body is preserved for signature verification.
- `backend/services/stripe_webhooks.py` *(new)* — per-event dispatch
  table (`checkout.session.completed`, `customer.subscription.*`,
  `invoice.payment_*`).
- `backend/services/stripe_client.py` — helper `verify_webhook(payload, sig)`.

**Endpoints required**
| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/webhooks/stripe` | *Signature only* — no JWT | Body is raw bytes; `Stripe-Signature` header required. |

**Database fields required (additive)**
New collection `stripe_events` for idempotency:
```python
{
  "_id": "evt_XXXXXX",        # Stripe event id (unique)
  "type": "checkout.session.completed",
  "received_at": "<iso>",
  "processed_at": "<iso>" | null,
  "result": "ok" | "error" | "skipped",
  "error": "<str>" | null,
}
```

Append to `SubscriptionInvoice` so the existing invoice surface can
ingest Stripe-issued invoices (zero impact on legacy manual rows):
```python
stripe_invoice_id:        Optional[str] = None
hosted_invoice_url:       Optional[str] = None
invoice_pdf_url:          Optional[str] = None
period_start / period_end: Optional[str] = None
```

**Tests**
- `backend/tests/test_stripe_webhook.py`:
  - Missing signature → 400.
  - Bad signature → 400.
  - Unknown event type → 200 + recorded as `skipped`.
  - `checkout.session.completed`:
    - First delivery sets `stripe_customer_id`, `stripe_subscription_id`,
      `stripe_price_id`, mirrors `plan_type`/`status`.
    - Second delivery with same `event.id` → 200, **no DB writes**
      (idempotency).
  - `customer.subscription.updated` flips `cancel_at_period_end` and
    `current_period_end` correctly.
  - `customer.subscription.deleted` flips status to `cancelled`,
    keeps the row.
  - `invoice.payment_succeeded`:
    - Creates a `SubscriptionInvoice` with `stripe_invoice_id` if
      missing; updates `status` to `paid` if present.
  - `invoice.payment_failed` marks `status = overdue`.

Fixtures use Stripe's officially published JSON payload samples
(snapshots stored under `backend/tests/fixtures/stripe/`). No live HTTP.

**Security risks**
- **Forgery**: ALWAYS verify with `stripe.Webhook.construct_event`.
  Endpoint refuses any request whose signature does not validate
  against `STRIPE_WEBHOOK_SECRET`.
- **Replay** with stale events: `construct_event` already enforces a
  5-min tolerance window. Idempotency collection further protects
  against duplicate delivery.
- **DoS / large body**: cap raw body at 256 KB before signature check.
- **Privilege escalation via webhook**: nothing in the handler ever
  reads identifiers from the URL or query string — only the verified
  event payload.
- **Schema drift**: handler is defensive — unknown fields are ignored
  by Pydantic models (`extra="ignore"`); a Stripe API version bump
  cannot crash the endpoint.

**Webhook idempotency contract**
1. Compute `event.id`.
2. Atomic `find_one_and_update` on `stripe_events` with
   `upsert=true, returnDocument=before`. If the previous doc already
   has `processed_at`, return 200 immediately without re-processing.
3. Run the handler.
4. On success, set `processed_at`. On failure, set
   `result="error", error=str(exc)` — leaves the row reclaimable for
   re-delivery (Stripe will retry automatically).

**Rollout checklist**
- [ ] PR merged to `main`.
- [ ] Operator creates the Webhook endpoint in Stripe Dashboard test
      mode pointing at `https://<backend>/api/webhooks/stripe`.
- [ ] Operator pastes the signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Stripe CLI `stripe trigger checkout.session.completed` produces
      a 200 and writes a `stripe_events` row.

---

### S4 — Subscription UI
**Goal:** Make Stripe Checkout reachable from `/subscription` and have
the page display Stripe-sourced state (current plan, period end,
cancel-at-period-end, hosted invoice links).

**Files affected**
- `frontend/src/pages/SubscriptionPage.jsx` — additive: new
  *Choose plan* card listing the 2 plans × 2 intervals, "Upgrade"
  buttons that POST `/checkout-session` and `window.location =` the
  returned URL. Existing invoice table consumes the new Stripe fields
  when present, falls back to local fields otherwise.
- `frontend/src/services/api.js` — `subscriptionApi.checkoutSession({plan_type, interval})` and `.portalSession()`.
- `frontend/src/i18n/translations.js` — ~20 new keys in PT/EN/ES/FR/IT
  (`subscription.plans.*`, `subscription.checkout.*`,
  `subscription.cancelAtPeriodEnd`, etc.). Parity test must remain green.
- `frontend/src/pages/SubscriptionSuccess.jsx` *(optional)* — light
  return page reached via `?success=1` that polls `/subscription` for
  ~10 s waiting for the webhook to land, then routes to the regular
  view. If we keep things minimal, `SubscriptionPage` itself handles
  the `?success=1` / `?cancelled=1` query params with a toast.

**Endpoints required (consumed)**
- `POST /api/subscription/checkout-session` (S2)
- `GET  /api/subscription/portal-session` (S2 — optional)
- `GET  /api/subscription` (existing — already in place)

**Database fields required**
- None new — UI consumes the fields landed in S2/S3.

**Tests**
- Jest `i18n_parity` stays green.
- `frontend/yarn build` smoke.
- Browser smoke (Playwright via `mcp_screenshot_tool`):
  1. Admin logs in.
  2. Navigate to `/subscription`.
  3. Click "Upgrade to Plus (monthly)".
  4. URL changes to `checkout.stripe.com/c/pay/cs_test_…`.
  5. Use Stripe test card `4242 4242 4242 4242`, 12/34, CVC 123, ZIP 12345.
  6. Stripe redirects back to `/subscription?success=1`.
  7. Page eventually shows plan = "Plus", current_period_end set,
     cancel_at_period_end = false.

**Security risks**
- Same-origin check: the return URLs always live under our `FRONTEND_URL`,
  so a malicious page can't impersonate the success page.
- Don't ship the publishable key bundle-wide unless we move to embedded
  Elements (not planned).
- Frontend never sees the secret API key.

---

### S5 — Test mode validation
**Goal:** Final integration pass against the real Stripe test account
to catch anything the unit tests can't.

**Manual checklist**
- [ ] Seed script in S1 has been run; 4 Price IDs in `.env`.
- [ ] Webhook endpoint registered, signing secret in `.env`.
- [ ] `stripe listen --forward-to <BACKEND_URL>/api/webhooks/stripe`
      while running smoke tests locally.
- [ ] Happy path: card `4242 4242 4242 4242` → subscription `active`,
      one `SubscriptionInvoice` row with `hosted_invoice_url` set.
- [ ] Decline path: card `4000 0000 0000 0002` → subscription stays
      `incomplete`, no plan upgrade in DB.
- [ ] Failed payment after success: card `4000 0000 0000 0341` →
      first invoice succeeds, second invoice triggers
      `invoice.payment_failed`, `status` flips to `overdue`.
- [ ] Cancel-at-period-end: admin clicks Cancel in `/subscription` →
      `cancel_at_period_end=true`, plan stays usable until
      `current_period_end`.
- [ ] Idempotency: replay an event via Stripe CLI
      (`stripe events resend evt_…`) — 200 response, no duplicate
      invoice row.
- [ ] i18n: switch language to PT/EN/ES/FR/IT, every label resolves.
- [ ] No regressions in Auth/Email/Onboarding suites
      (44 + 69 + 9 tests stay green).
- [ ] `git diff main..HEAD` per PR contains **no** `memory/*`,
      `.emergent/*`, or `*.patch` files.

**Automated checklist**
- [ ] Full backend pytest suite green.
- [ ] Frontend `yarn build` green.
- [ ] i18n parity Jest green.
- [ ] Browser Playwright smoke green.

---

## 2. Aggregate files affected (across S1 → S5)

```
backend/.env                                            # env keys only
backend/server.py                                       # additive routes (no refactor)
backend/services/stripe_client.py            (NEW)
backend/services/stripe_webhooks.py          (NEW)
backend/services/pricing.py                  (NEW)
backend/scripts/stripe_seed_test_mode.py     (NEW)
backend/scripts/validate_stripe_config.py    (NEW)
backend/tests/test_stripe_config_validation.py    (NEW)
backend/tests/test_pricing_mapping.py             (NEW)
backend/tests/test_stripe_checkout_session.py     (NEW)
backend/tests/test_stripe_customer_lookup.py      (NEW)
backend/tests/test_stripe_webhook.py              (NEW)
backend/tests/fixtures/stripe/*.json              (NEW)
frontend/src/pages/SubscriptionPage.jsx               # additive
frontend/src/services/api.js                          # 2 new methods
frontend/src/i18n/translations.js                     # ~20 new keys × 5 langs
```

**No file is removed. `server.py` is not refactored.**

## 3. Aggregate endpoints required

```
POST   /api/subscription/checkout-session           (S2)  — admin only
GET    /api/subscription/portal-session             (S2)  — admin only, optional
POST   /api/webhooks/stripe                         (S3)  — Stripe-signature auth
```

## 4. Aggregate DB additions

```
Subscription                +stripe_customer_id, stripe_subscription_id,
                            stripe_price_id, stripe_status,
                            current_period_start, current_period_end,
                            cancel_at_period_end, stripe_latest_invoice_url
Club                        +stripe_customer_id
SubscriptionInvoice         +stripe_invoice_id, hosted_invoice_url,
                            invoice_pdf_url, period_start, period_end
stripe_events  (new col.)   _id (evt_*), type, received_at,
                            processed_at, result, error
```

All additions are nullable / default-False, so zero impact on existing
documents.

## 5. Out of scope for this plan

- Resend webhooks (Phase E4, separate plan).
- Refactor of `server.py` into routers per domain.
- Family Accounts dual-write (blocked on the refactor).
- Stripe Tax, Promo Codes, Trials, Proration UX, Multi-currency.
- Live mode rollout — explicitly **test mode only**.

## 6. Risks and mitigations summary

| Risk | Mitigation |
|---|---|
| Webhook forgery | `stripe.Webhook.construct_event` with `STRIPE_WEBHOOK_SECRET`. |
| Duplicate webhook delivery | `stripe_events` collection with `event.id` as PK + atomic upsert. |
| Wrong-mode keys in prod | Startup validator rejects `the live-mode prefix` when `ENVIRONMENT != production`. |
| Open redirect via success_url | Server-side constant, never read from request body. |
| Privilege escalation | Endpoints resolve `club_id` from `current_user`, never from body. |
| PCI scope | Hosted Checkout — card data never touches our backend. |
| Stripe schema drift | Pydantic `extra="ignore"` + per-event dispatch table. |
| Rate-limit abuse on `/checkout-session` | Re-use existing per-user throttle (Auth/Email). |
| DB drift between Stripe and Mongo | Stripe is source of truth; `GET /api/subscription` can lazily reconcile by calling `stripe.Subscription.retrieve` if `stripe_status` is stale. |

---

## 7. Recommended order of execution (PR-by-PR)

1. **S1** — `feature/stripe-s1-config-pricing` (lowest risk, no public surface).
2. **S2** — `feature/stripe-s2-checkout-session` (depends on S1 IDs being in env).
3. **S3** — `feature/stripe-s3-webhook` (depends on S2 to test the loop end-to-end).
4. **S4** — `feature/stripe-s4-ui` (depends on S2/S3).
5. **S5** — `feature/stripe-s5-test-mode-validation` (only docs + browser smoke + checklist sign-off; minimal code).

Each PR follows the Onboarding O1 → O4 hygiene rules: **no memory/,
no .emergent/, no *.patch** in the diff; tests green before merge.
