# backend/app/email.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

# Defaults configured for Zoho ZeptoMail EU Data Center
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.zeptomail.eu")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "emailapikey")
SMTP_PASSWORD = os.getenv(
    "SMTP_PASSWORD",
    "yA6KbHtb7Vqlw2hQFUFo1cCJodk3/f9q3Hngti/hL80jfoXkiaE71xBvKtvuJ2PSi9eEsqNUY90QcoC/7NpZLZMyMNJQKpTGTuv4P2uV48xh8ciEYNYljJWsAbATEq5PdhwgCC83R/UiWA=="
)
EMAIL_FROM = os.getenv("EMAIL_FROM", "rafapp@rafapp.is")

def send_password_reset_email(to_email: str, reset_link: str, user_name: str = "Notandi") -> bool:
    """
    Sends a high-priority, branded password reset email via ZeptoMail / SMTP.
    """
    subject = "RafApp — Endursetning lykilorðs / Password Reset Request"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 40px; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }}
            .logo {{ font-size: 24px; font-weight: 900; color: #6366f1; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 24px; display: inline-block; }}
            h1 {{ font-size: 18px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }}
            p {{ font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; padding: 16px 32px; border-radius: 14px; margin: 16px 0; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); }}
            .btn:hover {{ background-color: #4338ca; }}
            .footer {{ border-top: 1px solid #334155; margin-top: 32px; pt: 20px; font-size: 11px; color: #64748b; text-align: center; }}
            .warning {{ background: #451a03; border: 1px solid #78350f; border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #fcd34d; margin-top: 24px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">⚡ RAFAPP</div>
            <h1>Endursetning lykilorðs / Password Reset</h1>
            <p>Sæll/sæl {user_name},</p>
            <p>Fyrirspurn barst um að endursetja lykilorð að aðgangi þínum í RafApp. Smelltu á hnappinn hér fyrir neðan til að velja nýtt lykilorð:</p>
            <p style="text-align: center;">
                <a href="{reset_link}" class="btn">Endursetja lykilorð / Reset Password</a>
            </p>
            <p style="font-size: 12px; color: #94a3b8;">
                Einnig er hægt að afrita þennan tengil í vafrann þinn:<br>
                <a href="{reset_link}" style="color: #818cf8; word-break: break-all;">{reset_link}</a>
            </p>
            <div class="warning">
                ⏱️ <strong>Öryggisathugasemd:</strong> Þessi hlekkur gildir í 30 mínútur. Ef þú baðst ekki um þessa endursetningu geturðu leyft hlekknum að renna út án þess að breyta neinu.
            </div>
            <div class="footer">
                © {os.getenv('APP_NAME', 'RafApp')} · Rafverktakakerfi Íslands · support@rafapp.is
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"RafApp <{EMAIL_FROM}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        logger.info(f"Attempting SMTP email dispatch via {SMTP_HOST}:{SMTP_PORT} to {to_email}")
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, [to_email], msg.as_string())
        logger.info(f"Successfully dispatched password reset email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP dispatch failed to {to_email}: {e}")
        return False
