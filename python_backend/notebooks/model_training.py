"""
Model Training Script for NASA C-MAPSS FD001 Dataset
Trains a RandomForestRegressor for Remaining Useful Life (RUL) prediction

Dataset: NASA Turbofan Engine Degradation Simulation
- 100 engines in training set
- 21 sensor measurements per cycle
- Goal: Predict Remaining Useful Life (cycles until failure)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Column names for NASA C-MAPSS dataset
COLUMN_NAMES = [
    'engine_id', 'cycle',
    'setting_1', 'setting_2', 'setting_3',
    's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10',
    's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21'
]

# Sensor columns that are useful for prediction (remove constant/noisy sensors)
USEFUL_SENSORS = ['s2', 's3', 's4', 's7', 's8', 's9', 's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21']

# Maximum RUL to cap (piecewise linear degradation)
MAX_RUL = 125


def load_data(data_dir: str = "data"):
    """Load NASA C-MAPSS FD001 dataset"""
    train_path = os.path.join(data_dir, "train_FD001.txt")
    test_path = os.path.join(data_dir, "test_FD001.txt")
    rul_path = os.path.join(data_dir, "RUL_FD001.txt")
    
    # Check if files exist, if not generate synthetic data
    if not os.path.exists(train_path):
        print("📊 NASA dataset not found. Generating synthetic training data...")
        return generate_synthetic_data()
    
    # Load training data
    train_df = pd.read_csv(train_path, sep=r'\s+', header=None, names=COLUMN_NAMES)
    
    # Load test data
    test_df = pd.read_csv(test_path, sep=r'\s+', header=None, names=COLUMN_NAMES)
    
    # Load RUL labels for test data
    rul_df = pd.read_csv(rul_path, sep=r'\s+', header=None, names=['RUL'])
    
    print(f"✅ Loaded training data: {len(train_df)} rows, {train_df['engine_id'].nunique()} engines")
    print(f"✅ Loaded test data: {len(test_df)} rows, {test_df['engine_id'].nunique()} engines")
    
    return train_df, test_df, rul_df


def generate_synthetic_data():
    """Generate synthetic data similar to NASA C-MAPSS FD001"""
    print("🔧 Generating synthetic NASA-style training data...")
    
    np.random.seed(42)
    
    n_engines = 100
    all_data = []
    
    for engine_id in range(1, n_engines + 1):
        # Random engine lifetime between 128-362 cycles (similar to FD001)
        max_cycles = np.random.randint(128, 363)
        
        for cycle in range(1, max_cycles + 1):
            # Progress towards failure (0 to 1)
            progress = cycle / max_cycles
            
            # Operational settings (typically constant for FD001)
            setting_1 = -0.0007 + np.random.normal(0, 0.001)
            setting_2 = -0.0004 + np.random.normal(0, 0.001)
            setting_3 = 100 + np.random.normal(0, 0.1)
            
            # Sensor patterns based on degradation
            # s2: Total temperature at LPC outlet (increases with degradation)
            s2 = 642.15 + progress * 2.5 + np.random.normal(0, 0.5)
            
            # s3: Total temperature at HPC outlet
            s3 = 1585.29 + progress * 8 + np.random.normal(0, 2)
            
            # s4: Total temperature at LPT outlet
            s4 = 1408.93 + progress * 5 + np.random.normal(0, 1.5)
            
            # s7: Total pressure at HPC outlet (decreases)
            s7 = 554.36 - progress * 3 + np.random.normal(0, 0.4)
            
            # s8: Physical fan speed (increases)
            s8 = 2388.04 + progress * 2 + np.random.normal(0, 0.8)
            
            # s9: Physical core speed
            s9 = 9065.24 + progress * 15 + np.random.normal(0, 3)
            
            # s11: Static pressure at HPC outlet
            s11 = 47.47 + progress * 0.6 + np.random.normal(0, 0.1)
            
            # s12: Ratio of fuel flow to Ps30
            s12 = 521.66 + progress * 4 + np.random.normal(0, 0.5)
            
            # s13: Corrected fan speed
            s13 = 2388.03 + progress * 2.5 + np.random.normal(0, 0.9)
            
            # s14: Corrected core speed
            s14 = 8138.62 + progress * 3 + np.random.normal(0, 1)
            
            # s15: Bypass Ratio
            s15 = 8.4195 - progress * 0.05 + np.random.normal(0, 0.02)
            
            # s17: Bleed Enthalpy
            s17 = 392.0 + progress * 2 + np.random.normal(0, 0.3)
            
            # s20: HPT coolant bleed
            s20 = 38.95 + progress * 0.3 + np.random.normal(0, 0.1)
            
            # s21: LPT coolant bleed
            s21 = 23.4190 + progress * 0.25 + np.random.normal(0, 0.05)
            
            # Other sensors (less important, more constant)
            s1 = 518.67 + np.random.normal(0, 0.1)
            s5 = 14.62 + np.random.normal(0, 0.01)
            s6 = 21.61 + np.random.normal(0, 0.01)
            s10 = 1.3 + np.random.normal(0, 0.01)
            s16 = 0.03 + np.random.normal(0, 0.001)
            s18 = 2000 + np.random.normal(0, 1)
            s19 = 100 + np.random.normal(0, 0.1)
            
            row = [
                engine_id, cycle,
                setting_1, setting_2, setting_3,
                s1, s2, s3, s4, s5, s6, s7, s8, s9, s10,
                s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21
            ]
            all_data.append(row)
    
    train_df = pd.DataFrame(all_data, columns=COLUMN_NAMES)
    
    # Save generated data
    os.makedirs("data", exist_ok=True)
    train_df.to_csv("data/train_FD001.txt", sep=' ', header=False, index=False)
    
    print(f"✅ Generated {len(train_df)} training samples from {n_engines} engines")
    
    # No test data for synthetic
    return train_df, None, None


def add_rul_column(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate RUL (Remaining Useful Life) for each row"""
    # For each engine, RUL = max_cycle - current_cycle
    df = df.copy()
    
    # Get max cycle for each engine
    max_cycles = df.groupby('engine_id')['cycle'].max().reset_index()
    max_cycles.columns = ['engine_id', 'max_cycle']
    
    # Merge and calculate RUL
    df = df.merge(max_cycles, on='engine_id')
    df['RUL'] = df['max_cycle'] - df['cycle']
    
    # Cap RUL at MAX_RUL (piecewise linear degradation assumption)
    df['RUL'] = df['RUL'].clip(upper=MAX_RUL)
    
    df = df.drop('max_cycle', axis=1)
    
    return df


def prepare_features(df: pd.DataFrame) -> tuple:
    """Prepare feature matrix and target for training"""
    # Add RUL column
    df = add_rul_column(df)
    
    # Select useful sensors as features
    X = df[USEFUL_SENSORS].values
    y = df['RUL'].values
    
    return X, y, df


def train_model(X_train, y_train, model_type: str = "random_forest"):
    """Train the ML model"""
    print(f"🌲 Training {model_type} model...")
    
    if model_type == "random_forest":
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
    elif model_type == "gradient_boosting":
        model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    model.fit(X_train, y_train)
    
    return model


def evaluate_model(model, X_test, y_test):
    """Evaluate model performance"""
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n📊 Model Evaluation:")
    print(f"   MAE:  {mae:.2f} cycles")
    print(f"   RMSE: {rmse:.2f} cycles")
    print(f"   R²:   {r2:.3f}")
    
    return {"mae": mae, "rmse": rmse, "r2": r2}


def save_model(model, scaler, output_dir: str = "ml"):
    """Save trained model and scaler"""
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, "rul_model.pkl")
    scaler_path = os.path.join(output_dir, "scaler.pkl")
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"\n✅ Model saved to {model_path}")
    print(f"✅ Scaler saved to {scaler_path}")


def main():
    """Main training pipeline"""
    print("=" * 60)
    print("🚀 NASA C-MAPSS FD001 Model Training")
    print("=" * 60)
    
    # Load data
    train_df, test_df, rul_df = load_data()
    
    # Prepare features
    X, y, df = prepare_features(train_df)
    
    print(f"\n📊 Dataset Statistics:")
    print(f"   Total samples: {len(X)}")
    print(f"   Features: {len(USEFUL_SENSORS)}")
    print(f"   RUL range: {y.min()} - {y.max()} cycles")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    print(f"\n📊 Train/Test Split:")
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    
    # Train model
    model = train_model(X_train, y_train, "random_forest")
    
    # Evaluate
    metrics = evaluate_model(model, X_test, y_test)
    
    # Save model
    save_model(model, scaler)
    
    # Feature importance
    print("\n📊 Top 5 Feature Importance:")
    importance = pd.DataFrame({
        'feature': USEFUL_SENSORS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for i, row in importance.head(5).iterrows():
        print(f"   {row['feature']}: {row['importance']:.4f}")
    
    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    
    return model, scaler, metrics


if __name__ == "__main__":
    main()
