"""
Machine Learning Module for Health Prediction
Uses GradientBoosting Classifier for health_status (NORMAL, WARNING, CRITICAL)
Uses GradientBoosting Regressor for RUL prediction

Final Year Project: AI-Based Machine Health Prediction and Real-Time Alert System
"""

import os
import joblib
import json
import numpy as np
from typing import Dict, Any, Optional, Tuple
from datetime import datetime


# Model paths
ML_DIR = os.path.join(os.path.dirname(__file__), "ml")
CLASSIFIER_PATH = os.path.join(ML_DIR, "health_classifier.pkl")
REGRESSOR_PATH = os.path.join(ML_DIR, "rul_regressor.pkl")
SCALER_PATH = os.path.join(ML_DIR, "feature_scaler.pkl")
METADATA_PATH = os.path.join(ML_DIR, "model_metadata.json")

# Global models
_classifier = None
_regressor = None
_scaler = None
_metadata = None

# Health status mapping
HEALTH_STATUS = {
    0: "NORMAL",
    1: "WARNING", 
    2: "CRITICAL"
}


def load_models():
    """Load all ML models and metadata"""
    global _classifier, _regressor, _scaler, _metadata
    
    if _classifier is not None:
        return True
    
    try:
        if os.path.exists(CLASSIFIER_PATH):
            _classifier = joblib.load(CLASSIFIER_PATH)
            print(f"[OK] Health Classifier loaded")
        
        if os.path.exists(REGRESSOR_PATH):
            _regressor = joblib.load(REGRESSOR_PATH)
            print(f"[OK] RUL Regressor loaded")
        
        if os.path.exists(SCALER_PATH):
            _scaler = joblib.load(SCALER_PATH)
            print(f"[OK] Feature Scaler loaded")
        
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'r') as f:
                _metadata = json.load(f)
            print(f"[OK] Model Metadata loaded (v{_metadata.get('model_version', '1.0')})")
        
        return _classifier is not None and _regressor is not None
    
    except Exception as e:
        print(f"[ERROR] Failed to load models: {e}")
        return False


def get_model_status() -> Dict[str, Any]:
    """Get current model status and metadata"""
    load_models()
    
    if _classifier is None or _regressor is None:
        return {
            "model_trained": False,
            "message": "No trained models found"
        }
    
    return {
        "model_trained": True,
        "model_version": _metadata.get("model_version", "2.0") if _metadata else "2.0",
        "algorithm": _metadata.get("algorithm", "GradientBoosting") if _metadata else "GradientBoosting",
        "feature_names": _metadata.get("feature_names", ["temperature", "vibration", "current", "pressure", "runtime_hours"]) if _metadata else [],
        "n_features": len(_metadata.get("feature_names", [])) if _metadata else 5,
        "n_estimators": 150,
        "classifier_metrics": _metadata.get("classifier_metrics", {}) if _metadata else {},
        "regressor_metrics": _metadata.get("regressor_metrics", {}) if _metadata else {},
        "health_thresholds": {
            "NORMAL": ">80 RUL",
            "WARNING": "30-80 RUL",
            "CRITICAL": "<30 RUL"
        },
        "max_rul": 150
    }


def predict_health(
    temperature: float,
    vibration: float,
    current: float,
    pressure: float = 100.0,
    runtime_hours: int = 0,
    cycle: int = None
) -> Dict[str, Any]:
    """
    Predict machine health status and RUL
    
    Args:
        temperature: Operating temperature (°C)
        vibration: Vibration level (mm/s)
        current: Motor current (A)
        pressure: Operating pressure (PSI) - optional
        runtime_hours: Total operating hours - optional
        cycle: Current cycle number - optional (recommended for proper degradation modeling)
    
    Returns:
        Dict with health_status, predicted_rul, confidence_score, health_percentage
    """
    # Load models if not loaded
    if not load_models():
        return _fallback_prediction(temperature, vibration, current, pressure, runtime_hours, cycle)
    
    try:
        # Get feature names from metadata to determine if cycle is included
        feature_names = _metadata.get('feature_names', []) if _metadata else []
        has_cycle = 'cycle' in feature_names
        
        # Prepare features in correct order
        if has_cycle:
            # If cycle is a feature, use it (estimate from runtime_hours if not provided)
            if cycle is None:
                cycle = runtime_hours // 8 if runtime_hours > 0 else 0  # Estimate: 8 hours per cycle
            features = np.array([[temperature, vibration, current, pressure, cycle]])
        else:
            # Legacy: no cycle feature
            features = np.array([[temperature, vibration, current, pressure, runtime_hours]])
        
        # Scale features
        features_scaled = _scaler.transform(features)
        
        # Predict health status
        health_class = _classifier.predict(features_scaled)[0]
        health_proba = _classifier.predict_proba(features_scaled)[0]
        confidence = float(np.max(health_proba))
        health_status = HEALTH_STATUS.get(int(health_class), "UNKNOWN")
        
        # Predict RUL
        predicted_rul = float(_regressor.predict(features_scaled)[0])
        
        # Get Initial RUL from metadata or use default
        initial_rul = _metadata.get('initial_rul', 150) if _metadata else 150
        predicted_rul = max(0, min(initial_rul, predicted_rul))  # Clamp to valid range
        
        # Calculate health percentage: Health = (Predicted_RUL / Initial_RUL) * 100
        health_percentage = min(100, max(0, (predicted_rul / initial_rul) * 100))
        
        # Determine root cause based on sensor readings
        root_cause = _analyze_root_cause(temperature, vibration, current, pressure, health_status)
        
        return {
            "health_status": health_status,
            "predicted_rul": round(predicted_rul, 2),
            "confidence_score": round(confidence, 4),
            "health_percentage": round(health_percentage, 2),
            "risk_level": health_status.lower() if health_status != "NORMAL" else "low",
            "root_cause": root_cause,
            "sensor_analysis": {
                "temperature": _analyze_sensor(temperature, "temperature"),
                "vibration": _analyze_sensor(vibration, "vibration"),
                "current": _analyze_sensor(current, "current"),
                "pressure": _analyze_sensor(pressure, "pressure")
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return _fallback_prediction(temperature, vibration, current, pressure, runtime_hours)


def _analyze_sensor(value: float, sensor_type: str) -> Dict[str, Any]:
    """Analyze individual sensor reading"""
    thresholds = {
        "temperature": {"normal": 65, "warning": 80, "critical": 95},
        "vibration": {"normal": 3.5, "warning": 6.0, "critical": 8.0},
        "current": {"normal": 15, "warning": 20, "critical": 28},
        "pressure": {"normal": 110, "warning": 125, "critical": 150}
    }
    
    thresh = thresholds.get(sensor_type, {"normal": 0, "warning": 0, "critical": float('inf')})
    
    if value < thresh["normal"]:
        status = "NORMAL"
    elif value < thresh["warning"]:
        status = "ELEVATED"
    elif value < thresh["critical"]:
        status = "WARNING"
    else:
        status = "CRITICAL"
    
    return {
        "value": round(value, 2),
        "status": status,
        "threshold_warning": thresh["warning"],
        "threshold_critical": thresh["critical"]
    }


def _analyze_root_cause(temp: float, vib: float, curr: float, pres: float, health_status: str) -> str:
    """Analyze root cause based on sensor values"""
    causes = []
    
    if health_status == "NORMAL":
        return "No issues detected - machine operating normally"
    
    # Temperature analysis
    if temp > 80:
        causes.append("High temperature - check cooling system")
    
    # Vibration analysis
    if vib > 6.0:
        causes.append("High vibration - possible bearing wear or misalignment")
    
    # Current analysis
    if curr > 22:
        causes.append("High current draw - motor overload or insulation degradation")
    
    # Pressure analysis
    if pres > 130:
        causes.append("High pressure - check for blockages or valve issues")
    
    # Combined factors
    if temp > 75 and curr > 20:
        causes.append("[WARNING] Combined thermal-electrical stress detected")
    
    if vib > 5.0 and temp > 70:
        causes.append("[WARNING] Bearing degradation likely - schedule maintenance")
    
    return " | ".join(causes) if causes else "Monitoring recommended - elevated sensor readings"


def _fallback_prediction(temp: float, vib: float, curr: float, pres: float, runtime: int, cycle: int = None) -> Dict[str, Any]:
    """Fallback prediction when models are not available"""
    # Simple rule-based prediction with cycle consideration
    risk_score = (
        (temp - 50) / 50 * 0.25 +
        (vib - 2) / 8 * 0.35 +
        (curr - 10) / 20 * 0.25 +
        (pres - 90) / 60 * 0.15
    )
    
    # Add cycle-based degradation if cycle is provided
    if cycle is not None:
        cycle_factor = min(1.0, cycle / 150.0)  # Normalize cycle
        risk_score = risk_score * 0.7 + cycle_factor * 0.3  # Blend sensor and cycle
    
    risk_score = max(0, min(1, risk_score))
    
    initial_rul = 150  # Default initial RUL
    
    if risk_score < 0.3:
        health_status = "NORMAL"
        rul = initial_rul * (1 - risk_score * 0.3) + np.random.randint(-10, 10)
    elif risk_score < 0.6:
        health_status = "WARNING"
        rul = initial_rul * (0.6 - risk_score * 0.3) + np.random.randint(-15, 15)
    else:
        health_status = "CRITICAL"
        rul = initial_rul * (0.3 - risk_score * 0.3) + np.random.randint(-10, 10)
    
    rul = max(0, min(initial_rul, rul))
    
    # Calculate health percentage: Health = (RUL / Initial_RUL) * 100
    health_percentage = (rul / initial_rul) * 100
    
    return {
        "health_status": health_status,
        "predicted_rul": rul,
        "confidence_score": round(1 - risk_score * 0.5, 4),
        "health_percentage": round(health_percentage, 2),
        "risk_level": health_status.lower() if health_status != "NORMAL" else "low",
        "root_cause": _analyze_root_cause(temp, vib, curr, pres, health_status),
        "sensor_analysis": {
            "temperature": _analyze_sensor(temp, "temperature"),
            "vibration": _analyze_sensor(vib, "vibration"),
            "current": _analyze_sensor(curr, "current"),
            "pressure": _analyze_sensor(pres, "pressure")
        },
        "timestamp": datetime.now().isoformat(),
        "note": "Using fallback prediction - models not loaded"
    }


def predict_batch(sensor_data_list: list) -> list:
    """Predict health for multiple sensor readings"""
    results = []
    for data in sensor_data_list:
        result = predict_health(
            temperature=data.get("temperature", 55),
            vibration=data.get("vibration", 2.5),
            current=data.get("current", 12),
            pressure=data.get("pressure", 100),
            runtime_hours=data.get("runtime_hours", 0),
            cycle=data.get("cycle", None)
        )
        results.append(result)
    return results


# Initialize models on module load
if __name__ != "__main__":
    load_models()
