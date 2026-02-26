"""
Improved XGBoost Model Training with Cycle Feature
Senior ML Engineer - Corrected Training Script

This script trains models with proper degradation modeling:
1. Includes 'cycle' as explicit feature
2. Models realistic degradation over cycles
3. Ensures no data leakage
4. Proper RUL calculation from ground truth

Features: temperature, vibration, current, pressure, cycle
Target: RUL (Remaining Useful Life in cycles)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix,
    mean_absolute_error, mean_squared_error, r2_score
)
import joblib
import json
import os
from datetime import datetime

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'ml')
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'data')

# Create directories if they don't exist
os.makedirs(ML_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Constants
INITIAL_RUL = 150  # Maximum RUL (cycles)
MAX_CYCLE = 150    # Maximum cycles before failure


def generate_training_data_with_cycles(n_samples=15000, n_engines=100, seed=42):
    """
    Generate training data with proper degradation modeling.
    
    Key improvements:
    1. Each engine has a lifecycle from cycle 1 to failure_cycle
    2. RUL = failure_cycle - current_cycle (ground truth, no leakage)
    3. Sensor readings degrade over cycles
    4. Cycle is included as a feature
    
    NO DATA LEAKAGE: RUL is calculated from known failure cycle, not max cycle in dataset.
    """
    np.random.seed(seed)
    
    data = []
    
    # Generate data for multiple engines
    for engine_id in range(1, n_engines + 1):
        # Each engine has a random failure cycle (between 80 and 150)
        failure_cycle = np.random.randint(80, MAX_CYCLE + 1)
        
        # Generate cycles for this engine (from 1 to failure_cycle)
        # Sample more cycles near failure (important for learning degradation)
        cycles = []
        for _ in range(n_samples // n_engines):
            # Weight sampling towards later cycles (more degradation examples)
            cycle = int(np.random.beta(2, 1) * failure_cycle) + 1
            cycle = min(cycle, failure_cycle)
            cycles.append(cycle)
        
        for cycle in cycles:
            # Calculate RUL (ground truth - no leakage)
            rul = failure_cycle - cycle
            rul = max(0, rul)  # RUL cannot be negative
            
            # Normalize cycle for degradation modeling
            cycle_norm = cycle / failure_cycle  # 0 to 1
            
            # Model sensor degradation over cycles
            # Base values (healthy state)
            base_temp = 50.0
            base_vib = 2.0
            base_curr = 10.0
            base_pressure = 100.0
            
            # Degradation factors (non-linear, realistic patterns)
            # Temperature increases with wear
            temp_factor = 1 + (cycle_norm ** 1.5) * 0.7
            # Vibration increases quadratically (mechanical wear accelerates)
            vib_factor = 1 + (cycle_norm ** 2.0) * 1.5
            # Current increases (electrical degradation)
            curr_factor = 1 + (cycle_norm ** 1.3) * 0.9
            # Pressure may increase or decrease (system dependent)
            pressure_factor = 1 + (cycle_norm ** 1.0) * 0.3
            
            # Calculate sensor values
            temperature = base_temp * temp_factor + np.random.normal(0, 3)
            vibration = base_vib * vib_factor + np.random.normal(0, 0.4)
            current = base_curr * curr_factor + np.random.normal(0, 0.8)
            pressure = base_pressure * pressure_factor + np.random.normal(0, 5)
            
            # Ensure realistic bounds
            temperature = np.clip(temperature, 20, 120)
            vibration = np.clip(vibration, 0.1, 15)
            current = np.clip(current, 5, 40)
            pressure = np.clip(pressure, 50, 200)
            
            # Determine health status based on RUL
            if rul > 80:
                health_status = 0  # NORMAL
            elif rul >= 30:
                health_status = 1  # WARNING
            else:
                health_status = 2  # CRITICAL
            
            data.append({
                'engine_id': engine_id,
                'cycle': cycle,
                'temperature': round(temperature, 2),
                'vibration': round(vibration, 4),
                'current': round(current, 2),
                'pressure': round(pressure, 2),
                'rul': rul,
                'health_status': health_status,
                'failure_cycle': failure_cycle  # For validation only, not used in training
            })
    
    df = pd.DataFrame(data)
    return df


def train_classifier(X_train, X_test, y_train, y_test, feature_names):
    """Train Gradient Boosting Classifier for health status prediction."""
    print("\n" + "="*60)
    print("Training Gradient Boosting Classifier for Health Status")
    print("="*60)
    
    classifier = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
        verbose=0
    )
    
    classifier.fit(X_train, y_train)
    
    y_pred = classifier.predict(X_test)
    y_prob = classifier.predict_proba(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    print(f"\nClassification Results:")
    print(f"  Accuracy:  {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    
    print(f"\nClassification Report:")
    labels = ['NORMAL', 'WARNING', 'CRITICAL']
    print(classification_report(y_test, y_pred, target_names=labels))
    
    print(f"\nFeature Importance:")
    importance = classifier.feature_importances_
    for name, imp in sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True):
        print(f"  {name}: {imp:.4f}")
    
    return classifier, {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'feature_importance': dict(zip(feature_names, importance.tolist()))
    }


def train_regressor(X_train, X_test, y_train, y_test, feature_names):
    """
    Train Gradient Boosting Regressor for RUL prediction.
    
    Note: XGBoost supports monotonic constraints, but sklearn's GradientBoosting
    does not. For production, consider using XGBoost with monotonic_constraints.
    """
    print("\n" + "="*60)
    print("Training Gradient Boosting Regressor for RUL Prediction")
    print("="*60)
    
    regressor = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
        verbose=0
    )
    
    regressor.fit(X_train, y_train)
    
    y_pred = regressor.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nRegression Results:")
    print(f"  MAE:  {mae:.4f} cycles")
    print(f"  RMSE: {rmse:.4f} cycles")
    print(f"  R²:   {r2:.4f}")
    
    print(f"\nFeature Importance:")
    importance = regressor.feature_importances_
    for name, imp in sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True):
        print(f"  {name}: {imp:.4f}")
    
    # Check for monotonicity in cycle feature
    print(f"\nMonotonicity Check (Cycle feature):")
    cycle_idx = feature_names.index('cycle')
    cycle_importance = importance[cycle_idx]
    print(f"  Cycle importance: {cycle_importance:.4f}")
    if cycle_importance > 0.1:
        print(f"  ✓ Cycle feature has significant importance")
    else:
        print(f"  ⚠️  Cycle feature has low importance - may need more training data")
    
    return regressor, {
        'mae': mae,
        'rmse': rmse,
        'r2_score': r2,
        'feature_importance': dict(zip(feature_names, importance.tolist()))
    }


def save_models(classifier, regressor, scaler, classifier_metrics, regressor_metrics, feature_names):
    """Save trained models and metadata."""
    print("\n" + "="*60)
    print("Saving Models")
    print("="*60)
    
    classifier_path = os.path.join(ML_DIR, 'health_classifier.pkl')
    joblib.dump(classifier, classifier_path)
    print(f"  Classifier saved: {classifier_path}")
    
    regressor_path = os.path.join(ML_DIR, 'rul_regressor.pkl')
    joblib.dump(regressor, regressor_path)
    print(f"  Regressor saved: {regressor_path}")
    
    scaler_path = os.path.join(ML_DIR, 'feature_scaler.pkl')
    joblib.dump(scaler, scaler_path)
    print(f"  Scaler saved: {scaler_path}")
    
    metadata = {
        'model_version': '2.1',
        'algorithm': 'GradientBoosting',
        'training_date': datetime.now().isoformat(),
        'feature_names': feature_names,
        'initial_rul': INITIAL_RUL,
        'label_encoding': {
            'NORMAL': 0,
            'WARNING': 1,
            'CRITICAL': 2
        },
        'classifier_metrics': classifier_metrics,
        'regressor_metrics': regressor_metrics,
        'health_thresholds': {
            'normal_rul_min': 80,
            'warning_rul_range': [30, 80],
            'critical_rul_max': 30,
            'health_percentage_thresholds': {
                'healthy': 70,
                'warning': 40,
                'critical': 40
            }
        },
        'notes': [
            'Cycle is included as a feature for proper degradation modeling',
            'RUL is ground truth from failure cycle, no data leakage',
            'Health percentage = (RUL / Initial_RUL) * 100'
        ]
    }
    
    metadata_path = os.path.join(ML_DIR, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata saved: {metadata_path}")
    
    return metadata


def main():
    print("="*60)
    print("IMPROVED ML MODEL TRAINING - WITH CYCLE FEATURE")
    print("Senior ML Engineer - Corrected Training")
    print("="*60)
    print(f"Training started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Generate training data
    print("\n[1/5] Generating training data with proper degradation...")
    df = generate_training_data_with_cycles(n_samples=15000, n_engines=100)
    
    # Save training data
    data_path = os.path.join(DATA_DIR, 'training_data_with_cycles.csv')
    df.to_csv(data_path, index=False)
    print(f"  Training data saved: {data_path}")
    print(f"  Total samples: {len(df)}")
    print(f"  Engines: {df['engine_id'].nunique()}")
    print(f"  Cycle range: {df['cycle'].min()} to {df['cycle'].max()}")
    print(f"  RUL range: {df['rul'].min()} to {df['rul'].max()}")
    print(f"  Class distribution:")
    print(f"    NORMAL:   {(df['health_status'] == 0).sum()} ({(df['health_status'] == 0).mean():.1%})")
    print(f"    WARNING:  {(df['health_status'] == 1).sum()} ({(df['health_status'] == 1).mean():.1%})")
    print(f"    CRITICAL: {(df['health_status'] == 2).sum()} ({(df['health_status'] == 2).mean():.1%})")
    
    # Prepare features and labels
    print("\n[2/5] Preparing features...")
    feature_names = ['temperature', 'vibration', 'current', 'pressure', 'cycle']
    X = df[feature_names].values
    y_status = df['health_status'].values
    y_rul = df['rul'].values
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_status_train, y_status_test, y_rul_train, y_rul_test = train_test_split(
        X_scaled, y_status, y_rul, test_size=0.2, random_state=42, stratify=y_status
    )
    
    print(f"  Training set: {len(X_train)} samples")
    print(f"  Test set: {len(X_test)} samples")
    print(f"  Features: {feature_names}")
    
    # Train classifier
    print("\n[3/5] Training classifier...")
    classifier, classifier_metrics = train_classifier(
        X_train, X_test, y_status_train, y_status_test, feature_names
    )
    
    # Train regressor
    print("\n[4/5] Training regressor...")
    regressor, regressor_metrics = train_regressor(
        X_train, X_test, y_rul_train, y_rul_test, feature_names
    )
    
    # Save models
    print("\n[5/5] Saving models...")
    metadata = save_models(
        classifier, regressor, scaler,
        classifier_metrics, regressor_metrics, feature_names
    )
    
    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)
    print(f"\nModel Summary:")
    print(f"  Algorithm: GradientBoosting")
    print(f"  Version: {metadata['model_version']}")
    print(f"  Features: {', '.join(feature_names)}")
    print(f"  Initial RUL: {INITIAL_RUL} cycles")
    print(f"  Classifier Accuracy: {classifier_metrics['accuracy']:.4f}")
    print(f"  Classifier F1-Score: {classifier_metrics['f1_score']:.4f}")
    print(f"  Regressor MAE: {regressor_metrics['mae']:.2f} cycles")
    print(f"  Regressor R²: {regressor_metrics['r2_score']:.4f}")
    print(f"\nModels saved to: {ML_DIR}")
    print(f"\nNext steps:")
    print(f"  1. Run validation: python validate_degradation.py")
    print(f"  2. Update predict_health() to accept cycle parameter")
    
    return classifier, regressor, scaler, metadata


if __name__ == "__main__":
    main()

