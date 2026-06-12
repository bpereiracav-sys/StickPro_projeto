#!/usr/bin/env python3
"""Seed Stripe test mode with the StickPro Club product + 2 prices.

Usage::

    cd backend && python scripts/stripe_seed_test_mode.py
    # or with custom amounts
    python scripts/stripe_seed_test_mode.py --monthly 1990 --yearly 19900

The script is **idempotent**:

* Looks up the Product by the metadata tag ``stickpro:club``. Creates
  it if missing; reuses it otherwise.
* For each interval (monthly / yearly), looks up an existing recurring
  Price on the product whose interval matches and whose metadata tag is
  ``stickpro:club:<interval>``. Creates a new one if missing; reuses
  otherwise.
* Prints the Price IDs operators must paste into ``backend/.env``.

Refuses to run with a live-mode key — this script is for test mode
only. Live-mode setup is a manual one-off done in the Stripe dashboard
once pricing has been finalised commercially.

Exit codes:
    0 — seeding succeeded (or everything was already present).
    1 — configuration error or Stripe API error.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

try:
    from dotenv import load_dotenv

    load_dotenv(_BACKEND_ROOT / ".env")
except Exception:  # pragma: no cover - dotenv is optional in CI
    pass

import stripe  # noqa: E402

from services.pricing import (  # noqa: E402
    BillingInterval,
    ClubPlan,
    env_var_for,
)
from services.stripe_config import (  # noqa: E402
    LIVE_KEY_PREFIX,
    get_stripe_api_key,
)


PRODUCT_NAME = "StickPro Club"
PRODUCT_DESCRIPTION = (
    "Subscription to the StickPro hockey club management platform — "
    "pilot pricing. One subscription per club."
)
PRODUCT_METADATA_TAG = "stickpro:club"

DEFAULT_AMOUNT_MONTHLY = 1990   # €19.90 / month
DEFAULT_AMOUNT_YEARLY = 19900   # €199.00 / year
DEFAULT_CURRENCY = "eur"


def _abort(msg: str, code: int = 1) -> "None":
    print(f"[stripe-seed] ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def _find_product_by_tag(tag: str) -> Optional[Dict[str, Any]]:
    # Stripe's Search API supports metadata queries — single round trip.
    res = stripe.Product.search(
        query=f"active:'true' AND metadata['stickpro']:'{tag.split(':')[1]}'",
        limit=10,
    )
    for product in res.data:
        if product.metadata.get("stickpro") == tag.split(":")[1]:
            return product
    return None


def _find_existing_price(
    product_id: str,
    interval: BillingInterval,
    metadata_tag: str,
) -> Optional[Dict[str, Any]]:
    iterator = stripe.Price.list(
        product=product_id, active=True, limit=100,
    )
    for price in iterator.auto_paging_iter():
        recurring = price.get("recurring") or {}
        if (
            recurring.get("interval") == interval.value.rstrip("ly")
            # "monthly" -> "month", "yearly" -> "year"
            or recurring.get("interval") == _stripe_interval(interval)
        ) and price.metadata.get("stickpro") == metadata_tag:
            return price
    return None


def _stripe_interval(interval: BillingInterval) -> str:
    return {"monthly": "month", "yearly": "year"}[interval.value]


def _ensure_product() -> Dict[str, Any]:
    existing = _find_product_by_tag(PRODUCT_METADATA_TAG)
    if existing:
        print(f"[stripe-seed] product reused: {existing.id} ({existing.name})")
        return existing
    created = stripe.Product.create(
        name=PRODUCT_NAME,
        description=PRODUCT_DESCRIPTION,
        metadata={"stickpro": "club"},
    )
    print(f"[stripe-seed] product CREATED: {created.id} ({created.name})")
    return created


def _ensure_price(
    product_id: str,
    interval: BillingInterval,
    amount_cents: int,
    currency: str,
) -> Tuple[Dict[str, Any], bool]:
    metadata_tag = f"club:{interval.value}"
    existing = _find_existing_price(product_id, interval, metadata_tag)
    if existing:
        print(
            f"[stripe-seed] price reused [{interval.value}]: {existing.id} "
            f"({existing.unit_amount} {existing.currency})"
        )
        return existing, False
    created = stripe.Price.create(
        product=product_id,
        unit_amount=amount_cents,
        currency=currency,
        recurring={"interval": _stripe_interval(interval)},
        metadata={"stickpro": metadata_tag},
    )
    print(
        f"[stripe-seed] price CREATED [{interval.value}]: {created.id} "
        f"({created.unit_amount} {created.currency})"
    )
    return created, True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed Stripe test mode with the StickPro Club product + prices.",
    )
    parser.add_argument(
        "--monthly", type=int, default=DEFAULT_AMOUNT_MONTHLY,
        help=f"Monthly amount in cents (default: {DEFAULT_AMOUNT_MONTHLY})",
    )
    parser.add_argument(
        "--yearly", type=int, default=DEFAULT_AMOUNT_YEARLY,
        help=f"Yearly amount in cents (default: {DEFAULT_AMOUNT_YEARLY})",
    )
    parser.add_argument(
        "--currency", default=DEFAULT_CURRENCY,
        help=f"ISO currency code (default: {DEFAULT_CURRENCY})",
    )
    args = parser.parse_args()

    api_key = get_stripe_api_key()
    if not api_key:
        _abort("STRIPE_API_KEY is not set in the environment.")
    if api_key.startswith(LIVE_KEY_PREFIX):
        _abort(
            "Refusing to seed with a LIVE key. This script is for "
            "Stripe test mode only — set STRIPE_API_KEY to a "
            "test-mode key (the one starting with the test prefix) "
            "before running."
        )
    stripe.api_key = api_key

    try:
        product = _ensure_product()
        monthly, _ = _ensure_price(
            product.id, BillingInterval.monthly, args.monthly, args.currency,
        )
        yearly, _ = _ensure_price(
            product.id, BillingInterval.yearly, args.yearly, args.currency,
        )
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        _abort(f"Stripe API error: {exc}")
        return 1  # pragma: no cover

    monthly_var = env_var_for(ClubPlan.club, BillingInterval.monthly)
    yearly_var = env_var_for(ClubPlan.club, BillingInterval.yearly)

    print("")
    print("=" * 64)
    print("Paste these into backend/.env:")
    print("=" * 64)
    print(f"{monthly_var}={monthly.id}")
    print(f"{yearly_var}={yearly.id}")
    print("=" * 64)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
