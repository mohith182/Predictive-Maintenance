"""
Authentication Utilities
Password hashing, JWT tokens, OTP generation
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
import string

from passlib.context import CryptContext
from jose import jwt, JWTError
import pyotp
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64

from config import settings


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ====================
# Password Functions
# ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets requirements:
    - At least 8 characters
    - Contains uppercase and lowercase
    - Contains a number
    - Contains a special character
    """
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is valid"


# ====================
# JWT Token Functions
# ====================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": secrets.token_urlsafe(32)  # Unique token ID
    })
    
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def create_email_verification_token(email: str) -> str:
    """Create a token for email verification"""
    data = {
        "email": email,
        "purpose": "email_verification"
    }
    expires = timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    return create_access_token(data, expires)


def verify_email_token(token: str) -> Optional[str]:
    """Verify email verification token and return email"""
    payload = decode_token(token)
    if payload and payload.get("purpose") == "email_verification":
        return payload.get("email")
    return None


# ====================
# MFA / OTP Functions
# ====================

def generate_mfa_secret() -> str:
    """Generate a new TOTP secret for MFA"""
    return pyotp.random_base32()


def get_totp(secret: str) -> pyotp.TOTP:
    """Get TOTP object for a secret"""
    return pyotp.TOTP(secret, interval=30)


def verify_otp(secret: str, otp_code: str) -> bool:
    """Verify an OTP code against the user's secret"""
    totp = get_totp(secret)
    # Allow 1 window before/after for clock drift
    return totp.verify(otp_code, valid_window=1)


def generate_otp(secret: str) -> str:
    """Generate current OTP for a secret"""
    totp = get_totp(secret)
    return totp.now()


def generate_mfa_qr_code(email: str, secret: str) -> str:
    """Generate QR code for MFA setup, returns base64 PNG"""
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=email,
        issuer_name=settings.OTP_ISSUER_NAME
    )
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4
    )
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate backup codes for MFA recovery"""
    codes = []
    for _ in range(count):
        # Generate 8-character alphanumeric codes
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        # Format as XXXX-XXXX
        codes.append(f"{code[:4]}-{code[4:]}")
    return codes


# ====================
# Utility Functions
# ====================

def generate_random_token(length: int = 32) -> str:
    """Generate a random URL-safe token"""
    return secrets.token_urlsafe(length)


def generate_otp_code() -> str:
    """Generate a 6-digit numeric OTP code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))
