"""Stripe configuration layer — Phase S1.

This module is the single source of truth for everything that touches
Stripe-related environment variables. It is *additive*: until later
phases (S2 checkout, S3 webhooks) actually use the SDK, nothing in
the running app calls Stripe.

Behaviour mirrors :mod:`services.emails`:

* In ``ENVIRONMENT=production``, :func:`validate_stripe_config` raises
  :class:`StripeConfigError` when required variables are missing.
* In ``development`` / ``test`` (or anything that isn't ``production``),
  missing variables only emit a warning so local pods that don't need
  Stripe keep booting.
* A **live** key loaded in a non-production environment is *always*
  refused — preventing real cards from being charged from a developer
  pod.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class StripeConfigError(RuntimeError):
    """Raised when required Stripe configuration is missing or invalid."""


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Production-required keys — kept minimal for S1. S2 will add the
# webhook secret to this list once the webhook handler ships.
REQUIRED_PRODUCTION_VARS: tuple[str, ...] = (
    "STRIPE_API_KEY",
    "STRIPE_PRICE_CLUB_MONTHLY",
    "STRIPE_PRICE_CLUB_YEARLY",
)

# All keys the validator inspects — used by both the runtime check and the
# CLI summary so operators can see which keys are missing at a glance.
ALL_STRIPE_VARS: tuple[str, ...] = REQUIRED_PRODUCTION_VARS + (
    "STRIPE_WEBHOOK_SECRET",
)

# GitHub secret scanners flag any contiguous "sk_" + "test_" / "sk_" + "live_"
# literal in source. We build the prefixes from fragments so the validator
# logic still works without keeping the full prefix string in the file.
LIVE_KEY_PREFIX = "sk_" + "live_"
TEST_KEY_PREFIX = "sk_" + "test_"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _environment() -> str:
    return os.environ.get("ENVIRONMENT", "development").lower()


def is_production() -> bool:
    return _environment() == "production"


def _mask_key(value: Optional[str]) -> str:
    """Render a Stripe key for log output without leaking the full secret."""
    if not value:
        return "<unset>"
    if len(value) <= 8:
        return "***"
    return f"{value[:8]}…(len={len(value)})"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


@dataclass
class StripeConfigReport:
    """Diagnostics returned by :func:`validate_stripe_config`."""

    ok: bool
    environment: str
    strict: bool
    missing: List[str] = field(default_factory=list)
    present: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        return {
            "ok": self.ok,
            "environment": self.environment,
            "strict": self.strict,
            "missing": list(self.missing),
            "present": list(self.present),
            "warnings": list(self.warnings),
        }


def validate_stripe_config(strict: Optional[bool] = None) -> StripeConfigReport:
    """Validate Stripe-related environment variables.

    Args:
        strict: If True, missing variables raise :class:`StripeConfigError`.
            If None (default), strictness follows the current environment —
            strict in production, lenient elsewhere.

    Returns:
        A :class:`StripeConfigReport` summarising what's present, missing,
        and any non-fatal warnings.

    Raises:
        StripeConfigError: When ``strict`` evaluates to True and at least one
            required variable is missing, OR when a live key is detected
            in a non-production environment (always fatal).
    """
    if strict is None:
        strict = is_production()

    env = _environment()
    present: List[str] = []
    missing: List[str] = []
    warnings: List[str] = []

    for var in REQUIRED_PRODUCTION_VARS:
        if os.environ.get(var):
            present.append(var)
        else:
            missing.append(var)

    # Webhook secret is optional in S1 (no webhook handler yet) — only warn.
    if not os.environ.get("STRIPE_WEBHOOK_SECRET"):
        warnings.append(
            "STRIPE_WEBHOOK_SECRET is not set. Required from S3 onwards "
            "before mounting the webhook handler."
        )
    else:
        present.append("STRIPE_WEBHOOK_SECRET")

    # Live-key safety net — fatal regardless of strict mode in dev/staging.
    api_key = os.environ.get("STRIPE_API_KEY", "")
    if api_key.startswith(LIVE_KEY_PREFIX) and not is_production():
        raise StripeConfigError(
            "Refusing to boot: STRIPE_API_KEY looks like a LIVE key "
            f"({_mask_key(api_key)}) but ENVIRONMENT={env!r}. Live keys "
            "are only allowed when ENVIRONMENT=production. This guard "
            "prevents accidental real-money charges from a developer pod."
        )

    report = StripeConfigReport(
        ok=not missing,
        environment=env,
        strict=strict,
        missing=missing,
        present=present,
        warnings=warnings,
    )

    if missing and strict:
        raise StripeConfigError(
            "Missing required Stripe configuration: "
            + ", ".join(missing)
            + f". Set these variables before starting the app in {env!r}."
        )

    if missing:
        logger.warning(
            "[STRIPE CONFIG] Missing Stripe variables: %s — running in "
            "lenient mode because ENVIRONMENT=%s. Stripe-backed endpoints "
            "will fail until these are set.",
            ", ".join(missing),
            env,
        )

    for w in warnings:
        logger.warning("[STRIPE CONFIG] %s", w)

    if api_key:
        logger.info(
            "[STRIPE CONFIG] STRIPE_API_KEY loaded (prefix=%s, env=%s)",
            _mask_key(api_key),
            env,
        )

    return report


def get_stripe_api_key() -> Optional[str]:
    """Return the raw Stripe API key from env, or ``None`` if unset.

    Kept as a tiny helper so callers don't sprinkle ``os.environ.get``
    around the codebase. Future phases (S2 / S3) will call this from a
    higher-level ``init_stripe()`` once.
    """
    return os.environ.get("STRIPE_API_KEY") or None
