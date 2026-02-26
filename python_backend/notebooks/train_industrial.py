"""
Industrial Sensor Model Training
Train ML model using industrial sensor data (temp, vibration, current)
Based on NASA degradation patterns adapted to industrial equipment
"""

import os
import sys
import sqlite3
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uptimeai.db")


def generate_industrial_data_from_nasa():
    """
    Generate industrial sensor data based on NASA FD002 degradation patterns
    Maps NASA RUL to industrial sensor readings
    """
    print("📊 Generating industrial sensor data from NASA patterns...")
    
    conn = sqlite3.connect(DB_PATH)
    
    # Get RUL distribution from NASA data
    nasa_df = pd.read_sql('SELECT RUL FROM nasa_training_data', conn)
    conn.close()
    
    n_samples = len(nasa_df)
    rul_values = nasa_df['RUL'].values
    rul_values = np.clip(rul_values, 0, 125)  # Cap at 125
    
    # Calculate degradation factor (0 = new, 1 = end of life)
    degradation = 1 - (rul_values / 125)
    
    # Generate correlated industrial sensor readings
    np.random.seed(42)
    
    # Temperature: Normal 45-55°C, degraded 70-95°C
    base_temp = 45 + degradation * 45
    temperature = base_temp + np.random.normal(0, 3, n_samples)
    temperature = np.clip(temperature, 35, 100)
    
    # Vibration: Normal 0.5-2 mm/s, degraded 4-9 mm/s
    base_vib = 0.5 + degradation * 7.5
    vibration = base_vib + np.random.normal(0, 0.5, n_samples)
    vibration = np.clip(vibration, 0.3, 10)
    
    # Current: Normal 10-14A, degraded 18-28A
    base_cur = 10 + degradation * 15
    current = base_cur + np.random.normal(0, 1.5, n_samples)
    current = np.clip(current, 8, 30)
    
    df = pd.DataFrame({
        'temperature': temperature,
        'vibration': vibration,
        'current': current,
        'RUL': rul_values
    })
    
    print(f"✅ Generated {len(df)} samples from NASA RUL patterns")
    return df


def store_industrial_data(df):
    """Store industrial sensor data in database"""
    print("💾 Storing industrial sensor data in database...")
    
    conn = sqlite3.connect(DB_PATH)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS industrial_training_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL,
            vibration REAL,
            current REAL,
            RUL REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("DELETE FROM industrial_training_data")
    df.to_sql('industrial_training_data', conn, if_exists='append', index=False)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Stored {len(df)} industrial samples in database")


def train_industrial_model(df):
    """Train RandomForest model on industrial sensor data"""
    print("\n🌲 Training RandomForest model on industrial sensor data...")
    
    X = df[['temperature', 'vibration', 'current']].values
    y = df['RUL'].values
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    print(f"   Features: 3 (temperature, vibration, current)")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n📊 Model Performance:")
    print(f"   MAE:  {mae:.2f} cycles")
    print(f"   RMSE: {rmse:.2f} cycles")
    print(f"   R²:   {r2:.3f}")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': ['temperature', 'vibration', 'current'],
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🔍 Feature Importance:")
    for _, row in importance.iterrows():
        print(f"   {row['feature']}: {row['importance']:.4f}")
    
    return model, scaler, {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'n_samples': len(X_train)
    }


def save_model(model, scaler, metrics):
    """Save model and scaler"""
    os.makedirs(ML_DIR, exist_ok=True)
    
    # Save as industrial model (3 features)
    model_path = os.path.join(ML_DIR, "industrial_model.pkl")
    scaler_path = os.path.join(ML_DIR, "industrial_scaler.pkl")
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"\n✅ Model saved to {model_path}")
    print(f"✅ Scaler saved to {scaler_path}")
    
    # Record training history
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO model_training_history 
        (dataset_name, n_samples, n_engines, mae, rmse, r2, n_features, n_estimators)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ('Industrial-NASA', metrics['n_samples'], 260, metrics['mae'], metrics['rmse'], 
          metrics['r2'], 3, 100))
    conn.commit()
    conn.close()


def main():
    print("=" * 60)
    print("  Industrial Sensor Model Training")
    print("  (Based on NASA FD002 degradation patterns)")
    print("=" * 60)
    
    # Generate data from NASA patterns
    df = generate_industrial_data_from_nasa()
    
    # Store in database
    store_industrial_data(df)
    
    # Train model
    model, scaler, metrics = train_industrial_model(df)
    
    # Save model
    save_model(model, scaler, metrics)
    
    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)
    print(f"\nModel: RandomForest (100 estimators, 3 features)")
    print(f"Features: temperature, vibration, current")
    print(f"MAE: {metrics['mae']:.2f} cycles")
    print(f"R²: {metrics['r2']:.3f}")


if __name__ == "__main__":
    main()
