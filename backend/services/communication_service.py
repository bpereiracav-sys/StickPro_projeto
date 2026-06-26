from datetime import datetime, timezone
from typing import Optional, Dict, Any
import resend
from services.template_service import TemplateService


class CommunicationService:
    def __init__(self, db):
        self.db = db
        self.templates = TemplateService()

    async def log_notification(
        self,
        notification_type: str,
        recipient_user_id: Optional[str],
        recipient_email: Optional[str],
        subject: str,
        status: str = "pending",
        metadata: Optional[Dict[str, Any]] = None,
    ):
        log = {
            "notification_type": notification_type,
            "recipient_user_id": recipient_user_id,
            "recipient_email": recipient_email,
            "subject": subject,
            "status": status,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        await self.db.notification_logs.insert_one(log)
        return log

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html: str,
        notification_type: str,
        recipient_user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        log = await self.log_notification(
            notification_type=notification_type,
            recipient_user_id=recipient_user_id,
            recipient_email=to_email,
            subject=subject,
            status="pending",
            metadata=metadata,
        )

        try:
            resend.Emails.send({
                "from": "StickPro <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html,
            })

            await self.db.notification_logs.update_one(
                {"created_at": log["created_at"], "recipient_email": to_email},
                {
                    "$set": {
                        "status": "sent",
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

            return {"status": "sent"}

        except Exception as error:
            await self.db.notification_logs.update_one(
                {"created_at": log["created_at"], "recipient_email": to_email},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(error),
                    }
                },
            )

            return {"status": "failed", "error": str(error)}
    
    def render_birthday_email(self, member_name: str, club_name: str):
        return self.templates.render_template(
            "emails/birthday.html",
            {
                "member_name": member_name,
                "club_name": club_name,
            },
        )

    def render_event_postponed_email(
        self,
        event_title: str,
        club_name: str,
        new_date: str,
        location: str = "",
        reason: str = "",
    ):
        return self.templates.render_template(
            "emails/event_postponed.html",
            {
                "event_title": event_title,
                "club_name": club_name,
                "new_date": new_date,
                "location": location,
                "reason": reason,
            },
        )

    def render_event_cancelled_email(
        self,
        event_title: str,
        club_name: str,
        original_date: str,
        location: str = "",
    ):
        return self.templates.render_template(
            "emails/event_cancelled.html",
            {
                "event_title": event_title,
                "club_name": club_name,
                "original_date": original_date,
                "location": location,
            },
        )

    async def notify_event_cancelled(self, event: Dict[str, Any]):
        subject = f"Evento cancelado: {event.get('title', 'Evento')}"
        return await self.log_notification(
            notification_type="event_cancelled",
            recipient_user_id=None,
            recipient_email=None,
            subject=subject,
            status="pending",
            metadata={"event_id": event.get("id")},
        )

    async def notify_event_postponed(self, event: Dict[str, Any]):
        subject = f"Evento adiado: {event.get('title', 'Evento')}"
        return await self.log_notification(
            notification_type="event_postponed",
            recipient_user_id=None,
            recipient_email=None,
            subject=subject,
            status="pending",
            metadata={
                "event_id": event.get("id"),
                "postponed_to_start_time": event.get("postponed_to_start_time"),
                "postponed_to_end_time": event.get("postponed_to_end_time"),
                "postponement_reason": event.get("postponement_reason"),
            },
        )

    async def notify_event_restored(self, event: Dict[str, Any]):
        subject = f"Evento reativado: {event.get('title', 'Evento')}"
        return await self.log_notification(
            notification_type="event_restored",
            recipient_user_id=None,
            recipient_email=None,
            subject=subject,
            status="pending",
            metadata={"event_id": event.get("id")},
        )

    async def notify_birthday(
        self,
        member: Dict[str, Any],
        club: Optional[Dict[str, Any]] = None,
    ):
        member_name = member.get("name", "Atleta")
        club_name = club.get("name") if club else "o clube"

        subject = f"🎂 Feliz aniversário, {member_name}!"

        return await self.log_notification(
            notification_type="birthday",
            recipient_user_id=member.get("id"),
            recipient_email=member.get("email"),
            subject=subject,
            status="pending",
            metadata={
                "member_id": member.get("id"),
                "member_name": member_name,
                "club_id": member.get("club_id"),
                "club_name": club_name,
            },
        )
    async def send_birthday_email(
        self,
        member: Dict[str, Any],
        club: Optional[Dict[str, Any]] = None,
    ):
        member_name = member.get("name", "Atleta")
        club_name = club.get("name") if club else "o clube"
        to_email = member.get("email")

        if not to_email:
            return {"status": "skipped", "reason": "missing_email"}

        subject = f"🎂 Feliz aniversário, {member_name}!"
        html = self.render_birthday_email(member_name, club_name)

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html=html,
            notification_type="birthday",
            recipient_user_id=member.get("id"),
            metadata={
                "member_id": member.get("id"),
                "club_id": member.get("club_id"),
                "club_name": club_name,
            },
        )

    async def send_event_postponed_email(
        self,
        to_email: str,
        event: Dict[str, Any],
        club_name: str = "o clube",
        recipient_user_id: Optional[str] = None,
    ):
        subject = f"⏳ Evento adiado: {event.get('title', 'Evento')}"

        html = self.render_event_postponed_email(
            event_title=event.get("title", "Evento"),
            club_name=club_name,
            new_date=event.get("postponed_to_start_time", ""),
            location=event.get("location", ""),
            reason=event.get("postponement_reason", ""),
        )

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html=html,
            notification_type="event_postponed",
            recipient_user_id=recipient_user_id,
            metadata={"event_id": event.get("id")},
        )

    async def send_event_cancelled_email(
        self,
        to_email: str,
        event: Dict[str, Any],
        club_name: str = "o clube",
        recipient_user_id: Optional[str] = None,
    ):
        subject = f"❌ Evento cancelado: {event.get('title', 'Evento')}"

        html = self.render_event_cancelled_email(
            event_title=event.get("title", "Evento"),
            club_name=club_name,
            original_date=event.get("start_time", ""),
            location=event.get("location", ""),
        )

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html=html,
            notification_type="event_cancelled",
            recipient_user_id=recipient_user_id,
            metadata={"event_id": event.get("id")},
        )
