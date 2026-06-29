import smtplib
from email.mime.text import MIMEText
import os
import anyio
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER") or os.getenv("SENDER_EMAIL")
EMAIL_PASS = os.getenv("EMAIL_PASS") or os.getenv("SENDER_PASS")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465

def _send_email_sync(to_email: str, subject: str, body: str):
    print(f"[MOCKED EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
    return

async def send_email(to_email: str, subject: str, body: str):
    # Run the blocking SMTP operations in a worker thread to keep FastAPI responsive
    try:
        await anyio.to_thread.run_sync(_send_email_sync, to_email, subject, body)
    except Exception as e:
        print(f"Async email task failed: {e}")
