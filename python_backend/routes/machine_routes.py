"""
Machine Routes
Endpoints for machine management and monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timedelta
from typing import List, Optional
import random
import math

from database import get_db
from models import User, Machine, SensorReading
from schemas import (
    MachineCreate, MachineResponse, FleetSummary, AlertSchema,
    SensorReadingSchema, MessageResponse
)
from routes.auth_routes import get_current_user, get_optional_user
from ml_model import predict_rul
from config import settings


router = APIRouter(prefix="/api", tags=["Machines"])


def _to_camel_case(data: dict) -> dict:
    """Convert snake_case keys to camelCase recursively"""
    def convert_key(key: str) -> str:
        parts = key.split('_')
        return parts[0] + ''.join(word.capitalize() for word in parts[1:])
    
    result = {}
    for key, value in data.items():
        new_key = convert_key(key)
        if isinstance(value, dict):
            result[new_key] = _to_camel_case(value)
        elif isinstance(value, list):
            result[new_key] = [_to_camel_case(item) if isinstance(item, dict) else item for item in value]
        else:
            result[new_key] = value
    return result


# Simulation state for live data
_simulation_start = datetime.utcnow()
_machine_configs = [
    {"machine_id": "MCH-001", "name": "CNC Milling Unit Alpha", "type": "CNC Machine", 
     "location": "Bay A — Floor 2", "base_health": 87, "degradation_rate": 0.02, "volatility": 0.5},
    {"machine_id": "MCH-002", "name": "Hydraulic Press Beta", "type": "Hydraulic Press",
     "location": "Bay B — Floor 1", "base_health": 54, "degradation_rate": 0.08, "volatility": 1.5},
    {"machine_id": "MCH-003", "name": "Conveyor System Gamma", "type": "Conveyor",
     "location": "Assembly Line 3", "base_health": 28, "degradation_rate": 0.15, "volatility": 2.0},
    {"machine_id": "MCH-004", "name": "Robotic Arm Delta", "type": "Robot",
     "location": "Cell 7 — Floor 3", "base_health": 92, "degradation_rate": 0.01, "volatility": 0.3},
    {"machine_id": "MCH-005", "name": "Injection Molder Epsilon", "type": "Injection Molder",
     "location": "Plastics Bay", "base_health": 63, "degradation_rate": 0.06, "volatility": 1.2},
    {"machine_id": "MCH-006", "name": "Lathe Machine Zeta", "type": "Lathe",
     "location": "Bay A — Floor 1", "base_health": 79, "degradation_rate": 0.03, "volatility": 0.8},
]


def _generate_live_sensor_data(config: dict) -> dict:
    """Generate live sensor readings with realistic drift"""
    now = datetime.utcnow()
    elapsed_minutes = (now - _simulation_start).total_seconds() / 60
    
    # Calculate current health with degradation and random walk
    degradation = config["degradation_rate"] * (elapsed_minutes / 10)
    random_walk = (math.sin(now.timestamp() / 30) + math.cos(now.timestamp() / 45)) * config["volatility"] * 3
    noise = (random.random() - 0.5) * config["volatility"] * 4
    
    current_health = config["base_health"] - degradation + random_walk + noise
    current_health = max(5, min(98, current_health))
    
    # Generate sensor readings based on health
    health_factor = (100 - current_health) / 100
    
    temperature = 40 + health_factor * 45 + (random.random() - 0.5) * 8
    vibration = 0.3 + health_factor * 6 + (random.random() - 0.5) * 0.8
    current = 10 + health_factor * 12 + (random.random() - 0.5) * 2
    
    return {
        "temperature": round(temperature, 1),
        "vibration": round(vibration, 2),
        "current": round(current, 1),
        "health_score": round(current_health),
        "timestamp": now.isoformat()
    }


def _build_machine_data(config: dict) -> dict:
    """Build complete machine data with live prediction"""
    sensor_data = _generate_live_sensor_data(config)
    prediction = predict_rul(
        vibration=sensor_data["vibration"],
        temperature=sensor_data["temperature"],
        current=sensor_data["current"]
    )
    
    # Determine status
    health = prediction["health_percentage"]
    if health > 70:
        status_str = "healthy"
        risk = "low"
    elif health >= 40:
        status_str = "warning"
        risk = "medium"
    else:
        status_str = "critical"
        risk = "high"
    
    return {
        "machine_id": config["machine_id"],
        "name": config["name"],
        "type": config["type"],  # Frontend expects "type" not "machineType"
        "location": config["location"],
        "health_score": prediction["health_percentage"],
        "rul": prediction["predicted_RUL"],  # Frontend expects "rul" not "predictedRul"
        "risk_level": risk,
        "status": status_str,
        "root_cause": prediction["root_cause"] if status_str != "healthy" else None,
        "current_sensors": sensor_data,
        "last_maintenance": (datetime.utcnow() - timedelta(days=random.randint(20, 60))).date().isoformat(),
        "next_scheduled": (datetime.utcnow() + timedelta(days=random.randint(10, 40))).date().isoformat()
    }


def _generate_sensor_history(config: dict, hours: int = 72) -> List[dict]:
    """Generate historical sensor data"""
    data = []
    now = datetime.utcnow()
    
    for i in range(hours, -1, -1):
        timestamp = now - timedelta(hours=i)
        elapsed_minutes = (timestamp - _simulation_start).total_seconds() / 60
        
        degradation = max(0, config["degradation_rate"] * (elapsed_minutes / 10))
        cycle_noise = (math.sin(timestamp.timestamp() / 30000) + math.cos(timestamp.timestamp() / 45000)) * config["volatility"]
        random_noise = (random.random() - 0.5) * config["volatility"] * 2
        
        historical_health = config["base_health"] - degradation + cycle_noise + random_noise
        historical_health = max(5, min(98, historical_health))
        
        health_factor = (100 - historical_health) / 100
        
        data.append({
            "timestamp": timestamp.isoformat(),
            "temperature": round(40 + health_factor * 45 + (random.random() - 0.5) * 5, 1),
            "vibration": round(0.3 + health_factor * 6 + (random.random() - 0.5) * 0.5, 2),
            "current": round(10 + health_factor * 12 + (random.random() - 0.5) * 1.5, 1),
            "health_score": round(historical_health)
        })
    
    return data


@router.get("/machines")
async def get_all_machines(
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all machines with live status"""
    machines = []
    
    for config in _machine_configs:
        machine_data = _build_machine_data(config)
        machine_data["id"] = config["machine_id"]
        machine_data["sensor_history"] = _generate_sensor_history(config, hours=24)
        # Convert to camelCase for frontend
        machines.append(_to_camel_case(machine_data))
    
    return machines


@router.get("/machines/{machine_id}")
async def get_machine(
    machine_id: str,
    user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single machine by ID"""
    config = next((c for c in _machine_configs if c["machine_id"] == machine_id), None)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found"
        )
    
    machine_data = _build_machine_data(config)
    machine_data["id"] = config["machine_id"]
    machine_data["sensor_history"] = _generate_sensor_history(config, hours=72)
    
    return _to_camel_case(machine_data)


@router.get("/machines/{machine_id}/live")
async def get_live_sensor_data(
    machine_id: str,
    user: User = Depends(get_optional_user)
):
    """Get real-time sensor data for a machine"""
    config = next((c for c in _machine_configs if c["machine_id"] == machine_id), None)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found"
        )
    
    sensor_data = _generate_live_sensor_data(config)
    prediction = predict_rul(
        vibration=sensor_data["vibration"],
        temperature=sensor_data["temperature"],
        current=sensor_data["current"]
    )
    
    result = {
        **sensor_data,
        "predicted_rul": prediction["predicted_RUL"],
        "risk_level": prediction["risk_level"]
    }
    return _to_camel_case(result)


@router.get("/fleet/summary")
async def get_fleet_summary(
    user: User = Depends(get_optional_user)
):
    """Get fleet overview statistics"""
    machines_data = [_build_machine_data(c) for c in _machine_configs]
    
    total = len(machines_data)
    healthy = sum(1 for m in machines_data if m["status"] == "healthy")
    warning = sum(1 for m in machines_data if m["status"] == "warning")
    critical = sum(1 for m in machines_data if m["status"] == "critical")
    avg_health = sum(m["health_score"] for m in machines_data) / total
    
    return {
        "total": total,
        "healthy": healthy,
        "warning": warning,
        "critical": critical,
        "avgHealth": round(avg_health, 1)
    }


@router.get("/alerts")
async def get_alerts(
    user: User = Depends(get_optional_user)
):
    """Get alerts for machines with issues"""
    alerts = []
    machines_data = [_build_machine_data(c) for c in _machine_configs]
    
    for machine in machines_data:
        if machine["status"] == "critical":
            alerts.append({
                "id": f"ALT-{machine['machine_id']}-CRIT",
                "machineId": machine["machine_id"],
                "machineName": machine["name"],
                "severity": "critical",
                "message": f"CRITICAL: Immediate maintenance required — Health at {machine['health_score']}%",
                "timestamp": (datetime.utcnow() - timedelta(minutes=random.randint(5, 120))).isoformat(),
                "acknowledged": False
            })
        elif machine["status"] == "warning":
            alerts.append({
                "id": f"ALT-{machine['machine_id']}-WARN",
                "machineId": machine["machine_id"],
                "machineName": machine["name"],
                "severity": "warning",
                "message": f"WARNING: {machine['root_cause'] or 'Schedule maintenance soon'} — Health at {machine['health_score']}%",
                "timestamp": (datetime.utcnow() - timedelta(hours=random.randint(1, 24))).isoformat(),
                "acknowledged": False
            })
    
    # Sort by severity (critical first) and timestamp
    alerts.sort(key=lambda x: (0 if x["severity"] == "critical" else 1, x["timestamp"]), reverse=True)
    
    return alerts


@router.post("/machines", response_model=MachineResponse)
async def create_machine(
    request: MachineCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new machine (authenticated)"""
    # Check if machine ID exists
    if any(c["machine_id"] == request.machine_id for c in _machine_configs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Machine ID already exists"
        )
    
    # Add to config (in production, this would go to database)
    new_config = {
        "machine_id": request.machine_id,
        "name": request.name,
        "type": request.machine_type or "Unknown",
        "location": request.location or "Unknown",
        "base_health": 90,
        "degradation_rate": 0.02,
        "volatility": 0.5
    }
    _machine_configs.append(new_config)
    
    machine_data = _build_machine_data(new_config)
    machine_data["id"] = new_config["machine_id"]
    machine_data["sensor_history"] = []
    
    return MachineResponse(**machine_data)
