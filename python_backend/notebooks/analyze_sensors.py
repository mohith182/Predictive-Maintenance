                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111                                                                 111                                                    """Analyze NASA sensor statistics to calibrate mapping"""
import sqlite3
import pandas as pd
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uptimeai.db")
conn = sqlite3.connect(DB_PATH)

# Get sensor statistics from training data (only selected sensors)
df = pd.read_sql('SELECT s2, s3, s4, s7, s8, s9, s11, s12, s13, s14, s15, s17, s20, s21, RUL FROM nasa_training_data', conn)

print('=== Sensor Statistics (NASA FD002) ===')
for col in ['s2', 's3', 's4', 's7', 's8', 's9', 's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21']:
    print(f'{col}: min={df[col].min():.2f}, max={df[col].max():.2f}, mean={df[col].mean():.2f}')

print()
print('=== RUL Distribution ===')
print(f'RUL: min={df["RUL"].min()}, max={df["RUL"].max()}, mean={df["RUL"].mean():.2f}')

# Show correlation (high RUL = healthy, low RUL = degraded)
print()
print('=== Sensor values at HEALTHY state (RUL > 100) ===')
healthy = df[df['RUL'] > 100]
for col in ['s2', 's3', 's4', 's7', 's11', 's12', 's13']:
    print(f'{col}: mean={healthy[col].mean():.2f}')

print()
print('=== Sensor values at DEGRADED state (RUL < 20) ===')
degraded = df[df['RUL'] < 20]
for col in ['s2', 's3', 's4', 's7', 's11', 's12', 's13']:
    print(f'{col}: mean={degraded[col].mean():.2f}')

conn.close()
