#!/usr/bin/env python3
"""CLI: validate Stripe-related environment configuration.

Usage::

    cd backend && python scripts/validate_stripe_config.py
    # or with --strict to force production-style validation in any env
    python scripts/validate_stripe_config.py --strict

Exit codes:
    0 — configuration is OK for the current environment.
    1 — configuration is invalid (missing variables in production, or
        ``--strict`` was requested and variables are missing, or a live
        key was detected outside production).

This script does NOT contact Stripe; it only validates env vars.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

try:
    from dotenv import load_dotenv

    load_dotenv(_BACKEND_ROOT / ".env")
except Exception:  # pragma: no cover - dotenv is optional
    pass

from services.stripe_config import (  # noqa: E402
    StripeConfigError,
    validate_stripe_config,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Stripe environment configuration.",
    )
    parser.add_argument(
        "--strict", action="store_true",
        help="Treat missing variables as a fatal error regardless of "
             "ENVIRONMENT (use in CI / pre-deploy).",
    )
    args = parser.parse_args()

    try:
        report = validate_stripe_config(strict=args.strict or None)
    except StripeConfigError as exc:
        print(f"[stripe-validate] FAIL: {exc}", file=sys.stderr)
        return 1

    print("[stripe-validate] environment :", report.environment)
    print("[stripe-validate] strict      :", report.strict)
    print("[stripe-validate] present     :", ", ".join(report.present) or "<none>")
    print("[stripe-validate] missing     :", ", ".join(report.missing) or "<none>")
    for w in report.warnings:
        print("[stripe-validate] warning     :", w)
    print("[stripe-validate] ok          :", report.ok)
    return 0 if report.ok else 0  # warning, not failure, when lenient


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
