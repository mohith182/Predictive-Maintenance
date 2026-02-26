"""
Authentication Routes
Sign up, login, MFA, Google OAuth, password reset
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from typing import Optional
import json
import httpx

from database import get_db
from models import User, Session, OTPVerification, LoginAttempt
from schemas import (
    SignUpRequest, LoginRequest, OTPVerifyRequest, GoogleAuthRequest,
    RefreshTokenRequest, PasswordResetRequest, PasswordResetConfirm,
    MFASetupRequest, MFADisableRequest,
    TokenResponse, MFARequiredResponse, MFASetupResponse, UserResponse,
    AuthResponse, MessageResponse
)
from auth import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token, decode_token,
    create_email_verification_token, verify_email_token,
    generate_mfa_secret, verify_otp, generate_mfa_qr_code,
    generate_backup_codes, generate_otp_code
)
from email_service import (
    send_verification_email, send_otp_email,
    send_password_reset_email, send_mfa_enabled_email
)
from config import settings


router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


# ====================
# Dependencies
# ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated"
        )
    
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# ====================
# Sign Up
# ====================

@router.post("/signup", response_model=MessageResponse)
async def signup(request: SignUpRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a new user account with email and password.
    Sends verification email after registration.
    """
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.email == request.email.lower())
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    is_valid, message = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Create verification token
    verification_token = create_email_verification_token(request.email)
    verification_expires = datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    
    # Create user (auto-verify in development mode)
    is_dev = settings.APP_ENV == "development"
    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        auth_provider="email",
        email_verification_token=verification_token,
        email_verification_expires=verification_expires,
        is_email_verified=is_dev  # Auto-verify in development
    )
    
    db.add(user)
    await db.commit()
    
    # Send verification email
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
    await send_verification_email(request.email, verification_link)
    
    return MessageResponse(
        message="Account created successfully. Please check your email to verify your account.",
        success=True
    )


# ====================
# Email Verification
# ====================

@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify email address using the token from email link"""
    email = verify_email_token(token)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    result = await db.execute(
        select(User).where(User.email == email.lower())
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_email_verified:
        return MessageResponse(message="Email already verified", success=True)
    
    # Verify token matches
    if user.email_verification_token != token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Update user
    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    await db.commit()
    
    return MessageResponse(
        message="Email verified successfully! You can now log in.",
        success=True
    )


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(email: str, db: AsyncSession = Depends(get_db)):
    """Resend email verification link"""
    result = await db.execute(
        select(User).where(User.email == email.lower())
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if user exists
        return MessageResponse(
            message="If an account exists with this email, a verification link will be sent.",
            success=True
        )
    
    if user.is_email_verified:
        return MessageResponse(message="Email already verified", success=True)
    
    # Generate new token
    verification_token = create_email_verification_token(email)
    verification_expires = datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    
    user.email_verification_token = verification_token
    user.email_verification_expires = verification_expires
    await db.commit()
    
    # Send email
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
    await send_verification_email(email, verification_link)
    
    return MessageResponse(
        message="Verification email sent. Please check your inbox.",
        success=True
    )


# ====================
# Login
# ====================

@router.post("/login")
async def login(
    request: LoginRequest,
    response: Response,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.
    Returns tokens if MFA is disabled, or MFA challenge if enabled.
    """
    # Find user
    result = await db.execute(
        select(User).where(User.email == request.email.lower())
    )
    user = result.scalar_one_or_none()
    
    # Record login attempt
    attempt = LoginAttempt(
        user_id=user.id if user else None,
        email=request.email,
        ip_address=req.client.host if req.client else None,
        success=False
    )
    
    if not user:
        attempt.failure_reason = "user_not_found"
        db.add(attempt)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not user.password_hash or not verify_password(request.password, user.password_hash):
        attempt.failure_reason = "invalid_password"
        db.add(attempt)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check email verification (skip in development mode)
    if not user.is_email_verified and settings.APP_ENV != "development":
        attempt.failure_reason = "email_not_verified"
        db.add(attempt)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email before logging in"
        )
    
    # Check if account is active
    if not user.is_active:
        attempt.failure_reason = "account_deactivated"
        db.add(attempt)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # If MFA is enabled, require OTP verification
    if user.mfa_enabled:
        # Generate OTP and send via email (or use TOTP app)
        otp_code = generate_otp_code()
        otp_expires = datetime.utcnow() + timedelta(seconds=settings.OTP_VALID_SECONDS)
        
        # Store OTP
        otp_record = OTPVerification(
            user_id=user.id,
            otp_code=otp_code,
            purpose="login",
            expires_at=otp_expires
        )
        db.add(otp_record)
        
        # Create temporary token for MFA verification
        temp_token = create_access_token(
            {"sub": user.id, "purpose": "mfa_verify"},
            timedelta(minutes=5)
        )
        
        await db.commit()
        
        # Send OTP via email
        await send_otp_email(user.email, otp_code, "login")
        
        return MFARequiredResponse(
            mfa_required=True,
            temp_token=temp_token,
            message="Please check your email for the verification code"
        )
    
    # No MFA - issue tokens directly
    attempt.success = True
    db.add(attempt)
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    
    # Create tokens
    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})
    
    # Store refresh token session
    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        device_info=req.headers.get("User-Agent"),
        ip_address=req.client.host if req.client else None,
        expires_at=datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    await db.commit()
    
    # Set HTTP-only cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_email_verified=user.is_email_verified,
            mfa_enabled=user.mfa_enabled,
            auth_provider=user.auth_provider,
            created_at=user.created_at
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )


# ====================
# MFA Verification
# ====================

@router.post("/verify-otp")
async def verify_otp_code(
    request: OTPVerifyRequest,
    response: Response,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Verify OTP code for MFA login"""
    # Verify temp token
    if not request.temp_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing temporary token"
        )
    
    payload = decode_token(request.temp_token)
    if not payload or payload.get("purpose") != "mfa_verify":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired temporary token"
        )
    
    user_id = payload.get("sub")
    
    # Find user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify OTP
    otp_result = await db.execute(
        select(OTPVerification).where(
            OTPVerification.user_id == user_id,
            OTPVerification.otp_code == request.otp_code,
            OTPVerification.purpose == "login",
            OTPVerification.is_used == False,
            OTPVerification.expires_at > datetime.utcnow()
        )
    )
    otp_record = otp_result.scalar_one_or_none()
    
    if not otp_record:
        # Also check TOTP if user has MFA secret
        if user.mfa_secret and verify_otp(user.mfa_secret, request.otp_code):
            pass  # Valid TOTP
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP code"
            )
    else:
        # Mark OTP as used
        otp_record.is_used = True
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    
    # Create tokens
    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})
    
    # Store session
    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        device_info=req.headers.get("User-Agent"),
        ip_address=req.client.host if req.client else None,
        expires_at=datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    await db.commit()
    
    # Set cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_email_verified=user.is_email_verified,
            mfa_enabled=user.mfa_enabled,
            auth_provider=user.auth_provider,
            created_at=user.created_at
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )


# ====================
# MFA Setup
# ====================

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize MFA setup - returns QR code and backup codes"""
    if user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    # Generate secret and backup codes
    secret = generate_mfa_secret()
    backup_codes = generate_backup_codes(10)
    
    # Store temporarily (not active until confirmed)
    user.mfa_secret = secret
    user.mfa_backup_codes = json.dumps(backup_codes)
    await db.commit()
    
    # Generate QR code
    qr_code = generate_mfa_qr_code(user.email, secret)
    
    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )


@router.post("/mfa/enable", response_model=MessageResponse)
async def enable_mfa(
    request: MFASetupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Confirm MFA setup by verifying OTP code"""
    if user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    if not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please initiate MFA setup first"
        )
    
    # Verify OTP
    if not verify_otp(user.mfa_secret, request.otp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code"
        )
    
    # Enable MFA
    user.mfa_enabled = True
    await db.commit()
    
    # Send confirmation email
    await send_mfa_enabled_email(user.email)
    
    return MessageResponse(
        message="Two-factor authentication has been enabled",
        success=True
    )


@router.post("/mfa/disable", response_model=MessageResponse)
async def disable_mfa(
    request: MFADisableRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disable MFA with password and OTP verification"""
    if not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    # Verify OTP
    if not verify_otp(user.mfa_secret, request.otp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code"
        )
    
    # Disable MFA
    user.mfa_enabled = False
    user.mfa_secret = None
    user.mfa_backup_codes = None
    await db.commit()
    
    return MessageResponse(
        message="Two-factor authentication has been disabled",
        success=True
    )


# ====================
# Token Refresh
# ====================

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = decode_token(request.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Verify session exists and is valid
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.refresh_token == request.refresh_token,
            Session.is_valid == True,
            Session.expires_at > datetime.utcnow()
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )
    
    # Create new tokens
    access_token = create_access_token({"sub": user.id, "email": user.email})
    new_refresh_token = create_refresh_token({"sub": user.id})
    
    # Update session
    session.refresh_token = new_refresh_token
    session.last_used_at = datetime.utcnow()
    session.expires_at = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    await db.commit()
    
    # Update cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


# ====================
# Logout
# ====================

@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user and invalidate session"""
    # Get refresh token from cookie or body
    refresh_token = request.cookies.get("refresh_token")
    
    if refresh_token:
        # Invalidate session
        await db.execute(
            update(Session)
            .where(Session.refresh_token == refresh_token)
            .values(is_valid=False)
        )
        await db.commit()
    
    # Clear cookie
    response.delete_cookie("refresh_token")
    
    return MessageResponse(message="Logged out successfully", success=True)


# ====================
# Google OAuth
# ====================

@router.post("/google")
async def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with Google OAuth"""
    try:
        # Verify Google ID token
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={request.credential}"
            )
        
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token"
            )
        
        google_data = google_response.json()
        
        # Verify audience
        if google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google client"
            )
        
        email = google_data.get("email")
        google_id = google_data.get("sub")
        name = google_data.get("name")
        picture = google_data.get("picture")
        
        # Find or create user
        result = await db.execute(
            select(User).where(
                (User.email == email.lower()) | (User.google_id == google_id)
            )
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update Google info
            user.google_id = google_id
            if not user.avatar_url:
                user.avatar_url = picture
        else:
            # Create new user
            user = User(
                email=email.lower(),
                google_id=google_id,
                full_name=name,
                avatar_url=picture,
                auth_provider="google",
                is_email_verified=True  # Google emails are verified
            )
            db.add(user)
        
        # Check MFA
        if user.mfa_enabled:
            otp_code = generate_otp_code()
            otp_expires = datetime.utcnow() + timedelta(seconds=settings.OTP_VALID_SECONDS)
            
            await db.commit()
            await db.refresh(user)
            
            otp_record = OTPVerification(
                user_id=user.id,
                otp_code=otp_code,
                purpose="login",
                expires_at=otp_expires
            )
            db.add(otp_record)
            
            temp_token = create_access_token(
                {"sub": user.id, "purpose": "mfa_verify"},
                timedelta(minutes=5)
            )
            await db.commit()
            
            await send_otp_email(user.email, otp_code, "login")
            
            return MFARequiredResponse(
                mfa_required=True,
                temp_token=temp_token,
                message="Please check your email for the verification code"
            )
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        
        # Create tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})
        
        # Store session
        session = Session(
            user_id=user.id,
            refresh_token=refresh_token,
            device_info=req.headers.get("User-Agent"),
            ip_address=req.client.host if req.client else None,
            expires_at=datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(session)
        await db.commit()
        
        # Set cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.APP_ENV == "production",
            samesite="lax",
            max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )
        
        return AuthResponse(
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                is_email_verified=user.is_email_verified,
                mfa_enabled=user.mfa_enabled,
                auth_provider=user.auth_provider,
                created_at=user.created_at
            ),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
        
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not verify Google token"
        )


# ====================
# User Profile
# ====================

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_email_verified=user.is_email_verified,
        mfa_enabled=user.mfa_enabled,
        auth_provider=user.auth_provider,
        created_at=user.created_at
    )
