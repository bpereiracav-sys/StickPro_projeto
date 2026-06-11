"""
Resend email service for Stick Pro — Phase E1 (production readiness).

This module is the single entry point all NEW email flows must use
(activation, password reset, notifications, etc.). The legacy helper
`send_email_notification` in `backend/server.py` is intentionally left in
place; it should be migrated module by module in later phases.

Key properties of this service:

* Async-friendly: the Resend SDK is synchronous, so calls are dispatched
  via ``asyncio.to_thread`` to keep the FastAPI event loop non-blocking.
* Retry with exponential backoff on transient errors (network errors,
  5xx, 429). Permanent errors (4xx validation, invalid API key) are NOT
  retried — they fail fast.
* Fail-fast configuration validation in production via
  :func:`validate_email_config`.
* Dry-run support in non-production environments: when ``RESEND_API_KEY``
  is unset, the call logs the message and returns a synthetic message id
  so feature development can proceed without a live Resend account.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import os
import random
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

import resend
from resend.exceptions import (
    ApplicationError,
    InvalidApiKeyError,
    MissingApiKeyError,
    MissingRequiredFieldsError,
    RateLimitError,
    ResendError,
    ValidationError,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------


@dataclass
class EmailAttachment:
    """Single email attachment.

    ``content`` is raw bytes; the service base64-encodes it on send."""

    filename: str
    content: bytes
    content_type: Optional[str] = None


@dataclass
class EmailMessage:
    """A normalized email payload, independent of the Resend SDK."""

    to: Sequence[str]
    subject: str
    html: str
    text: Optional[str] = None
    reply_to: Optional[str] = None
    tags: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None
    attachments: List[EmailAttachment] = field(default_factory=list)

    def __post_init__(self) -> None:
        if isinstance(self.to, str):  # accept a single recipient as a string
            self.to = [self.to]
        if not self.to:
            raise ValueError("EmailMessage.to must contain at least one address")
        if not self.subject:
            raise ValueError("EmailMessage.subject is required")
        if not self.html:
            raise ValueError("EmailMessage.html is required")


@dataclass
class EmailResult:
    """Outcome of a send operation."""

    success: bool
    message_id: Optional[str]
    attempts: int
    dry_run: bool = False
    error: Optional[str] = None


class EmailConfigError(RuntimeError):
    """Raised when required email configuration is missing in production."""


class EmailDeliveryError(RuntimeError):
    """Raised when a send fails permanently (after retries or on 4xx)."""


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------


REQUIRED_PRODUCTION_VARS = ("RESEND_API_KEY", "SENDER_EMAIL", "FRONTEND_URL")


def _environment() -> str:
    return os.environ.get("ENVIRONMENT", "development").lower()


def is_production() -> bool:
    return _environment() == "production"


def validate_email_config(strict: Optional[bool] = None) -> Dict[str, Any]:
    """Validate email-related environment variables.

    Args:
        strict: If True, missing variables raise :class:`EmailConfigError`.
            If None (default), strictness follows the current environment —
            strict in production, lenient elsewhere.

    Returns:
        A dict with ``ok``, ``environment``, ``missing`` and ``present`` keys
        describing the current configuration state. Useful for diagnostics
        and the validation CLI script.

    Raises:
        EmailConfigError: When ``strict`` evaluates to True and at least one
            required variable is missing.
    """
    if strict is None:
        strict = is_production()

    missing: List[str] = []
    present: List[str] = []
    for var in REQUIRED_PRODUCTION_VARS:
        if os.environ.get(var):
            present.append(var)
        else:
            missing.append(var)

    result = {
        "ok": not missing,
        "environment": _environment(),
        "missing": missing,
        "present": present,
        "strict": strict,
    }

    if missing and strict:
        raise EmailConfigError(
            "Missing required email configuration: "
            + ", ".join(missing)
            + ". Set these variables before starting the app in production."
        )

    if missing:
        logger.warning(
            "Email configuration incomplete (non-strict): missing=%s. "
            "Dry-run mode will be used for outbound mail.",
            ",".join(missing),
        )

    return result


# ---------------------------------------------------------------------------
# Retry policy
# ---------------------------------------------------------------------------


# Permanent failures — never retry.
_NON_RETRYABLE_RESEND_ERRORS = (
    InvalidApiKeyError,
    MissingApiKeyError,
    MissingRequiredFieldsError,
    ValidationError,
)

# Explicit transient categories — always retry.
_RETRYABLE_RESEND_ERRORS = (
    ApplicationError,  # 5xx server errors
    RateLimitError,    # 429
)


def is_retryable_error(exc: BaseException) -> bool:
    """Decide whether an exception from the Resend SDK is transient.

    Strategy:
    * 4xx / config errors are not retried.
    * Resend 5xx + 429 are retried.
    * Any other ``Exception`` (network, timeout, DNS, etc.) is retried
      unless it is a ``ResendError`` we explicitly classified above.
    """
    if isinstance(exc, _NON_RETRYABLE_RESEND_ERRORS):
        return False
    if isinstance(exc, _RETRYABLE_RESEND_ERRORS):
        return True
    if isinstance(exc, ResendError):
        # Unknown ResendError subclass — be conservative and do not retry.
        return False
    # Generic Exception (network, timeout) — retry.
    return isinstance(exc, Exception)


def _compute_backoff(attempt: int, base_delay: float, jitter: bool) -> float:
    """Exponential backoff: ``base * 2**(attempt-1)``, optionally jittered."""
    delay = base_delay * (2 ** max(0, attempt - 1))
    if jitter:
        delay += random.uniform(0, base_delay)
    return delay


# ---------------------------------------------------------------------------
# Resend payload builder
# ---------------------------------------------------------------------------


def _build_params(message: EmailMessage, sender: str) -> Dict[str, Any]:
    """Translate :class:`EmailMessage` into the dict expected by Resend SDK."""
    params: Dict[str, Any] = {
        "from": sender,
        "to": list(message.to),
        "subject": message.subject,
        "html": message.html,
    }
    if message.text:
        params["text"] = message.text
    if message.reply_to:
        params["reply_to"] = message.reply_to
    if message.tags:
        params["tags"] = [
            {"name": k, "value": v} for k, v in message.tags.items()
        ]
    if message.headers:
        params["headers"] = dict(message.headers)
    if message.attachments:
        params["attachments"] = [
            {
                "filename": a.filename,
                "content": base64.b64encode(a.content).decode("utf-8"),
                **({"content_type": a.content_type} if a.content_type else {}),
            }
            for a in message.attachments
        ]
    return params


# ---------------------------------------------------------------------------
# Public send API
# ---------------------------------------------------------------------------


async def send_email(
    message: EmailMessage,
    *,
    max_attempts: int = 3,
    base_delay: float = 0.5,
    jitter: bool = True,
    sleep: Optional[Any] = None,
) -> EmailResult:
    """Send an email through Resend with retry/backoff.

    Args:
        message: Normalized email payload.
        max_attempts: Total attempts including the first try. Must be >= 1.
        base_delay: Initial backoff delay in seconds (doubles each attempt).
        jitter: Add up to ``base_delay`` seconds of random jitter to each sleep.
        sleep: Override for ``asyncio.sleep`` (used by tests).

    Returns:
        :class:`EmailResult` with the message id on success.

    Raises:
        EmailConfigError: In production when ``RESEND_API_KEY`` is missing.
        EmailDeliveryError: When all retries are exhausted or a permanent
            error is encountered.
    """
    if max_attempts < 1:
        raise ValueError("max_attempts must be >= 1")

    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    # Dry-run handling
    if not api_key:
        if is_production():
            raise EmailConfigError(
                "RESEND_API_KEY is required in production but was not set."
            )
        fake_id = f"dryrun-{uuid.uuid4().hex[:12]}"
        logger.warning(
            "[EMAIL DRY-RUN] to=%s subject=%r — RESEND_API_KEY not set; "
            "returning synthetic id=%s",
            list(message.to),
            message.subject,
            fake_id,
        )
        return EmailResult(
            success=True, message_id=fake_id, attempts=0, dry_run=True
        )

    resend.api_key = api_key
    params = _build_params(message, sender)
    sleep_fn = sleep or asyncio.sleep

    last_exc: Optional[BaseException] = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = await asyncio.to_thread(resend.Emails.send, params)
            message_id = (
                response.get("id") if isinstance(response, dict) else None
            )
            logger.info(
                "[EMAIL SENT] to=%s subject=%r id=%s attempt=%d",
                list(message.to),
                message.subject,
                message_id,
                attempt,
            )
            return EmailResult(
                success=True, message_id=message_id, attempts=attempt
            )
        except Exception as exc:  # noqa: BLE001 — classified below
            last_exc = exc
            retryable = is_retryable_error(exc)
            logger.warning(
                "[EMAIL ATTEMPT FAILED] to=%s attempt=%d/%d retryable=%s "
                "exc=%s: %s",
                list(message.to),
                attempt,
                max_attempts,
                retryable,
                type(exc).__name__,
                exc,
            )
            if not retryable or attempt >= max_attempts:
                break
            await sleep_fn(_compute_backoff(attempt, base_delay, jitter))

    # Exhausted attempts or hit a non-retryable error.
    assert last_exc is not None
    raise EmailDeliveryError(
        f"Email delivery failed after {attempt} attempt(s): "
        f"{type(last_exc).__name__}: {last_exc}"
    ) from last_exc
