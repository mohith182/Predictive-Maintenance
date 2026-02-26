"""Check database contents"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uptimeai.db")
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# List tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print('Tables:', [t[0] for t in tables])

# Count NASA data
c.execute('SELECT COUNT(*) FROM nasa_training_data')
print('NASA training rows:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM nasa_test_data')
print('NASA test rows:', c.fetchone()[0])

# Count industrial data
c.execute('SELECT COUNT(*) FROM industrial_training_data')
print('Industrial training rows:', c.fetchone()[0])

# Training history
c.execute('SELECT * FROM model_training_history ORDER BY trained_at DESC LIMIT 3')
rows = c.fetchall()
print('\nModel Training History:')
for r in rows:
    print(f'  Dataset: {r[1]}, Samples: {r[2]}, MAE: {r[4]:.2f}, R²: {r[6]:.3f}, Date: {r[8]}')

conn.close()
