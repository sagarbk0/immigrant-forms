from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, field_serializer
from app.models import LeadState


class LeadOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    resume_filename: str
    state: LeadState
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: datetime) -> str:
        # Timestamps are stored as naive UTC (SQLite drops tzinfo). Mark them as
        # UTC on the way out so the browser's new Date() parses them correctly
        # instead of assuming local time.
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class LeadPatch(BaseModel):
    state: LeadState


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
