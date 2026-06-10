import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

logger = logging.getLogger(__name__)

def send_email_sync(to_email: str, subject: str, body: str, is_html: bool = False):
    settings = get_settings()
    
    if not settings.smtp_host:
        logger.warning(f"SMTP not configured. Mock sending email to {to_email}: {subject}")
        return False
        
    msg = MIMEMultipart()
    msg['From'] = settings.smtp_from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'html' if is_html else 'plain', 'utf-8'))
    
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {to_email}")
            return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
