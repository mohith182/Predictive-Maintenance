"""
Pydantic Schemas
Request and Response models for API validation
"""

from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Helper to convert snake_case to camelCase
def to_camel(string: str) -> str:
    parts = string.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])


# Base config for camelCase output
class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


# ====================
# Enums
# ====================

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    WARNING = "warning"
    CRITICAL = "critical"


class MachineStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"


class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"


# ====================
# Auth Schemas
# ====================

class SignUpRequest(BaseModel):
    """Sign up with email and password"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain an uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain a lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain a number')
        return v


class LoginRequest(BaseModel):
    """Login with email and password"""
    email: EmailStr
    password: str


class OTPVerifyRequest(BaseModel):
    """Verify OTP code for MFA"""
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    temp_token: Optional[str] = None  # Temporary token from initial login


class GoogleAuthRequest(BaseModel):
    """Google OAuth callback"""
    credential: str  # Google ID token


class RefreshTokenRequest(BaseModel):
    """Refresh access token"""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Request password reset"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with new password"""
    token: str
    new_password: str = Field(..., min_length=8)


class MFASetupRequest(BaseModel):
    """Initial MFA setup confirmation"""
    otp_code: str = Field(..., min_length=6, max_length=6)


class MFADisableRequest(BaseModel):
    """Disable MFA with password confirmation"""
    password: str
    otp_code: str = Field(..., min_length=6, max_length=6)


# ====================
# Auth Response Schemas
# ====================

class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class MFARequiredResponse(BaseModel):
    """Response when MFA verification is needed"""
    mfa_required: bool = True
    temp_token: str
    message: str = "Please enter your MFA code"


class MFASetupResponse(BaseModel):
    """Response for MFA setup"""
    secret: str
    qr_code: str  # Base64 encoded QR code image
    backup_codes: List[str]


class UserResponse(BaseModel):
    """User profile response"""
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_email_verified: bool
    mfa_enabled: bool
    auth_provider: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Full authentication response"""
    user: UserResponse
    tokens: TokenResponse


class MessageResponse(BaseModel):
    """Simple message response"""
    message: str
    success: bool = True


# ====================
# ML Prediction Schemas
# ====================

class PredictionRequest(BaseModel):
    """Sensor data for prediction"""
    vibration: float = Field(..., ge=0, le=20, description="Vibration in mm/s (0-20)")
    temperature: float = Field(..., ge=-50, le=200, description="Temperature in °C (-50 to 200)")
    current: float = Field(..., ge=0, le=50, description="Current in A (0-50)")
    pressure: Optional[float] = Field(default=100.0, ge=0, le=300, description="Pressure in PSI (0-300)")
    runtime_hours: Optional[int] = Field(default=0, ge=0, le=100000, description="Runtime hours (0-100000)")
    cycle: Optional[int] = Field(default=None, ge=0, le=1000, description="Current cycle number (0-1000)")
    machine_id: Optional[str] = None


class PredictionResponse(BaseModel):
    """ML prediction result"""
    health_status: str = Field(default="NORMAL", description="NORMAL, WARNING, or CRITICAL")
    predicted_RUL: float
    health_percentage: float
    risk_level: RiskLevel
    root_cause: str
    confidence: float
    timestamp: datetime


class BatchPredictionRequest(BaseModel):
    """Multiple sensor readings for batch prediction"""
    readings: List[PredictionRequest]


# ====================
# Machine Schemas
# ====================

class SensorReadingSchema(CamelModel):
    """Sensor reading data"""
    timestamp: datetime
    temperature: float
    vibration: float
    current: float
    health_score: Optional[float] = None


class MachineBase(CamelModel):
    """Base machine schema"""
    machine_id: str
    name: str
    machine_type: Optional[str] = None
    location: Optional[str] = None


class MachineCreate(MachineBase):
    """Create new machine"""
    pass


class MachineResponse(MachineBase):
    """Machine with status"""
    id: str
    health_score: float
    predicted_rul: Optional[float]
    risk_level: RiskLevel
    status: MachineStatus
    last_maintenance: Optional[datetime]
    next_scheduled: Optional[datetime]
    sensor_history: Optional[List[SensorReadingSchema]] = None
    root_cause: Optional[str] = None


class FleetSummary(CamelModel):
    """Fleet overview statistics"""
    total: int
    healthy: int
    warning: int
    critical: int
    avg_health: float


class AlertSchema(CamelModel):
    """Alert notification"""
    id: str
    machine_id: str
    machine_name: str
    severity: str  # warning, critical
    message: str
    timestamp: datetime
    acknowledged: bool = False


# ====================
# Dashboard Schemas
# ====================

class DashboardData(BaseModel):
    """Complete dashboard data"""
    fleet_summary: FleetSummary
    machines: List[MachineResponse]
    alerts: List[AlertSchema]
    recent_predictions: List[PredictionResponse]
