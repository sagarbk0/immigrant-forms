import os
import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import EmailStr, ValidationError as PydanticValidationError
from app.database import get_db
from app.models import Lead, LeadState
from app.schemas import LeadOut, LeadPatch
from app.auth import get_current_user
from app.config import settings
from app.email_service import send_prospect_confirmation, send_attorney_notification

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _validate_email(email: str) -> str:
    try:
        from pydantic import TypeAdapter
        TypeAdapter(EmailStr).validate_python(email)
    except PydanticValidationError:
        raise HTTPException(status_code=400, detail="Invalid email address")
    return email


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not first_name.strip():
        raise HTTPException(status_code=400, detail="first_name is required")
    if not last_name.strip():
        raise HTTPException(status_code=400, detail="last_name is required")

    _validate_email(email)

    ext = Path(resume.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Resume must be one of {ALLOWED_EXTENSIONS}")

    contents = await resume.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Resume must be under 5 MB")

    lead_id = str(uuid.uuid4())
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{lead_id}{ext}"
    file_path.write_bytes(contents)

    lead = Lead(
        id=lead_id,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        email=email.strip(),
        resume_filename=resume.filename,
        resume_path=str(file_path),
        state=LeadState.PENDING,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    send_prospect_confirmation(lead)
    send_attorney_notification(lead, settings.attorney_email)

    return lead


@router.get("", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return db.query(Lead).order_by(Lead.created_at.desc()).all()


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: str, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: str,
    body: LeadPatch,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.state = body.state
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/{lead_id}/resume")
def download_resume(lead_id: str, db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not os.path.exists(lead.resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")
    return FileResponse(
        path=lead.resume_path,
        filename=lead.resume_filename,
        media_type="application/octet-stream",
    )
