import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from fastapi import HTTPException

from app.core.config import settings
from app.models.models import Offer

logger = logging.getLogger(__name__)

async def send_offer_email(offer: Offer, custom_message: str | None = None) -> bool:
    """Send an offer link to the client via SMTP (Gmail) with the Wally HTML template."""
    
    if not offer.client or not offer.client.email:
        raise ValueError("Offer client email is missing.")

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error("SMTP credentials (USER/PASSWORD) are not configured.")
        raise HTTPException(
            status_code=500,
            detail="Brak skonfigurowanych danych SMTP. Funkcja wysyłania e-maili jest niedostępna."
        )

    offer_url = f"{settings.OFFER_PUBLIC_BASE_URL.rstrip('/')}/offer/{offer.token}"
    logo_url = f"{settings.OFFER_PUBLIC_BASE_URL.rstrip('/')}/wally_logo.svg"
    sender_name = offer.user.full_name if (offer.user and offer.user.full_name) else settings.COMPANY_NAME
    
    subject = f"Odpowiedź na zapytanie ofertowe - {settings.COMPANY_NAME}"
    if offer.title:
        subject += f" ({offer.title})"

    # Clean multi-line custom message for HTML output
    custom_message_html = ""
    if custom_message:
        paragraphs = custom_message.strip().split('\n')
        msg_parts = "".join([f"<p>{p}</p>" for p in paragraphs if p.strip()])
        custom_message_html = f"""
        <div style="background-color: #f8fafc; border-left: 4px solid #84cc16; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin-top: 0; font-weight: 600; color: #334155;">Wiadomość od opiekuna:</p>
            <div style="color: #475569; font-size: 15px;">
                {msg_parts}
            </div>
        </div>
        """

    # HTML Email Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Oferta PrintFlow</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }}
            .header {{ background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #e2e8f0; }}
            .header img {{ max-height: 60px; max-width: 200px; }}
            .content {{ padding: 40px; }}
            .greeting {{ font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #1e293b; }}
            .btn-wrapper {{ text-align: center; margin: 32px 0; }}
            .btn {{ display: inline-block; background-color: #84cc16; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; transition: background-color 0.2s; }}
            .footer {{ background-color: #f8fafc; padding: 24px 40px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{logo_url}" alt="Wally Logo">
            </div>
            
            <div class="content">
                <div class="greeting">Dzień dobry,</div>
                
                <p>Przesyłamy odpowiedź na Państwa ostatnie zapytanie ofertowe.</p>
                
                {custom_message_html}
                
                <p>Przygotowaliśmy szczegółową wycenę dostępną pod poniższym przyciskiem. Na stronie oferty można zapoznać się ze wszystkimi wariantami i szczegółami zamówienia.</p>
                
                <div class="btn-wrapper">
                    <a href="{offer_url}" class="btn">Zobacz ofertę online</a>
                </div>
                
                <p style="margin-top: 32px; margin-bottom: 0;">Pozdrawiamy,<br><strong>Zespół {settings.COMPANY_NAME}</strong></p>
                <p style="margin-top: 4px; font-size: 14px; color: #64748b;">Opiekun: {sender_name}</p>
            </div>
            
            <div class="footer">
                Ta wiadomość została wygenerowana automatycznie przez system PrintFlow.<br>
                Prosimy o przejrzenie oferty i, w razie akceptacji, potwierdzenie jej bezpośrednio na stronie.
            </div>
        </div>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message['From'] = settings.EMAIL_FROM or settings.SMTP_USER
    message['To'] = offer.client.email
    message['Subject'] = subject
    
    if settings.COMPANY_EMAIL:
        message['Reply-To'] = settings.COMPANY_EMAIL

    message.attach(MIMEText(html_content, 'html'))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=settings.SMTP_SECURE,
            start_tls=not settings.SMTP_SECURE if settings.SMTP_PORT == 587 else False,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        
        logger.info(f"Offer {offer.id} email sent successfully via SMTP to {offer.client.email}")
        return True
    except Exception as e:
        logger.error(f"An error occurred sending email via SMTP: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Błąd wysyłania e-maila przez SMTP: {str(e)}"
        )


async def send_order_email(*args, **kwargs):
    print("Async sending order email...", args, kwargs)

async def send_followup_email(*args, **kwargs):
    print("Async sending followup email...", args, kwargs)
