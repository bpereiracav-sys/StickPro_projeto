"""Tests for Phase 0 - JWT_SECRET hardcoded fallback removal.

Verifies that:
- In production, importing the JWT-secret-loading module without JWT_SECRET aborts.
- In development, the module loads with a clearly-marked insecure fallback.
- When JWT_SECRET is set, the value is used as-is in any environment.
"""
import os
import subprocess
import sys
import textwrap
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _run_python(code: str, env_overrides: dict, clear_jwt_secret: bool = False) -> subprocess.CompletedProcess:
    """Run a snippet in a clean subprocess so module-level guards execute fresh.

    When ``clear_jwt_secret`` is True, JWT_SECRET is set to an empty string in the
    subprocess environment. python-dotenv's ``load_dotenv`` (used by core.security)
    defaults to ``override=False``, so this prevents the local backend/.env file
    from re-injecting a value during the test.
    """
    env = os.environ.copy()
    for k in ("JWT_SECRET", "ENVIRONMENT"):
        env.pop(k, None)
    if clear_jwt_secret:
        env["JWT_SECRET"] = ""
    env.update(env_overrides)
    env.setdefault("MONGO_URL", "mongodb://localhost:27017")
    env.setdefault("DB_NAME", "test_database")
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(BACKEND_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=15,
    )


def test_production_without_jwt_secret_aborts():
    """Importing core.security in production with no JWT_SECRET must raise RuntimeError."""
    code = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, '.')
        try:
            import core.security  # noqa: F401
        except RuntimeError as e:
            print("RUNTIME_ERROR_OK:", e)
            sys.exit(0)
        print("NO_ERROR")
        sys.exit(1)
        """
    )
    result = _run_python(code, {"ENVIRONMENT": "production"}, clear_jwt_secret=True)
    assert result.returncode == 0, (
        f"Expected RuntimeError in production without JWT_SECRET.\n"
        f"stdout={result.stdout!r}\nstderr={result.stderr!r}"
    )
    assert "RUNTIME_ERROR_OK" in result.stdout
    assert "JWT_SECRET" in result.stdout


def test_development_without_jwt_secret_uses_fallback():
    """In development with no JWT_SECRET, module loads with insecure fallback."""
    code = textwrap.dedent(
        """
        import sys
        sys.path.insert(0, '.')
        import core.security as s
        assert s.JWT_SECRET == 'dev-only-insecure-jwt-secret-change-me', s.JWT_SECRET
        print("DEV_FALLBACK_OK")
        """
    )
    result = _run_python(code, {"ENVIRONMENT": "development"}, clear_jwt_secret=True)
    assert result.returncode == 0, (
        f"Dev fallback should load.\nstdout={result.stdout!r}\nstderr={result.stderr!r}"
    )
    assert "DEV_FALLBACK_OK" in result.stdout


def test_production_with_jwt_secret_uses_provided_value():
    """When JWT_SECRET is set, it is used verbatim regardless of environment."""
    secret = "my-strong-test-secret-1234567890abcdef"
    code = textwrap.dedent(
        f"""
        import sys
        sys.path.insert(0, '.')
        import core.security as s
        assert s.JWT_SECRET == {secret!r}, s.JWT_SECRET
        print("PROD_SECRET_OK")
        """
    )
    result = _run_python(
        code, {"ENVIRONMENT": "production", "JWT_SECRET": secret}
    )
    assert result.returncode == 0, (
        f"Provided JWT_SECRET must be honored.\n"
        f"stdout={result.stdout!r}\nstderr={result.stderr!r}"
    )
    assert "PROD_SECRET_OK" in result.stdout


def test_no_hardcoded_fallback_string_remains_in_source():
    """Guard: the legacy hardcoded fallback must not appear anywhere in backend/."""
    legacy = "roller-hockey-hub-secret-key-2024"
    offenders = []
    for path in BACKEND_DIR.rglob("*.py"):
        # Skip this very test file
        if path.resolve() == Path(__file__).resolve():
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if legacy in content:
            offenders.append(str(path.relative_to(BACKEND_DIR)))
    assert not offenders, (
        f"Hardcoded JWT_SECRET fallback still present in: {offenders}"
    )
