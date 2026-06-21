"""
Account activation email helper — Phase E2.

This is a thin, well-tested layer on top of :mod:`services.emails`. It owns:

* The canonical activation-link format (built from ``FRONTEND_URL`` +
  ``/activate-account?token=...``).
* The HTML and plain-text bodies of the activation email.
* Safe escaping of user-controlled values that end up in the HTML.
* A single async entry point, :func:`send_activation_email`, that callers in
  ``server.py`` invoke after creating an inactive user or regenerating a token.

It does NOT manage the activation token lifecycle — that stays in
``server.py`` for now. This module is purely about *delivering* an
activation email when a token has been produced upstream.
"""
from __future__ import annotations

import html
import logging
import os
from typing import Optional, Tuple
from urllib.parse import quote

from services.emails import EmailMessage, send_email

logger = logging.getLogger(__name__)


# Path the React app exposes for activation. Kept here so all callers
# build the same URL shape.
ACTIVATION_PATH = "/activate-account"


def build_activation_link(token: str, *, frontend_url: Optional[str] = None) -> str:
    """Return the canonical activation URL for ``token``.

    The base URL is read from ``FRONTEND_URL`` if not explicitly given. The
    trailing slash is normalised away. The token is percent-encoded so any
    URL-unsafe characters (very unlikely with ``secrets.token_urlsafe`` but
    defensive nonetheless) are escaped.

    Raises:
        ValueError: when neither ``frontend_url`` argument nor the
            ``FRONTEND_URL`` env var is set.
    """
    if not token:
        raise ValueError("token is required to build activation link")
    base = (frontend_url or os.environ.get("FRONTEND_URL") or "").rstrip("/")
    if not base:
        raise ValueError(
            "FRONTEND_URL is not configured — activation link cannot be built"
        )
    return f"{base}{ACTIVATION_PATH}?token={quote(token, safe='')}"


def _render_bodies(*, name: str, activation_link: str) -> Tuple[str, str]:
    """Render the HTML and plain-text bodies for the activation email.

    User-controlled values are HTML-escaped before interpolation. The URL is
    inserted into the ``href`` attribute and into the visible text; both are
    escaped with :func:`html.escape` (the URL itself is already safe from
    :func:`build_activation_link`, but defence-in-depth applies).
    """
    safe_name = html.escape(name or "Atleta")
    safe_link = html.escape(activation_link, quote=True)

    plain = (
        f"Olá {name or 'Atleta'},\n\n"
        "A tua conta no Stick Pro está pronta a ser ativada.\n"
        "Define a tua palavra-passe através deste link:\n\n"
        f"  {activation_link}\n\n"
        "Este link é pessoal e expira em 7 dias.\n"
        "Se não esperavas este email, podes ignorá-lo.\n\n"
        "— Equipa Stick Pro\n"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ativa a tua conta Stick Pro</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0 0 8px 0;font-size:24px;color:#0f172a;">Olá {safe_name},</h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;color:#334155;">
                A tua conta no <strong>Stick Pro</strong> está pronta a ser ativada.
                Define a tua palavra-passe para começar.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <a href="{safe_link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">Ativar conta</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
                Se o botão não funcionar, copia este endereço para o teu navegador:
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;color:#0f172a;word-break:break-all;">
                {safe_link}
              </p>
              <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
                Este link é pessoal e expira em 7 dias. Se não esperavas este email, podes ignorá-lo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">— Equipa Stick Pro</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return html_body, plain


async def send_activation_email(
    *,
    to_email: str,
    name: str,
    token: str,
    frontend_url: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> bool:
    """Send an account-activation email. Returns True on success or dry-run.

    This function never raises on a delivery failure: callers in ``server.py``
    typically run inside HTTP handlers where a transient email failure must
    not abort user creation. Any error is logged and ``False`` is returned
    so the caller can decide whether to flag it to the operator.

    Raises:
        ValueError: when inputs are invalid (missing token, no FRONTEND_URL,
            empty recipient). These are programming errors, not delivery
            failures, and are surfaced loudly so they fail fast in tests.
    """
    if not to_email or "@" not in to_email:
        raise ValueError(f"invalid recipient email: {to_email!r}")
    if not token:
        raise ValueError("token is required to send activation email")

    link = build_activation_link(token, frontend_url=frontend_url)
    html_body, text_body = _render_bodies(name=name, activation_link=link)

    headers = (
        {"X-Idempotency-Key": idempotency_key} if idempotency_key else None
    )
    message = EmailMessage(
        to=to_email,
        subject="Ativa a tua conta Stick Pro",
        html=html_body,
        text=text_body,
        tags={"category": "activation"},
        headers=headers,
    )

    try:
        result = await send_email(message)
    except Exception as exc:  # noqa: BLE001 — surface as boolean to callers
        logger.error(
            "[ACTIVATION EMAIL FAILED] to=%s name=%r err=%s: %s",
            to_email,
            name,
            type(exc).__name__,
            exc,
        )
        return False

    logger.info(
        "[ACTIVATION EMAIL SENT] to=%s name=%r id=%s dry_run=%s attempts=%d",
        to_email,
        name,
        result.message_id,
        result.dry_run,
        result.attempts,
    )
    return result.success
