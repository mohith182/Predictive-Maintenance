"""
Machine Learning Module
Train and use RandomForest model for RUL prediction
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from datetime import datetime

from config import settings


# Global model and scaler
_model: Optional[RandomForestRegressor] = None
_scaler: Optional[StandardScaler] = None


def get_model_path() -> str:
    """Get the path to the saved model"""
    # Priority: Industrial model (3 features) > NASA model (14 features) > default
    industrial_model = os.path.join(os.path.dirname(__file__), "ml", "industrial_model.pkl")
    if os.path.exists(industrial_model):
        return industrial_model
    nasa_model = os.path.join(os.path.dirname(__file__), "ml", "rul_model.pkl")
    if os.path.exists(nasa_model):
        return nasa_model
    return os.path.join(os.path.dirname(__file__), "ml", "model.pkl")


def get_scaler_path() -> str:
    """Get the path to the saved scaler"""
    # Match model type
    industrial_scaler = os.path.join(os.path.dirname(__file__), "ml", "industrial_scaler.pkl")
    if os.path.exists(industrial_scaler):
        return industrial_scaler
    return os.path.join(os.path.dirname(__file__), "ml", "scaler.pkl")


def load_model() -> Tuple[RandomForestRegressor, StandardScaler]:
    """Load the trained model and scaler"""
    global _model, _scaler
    
    if _model is not None and _scaler is not None:
        return _model, _scaler
    
    model_path = get_model_path()
    scaler_path = get_scaler_path()
    
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        _model = joblib.load(model_path)
        _scaler = joblib.load(scaler_path)
        model_type = "Industrial" if "industrial" in model_path else "NASA"
        print(f"[OK] ML Model loaded successfully ({model_type}, {_model.n_features_in_} features)")
        return _model, _scaler
    else:
        print("[WARNING] No trained model found. Using simulation mode.")
        return None, None


def train_model(data_path: str = None) -> Dict[str, Any]:
    """
    Train the RandomForest model on sensor data
    
    Expected CSV columns: vibration, temperature, current, RUL
    """
    global _model, _scaler
    
    # Create ml directory if it doesn't exist
    ml_dir = os.path.join(os.path.dirname(__file__), "ml")
    os.makedirs(ml_dir, exist_ok=True)
    
    # Load data
    if data_path and os.path.exists(data_path):
        df = pd.read_csv(data_path)
    else:
        # Generate synthetic training data if no CSV provided
        print("[INFO] Generating synthetic training data...")
        df = generate_synthetic_data(10000)
    
    # Validate columns
    required_cols = ['vibration', 'temperature', 'current', 'RUL']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Prepare features and target
    X = df[['vibration', 'temperature', 'current']].values
    y = df['RUL'].values
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    _scaler = StandardScaler()
    X_train_scaled = _scaler.fit_transform(X_train)
    X_test_scaled = _scaler.transform(X_test)
    
    # Train Random Forest
    print("[INFO] Training RandomForest model...")
    _model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    _model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = _model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    # Save model and scaler
    joblib.dump(_model, get_model_path())
    joblib.dump(_scaler, get_scaler_path())
    
    print(f"[OK] Model trained and saved!")
    print(f"   MAE: {mae:.2f}")
    print(f"   RMSE: {rmse:.2f}")
    print(f"   R²: {r2:.3f}")
    
    return {
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "samples_trained": len(X_train),
        "samples_tested": len(X_test)
    }


def generate_synthetic_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate synthetic sensor data for training"""
    np.random.seed(42)
    
    # Generate base RUL values (0-125 cycles)
    rul = np.random.uniform(0, 125, n_samples)
    
    # Generate sensor values correlated with RUL (inverse relationship)
    # Lower RUL = higher sensor readings (machine degradation)
    degradation = (125 - rul) / 125  # 0 to 1
    
    # Temperature: Normal 40-60°C, degraded 60-100°C
    temperature = 40 + degradation * 40 + np.random.normal(0, 5, n_samples)
    temperature = np.clip(temperature, 20, 120)
    
    # Vibration: Normal 0.5-2 mm/s, degraded 2-8 mm/s
    vibration = 0.5 + degradation * 6 + np.random.normal(0, 0.5, n_samples)
    vibration = np.clip(vibration, 0.1, 10)
    
    # Current: Normal 10-15A, degraded 15-25A
    current = 10 + degradation * 12 + np.random.normal(0, 2, n_samples)
    current = np.clip(current, 5, 30)
    
    return pd.DataFrame({
        'vibration': vibration,
        'temperature': temperature,
        'current': current,
        'RUL': rul
    })


def predict_rul(vibration: float, temperature: float, current: float) -> Dict[str, Any]:
    """
    Predict Remaining Useful Life from sensor readings
    
    Returns:
        predicted_RUL: Predicted remaining useful life (cycles)
        health_percentage: Health score (0-100%)
        risk_level: low/medium/high
        root_cause: Explanation of potential issues
        confidence: Model confidence score
    """
    model, scaler = load_model()
    
    if model is not None and scaler is not None:
        # Check how many features the model expects
        n_features = model.n_features_in_
        
        if n_features == 3:
            # Industrial model: Direct 3-feature input (temp, vib, current)
            X = np.array([[temperature, vibration, current]])
        elif n_features == 14:
            # NASA FD002 model: Map industrial sensors to NASA C-MAPSS sensor ranges
            temp_deg = np.clip((temperature - 40) / 60, 0, 1)
            vib_deg = np.clip((vibration - 0.5) / 7.5, 0, 1)
            cur_deg = np.clip((current - 10) / 15, 0, 1)
            degradation = 0.4 * vib_deg + 0.35 * temp_deg + 0.25 * cur_deg
            
            X = np.array([[
                579.5 + degradation * 1.2,      # s2
                1417.0 + degradation * 12.0,    # s3
                1201.0 + degradation * 19.0,    # s4
                282.9 + degradation * 0.1,      # s7
                2228.0 + degradation * 2.0,     # s8
                8525.0 + degradation * 10.0,    # s9
                42.9 + degradation * 0.6,       # s11
                266.4 + degradation * 0.2,      # s12
                2335.0 + degradation * 1.0,     # s13
                8066.0 + degradation * 2.0,     # s14
                9.33 + degradation * 0.1,       # s15
                348.0 + degradation * 2.0,      # s17
                20.8 + degradation * 1.0,       # s20
                12.5 + degradation * 0.5        # s21
            ]])
        else:
            # Unknown model - use direct input
            X = np.array([[vibration, temperature, current]])
        
        # Use trained model
        X_scaled = scaler.transform(X)
        predicted_rul = model.predict(X_scaled)[0]
        
        # Get prediction confidence from tree variance
        tree_predictions = np.array([tree.predict(X_scaled)[0] for tree in model.estimators_])
        confidence = 1 - (np.std(tree_predictions) / (np.mean(tree_predictions) + 1e-6))
        confidence = max(0.5, min(0.99, confidence))
    else:
        # Simulation mode (fallback)
        predicted_rul = simulate_prediction(vibration, temperature, current)
        confidence = 0.85 + np.random.uniform(-0.05, 0.05)
    
    # Ensure RUL is within bounds
    predicted_rul = max(0, min(settings.MAX_RUL, predicted_rul))
    
    # Calculate health percentage
    health_percentage = (predicted_rul / settings.MAX_RUL) * 100
    
    # Determine risk level
    if health_percentage > 70:
        risk_level = "low"
    elif health_percentage >= 40:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    # Determine root cause
    root_cause = analyze_root_cause(vibration, temperature, current, health_percentage)
    
    return {
        "predicted_RUL": round(predicted_rul, 2),
        "health_percentage": round(health_percentage, 2),
        "risk_level": risk_level,
        "root_cause": root_cause,
        "confidence": round(confidence, 3),
        "timestamp": datetime.utcnow().isoformat()
    }


def simulate_prediction(vibration: float, temperature: float, current: float) -> float:
    """Simulate prediction when no model is available"""
    # Normalize inputs
    temp_norm = min(max((temperature - 20) / 80, 0), 1)
    vib_norm = min(max(vibration / 10, 0), 1)
    cur_norm = min(max((current - 5) / 25, 0), 1)
    
    # Weighted average for degradation score
    degradation = (temp_norm * 0.35) + (vib_norm * 0.40) + (cur_norm * 0.25)
    
    # Calculate RUL with some noise
    rul = settings.MAX_RUL * (1 - degradation) + np.random.normal(0, 5)
    return max(0, min(settings.MAX_RUL, rul))


def analyze_root_cause(vibration: float, temperature: float, current: float, health: float) -> str:
    """
    Analyze sensor readings to determine root cause of degradation
    """
    if health > 70:
        return "No issues detected - machine operating normally"
    
    issues = []
    
    # Check vibration (normal: < 2.5 mm/s)
    if vibration > 5:
        issues.append("Severe bearing degradation - abnormal vibration pattern")
    elif vibration > 3.5:
        issues.append("Bearing wear detected - vibration exceeds normal range")
    elif vibration > 2.5:
        issues.append("Minor mechanical imbalance - monitor vibration levels")
    
    # Check temperature (normal: < 65°C)
    if temperature > 85:
        issues.append("Critical thermal overload - immediate cooling required")
    elif temperature > 75:
        issues.append("Thermal stress detected - high operating temperature")
    elif temperature > 65:
        issues.append("Elevated temperature - check cooling system")
    
    # Check current (normal: < 18A)
    if current > 24:
        issues.append("Severe electrical overload - current draw critical")
    elif current > 20:
        issues.append("Electrical imbalance - current exceeding nominal range")
    elif current > 18:
        issues.append("Increased power consumption - check for obstructions")
    
    # Combined analysis
    if vibration > 4 and temperature > 75:
        issues.insert(0, "[WARNING] Combined thermal-mechanical stress detected")
    
    if current > 20 and temperature > 75:
        issues.insert(0, "[WARNING] Overload condition - high current causing thermal buildup")
    
    if not issues:
        if health < 40:
            return "Multiple degradation factors - comprehensive inspection recommended"
        else:
            return "Early wear indicators - schedule preventive maintenance"
    
    return " | ".join(issues[:2])  # Return top 2 issues


def batch_predict(readings: list) -> list:
    """
    Batch prediction for multiple sensor readings
    """
    results = []
    for reading in readings:
        result = predict_rul(
            vibration=reading.get('vibration', 0),
            temperature=reading.get('temperature', 0),
            current=reading.get('current', 0)
        )
        if 'machine_id' in reading:
            result['machine_id'] = reading['machine_id']
        results.append(result)
    return results


# Initialize model on module load
try:
    load_model()
except Exception as e:
    print(f"[WARNING] Could not load model: {e}")


if __name__ == "__main__":
    # Train model when run directly
    print("[START] Training ML model...")
    metrics = train_model()
    print(f"\n[OK] Training complete!")
    
    # Test prediction
    print("\n[TEST] Test prediction:")
    result = predict_rul(vibration=3.5, temperature=72, current=18)
    print(f"   RUL: {result['predicted_RUL']} cycles")
    print(f"   Health: {result['health_percentage']}%")
    print(f"   Risk: {result['risk_level']}")
    print(f"   Root Cause: {result['root_cause']}")
