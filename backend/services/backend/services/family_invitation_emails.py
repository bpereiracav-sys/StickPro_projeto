from __future__ import annotations

import html
import logging
import os
from typing import Optional, Tuple
from urllib.parse import quote

from services.emails import EmailMessage, send_email

logger = logging.getLogger(__name__)

FAMILY_INVITE_PATH = "/accept-family-invite"


def build_family_invite_link(token: str, *, frontend_url: Optional[str] = None) -> str:
    if not token:
        raise ValueError("token is required to build family invite link")

    base = (frontend_url or os.environ.get("FRONTEND_URL") or "").rstrip("/")
    if not base:
        raise ValueError("FRONTEND_URL is not configured")

    return f"{base}{FAMILY_INVITE_PATH}?token={quote(token, safe='')}"


def _render_bodies(
    *,
    guardian_name: str,
    player_name: str,
    relationship: str,
    invite_link: str,
) -> Tuple[str, str]:
    safe_guardian_name = html.escape(guardian_name or "Familiar")
    safe_player_name = html.escape(player_name or "atleta")
    safe_relationship = html.escape(relationship or "familiar")
    safe_link = html.escape(invite_link, quote=True)

    plain = (
        f"Olá {guardian_name or 'Familiar'},\n\n"
        f"Foi convidado para acompanhar {player_name or 'um atleta'} no Stick Pro.\n"
        f"Relação indicada: {relationship or 'familiar'}.\n\n"
        "Através da sua conta gratuita poderá acompanhar calendário, convocatórias, presenças, avaliações e comunicações associadas ao atleta.\n\n"
        f"Aceite o convite aqui:\n{invite_link}\n\n"
        "Este acesso não consome licença adicional.\n\n"
        "— Equipa Stick Pro\n"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Stick Pro</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <h1 style="margin:0 0 8px 0;font-size:24px;color:#0f172a;">Olá {safe_guardian_name},</h1>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#334155;">
                Foi convidado para acompanhar <strong>{safe_player_name}</strong> no <strong>Stick Pro</strong>.
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.5;color:#475569;">
                Relação indicada: <strong>{safe_relationship}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <a href="{safe_link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">Aceitar convite</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
                Este acesso não consome licença adicional.
              </p>
              <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
                Se o botão não funcionar, copie este endereço para o navegador:
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;color:#0f172a;word-break:break-all;">
                {safe_link}
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


async def send_family_invitation_email(
    *,
    to_email: str,
    guardian_name: str,
    player_name: str,
    relationship: str,
    token: str,
    frontend_url: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> bool:
    if not to_email or "@" not in to_email:
        raise ValueError(f"invalid recipient email: {to_email!r}")

    if not token:
        raise ValueError("token is required to send family invitation email")

    link = build_family_invite_link(token, frontend_url=frontend_url)

    html_body, text_body = _render_bodies(
        guardian_name=guardian_name,
        player_name=player_name,
        relationship=relationship,
        invite_link=link,
    )

    headers = {"X-Idempotency-Key": idempotency_key} if idempotency_key else None

    message = EmailMessage(
        to=to_email,
        subject="Convite para acompanhar atleta no Stick Pro",
        html=html_body,
        text=text_body,
        tags={"category": "family_invitation"},
        headers=headers,
    )

    try:
        result = await send_email(message)
    except Exception as exc:
        logger.error(
            "[FAMILY INVITATION EMAIL FAILED] to=%s player=%r err=%s: %s",
            to_email,
            player_name,
            type(exc).__name__,
            exc,
        )
        return False

    logger.info(
        "[FAMILY INVITATION EMAIL SENT] to=%s player=%r id=%s dry_run=%s attempts=%d",
        to_email,
        player_name,
        result.message_id,
        result.dry_run,
        result.attempts,
    )

    return result.success    
