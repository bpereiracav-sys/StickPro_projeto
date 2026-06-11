#!/usr/bin/env python3
"""CLI: validate email-related environment configuration.

Usage::

    python -m backend.scripts.validate_email_config
    # or
    cd backend && python scripts/validate_email_config.py

Exit codes:
    0 — configuration is OK for the current environment.
    1 — configuration is invalid (missing variables in production, or strict
        mode was requested via ``--strict`` and variables are missing).

This script is intended to run in CI pipelines and as a pre-deploy smoke check.
It does NOT contact Resend; it only validates that the required environment
variables are present.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Allow running directly (``python scripts/validate_email_config.py``) by
# adding the backend root to sys.path so ``services.emails`` resolves.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

try:
    from dotenv import load_dotenv

    load_dotenv(_BACKEND_ROOT / ".env")
except Exception:  # pragma: no cover - dotenv is a soft dependency here
    pass

from services.emails import (  # noqa: E402
    EmailConfigError,
    REQUIRED_PRODUCTION_VARS,
    validate_email_config,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate email environment configuration.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help=(
            "Treat missing variables as a hard failure regardless of "
            "ENVIRONMENT. By default, strictness follows ENVIRONMENT=production."
        ),
    )
    args = parser.parse_args(argv)

    env = os.environ.get("ENVIRONMENT", "development").lower()
    print(f"Environment: {env}")
    print(f"Required vars: {', '.join(REQUIRED_PRODUCTION_VARS)}")

    try:
        report = validate_email_config(strict=args.strict or env == "production")
    except EmailConfigError as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 1

    print(f"Present: {', '.join(report['present']) or '(none)'}")
    if report["missing"]:
        print(f"Missing: {', '.join(report['missing'])}")
        # Non-strict + non-prod: warn but succeed.
        print(
            "[WARN] Configuration incomplete — dry-run mode will be used "
            "for outbound mail."
        )
        return 0

    print("[OK] All required email variables are set.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
