"""
NASA C-MAPSS FD002 Model Training Script
Train ML model using real NASA Turbofan Engine Degradation dataset
Also stores the data in SQLite database for persistence
"""

import os
import sys
import sqlite3
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# NASA C-MAPSS column names
COLUMN_NAMES = [
    'engine_id', 'cycle',
    'setting_1', 'setting_2', 'setting_3',
    's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10',
    's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21'
]

# Selected sensors that show degradation patterns (based on NASA research)
SELECTED_SENSORS = ['s2', 's3', 's4', 's7', 's8', 's9', 's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21']

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uptimeai.db")


def load_fd002_data():
    """Load NASA C-MAPSS FD002 dataset"""
    train_path = os.path.join(DATA_DIR, "train_FD002.txt")
    test_path = os.path.join(DATA_DIR, "test_FD002.txt")
    rul_path = os.path.join(DATA_DIR, "RUL_FD002.txt")
    
    if not os.path.exists(train_path):
        raise FileNotFoundError(f"Training data not found at {train_path}")
    
    print("📂 Loading NASA C-MAPSS FD002 dataset...")
    
    # Load training data
    train_df = pd.read_csv(train_path, sep=r'\s+', header=None, names=COLUMN_NAMES)
    
    # Load test data
    test_df = pd.read_csv(test_path, sep=r'\s+', header=None, names=COLUMN_NAMES)
    
    # Load RUL labels for test data
    rul_df = pd.read_csv(rul_path, sep=r'\s+', header=None, names=['RUL'])
    
    print(f"✅ Loaded training data: {len(train_df)} rows, {train_df['engine_id'].nunique()} engines")
    print(f"✅ Loaded test data: {len(test_df)} rows, {test_df['engine_id'].nunique()} engines")
    print(f"✅ Loaded RUL labels: {len(rul_df)} engines")
    
    return train_df, test_df, rul_df


def add_rul_column(df):
    """Add Remaining Useful Life column to training data"""
    # For training data: RUL = max_cycle - current_cycle for each engine
    rul = df.groupby('engine_id')['cycle'].transform(lambda x: x.max() - x)
    df['RUL'] = rul
    return df


def store_data_in_database(train_df, test_df, rul_df):
    """Store NASA dataset in SQLite database"""
    print("💾 Storing data in SQLite database...")
    
    conn = sqlite3.connect(DB_PATH)
    
    # Create tables
    conn.execute("""
        CREATE TABLE IF NOT EXISTS nasa_training_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engine_id INTEGER,
            cycle INTEGER,
            setting_1 REAL,
            setting_2 REAL,
            setting_3 REAL,
            s1 REAL, s2 REAL, s3 REAL, s4 REAL, s5 REAL,
            s6 REAL, s7 REAL, s8 REAL, s9 REAL, s10 REAL,
            s11 REAL, s12 REAL, s13 REAL, s14 REAL, s15 REAL,
            s16 REAL, s17 REAL, s18 REAL, s19 REAL, s20 REAL, s21 REAL,
            RUL INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS nasa_test_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engine_id INTEGER,
            cycle INTEGER,
            setting_1 REAL,
            setting_2 REAL,
            setting_3 REAL,
            s1 REAL, s2 REAL, s3 REAL, s4 REAL, s5 REAL,
            s6 REAL, s7 REAL, s8 REAL, s9 REAL, s10 REAL,
            s11 REAL, s12 REAL, s13 REAL, s14 REAL, s15 REAL,
            s16 REAL, s17 REAL, s18 REAL, s19 REAL, s20 REAL, s21 REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS nasa_rul_labels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engine_id INTEGER,
            RUL INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS model_training_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_name TEXT,
            n_samples INTEGER,
            n_engines INTEGER,
            mae REAL,
            rmse REAL,
            r2 REAL,
            n_features INTEGER,
            n_estimators INTEGER,
            trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Clear existing data
    conn.execute("DELETE FROM nasa_training_data")
    conn.execute("DELETE FROM nasa_test_data")
    conn.execute("DELETE FROM nasa_rul_labels")
    
    # Store training data
    train_df.to_sql('nasa_training_data', conn, if_exists='append', index=False)
    
    # Store test data
    test_df.to_sql('nasa_test_data', conn, if_exists='append', index=False)
    
    # Store RUL labels
    rul_with_id = rul_df.copy()
    rul_with_id['engine_id'] = range(1, len(rul_df) + 1)
    rul_with_id.to_sql('nasa_rul_labels', conn, if_exists='append', index=False)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Stored {len(train_df)} training rows in database")
    print(f"✅ Stored {len(test_df)} test rows in database")
    print(f"✅ Stored {len(rul_df)} RUL labels in database")


def prepare_features(df):
    """Prepare feature matrix using selected sensors"""
    X = df[SELECTED_SENSORS].values
    return X


def train_model(train_df):
    """Train RandomForest model on NASA data"""
    print("\n🌲 Training RandomForest model on NASA FD002 data...")
    
    # Prepare features and target
    X = prepare_features(train_df)
    y = train_df['RUL'].values
    
    # Cap RUL at 125 cycles (common practice for NASA dataset)
    y = np.clip(y, 0, 125)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    print(f"   Features: {len(SELECTED_SENSORS)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=20,
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
        'feature': SELECTED_SENSORS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🔍 Top 5 Important Sensors:")
    for _, row in importance.head(5).iterrows():
        print(f"   {row['feature']}: {row['importance']:.4f}")
    
    return model, scaler, {
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'n_samples': len(X_train),
        'n_features': len(SELECTED_SENSORS)
    }


def save_model(model, scaler, metrics, n_engines):
    """Save model, scaler, and record training history"""
    os.makedirs(ML_DIR, exist_ok=True)
    
    model_path = os.path.join(ML_DIR, "rul_model.pkl")
    scaler_path = os.path.join(ML_DIR, "scaler.pkl")
    
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
    """, ('FD002', metrics['n_samples'], n_engines, metrics['mae'], metrics['rmse'], 
          metrics['r2'], metrics['n_features'], 100))
    conn.commit()
    conn.close()
    
    print(f"✅ Training history recorded in database")


def main():
    print("=" * 60)
    print("  NASA C-MAPSS FD002 Dataset Training")
    print("=" * 60)
    
    # Load data
    train_df, test_df, rul_df = load_fd002_data()
    
    # Add RUL column to training data
    train_df = add_rul_column(train_df)
    
    # Store in database
    store_data_in_database(train_df, test_df, rul_df)
    
    # Train model
    model, scaler, metrics = train_model(train_df)
    
    # Save model
    n_engines = train_df['engine_id'].nunique()
    save_model(model, scaler, metrics, n_engines)
    
    print("\n" + "=" * 60)
    print("  Training Complete!")
    print("=" * 60)
    print(f"\nDataset: NASA C-MAPSS FD002")
    print(f"Engines: {n_engines}")
    print(f"Total Samples: {len(train_df)}")
    print(f"Model: RandomForest (100 estimators, 14 features)")
    print(f"MAE: {metrics['mae']:.2f} cycles")
    print(f"R²: {metrics['r2']:.3f}")


if __name__ == "__main__":
    main()
