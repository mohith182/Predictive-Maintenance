"""
Advanced Prediction Routes
Simulation, Fleet Status, SHAP, Recommendations, Cost Estimation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import numpy as np

from database import get_db
from models import Machine
from health_predictor import predict_health, predict_batch
from config import settings


router = APIRouter(prefix="/api", tags=["Advanced"])


# ====================
# Schemas
# ====================

class SimulationRequest(BaseModel):
    """What-If Simulation parameters"""
    base_temperature: float = Field(..., ge=-50, le=200)
    base_vibration: float = Field(..., ge=0)
    base_current: float = Field(..., ge=0)
    base_pressure: float = Field(default=100.0, ge=0, le=300)
    base_runtime_hours: int = Field(default=0, ge=0)
    # Adjustments
    temperature_delta: float = Field(default=0, ge=-50, le=50)
    load_delta_percent: float = Field(default=0, ge=-50, le=100)  # % change in load
    runtime_hours_delta: int = Field(default=0, ge=0, le=1000)


class SimulationResult(BaseModel):
    """Simulation comparison result"""
    original: Dict[str, Any]
    simulated: Dict[str, Any]
    health_change_percent: float
    rul_change_cycles: float
    risk_change: str  # "improved", "unchanged", "worsened"


class MaintenanceRecommendation(BaseModel):
    """Maintenance recommendation"""
    priority: str  # "urgent", "high", "medium", "low"
    action: str
    reason: str
    estimated_time_hours: float
    estimated_cost: float


class FailureTimeline(BaseModel):
    """Failure timeline data"""
    today: datetime
    estimated_failure_date: datetime
    days_remaining: float
    hours_remaining: float
    warning_threshold_date: datetime
    critical_threshold_date: datetime
    timeline_progress_percent: float


class CostEstimate(BaseModel):
    """Downtime cost estimate"""
    downtime_cost_per_hour: float
    estimated_repair_hours: float
    estimated_loss: float
    currency: str = "INR"
    is_high_cost: bool


class SHAPContribution(BaseModel):
    """SHAP feature contribution"""
    feature: str
    contribution_percent: float
    impact: str  # "positive", "negative"


class EnhancedPredictionResponse(BaseModel):
    """Enhanced prediction with all advanced features"""
    # Basic prediction
    health_status: str
    predicted_rul: float
    health_percentage: float
    risk_level: str
    root_cause: str
    confidence: float
    timestamp: datetime
    
    # Advanced features
    failure_timeline: FailureTimeline
    recommendations: List[MaintenanceRecommendation]
    shap_contributions: List[SHAPContribution]
    cost_estimate: CostEstimate


class FleetMachine(BaseModel):
    """Fleet machine status"""
    machine_id: str
    name: str
    machine_type: str
    location: str
    health_percentage: float
    risk_level: str
    predicted_rul: float
    status: str
    last_updated: datetime
    days_to_failure: float


class FleetStatusResponse(BaseModel):
    """Fleet status overview"""
    total: int
    healthy: int
    warning: int
    critical: int
    avg_health: float
    machines: List[FleetMachine]


# ====================
# Helper Functions
# ====================

def calculate_failure_timeline(health_percentage: float, predicted_rul: float) -> FailureTimeline:
    """Calculate failure timeline based on health and RUL"""
    now = datetime.utcnow()
    
    # Assume 24 cycles per day (1 cycle per hour)
    hours_remaining = predicted_rul
    days_remaining = hours_remaining / 24
    
    # Estimated failure date
    estimated_failure_date = now + timedelta(hours=hours_remaining)
    
    # Calculate threshold dates based on health degradation rate
    # Warning at 70% health, Critical at 40% health
    if health_percentage >= 70:
        # Time to reach warning
        health_to_warning = health_percentage - 70
        degradation_rate = (100 - health_percentage) / max(hours_remaining, 1)
        hours_to_warning = health_to_warning / max(degradation_rate, 0.01)
        warning_date = now + timedelta(hours=hours_to_warning)
        
        hours_to_critical = (health_percentage - 40) / max(degradation_rate, 0.01)
        critical_date = now + timedelta(hours=hours_to_critical)
    elif health_percentage >= 40:
        warning_date = now  # Already past warning
        health_to_critical = health_percentage - 40
        degradation_rate = (100 - health_percentage) / max(hours_remaining, 1)
        hours_to_critical = health_to_critical / max(degradation_rate, 0.01)
        critical_date = now + timedelta(hours=hours_to_critical)
    else:
        warning_date = now
        critical_date = now  # Already critical
    
    # Timeline progress (0% = brand new, 100% = failure)
    timeline_progress = 100 - health_percentage
    
    return FailureTimeline(
        today=now,
        estimated_failure_date=estimated_failure_date,
        days_remaining=days_remaining,
        hours_remaining=hours_remaining,
        warning_threshold_date=warning_date,
        critical_threshold_date=critical_date,
        timeline_progress_percent=timeline_progress
    )


def generate_recommendations(
    temperature: float, 
    vibration: float, 
    current: float,
    health_percentage: float,
    predicted_rul: float
) -> List[MaintenanceRecommendation]:
    """Generate maintenance recommendations based on sensor data"""
    recommendations = []
    
    # High vibration
    if vibration > 6.0:
        recommendations.append(MaintenanceRecommendation(
            priority="urgent" if vibration > 8.0 else "high",
            action="Lubricate bearings and check shaft alignment",
            reason=f"Vibration level ({vibration:.1f} mm/s) exceeds normal range",
            estimated_time_hours=2.0,
            estimated_cost=5000.0
        ))
    elif vibration > 4.5:
        recommendations.append(MaintenanceRecommendation(
            priority="medium",
            action="Schedule bearing inspection",
            reason=f"Vibration level ({vibration:.1f} mm/s) showing early wear signs",
            estimated_time_hours=1.0,
            estimated_cost=2000.0
        ))
    
    # High temperature
    if temperature > 85:
        recommendations.append(MaintenanceRecommendation(
            priority="urgent" if temperature > 95 else "high",
            action="Check cooling system and reduce operational load by 15%",
            reason=f"Temperature ({temperature:.1f}°C) indicates overheating",
            estimated_time_hours=3.0,
            estimated_cost=8000.0
        ))
    elif temperature > 75:
        recommendations.append(MaintenanceRecommendation(
            priority="medium",
            action="Clean air filters and check coolant levels",
            reason=f"Temperature ({temperature:.1f}°C) is elevated",
            estimated_time_hours=1.5,
            estimated_cost=3000.0
        ))
    
    # High current (overload)
    if current > 22:
        recommendations.append(MaintenanceRecommendation(
            priority="high",
            action="Reduce load by 10% and check for mechanical binding",
            reason=f"Current draw ({current:.1f}A) indicates potential overload",
            estimated_time_hours=2.0,
            estimated_cost=4000.0
        ))
    
    # Combined high temp + high current
    if temperature > 80 and current > 20:
        recommendations.append(MaintenanceRecommendation(
            priority="urgent",
            action="Immediate load reduction and thermal inspection required",
            reason="Combined thermal and electrical stress detected",
            estimated_time_hours=4.0,
            estimated_cost=12000.0
        ))
    
    # RUL-based recommendations
    days_remaining = predicted_rul / 24
    if days_remaining < 3:
        recommendations.append(MaintenanceRecommendation(
            priority="urgent",
            action="Schedule emergency maintenance within 24-48 hours",
            reason=f"Predicted failure in {days_remaining:.1f} days",
            estimated_time_hours=8.0,
            estimated_cost=25000.0
        ))
    elif days_remaining < 7:
        recommendations.append(MaintenanceRecommendation(
            priority="high",
            action="Schedule preventive maintenance within 3-5 days",
            reason=f"Predicted failure in {days_remaining:.1f} days",
            estimated_time_hours=6.0,
            estimated_cost=15000.0
        ))
    elif days_remaining < 14:
        recommendations.append(MaintenanceRecommendation(
            priority="medium",
            action="Plan maintenance window for next week",
            reason=f"Approaching maintenance threshold ({days_remaining:.0f} days remaining)",
            estimated_time_hours=4.0,
            estimated_cost=10000.0
        ))
    
    # Health-based recommendations
    if health_percentage < 30:
        recommendations.append(MaintenanceRecommendation(
            priority="urgent",
            action="Consider immediate machine shutdown for full inspection",
            reason=f"Health critically low at {health_percentage:.1f}%",
            estimated_time_hours=12.0,
            estimated_cost=35000.0
        ))
    
    # If no issues, add routine check
    if not recommendations:
        recommendations.append(MaintenanceRecommendation(
            priority="low",
            action="Continue normal operation with routine monitoring",
            reason="All parameters within acceptable range",
            estimated_time_hours=0.5,
            estimated_cost=1000.0
        ))
    
    return sorted(recommendations, key=lambda x: {"urgent": 0, "high": 1, "medium": 2, "low": 3}[x.priority])


def calculate_shap_contributions(
    temperature: float,
    vibration: float,
    current: float,
    pressure: float,
    runtime_hours: int
) -> List[SHAPContribution]:
    """Calculate approximate SHAP-like feature contributions"""
    # Simplified contribution calculation based on thresholds
    contributions = []
    
    # Temperature contribution
    temp_norm = min((temperature - 50) / 50, 1.0)  # Normalized 50-100°C
    temp_impact = "negative" if temperature > 75 else "positive"
    contributions.append(SHAPContribution(
        feature="Temperature",
        contribution_percent=abs(temp_norm) * 35,
        impact=temp_impact
    ))
    
    # Vibration contribution
    vib_norm = min(vibration / 10, 1.0)
    vib_impact = "negative" if vibration > 5 else "positive"
    contributions.append(SHAPContribution(
        feature="Vibration",
        contribution_percent=vib_norm * 30,
        impact=vib_impact
    ))
    
    # Current contribution
    curr_norm = min((current - 10) / 15, 1.0)
    curr_impact = "negative" if current > 20 else "positive"
    contributions.append(SHAPContribution(
        feature="Current",
        contribution_percent=abs(curr_norm) * 20,
        impact=curr_impact
    ))
    
    # Runtime contribution
    runtime_norm = min(runtime_hours / 10000, 1.0)
    contributions.append(SHAPContribution(
        feature="Runtime Hours",
        contribution_percent=runtime_norm * 10,
        impact="negative" if runtime_hours > 5000 else "positive"
    ))
    
    # Pressure contribution
    pressure_norm = abs(pressure - 100) / 50
    contributions.append(SHAPContribution(
        feature="Pressure",
        contribution_percent=pressure_norm * 5,
        impact="negative" if pressure < 90 or pressure > 120 else "positive"
    ))
    
    # Normalize to 100%
    total = sum(c.contribution_percent for c in contributions)
    if total > 0:
        for c in contributions:
            c.contribution_percent = (c.contribution_percent / total) * 100
    
    return sorted(contributions, key=lambda x: x.contribution_percent, reverse=True)[:5]


def calculate_cost_estimate(
    health_percentage: float,
    predicted_rul: float,
    downtime_cost_per_hour: float = 5000.0
) -> CostEstimate:
    """Calculate estimated downtime cost"""
    # Estimated repair time based on severity
    if health_percentage < 30:
        repair_hours = 12.0
    elif health_percentage < 50:
        repair_hours = 8.0
    elif health_percentage < 70:
        repair_hours = 4.0
    else:
        repair_hours = 2.0
    
    estimated_loss = downtime_cost_per_hour * repair_hours
    
    # Add parts/material cost estimate
    if health_percentage < 40:
        estimated_loss += 50000  # Major repair/replacement
    elif health_percentage < 60:
        estimated_loss += 25000  # Moderate repair
    else:
        estimated_loss += 10000  # Minor maintenance
    
    return CostEstimate(
        downtime_cost_per_hour=downtime_cost_per_hour,
        estimated_repair_hours=repair_hours,
        estimated_loss=estimated_loss,
        currency="INR",
        is_high_cost=estimated_loss > 50000
    )


# ====================
# Endpoints
# ====================

@router.post("/predict/enhanced", response_model=EnhancedPredictionResponse)
async def enhanced_prediction(
    vibration: float,
    temperature: float,
    current: float,
    pressure: float = 100.0,
    runtime_hours: int = 0,
    downtime_cost_per_hour: float = 5000.0
):
    """
    Enhanced prediction with failure timeline, recommendations, SHAP, and cost estimation.
    """
    # Get base prediction
    result = predict_health(
        temperature=temperature,
        vibration=vibration,
        current=current,
        pressure=pressure,
        runtime_hours=runtime_hours
    )
    
    health_percentage = result["health_percentage"]
    predicted_rul = result["predicted_rul"]
    
    # Calculate advanced features
    failure_timeline = calculate_failure_timeline(health_percentage, predicted_rul)
    recommendations = generate_recommendations(
        temperature, vibration, current, health_percentage, predicted_rul
    )
    shap_contributions = calculate_shap_contributions(
        temperature, vibration, current, pressure, runtime_hours
    )
    cost_estimate = calculate_cost_estimate(
        health_percentage, predicted_rul, downtime_cost_per_hour
    )
    
    return EnhancedPredictionResponse(
        health_status=result["health_status"],
        predicted_rul=predicted_rul,
        health_percentage=health_percentage,
        risk_level="low" if result["health_status"] == "NORMAL" else result["health_status"].lower(),
        root_cause=result["root_cause"],
        confidence=result["confidence_score"],
        timestamp=datetime.fromisoformat(result["timestamp"]),
        failure_timeline=failure_timeline,
        recommendations=recommendations,
        shap_contributions=shap_contributions,
        cost_estimate=cost_estimate
    )


@router.post("/simulate", response_model=SimulationResult)
async def simulate_scenario(request: SimulationRequest):
    """
    What-If Simulation: Compare original vs. modified sensor values.
    Does NOT affect real data.
    """
    # Original prediction
    original_result = predict_health(
        temperature=request.base_temperature,
        vibration=request.base_vibration,
        current=request.base_current,
        pressure=request.base_pressure,
        runtime_hours=request.base_runtime_hours
    )
    
    # Calculate modified values
    sim_temperature = request.base_temperature + request.temperature_delta
    sim_current = request.base_current * (1 + request.load_delta_percent / 100)
    sim_vibration = request.base_vibration * (1 + request.load_delta_percent / 200)  # Vibration correlates with load
    sim_runtime = request.base_runtime_hours + request.runtime_hours_delta
    
    # Simulated prediction
    sim_result = predict_health(
        temperature=sim_temperature,
        vibration=sim_vibration,
        current=sim_current,
        pressure=request.base_pressure,
        runtime_hours=sim_runtime
    )
    
    # Calculate changes
    health_change = sim_result["health_percentage"] - original_result["health_percentage"]
    rul_change = sim_result["predicted_rul"] - original_result["predicted_rul"]
    
    if health_change > 5:
        risk_change = "improved"
    elif health_change < -5:
        risk_change = "worsened"
    else:
        risk_change = "unchanged"
    
    return SimulationResult(
        original={
            "temperature": request.base_temperature,
            "vibration": request.base_vibration,
            "current": request.base_current,
            "runtime_hours": request.base_runtime_hours,
            "health_status": original_result["health_status"],
            "health_percentage": original_result["health_percentage"],
            "predicted_rul": original_result["predicted_rul"],
            "risk_level": original_result["health_status"].lower() if original_result["health_status"] != "NORMAL" else "low"
        },
        simulated={
            "temperature": sim_temperature,
            "vibration": round(sim_vibration, 2),
            "current": round(sim_current, 2),
            "runtime_hours": sim_runtime,
            "health_status": sim_result["health_status"],
            "health_percentage": sim_result["health_percentage"],
            "predicted_rul": sim_result["predicted_rul"],
            "risk_level": sim_result["health_status"].lower() if sim_result["health_status"] != "NORMAL" else "low"
        },
        health_change_percent=round(health_change, 2),
        rul_change_cycles=round(rul_change, 2),
        risk_change=risk_change
    )


@router.get("/fleet-status", response_model=FleetStatusResponse)
async def get_fleet_status(db: AsyncSession = Depends(get_db)):
    """
    Get comprehensive fleet status for all machines.
    Used by Fleet Overview page.
    """
    result = await db.execute(select(Machine).order_by(Machine.health_score))
    machines = result.scalars().all()
    
    fleet_machines = []
    healthy_count = 0
    warning_count = 0
    critical_count = 0
    total_health = 0.0
    
    for m in machines:
        health = m.health_score or 75.0
        rul = m.predicted_rul or 500.0
        total_health += health
        
        if health >= 70:
            status = "healthy"
            risk = "low"
            healthy_count += 1
        elif health >= 40:
            status = "warning"
            risk = "warning"
            warning_count += 1
        else:
            status = "critical"
            risk = "critical"
            critical_count += 1
        
        fleet_machines.append(FleetMachine(
            machine_id=m.machine_id,
            name=m.name,
            machine_type=m.machine_type or "Pump",
            location=m.location or "Plant Floor",
            health_percentage=round(health, 2),
            risk_level=risk,
            predicted_rul=round(rul, 2),
            status=status,
            last_updated=m.updated_at or datetime.utcnow(),
            days_to_failure=round(rul / 24, 1)
        ))
    
    total = len(machines) or 1
    
    return FleetStatusResponse(
        total=len(machines),
        healthy=healthy_count,
        warning=warning_count,
        critical=critical_count,
        avg_health=round(total_health / total, 2),
        machines=fleet_machines
    )


@router.get("/recommendations/{machine_id}")
async def get_machine_recommendations(
    machine_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get maintenance recommendations for a specific machine"""
    result = await db.execute(
        select(Machine).where(Machine.machine_id == machine_id)
    )
    machine = result.scalar_one_or_none()
    
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Get latest sensor values (mock for now)
    temp = 65 + (100 - (machine.health_score or 75)) * 0.3
    vib = 3.0 + (100 - (machine.health_score or 75)) * 0.05
    curr = 15 + (100 - (machine.health_score or 75)) * 0.1
    
    recommendations = generate_recommendations(
        temperature=temp,
        vibration=vib,
        current=curr,
        health_percentage=machine.health_score or 75,
        predicted_rul=machine.predicted_rul or 500
    )
    
    return {
        "machine_id": machine_id,
        "machine_name": machine.name,
        "health_percentage": machine.health_score,
        "recommendations": [r.dict() for r in recommendations]
    }
