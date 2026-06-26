from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Literal

from pydantic import BaseModel, Field, ConfigDict
import uuid


# ==========================================================
# Communication Log
# ==========================================================

CommunicationChannel = Literal[
    "email",
    "push",
    "in_app"
]

CommunicationStatus = Literal[
    "pending",
    "sent",
    "failed",
    "read"
]

CommunicationType = Literal[
    "birthday",
    "event_created",
    "event_updated",
    "event_cancelled",
    "event_postponed",
    "event_restored",
    "convocation",
    "attendance",
    "feedback",
    "evaluation",
    "payment",
    "announcement",
    "system"
]


class CommunicationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    notification_type: CommunicationType

    channel: CommunicationChannel

    subject: str

    recipient_user_id: Optional[str] = None

    recipient_email: Optional[str] = None

    status: CommunicationStatus = "pending"

    metadata: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    sent_at: Optional[datetime] = None

    read_at: Optional[datetime] = None

    error: Optional[str] = None


# ==========================================================
# Notification (In-App)
# ==========================================================

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    user_id: str

    title: str

    message: str

    notification_type: CommunicationType

    metadata: Dict[str, Any] = Field(default_factory=dict)

    read: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    read_at: Optional[datetime] = None


# ==========================================================
# Email Template
# ==========================================================

class EmailTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    key: str

    subject: str

    template_file: str

    enabled: bool = True


# ==========================================================
# User Communication Preferences
# ==========================================================

class CommunicationPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email_enabled: bool = True

    push_enabled: bool = True

    in_app_enabled: bool = True

    birthday: bool = True

    event_created: bool = True

    event_updated: bool = True

    event_cancelled: bool = True

    event_postponed: bool = True

    event_restored: bool = True

    convocation: bool = True

    attendance: bool = True

    feedback: bool = True

    evaluation: bool = True

    payment: bool = True

    announcement: bool = True

    system: bool = True


# ==========================================================
# Club Communication Branding
# ==========================================================

class CommunicationBranding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    club_name: str

    logo_url: Optional[str] = None

    primary_color: str = "#0891b2"

    secondary_color: str = "#0f172a"

    accent_color: str = "#06b6d4"

    footer_text: Optional[str] = None

    website: Optional[str] = None

    facebook: Optional[str] = None

    instagram: Optional[str] = None
