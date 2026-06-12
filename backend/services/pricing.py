"""Pricing mapping — Phase S1.

Single source of truth that maps the simplified pilot pricing model
(``ClubPlan`` × ``BillingInterval``) to the Stripe Price ID held in
the corresponding environment variable.

The model is intentionally minimal for the pilot:

* **Plan**:     ``club`` (only one tier for now — "StickPro Club")
* **Interval**: ``monthly`` or ``yearly``

Adding a second plan later only requires extending the ``ClubPlan``
enum and registering its env-var keys in :data:`PRICE_ENV_VARS`.
"""
from __future__ import annotations

import os
from enum import Enum
from typing import Dict, Optional, Tuple


class ClubPlan(str, Enum):
    """Pilot pricing has a single subscription plan called ``club``."""

    club = "club"


class BillingInterval(str, Enum):
    monthly = "monthly"
    yearly = "yearly"


# Pure (plan, interval) → env-var-name table. Kept as a constant so the
# seed script and the validator can iterate it without importing anything
# Stripe-related.
PRICE_ENV_VARS: Dict[Tuple[ClubPlan, BillingInterval], str] = {
    (ClubPlan.club, BillingInterval.monthly): "STRIPE_PRICE_CLUB_MONTHLY",
    (ClubPlan.club, BillingInterval.yearly): "STRIPE_PRICE_CLUB_YEARLY",
}


class PricingConfigError(RuntimeError):
    """Raised when a requested (plan, interval) has no Stripe Price ID
    configured in the environment."""


def env_var_for(plan: ClubPlan, interval: BillingInterval) -> str:
    """Return the env-var name that holds the Stripe Price ID for
    ``(plan, interval)``.

    Raises:
        PricingConfigError: when the combination is not registered.
    """
    try:
        return PRICE_ENV_VARS[(plan, interval)]
    except KeyError:
        raise PricingConfigError(
            f"No env-var mapping for plan={plan.value!r} interval={interval.value!r}"
        )


def price_id_for(plan: ClubPlan, interval: BillingInterval) -> Optional[str]:
    """Return the Stripe Price ID for ``(plan, interval)`` from env, or
    ``None`` when the env var is unset.

    Callers that need a hard guarantee (the future S2 checkout-session
    endpoint) should call :func:`require_price_id` instead.
    """
    return os.environ.get(env_var_for(plan, interval)) or None


def require_price_id(plan: ClubPlan, interval: BillingInterval) -> str:
    """Return the Stripe Price ID for ``(plan, interval)`` or raise.

    Raises:
        PricingConfigError: when the env var is missing or empty.
    """
    var = env_var_for(plan, interval)
    value = os.environ.get(var)
    if not value:
        raise PricingConfigError(
            f"Stripe Price ID missing for plan={plan.value!r} "
            f"interval={interval.value!r}. Set {var} in the environment "
            f"(seed it via scripts/stripe_seed_test_mode.py)."
        )
    return value


def all_configured_prices() -> Dict[Tuple[ClubPlan, BillingInterval], str]:
    """Return only the ``(plan, interval) → price_id`` pairs whose env
    var is populated. Handy for diagnostics and the CLI summary."""
    out: Dict[Tuple[ClubPlan, BillingInterval], str] = {}
    for key, var in PRICE_ENV_VARS.items():
        value = os.environ.get(var)
        if value:
            out[key] = value
    return out
