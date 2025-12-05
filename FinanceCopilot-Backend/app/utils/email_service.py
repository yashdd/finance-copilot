"""Email service for sending verification emails"""
import os
from typing import Optional


class EmailService:
    """Service for sending emails (placeholder - integrate with actual email service)"""
    
    @staticmethod
    def send_verification_email(email: str, verification_token: str) -> bool:
        """
        Send email verification email
        
        In production, integrate with:
        - SendGrid
        - AWS SES
        - Mailgun
        - SMTP server
        
        For now, this is a placeholder that prints the verification link
        """
        verification_url = f"{os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')}/verify-email?token={verification_token}"
        
        # TODO: Implement actual email sending
        # For development, print the verification link
        print(f"\n{'='*60}")
        print(f"EMAIL VERIFICATION LINK (Development Mode)")
        print(f"{'='*60}")
        print(f"To: {email}")
        print(f"Verification Link: {verification_url}")
        print(f"Token: {verification_token}")
        print(f"{'='*60}\n")
        
        # In production, uncomment and configure:
        # import smtplib
        # from email.mime.text import MIMEText
        # from email.mime.multipart import MIMEMultipart
        # 
        # msg = MIMEMultipart()
        # msg['From'] = os.getenv('EMAIL_FROM')
        # msg['To'] = email
        # msg['Subject'] = "Verify your FinanceCopilot account"
        # 
        # body = f"""
        # Please click the following link to verify your email:
        # {verification_url}
        # """
        # msg.attach(MIMEText(body, 'plain'))
        # 
        # server = smtplib.SMTP(os.getenv('SMTP_HOST'), os.getenv('SMTP_PORT'))
        # server.starttls()
        # server.login(os.getenv('SMTP_USER'), os.getenv('SMTP_PASSWORD'))
        # server.send_message(msg)
        # server.quit()
        
        return True
    
    @staticmethod
    def send_password_reset_email(email: str, reset_token: str) -> bool:
        """Send password reset email (for future implementation)"""
        reset_url = f"{os.getenv('FRONTEND_ORIGIN', 'http://localhost:3000')}/reset-password?token={reset_token}"
        
        print(f"\n{'='*60}")
        print(f"PASSWORD RESET LINK (Development Mode)")
        print(f"{'='*60}")
        print(f"To: {email}")
        print(f"Reset Link: {reset_url}")
        print(f"{'='*60}\n")
        
        return True


