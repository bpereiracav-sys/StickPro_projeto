"""
Password reset email helper — Phase E3.

Thin layer on top of :mod:`services.emails`. Owns:

* The canonical reset-link format
  (``<FRONTEND_URL>/reset-password?token=<urlencoded>``).
* HTML and plain-text bodies for the password reset email.
* HTML escaping of user-controlled values.
* :func:`send_password_reset_email` that callers in ``server.py`` invoke
  once a reset token has been issued for an account.

Mirrors the shape of ``services.activation_emails`` so callers can compose
the two helpers identically. Like activation, **it never raises on a
delivery failure** — callers stay in control of the user-facing flow.
"""
from __future__ import annotations

import html
import logging
import os
from typing import Optional, Tuple
from urllib.parse import quote

from services.emails import EmailMessage, send_email

logger = logging.getLogger(__name__)


RESET_PATH = "/reset-password"


def build_reset_link(token: str, *, frontend_url: Optional[str] = None) -> str:
    """Return the canonical password reset URL for ``token``.

    The base URL is read from ``FRONTEND_URL`` if not explicitly given.
    The trailing slash is stripped. The token is percent-encoded.

    Raises:
        ValueError: when token is empty or no FRONTEND_URL is configured.
    """
    if not token:
        raise ValueError("token is required to build reset link")
    base = (frontend_url or os.environ.get("FRONTEND_URL") or "").rstrip("/")
    if not base:
        raise ValueError(
            "FRONTEND_URL is not configured — reset link cannot be built"
        )
    return f"{base}{RESET_PATH}?token={quote(token, safe='')}"


def _render_bodies(*, name: str, reset_link: str) -> Tuple[str, str]:
    """Render HTML and plain-text bodies. All user-controlled values are
    HTML-escaped before interpolation."""
    safe_name = html.escape(name or "Atleta")
    safe_link = html.escape(reset_link, quote=True)

    plain = (
        f"Olá {name or 'Atleta'},\n\n"
        "Recebemos um pedido para redefinir a palavra-passe da tua conta "
        "Stick Pro.\n\n"
        "Define uma nova palavra-passe através deste link:\n\n"
        f"  {reset_link}\n\n"
        "Este link é pessoal, só pode ser usado uma vez e expira em 1 hora.\n"
        "Se não pediste este reset, podes ignorar este email — a tua conta "
        "permanece segura.\n\n"
        "— Equipa Stick Pro\n"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir palavra-passe Stick Pro</title>
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
                Recebemos um pedido para redefinir a palavra-passe da tua conta <strong>Stick Pro</strong>.
                Clica no botão abaixo para escolheres uma nova.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <a href="{safe_link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">Definir nova palavra-passe</a>
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
                Este link é pessoal, só pode ser usado uma vez e expira em 1 hora.
                Se não pediste este reset, podes ignorar este email — a tua conta permanece segura.
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


async def send_password_reset_email(
    *,
    to_email: str,
    name: str,
    token: str,
    frontend_url: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> bool:
    """Send a password reset email. Returns True on success or dry-run.

    Never raises on delivery failure (returns False). Raises ValueError on
    programming errors (missing inputs).
    """
    if not to_email or "@" not in to_email:
        raise ValueError(f"invalid recipient email: {to_email!r}")
    if not token:
        raise ValueError("token is required to send password reset email")

    link = build_reset_link(token, frontend_url=frontend_url)
    html_body, text_body = _render_bodies(name=name, reset_link=link)

    headers = (
        {"X-Idempotency-Key": idempotency_key} if idempotency_key else None
    )
    message = EmailMessage(
        to=to_email,
        subject="Redefinir palavra-passe Stick Pro",
        html=html_body,
        text=text_body,
        tags={"category": "password_reset"},
        headers=headers,
    )

    try:
        result = await send_email(message)
    except Exception as exc:  # noqa: BLE001 — surface as boolean
        logger.error(
            "[PASSWORD RESET EMAIL FAILED] to=%s name=%r err=%s: %s",
            to_email,
            name,
            type(exc).__name__,
            exc,
        )
        return False

    logger.info(
        "[PASSWORD RESET EMAIL SENT] to=%s name=%r id=%s dry_run=%s attempts=%d",
        to_email,
        name,
        result.message_id,
        result.dry_run,
        result.attempts,
    )
    return result.success
