import logging
from typing import Protocol
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService(Protocol):
    def send(self, to: str, subject: str, body: str) -> None:
        ...


class ConsoleEmailService:
    def send(self, to: str, subject: str, body: str) -> None:
        logger.info(
            "\n" + "=" * 60 + "\n"
            f"TO:      {to}\n"
            f"SUBJECT: {subject}\n"
            f"BODY:\n{body}\n"
            + "=" * 60
        )


# TODO: SMTPEmailService — implement send() using smtplib or httpx against
# Resend/SendGrid when EMAIL_BACKEND=smtp is set in env.


def get_email_service() -> EmailService:
    if settings.email_backend == "smtp":
        raise NotImplementedError("SMTPEmailService not yet implemented")
    return ConsoleEmailService()


def send_prospect_confirmation(lead) -> None:
    svc = get_email_service()
    try:
        svc.send(
            to=lead.email,
            subject="We received your application",
            body=(
                f"Hi {lead.first_name},\n\n"
                "Thank you for submitting your information. "
                "An attorney will review your case and reach out to you soon.\n\n"
                "Best regards,\nAlma"
            ),
        )
    except Exception:
        logger.exception("Failed to send prospect confirmation email")


def send_attorney_notification(lead, attorney_email: str) -> None:
    svc = get_email_service()
    try:
        svc.send(
            to=attorney_email,
            subject=f"New lead: {lead.first_name} {lead.last_name}",
            body=(
                f"A new lead has been submitted.\n\n"
                f"Name:  {lead.first_name} {lead.last_name}\n"
                f"Email: {lead.email}\n"
                f"Resume file: {lead.resume_filename}\n"
                f"Lead ID: {lead.id}\n\n"
                "Log in to the internal dashboard to review."
            ),
        )
    except Exception:
        logger.exception("Failed to send attorney notification email")
