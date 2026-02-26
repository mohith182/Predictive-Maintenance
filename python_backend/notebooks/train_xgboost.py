"""
Gradient Boosting Model Training for Machine Health Prediction
Final Year Project: AI-Based Machine Health Prediction and Real-Time Alert System

This script trains:
1. GradientBoosting Classifier for health_status (NORMAL, WARNING, CRITICAL)
2. GradientBoosting Regressor for RUL (Remaining Useful Life) prediction

Note: Using sklearn's GradientBoosting which provides similar capabilities to XGBoost
with better cross-platform compatibility.

Features: temperature, vibration, current, pressure, runtime_hours
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
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


def generate_training_data(n_samples=10000, seed=42):
    """
    Generate synthetic training data based on NASA C-MAPSS degradation patterns.
    
    Features:
    - temperature: Operating temperature (°C)
    - vibration: Vibration level (mm/s)
    - current: Motor current (A)
    - pressure: Operating pressure (PSI)
    - runtime_hours: Total operating hours
    
    Labels:
    - health_status: NORMAL (0), WARNING (1), CRITICAL (2)
    - rul: Remaining Useful Life (cycles)
    """
    np.random.seed(seed)
    
    data = []
    
    # Generate data for each health category
    for _ in range(n_samples):
        # Randomly select health category based on realistic distribution
        # Most machines should be normal, fewer warning, least critical
        category = np.random.choice([0, 1, 2], p=[0.6, 0.25, 0.15])
        
        # Generate RUL based on category
        if category == 0:  # NORMAL
            rul = np.random.randint(80, 150)  # High RUL
            # Normal operating conditions
            temperature = np.random.normal(55, 8)
            vibration = np.random.normal(2.5, 0.8)
            current = np.random.normal(12, 2)
            pressure = np.random.normal(100, 10)
            runtime_hours = np.random.randint(0, 2000)
            
        elif category == 1:  # WARNING
            rul = np.random.randint(30, 80)  # Medium RUL
            # Elevated sensor readings
            temperature = np.random.normal(72, 6)
            vibration = np.random.normal(5.5, 1.2)
            current = np.random.normal(18, 3)
            pressure = np.random.normal(115, 12)
            runtime_hours = np.random.randint(2000, 5000)
            
        else:  # CRITICAL
            rul = np.random.randint(0, 30)  # Low RUL
            # Abnormal sensor readings
            temperature = np.random.normal(88, 8)
            vibration = np.random.normal(8.5, 1.5)
            current = np.random.normal(25, 4)
            pressure = np.random.normal(135, 15)
            runtime_hours = np.random.randint(5000, 10000)
        
        # Add some noise and ensure valid ranges
        temperature = max(20, min(120, temperature + np.random.normal(0, 2)))
        vibration = max(0.1, min(15, vibration + np.random.normal(0, 0.3)))
        current = max(5, min(40, current + np.random.normal(0, 0.5)))
        pressure = max(50, min(200, pressure + np.random.normal(0, 3)))
        runtime_hours = max(0, runtime_hours + np.random.randint(-100, 100))
        rul = max(0, rul + np.random.randint(-5, 5))
        
        data.append({
            'temperature': round(temperature, 2),
            'vibration': round(vibration, 4),
            'current': round(current, 4),
            'pressure': round(pressure, 2),
            'runtime_hours': runtime_hours,
            'health_status': category,
            'rul': rul
        })
    
    df = pd.DataFrame(data)
    return df


def train_classifier(X_train, X_test, y_train, y_test, feature_names):
    """
    Train Gradient Boosting Classifier for health status prediction.
    """
    print("\n" + "="*60)
    print("Training Gradient Boosting Classifier for Health Status")
    print("="*60)
    
    # GradientBoosting parameters optimized for multi-class classification
    classifier = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
        verbose=0
    )
    
    # Train
    classifier.fit(X_train, y_train)
    
    # Predictions
    y_pred = classifier.predict(X_test)
    y_prob = classifier.predict_proba(X_test)
    
    # Metrics
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
    
    print(f"\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Feature importance
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
    """
    print("\n" + "="*60)
    print("Training Gradient Boosting Regressor for RUL Prediction")
    print("="*60)
    
    # GradientBoosting parameters for regression
    regressor = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
        verbose=0
    )
    
    # Train
    regressor.fit(X_train, y_train)
    
    # Predictions
    y_pred = regressor.predict(X_test)
    
    # Metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nRegression Results:")
    print(f"  MAE:  {mae:.4f} cycles")
    print(f"  RMSE: {rmse:.4f} cycles")
    print(f"  R²:   {r2:.4f}")
    
    # Feature importance
    print(f"\nFeature Importance:")
    importance = regressor.feature_importances_
    for name, imp in sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True):
        print(f"  {name}: {imp:.4f}")
    
    return regressor, {
        'mae': mae,
        'rmse': rmse,
        'r2_score': r2,
        'feature_importance': dict(zip(feature_names, importance.tolist()))
    }


def save_models(classifier, regressor, scaler, classifier_metrics, regressor_metrics, feature_names):
    """
    Save trained models and metadata.
    """
    print("\n" + "="*60)
    print("Saving Models")
    print("="*60)
    
    # Save classifier
    classifier_path = os.path.join(ML_DIR, 'health_classifier.pkl')
    joblib.dump(classifier, classifier_path)
    print(f"  Classifier saved: {classifier_path}")
    
    # Save regressor
    regressor_path = os.path.join(ML_DIR, 'rul_regressor.pkl')
    joblib.dump(regressor, regressor_path)
    print(f"  Regressor saved: {regressor_path}")
    
    # Save scaler
    scaler_path = os.path.join(ML_DIR, 'feature_scaler.pkl')
    joblib.dump(scaler, scaler_path)
    print(f"  Scaler saved: {scaler_path}")
    
    # Save metadata
    metadata = {
        'model_version': '2.0',
        'algorithm': 'GradientBoosting',
        'training_date': datetime.now().isoformat(),
        'feature_names': feature_names,
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
            'critical_rul_max': 30
        }
    }
    
    metadata_path = os.path.join(ML_DIR, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  Metadata saved: {metadata_path}")
    
    return metadata


def main():
    print("="*60)
    print("AI-Based Machine Health Prediction Model Training")
    print("="*60)
    print(f"Training started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Generate training data
    print("\n[1/5] Generating training data...")
    df = generate_training_data(n_samples=15000)
    
    # Save training data
    data_path = os.path.join(DATA_DIR, 'training_data.csv')
    df.to_csv(data_path, index=False)
    print(f"  Training data saved: {data_path}")
    print(f"  Total samples: {len(df)}")
    print(f"  Class distribution:")
    print(f"    NORMAL:   {(df['health_status'] == 0).sum()} ({(df['health_status'] == 0).mean():.1%})")
    print(f"    WARNING:  {(df['health_status'] == 1).sum()} ({(df['health_status'] == 1).mean():.1%})")
    print(f"    CRITICAL: {(df['health_status'] == 2).sum()} ({(df['health_status'] == 2).mean():.1%})")
    
    # Prepare features and labels
    print("\n[2/5] Preparing features...")
    feature_names = ['temperature', 'vibration', 'current', 'pressure', 'runtime_hours']
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
    print(f"  Classifier Accuracy: {classifier_metrics['accuracy']:.4f}")
    print(f"  Classifier F1-Score: {classifier_metrics['f1_score']:.4f}")
    print(f"  Regressor MAE: {regressor_metrics['mae']:.2f} cycles")
    print(f"  Regressor R²: {regressor_metrics['r2_score']:.4f}")
    print(f"\nModels saved to: {ML_DIR}")
    
    return classifier, regressor, scaler, metadata


if __name__ == "__main__":
    main()
