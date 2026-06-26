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

            for key in ["player_ids", "coach_ids", "delegate_ids"]:
                for user_id in team.get(key, []) or []:
                    if user_id:
                        user_ids.add(user_id)

            members = await self.db.users.find(
                {"id": {"$in": list(user_ids)}},
                {"_id": 0}
            ).to_list(500)

            for member in members:
                email = member.get("email")
                if email:
                    recipients[member["id"]] = {
                        "user_id": member["id"],
                        "email": email,
                        "name": member.get("name") or member.get("full_name") or "Membro",
                        "role": member.get("role"),
                        "source": "team_member",
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
                            "source": "guardian",
                            "related_member_id": member.get("id"),
                            "related_member_name": member.get("name"),
                        }

        return list(recipients.values())
