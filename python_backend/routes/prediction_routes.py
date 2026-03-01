"""
Prediction Routes
ML-based Health Status and RUL prediction endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import List
import logging

from database import get_db
from models import User, Machine, SensorReading
from schemas import (
    PredictionRequest, PredictionResponse, BatchPredictionRequest,
    MessageResponse
)
from routes.auth_routes import get_current_user, get_optional_user
from health_predictor import predict_health, get_model_status as get_health_model_status, predict_batch
from config import settings

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api", tags=["Predictions"])


@router.post("/predict", response_model=PredictionResponse)
async def make_prediction(
    request: PredictionRequest,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Make a prediction based on sensor readings.
    
    Input:
    - vibration: Vibration level (mm/s) - Range: 0-20
    - temperature: Temperature (°C) - Range: -50 to 200
    - current: Electrical current (A) - Range: 0-50
    - pressure: Optional pressure (PSI) - Range: 0-300
    - runtime_hours: Optional runtime hours - Range: 0+
    - machine_id: Optional machine identifier
    
    Output:
    - health_status: NORMAL/WARNING/CRITICAL
    - predicted_rul: Remaining Useful Life (cycles)
    - confidence_score: Model confidence (0-1)
    - health_percentage: Health score (0-100%)
    - risk_level: low/warning/critical
    - root_cause: Explanation of potential issues
    """
    # Enhanced input validation and sanitization
    from input_validation import validate_sensor_input
    
    try:
        temperature, vibration, current, pressure, runtime_hours, cycle = validate_sensor_input(
            temperature=request.temperature,
            vibration=request.vibration,
            current=request.current,
            pressure=getattr(request, 'pressure', 100.0) or 100.0,
            runtime_hours=getattr(request, 'runtime_hours', 0) or 0,
            cycle=getattr(request, 'cycle', None),
            strict=False  # Clamp instead of error for production resilience
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Input validation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid sensor input values"
        )
    
    # Run prediction with validated inputs
    try:
        result = predict_health(
            temperature=temperature,
            vibration=vibration,
            current=current,
            pressure=pressure,
            runtime_hours=runtime_hours,
            cycle=cycle  # Pass cycle if available
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction service unavailable"
        )
    
    # Map new result format to response
    predicted_rul = result["predicted_rul"]
    health_percentage = result["health_percentage"]
    health_status = result["health_status"]
    
    # Determine risk_level from health_status
    risk_level = "low" if health_status == "NORMAL" else health_status.lower()
    
    # Store reading if machine_id provided and user authenticated
    if request.machine_id and user:
        # Find machine
        machine_result = await db.execute(
            select(Machine).where(Machine.machine_id == request.machine_id)
        )
        machine = machine_result.scalar_one_or_none()
        
        if machine:
            # Create sensor reading record
            reading = SensorReading(
                machine_id=machine.id,
                temperature=request.temperature,
                vibration=request.vibration,
                current=request.current,
                predicted_rul=predicted_rul,
                health_percentage=health_percentage,
                risk_level=risk_level,
                root_cause=result["root_cause"]
            )
            db.add(reading)
            
            # Update machine status
            machine.health_score = health_percentage
            machine.predicted_rul = predicted_rul
            machine.risk_level = risk_level
            machine.status = (
                "healthy" if health_status == "NORMAL"
                else "warning" if health_status == "WARNING"
                else "critical"
            )
            machine.updated_at = datetime.utcnow()
            
            await db.commit()
    
    return PredictionResponse(
        predicted_RUL=predicted_rul,
        health_percentage=health_percentage,
        risk_level=risk_level,
        root_cause=result["root_cause"],
        confidence=result["confidence_score"],
        timestamp=datetime.fromisoformat(result["timestamp"]),
        health_status=health_status
    )


@router.post("/predict/batch", response_model=List[PredictionResponse])
async def make_batch_prediction(
    request: BatchPredictionRequest,
    user: User = Depends(get_optional_user)
):
    """
    Make predictions for multiple sensor readings.
    Returns a list of predictions.
    """
    if len(request.readings) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 readings per batch"
        )
    
    readings_data = [
        {
            "vibration": r.vibration,
            "temperature": r.temperature,
            "current": r.current,
            "pressure": getattr(r, 'pressure', 100.0) or 100.0,
            "runtime_hours": getattr(r, 'runtime_hours', 0) or 0
        }
        for r in request.readings
    ]
    
    results = predict_batch(readings_data)
    
    return [
        PredictionResponse(
            health_status=r["health_status"],
            predicted_RUL=r["predicted_rul"],
            health_percentage=r["health_percentage"],
            risk_level="low" if r["health_status"] == "NORMAL" else r["health_status"].lower(),
            root_cause=r["root_cause"],
            confidence=r["confidence_score"],
            timestamp=datetime.fromisoformat(r["timestamp"])
        )
        for r in results
    ]


@router.post("/model/train", response_model=MessageResponse)
async def retrain_model(
    user: User = Depends(get_current_user)
):
    """
    Retrain the ML model.
    Admin only endpoint.
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        metrics = train_model()
        return MessageResponse(
            message=f"Model trained successfully. R²: {metrics['r2']:.3f}, MAE: {metrics['mae']:.2f}",
            success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


@router.get("/model/status")
async def get_model_status():
    """Get current model status with detailed metrics"""
    model_status = get_health_model_status()
    return model_status
