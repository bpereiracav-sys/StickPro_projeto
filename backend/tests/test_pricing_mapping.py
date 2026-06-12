"""Tests for Phase S1 — pricing mapping."""
from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture
def pricing(monkeypatch):
    for var in ("STRIPE_PRICE_CLUB_MONTHLY", "STRIPE_PRICE_CLUB_YEARLY"):
        monkeypatch.delenv(var, raising=False)
    if "services.pricing" in sys.modules:
        del sys.modules["services.pricing"]
    return importlib.import_module("services.pricing")


def test_env_var_for_known_pairs(pricing):
    assert pricing.env_var_for(
        pricing.ClubPlan.club, pricing.BillingInterval.monthly
    ) == "STRIPE_PRICE_CLUB_MONTHLY"
    assert pricing.env_var_for(
        pricing.ClubPlan.club, pricing.BillingInterval.yearly
    ) == "STRIPE_PRICE_CLUB_YEARLY"


def test_price_id_for_returns_none_when_unset(pricing):
    assert (
        pricing.price_id_for(
            pricing.ClubPlan.club, pricing.BillingInterval.monthly
        )
        is None
    )


def test_price_id_for_reads_env(pricing, monkeypatch):
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_test_m")
    assert (
        pricing.price_id_for(
            pricing.ClubPlan.club, pricing.BillingInterval.monthly
        )
        == "price_test_m"
    )


def test_require_price_id_raises_when_missing(pricing):
    with pytest.raises(pricing.PricingConfigError) as exc:
        pricing.require_price_id(
            pricing.ClubPlan.club, pricing.BillingInterval.yearly
        )
    assert "STRIPE_PRICE_CLUB_YEARLY" in str(exc.value)


def test_require_price_id_returns_value_when_set(pricing, monkeypatch):
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_test_y")
    assert (
        pricing.require_price_id(
            pricing.ClubPlan.club, pricing.BillingInterval.yearly
        )
        == "price_test_y"
    )


def test_all_configured_prices_skips_unset(pricing, monkeypatch):
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_m")
    out = pricing.all_configured_prices()
    # Only monthly is set.
    assert out == {
        (pricing.ClubPlan.club, pricing.BillingInterval.monthly): "price_m",
    }


def test_all_configured_prices_lists_both_when_set(pricing, monkeypatch):
    monkeypatch.setenv("STRIPE_PRICE_CLUB_MONTHLY", "price_m")
    monkeypatch.setenv("STRIPE_PRICE_CLUB_YEARLY", "price_y")
    out = pricing.all_configured_prices()
    assert len(out) == 2
    assert (pricing.ClubPlan.club, pricing.BillingInterval.monthly) in out
    assert (pricing.ClubPlan.club, pricing.BillingInterval.yearly) in out


def test_price_env_vars_constant_covers_both_intervals(pricing):
    """Defensive check: if someone adds a new BillingInterval later,
    they must register an env-var for it or this test catches it."""
    for interval in pricing.BillingInterval:
        assert (pricing.ClubPlan.club, interval) in pricing.PRICE_ENV_VARS
