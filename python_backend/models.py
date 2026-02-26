"""
Database Models
SQLAlchemy ORM models for users, sessions, and MFA
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    """User account model"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Null for OAuth users
    
    # Profile
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Email verification
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True)
    email_verification_expires = Column(DateTime, nullable=True)
    
    # MFA
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32), nullable=True)  # TOTP secret
    mfa_backup_codes = Column(Text, nullable=True)  # JSON array of backup codes
    
    # OAuth
    google_id = Column(String(255), nullable=True, unique=True)
    auth_provider = Column(String(50), default="email")  # email, google
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime, nullable=True)
    
    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    login_attempts = relationship("LoginAttempt", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"


class Session(Base):
    """User session for JWT refresh tokens"""
    __tablename__ = "sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    refresh_token = Column(String(500), unique=True, nullable=False)
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    
    is_valid = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now())
    last_used_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<Session {self.id[:8]}...>"


class LoginAttempt(Base):
    """Track login attempts for rate limiting"""
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    email = Column(String(255), nullable=False)
    ip_address = Column(String(50), nullable=True)
    
    success = Column(Boolean, default=False)
    failure_reason = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="login_attempts")


class OTPVerification(Base):
    """Store temporary OTP codes for MFA"""
    __tablename__ = "otp_verifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String(50), nullable=False)  # login, setup_mfa, reset_password
    
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Machine(Base):
    """Machine/Equipment for monitoring"""
    __tablename__ = "machines"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    machine_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    machine_type = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    
    # Current status
    health_score = Column(Float, default=100.0)
    predicted_rul = Column(Float, nullable=True)
    risk_level = Column(String(20), default="low")  # low, medium, high
    status = Column(String(20), default="healthy")  # healthy, warning, critical
    
    # Maintenance
    last_maintenance = Column(DateTime, nullable=True)
    next_scheduled = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    sensor_readings = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan")


class SensorReading(Base):
    """Sensor data from machines"""
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    
    temperature = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    
    # Prediction results
    predicted_rul = Column(Float, nullable=True)
    health_percentage = Column(Float, nullable=True)
    risk_level = Column(String(20), nullable=True)
    root_cause = Column(Text, nullable=True)
    
    timestamp = Column(DateTime, server_default=func.now())
    
    # Relationships
    machine = relationship("Machine", back_populates="sensor_readings")
