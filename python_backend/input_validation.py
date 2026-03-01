"""
Input Validation Utilities for ML Predictions
Production-ready validation with proper error handling
"""

import math
from typing import Tuple, Optional
from fastapi import HTTPException, status


# Realistic sensor value ranges
SENSOR_RANGES = {
    "temperature": {"min": -50, "max": 200, "unit": "°C"},
    "vibration": {"min": 0, "max": 20, "unit": "mm/s"},
    "current": {"min": 0, "max": 50, "unit": "A"},
    "pressure": {"min": 0, "max": 300, "unit": "PSI"},
    "runtime_hours": {"min": 0, "max": 100000, "unit": "hours"},
    "cycle": {"min": 0, "max": 1000, "unit": "cycles"},
}


def validate_sensor_input(
    temperature: float,
    vibration: float,
    current: float,
    pressure: Optional[float] = None,
    runtime_hours: Optional[int] = None,
    cycle: Optional[int] = None,
    strict: bool = True
) -> Tuple[float, float, float, float, int, Optional[int]]:
    """
    Validate and sanitize sensor inputs for ML prediction.
    
    Args:
        temperature: Temperature in °C
        vibration: Vibration in mm/s
        current: Current in A
        pressure: Optional pressure in PSI
        runtime_hours: Optional runtime hours
        cycle: Optional cycle number
        strict: If True, raise errors on invalid values. If False, clamp to ranges.
    
    Returns:
        Tuple of validated (temperature, vibration, current, pressure, runtime_hours, cycle)
    
    Raises:
        HTTPException: If validation fails and strict=True
    """
    errors = []
    
    # Check for NaN or Infinity
    values_to_check = [
        ("temperature", temperature),
        ("vibration", vibration),
        ("current", current),
    ]
    
    if pressure is not None:
        values_to_check.append(("pressure", pressure))
    if runtime_hours is not None:
        values_to_check.append(("runtime_hours", float(runtime_hours)))
    if cycle is not None:
        values_to_check.append(("cycle", float(cycle)))
    
    for name, value in values_to_check:
        if not isinstance(value, (int, float)):
            errors.append(f"{name} must be a number")
            continue
        
        if math.isnan(value):
            errors.append(f"{name} cannot be NaN")
        elif math.isinf(value):
            errors.append(f"{name} cannot be Infinity")
    
    if errors and strict:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": errors, "message": "Invalid sensor values detected"}
        )
    
    # Validate ranges
    validated_temp = _validate_range(
        "temperature", temperature, 
        SENSOR_RANGES["temperature"], strict
    )
    validated_vib = _validate_range(
        "vibration", vibration,
        SENSOR_RANGES["vibration"], strict
    )
    validated_curr = _validate_range(
        "current", current,
        SENSOR_RANGES["current"], strict
    )
    
    validated_pressure = pressure
    if pressure is not None:
        validated_pressure = _validate_range(
            "pressure", pressure,
            SENSOR_RANGES["pressure"], strict
        )
    else:
        validated_pressure = 100.0  # Default
    
    validated_runtime = runtime_hours or 0
    if runtime_hours is not None:
        validated_runtime = int(_validate_range(
            "runtime_hours", runtime_hours,
            SENSOR_RANGES["runtime_hours"], strict
        ))
    
    validated_cycle = cycle
    if cycle is not None:
        validated_cycle = int(_validate_range(
            "cycle", cycle,
            SENSOR_RANGES["cycle"], strict
        ))
    
    return (
        validated_temp,
        validated_vib,
        validated_curr,
        validated_pressure,
        validated_runtime,
        validated_cycle
    )


def _validate_range(
    name: str,
    value: float,
    range_config: dict,
    strict: bool
) -> float:
    """Validate a single value against its range"""
    min_val = range_config["min"]
    max_val = range_config["max"]
    unit = range_config.get("unit", "")
    
    if value < min_val or value > max_val:
        if strict:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{name} must be between {min_val} and {max_val} {unit}"
            )
        else:
            # Clamp to range
            return max(min_val, min(max_val, value))
    
    return value


def validate_health_calculation(
    predicted_rul: float,
    initial_rul: float = 150.0
) -> float:
    """
    Validate and calculate health percentage.
    
    Formula: Health = (Predicted_RUL / Initial_RUL) * 100
    
    Args:
        predicted_rul: Predicted remaining useful life
        initial_rul: Initial/maximum RUL (default 150)
    
    Returns:
        Health percentage (0-100)
    """
    if initial_rul <= 0:
        raise ValueError("Initial RUL must be greater than 0")
    
    if predicted_rul < 0:
        predicted_rul = 0
    if predicted_rul > initial_rul:
        predicted_rul = initial_rul
    
    health = (predicted_rul / initial_rul) * 100
    return max(0, min(100, health))  # Clamp to 0-100


def get_alert_status(health_percentage: float) -> str:
    """
    Determine alert status based on health percentage.
    
    Rules:
    - Health > 70% → Healthy
    - 40% ≤ Health ≤ 70% → Warning
    - Health < 40% → Critical
    """
    if health_percentage > 70:
        return "Healthy"
    elif health_percentage >= 40:
        return "Warning"
    else:
        return "Critical"


