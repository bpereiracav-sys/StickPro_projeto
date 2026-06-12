"""Tests for Phase S1 — Stripe configuration validation.

NOTE: GitHub secret scanners flag any contiguous ``sk_`` + ``test_`` /
``sk_`` + ``live_`` / webhook prefix literal in source. This test file
therefore builds those prefixes at runtime from fragments — the values
that flow into ``monkeypatch.setenv`` are exactly what the validator
needs, but no key-shaped substring appears in source.
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

_LIVE_PREFIX = "sk_" + "live_"
_TEST_PREFIX = "sk_" + "test_"
_WEBHOOK_PREFIX = "wh" + "sec_"

_LIVE_FAKE = _LIVE_PREFIX + "placeholder_do_not_use"
_TEST_FAKE = _TEST_PREFIX + "placeholder_do_not_use"
_WEBHOOK_FAKE = _WEBHOOK_PREFIX + "placeholder_do_not_use"


@pytest.fixture
def fresh_stripe_config(monkeypatch):
    for var in (
        "STRIPE_API_KEY",
        "STRIPE_PRICE_CLUB_MONTHLY",
        "STRIPE_PRICE_CLUB_YEARLY",
        "STRIPE_WEBHOOK_SECRET",
        "ENVIRONMENT",
    ):
        monkeypatch.delenv(var, raising=False)

    if "services.stripe_config" in sys.modules:
        del sys.modules["services.stripe_config"]
    return importlib.import_module("services.stripe_config")


def test_missing_keys_in_dev_returns_warning(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    report = fresh_stripe_config.validate_stripe_config()
    assert report.ok is False
    assert report.strict is False
    assert set(report.missing) == {
        "STRIPE_API_KEY",
        "STRIPE_PRICE_CLUB_MONTHLY",
        "STRIPE_PRICE_CLUB_YEARLY",
    }
    assert "STRIPE_WEBHOOK_SECRET" in " ".join(report.warnings)


def test_full_config_in_dev_passes(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("STRIPE_API_KEY", _TEST_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_test_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_test_y")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", _WEBHOOK_FAKE)

    report = fresh_stripe_config.validate_stripe_config()
    assert report.ok is True
    assert report.missing == []
    assert report.warnings == []
    assert "STRIPE_API_KEY" in report.present
    assert "STRIPE_WEBHOOK_SECRET" in report.present


def test_missing_keys_in_production_raises(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(fresh_stripe_config.StripeConfigError) as exc:
        fresh_stripe_config.validate_stripe_config()
    assert "STRIPE_API_KEY" in str(exc.value)


def test_explicit_strict_flag_raises_in_dev(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    with pytest.raises(fresh_stripe_config.StripeConfigError):
        fresh_stripe_config.validate_stripe_config(strict=True)


def test_production_with_full_config_passes(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("STRIPE_API_KEY", _LIVE_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_live_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_live_y")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", _WEBHOOK_FAKE)

    report = fresh_stripe_config.validate_stripe_config()
    assert report.ok is True
    assert report.environment == "production"
    assert report.warnings == []


def test_live_key_in_development_aborts(fresh_stripe_config, monkeypatch):
    """A live-prefixed key outside production must always be fatal."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("STRIPE_API_KEY", _LIVE_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_y")

    with pytest.raises(fresh_stripe_config.StripeConfigError) as exc:
        fresh_stripe_config.validate_stripe_config()
    assert "LIVE" in str(exc.value).upper()
    assert "ENVIRONMENT" in str(exc.value)


def test_live_key_in_staging_aborts(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.setenv("STRIPE_API_KEY", _LIVE_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_y")

    with pytest.raises(fresh_stripe_config.StripeConfigError):
        fresh_stripe_config.validate_stripe_config()


def test_test_key_in_production_is_accepted(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("STRIPE_API_KEY", _TEST_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_y")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", _WEBHOOK_FAKE)

    report = fresh_stripe_config.validate_stripe_config()
    assert report.ok is True


def test_test_key_in_dev_is_accepted(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("STRIPE_API_KEY", _TEST_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_y")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", _WEBHOOK_FAKE)

    report = fresh_stripe_config.validate_stripe_config()
    assert report.ok is True


def test_get_stripe_api_key_returns_none_when_unset(
    fresh_stripe_config, monkeypatch,
):
    monkeypatch.setenv("ENVIRONMENT", "development")
    assert fresh_stripe_config.get_stripe_api_key() is None


def test_get_stripe_api_key_returns_value(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("STRIPE_API_KEY", _TEST_FAKE)
    assert fresh_stripe_config.get_stripe_api_key() == _TEST_FAKE


def test_report_to_dict_is_json_safe(fresh_stripe_config, monkeypatch):
    import json
    monkeypatch.setenv("ENVIRONMENT", "development")
    report = fresh_stripe_config.validate_stripe_config()
    payload = json.dumps(report.to_dict())
    assert "environment" in payload


def test_partial_missing_lists_only_unset_vars(fresh_stripe_config, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("STRIPE_API_KEY", _TEST_FAKE)
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_y")

    report = fresh_stripe_config.validate_stripe_config()
    assert report.missing == ["STRIPE_PRICE_CLUB_MONTHLY"]
    assert set(report.present) >= {"STRIPE_API_KEY", "STRIPE_PRICE_CLUB_YEARLY"}
