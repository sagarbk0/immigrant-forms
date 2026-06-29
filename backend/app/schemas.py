from datetime import datetime
from pydantic import BaseModel, EmailStr
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


class LeadPatch(BaseModel):
    state: LeadState


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
