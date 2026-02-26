"""
Email Service
Send verification emails, OTP codes, and alerts
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

from config import settings


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> dict:
    """
    Send an email using SMTP
    Returns: {"success": bool, "error": str | None}
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject
        
        # Attach text version (fallback)
        if text_content:
            message.attach(MIMEText(text_content, "plain"))
        
        # Attach HTML version
        message.attach(MIMEText(html_content, "html"))
        
        # Send email
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        
        return {"success": True, "error": None}
        
    except Exception as e:
        print(f"❌ Email send error: {str(e)}")
        return {"success": False, "error": str(e)}


def get_email_styles() -> str:
    """Get shared CSS styles for emails"""
    return """
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #0a0a0f;
            color: #ffffff;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            padding: 30px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: white;
            font-size: 28px;
        }
        .content {
            background-color: #1a1a2e;
            padding: 30px;
            border-radius: 0 0 12px 12px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .otp-box {
            background-color: #0f0f1a;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #3b82f6;
            font-family: monospace;
        }
        .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
        }
        .warning {
            background-color: #422006;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 15px 0;
            border-radius: 4px;
        }
    </style>
    """


async def send_verification_email(to_email: str, verification_link: str) -> dict:
    """Send email verification link"""
    
    subject = "Verify Your UptimeAI Account"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔧 UptimeAI</h1>
            </div>
            <div class="content">
                <h2>Welcome to UptimeAI!</h2>
                <p>Thank you for signing up. Please verify your email address to activate your account.</p>
                
                <p style="text-align: center;">
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                </p>
                
                <p style="color: #9ca3af; font-size: 14px;">
                    Or copy and paste this link into your browser:
                    <br>
                    <code style="color: #3b82f6; word-break: break-all;">{verification_link}</code>
                </p>
                
                <div class="warning">
                    <strong>⏱️ This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.</strong>
                </div>
                
                <p style="color: #6b7280; font-size: 12px;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} UptimeAI - AI-Powered Predictive Maintenance</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to UptimeAI!
    
    Please verify your email by clicking this link:
    {verification_link}
    
    This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.
    
    If you didn't create an account, ignore this email.
    """
    
    return await send_email(to_email, subject, html_content, text_content)


async def send_otp_email(to_email: str, otp_code: str, purpose: str = "login") -> dict:
    """Send OTP code for MFA verification"""
    
    purpose_text = {
        "login": "complete your login",
        "setup_mfa": "set up two-factor authentication",
        "reset_password": "reset your password"
    }.get(purpose, "verify your identity")
    
    subject = f"Your UptimeAI Verification Code: {otp_code}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Verification Code</h1>
            </div>
            <div class="content">
                <p>Use this code to {purpose_text}:</p>
                
                <div class="otp-box">
                    <div class="otp-code">{otp_code}</div>
                </div>
                
                <div class="warning">
                    <strong>⏱️ This code expires in {settings.OTP_VALID_SECONDS // 60} minutes.</strong>
                </div>
                
                <p style="color: #9ca3af; font-size: 14px;">
                    If you didn't request this code, please secure your account immediately.
                </p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} UptimeAI - AI-Powered Predictive Maintenance</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Your UptimeAI Verification Code
    
    Use this code to {purpose_text}:
    
    {otp_code}
    
    This code expires in {settings.OTP_VALID_SECONDS // 60} minutes.
    
    If you didn't request this code, secure your account immediately.
    """
    
    return await send_email(to_email, subject, html_content, text_content)


async def send_password_reset_email(to_email: str, reset_link: str) -> dict:
    """Send password reset link"""
    
    subject = "Reset Your UptimeAI Password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔑 Password Reset</h1>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password. Click the button below to create a new password.</p>
                
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </p>
                
                <div class="warning">
                    <strong>⏱️ This link expires in 1 hour.</strong>
                </div>
                
                <p style="color: #6b7280; font-size: 12px;">
                    If you didn't request a password reset, you can safely ignore this email.
                    Your password will remain unchanged.
                </p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} UptimeAI - AI-Powered Predictive Maintenance</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, subject, html_content)


async def send_mfa_enabled_email(to_email: str) -> dict:
    """Notify user that MFA has been enabled"""
    
    subject = "Two-Factor Authentication Enabled - UptimeAI"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>{get_email_styles()}</head>
    <body>
        <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #10b981, #059669);">
                <h1>✅ MFA Enabled</h1>
            </div>
            <div class="content">
                <h2>Two-Factor Authentication is Now Active</h2>
                <p>Your account security has been enhanced! You'll now need to enter a verification code each time you log in.</p>
                
                <p style="color: #10b981;">
                    <strong>🔒 Your account is now more secure.</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 14px;">
                    Make sure to keep your backup codes in a safe place in case you lose access to your authenticator app.
                </p>
                
                <div class="warning">
                    <strong>⚠️ If you didn't enable MFA, contact support immediately.</strong>
                </div>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} UptimeAI - AI-Powered Predictive Maintenance</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, subject, html_content)
