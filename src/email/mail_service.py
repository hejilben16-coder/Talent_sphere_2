import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from src.config import SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL

def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"[Email Service] SMTP credentials not configured. Simulated sending email to {to_email} subject: '{subject}'")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email Service Error] Failed to send email to {to_email}: {e}")
        return False

def send_student_welcome_email(to_email: str, student_name: str, temp_pass: str) -> bool:
    subject = "Welcome to Talent Sphere AI - Account Credentials"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Welcome to Talent Sphere AI, {student_name}!</h2>
        <p>Your student account has been created successfully. You can now access your personalized AI learning portal.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login Email:</strong> {to_email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">{temp_pass}</code></p>
        </div>
        <p>Please log in and update your password immediately.</p>
        <br>
        <p style="color: #6b7280; font-size: 0.9em;">Talent Sphere AI Platform Administration</p>
    </div>
    """
    return send_email(to_email, subject, html_body)

def send_exam_notification_email(to_email: str, student_name: str, exam_title: str, due_date: str) -> bool:
    subject = f"New Exam Assigned: {exam_title}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">New Assessment Assigned</h2>
        <p>Hello {student_name},</p>
        <p>A new exam <strong>{exam_title}</strong> has been assigned to you on Talent Sphere AI.</p>
        <p><strong>Due Date:</strong> {due_date}</p>
        <p>Log in to your student dashboard to attempt the assessment.</p>
        <br>
        <p style="color: #6b7280; font-size: 0.9em;">Talent Sphere AI Platform Administration</p>
    </div>
    """
    return send_email(to_email, subject, html_body)
