"""Tests for startup-time email configuration validation.

Asserts that ``backend/server.py`` invokes
``services.emails.validate_email_config()`` at module-import time and that
the behaviour matches the contract documented for Phase E1:

* In production, a missing required email var raises ``EmailConfigError``
  *before* the FastAPI app object can be used. Importing ``server`` aborts.
* In production with all three required vars present, ``server`` imports
  cleanly.
* In development with no email vars set, ``server`` imports with a warning
  (dry-run fallback).
* The wiring line itself exists in the source — guards against accidental
  removal of the validator call.

All checks run in clean subprocesses so module-level guards execute fresh.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import textwrap
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _run_python(code: str, env_overrides: dict, clear_keys: tuple = ()) -> subprocess.CompletedProcess:
    """Run a snippet in a clean subprocess with controlled env."""
    env = os.environ.copy()
    # Strip the email-related and environment vars so each test sets exactly
    # what it needs. Use "" rather than del so python-dotenv (override=False)
    # cannot re-inject values from backend/.env during the test.
    for k in clear_keys:
        env[k] = ""
    env.update(env_overrides)
    # server.py needs Mongo connection info at import time (lazy connect, so
    # the URI does not need to actually point to a live db for the validator
    # branch we are exercising).
    env.setdefault("MONGO_URL", "mongodb://localhost:27017")
    env.setdefault("DB_NAME", "stickpro_startup_test")
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


# ---------------------------------------------------------------------------
# 1. Source-level regression: the wiring line must exist.
# ---------------------------------------------------------------------------


def test_server_source_contains_startup_validation_call():
    """If somebody removes _validate_email_config() from server.py, this fails."""
    src = (BACKEND_DIR / "server.py").read_text(encoding="utf-8")
    # Match either the import-and-call or any equivalent direct invocation.
    assert re.search(
        r"from\s+services\.emails\s+import\s+validate_email_config",
        src,
    ), "server.py should import validate_email_config from services.emails"
    assert re.search(
        r"_validate_email_config\s*\(\s*\)",
        src,
    ), "server.py should invoke validate_email_config() at module load"


# ---------------------------------------------------------------------------
# 2. Production with missing required vars must abort module import.
# ---------------------------------------------------------------------------


def test_production_missing_email_config_aborts_server_import():
    code = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, '.')
        try:
            import server  # noqa: F401
        except Exception as exc:
            cls = type(exc).__name__
            print(f"IMPORT_FAILED:{cls}:{exc}")
            sys.exit(0)
        print("IMPORT_OK")
        sys.exit(1)
        """
    )
    # Need JWT_SECRET set so the JWT_SECRET guard does not abort first; we
    # want to isolate the *email* failure mode specifically.
    result = _run_python(
        code,
        {"ENVIRONMENT": "production", "JWT_SECRET": "x" * 48},
        clear_keys=("RESEND_API_KEY", "SENDER_EMAIL", "FRONTEND_URL"),
    )
    assert result.returncode == 0, (
        f"Expected importing server to abort.\n"
        f"stdout={result.stdout!r}\nstderr={result.stderr!r}"
    )
    assert "IMPORT_FAILED:EmailConfigError" in result.stdout, result.stdout
    # Error message should mention at least one of the missing vars.
    assert any(
        v in result.stdout
        for v in ("RESEND_API_KEY", "SENDER_EMAIL", "FRONTEND_URL")
    ), result.stdout


# ---------------------------------------------------------------------------
# 3. Production with all required vars present imports cleanly.
# ---------------------------------------------------------------------------


def test_production_complete_email_config_allows_server_import():
    code = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, '.')
        import server  # noqa: F401
        print("IMPORT_OK")
        """
    )
    result = _run_python(
        code,
        {
            "ENVIRONMENT": "production",
            "JWT_SECRET": "x" * 48,
            "RESEND_API_KEY": "re_test_startup_complete",
            "SENDER_EMAIL": "noreply@stickpro.test",
            "FRONTEND_URL": "https://app.stickpro.test",
            # Phase S1: Stripe validator now runs at startup too. In
            # production it requires the same minimum env vars the
            # subscription endpoints depend on. Built from fragments so
            # GitHub secret scanners don't match the literal prefix.
            "STRIPE_API_KEY": "sk_" + "test_" + "placeholder_do_not_use",
            "STRIPE_PRICE_CLUB_MONTHLY": "price_test_m",
            "STRIPE_PRICE_CLUB_YEARLY": "price_test_y",
        },
    )
    assert "IMPORT_OK" in result.stdout, (
        f"Expected clean import; got stdout={result.stdout!r} "
        f"stderr={result.stderr!r}"
    )


# ---------------------------------------------------------------------------
# 4. Development with missing email vars imports with a warning only.
# ---------------------------------------------------------------------------


def test_development_missing_email_config_does_not_abort():
    code = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, '.')
        import server  # noqa: F401
        print("IMPORT_OK")
        """
    )
    result = _run_python(
        code,
        {"ENVIRONMENT": "development", "JWT_SECRET": "x" * 48},
        clear_keys=("RESEND_API_KEY", "SENDER_EMAIL", "FRONTEND_URL"),
    )
    assert "IMPORT_OK" in result.stdout, (
        f"Dev import must not abort.\n"
        f"stdout={result.stdout!r}\nstderr={result.stderr!r}"
    )
