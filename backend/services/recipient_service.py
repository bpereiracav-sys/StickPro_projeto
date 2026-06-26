from typing import Dict, Any, List


class RecipientService:
    def __init__(self, db):
        self.db = db

    async def get_event_recipients(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        team_ids = event.get("team_ids") or []

        if not team_ids and event.get("team_id"):
            team_ids = [event.get("team_id")]

        recipients = {}

        for team_id in team_ids:
            team = await self.db.teams.find_one({"id": team_id}, {"_id": 0})

            if not team:
                continue

            user_ids = set()

            for key in ["player_ids", "coach_ids", "assistant_coach_ids", "delegate_ids"]:
                for user_id in team.get(key, []) or []:
                    if user_id:
                        user_ids.add(user_id)

            if not user_ids:
                continue

            members = await self.db.users.find(
                {"id": {"$in": list(user_ids)}},
                {"_id": 0}
            ).to_list(500)

            for member in members:
                member_id = member.get("id")
                member_name = member.get("name") or member.get("full_name") or "Membro"
                member_email = member.get("email")
                has_real_email = member.get("has_real_email", True)

                if member_email and has_real_email and not member_email.endswith("@stickpro.local"):
                    recipients[member_id] = {
                        "user_id": member_id,
                        "email": member_email,
                        "name": member_name,
                        "role": member.get("role"),
                        "source": "team_member",
                    }

                guardian_email = member.get("guardian_email")
                if guardian_email:
                    recipients[f"{member_id}:{guardian_email}"] = {
                        "user_id": None,
                        "email": guardian_email,
                        "name": member.get("guardian_name") or "Responsável",
                        "role": "responsavel",
                        "source": "guardian_email",
                        "related_member_id": member_id,
                        "related_member_name": member_name,
                    }

                for guardian_email in member.get("guardian_emails", []) or []:
                    if guardian_email:
                        recipients[f"{member_id}:{guardian_email}"] = {
                            "user_id": None,
                            "email": guardian_email,
                            "name": "Responsável",
                            "role": "responsavel",
                            "source": "guardian_emails",
                            "related_member_id": member_id,
                            "related_member_name": member_name,
                        }

                for guardian in member.get("associated_accounts", []) or []:
                    guardian_email = guardian.get("email")
                    guardian_id = guardian.get("user_id") or guardian_email

                    if guardian_email:
                        recipients[guardian_id] = {
                            "user_id": guardian.get("user_id"),
                            "email": guardian_email,
                            "name": guardian.get("name") or "Responsável",
                            "role": "responsavel",
                            "source": "associated_account",
                            "related_member_id": member_id,
                            "related_member_name": member_name,
                        }

        return list(recipients.values())
