-- ============================================
-- Machine Health Prediction System
-- Database Setup Script
-- ============================================

-- Create the database (run this first in psql as superuser)
-- CREATE DATABASE machine_health_db;

-- Connect to the database
-- \c machine_health_db

-- ============================================
-- Drop existing tables (if recreating)
-- ============================================

DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS machine_readings CASCADE;

-- ============================================
-- Table 1: machine_readings
-- Stores raw sensor readings from machines
-- ============================================

CREATE TABLE machine_readings (
    id SERIAL PRIMARY KEY,
    temperature FLOAT NOT NULL,
    vibration FLOAT NOT NULL,
    current FLOAT NOT NULL,
    rul FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE machine_readings IS 'Stores raw sensor readings from machines';
COMMENT ON COLUMN machine_readings.temperature IS 'Temperature reading in Celsius';
COMMENT ON COLUMN machine_readings.vibration IS 'Vibration reading in mm/s';
COMMENT ON COLUMN machine_readings.current IS 'Electrical current reading in Amperes';
COMMENT ON COLUMN machine_readings.rul IS 'Remaining Useful Life in cycles (optional, can be updated by prediction)';

-- Create index for faster queries on timestamp
CREATE INDEX idx_readings_created_at ON machine_readings(created_at DESC);

-- ============================================
-- Table 2: predictions
-- Stores ML prediction results
-- ============================================

CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    reading_id INT REFERENCES machine_readings(id) ON DELETE CASCADE,
    predicted_rul FLOAT,
    health_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE predictions IS 'Stores ML prediction results linked to readings';
COMMENT ON COLUMN predictions.reading_id IS 'Foreign key to machine_readings table';
COMMENT ON COLUMN predictions.predicted_rul IS 'Predicted Remaining Useful Life in cycles';
COMMENT ON COLUMN predictions.health_status IS 'Health status: HEALTHY, WARNING, or CRITICAL';

-- Create indexes for faster queries
CREATE INDEX idx_predictions_reading_id ON predictions(reading_id);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_health_status ON predictions(health_status);

-- ============================================
-- Insert sample data (optional)
-- ============================================

INSERT INTO machine_readings (temperature, vibration, current, rul) VALUES
    (45.5, 1.2, 12.3, 95.5),
    (55.8, 2.5, 15.7, 72.3),
    (68.2, 4.8, 18.9, 45.1),
    (42.1, 0.8, 11.5, 110.2),
    (78.5, 6.2, 22.4, 28.7);

INSERT INTO predictions (reading_id, predicted_rul, health_status) VALUES
    (1, 95.5, 'HEALTHY'),
    (2, 72.3, 'WARNING'),
    (3, 45.1, 'WARNING'),
    (4, 110.2, 'HEALTHY'),
    (5, 28.7, 'CRITICAL');

-- ============================================
-- Verify tables
-- ============================================

SELECT 'machine_readings' as table_name, COUNT(*) as row_count FROM machine_readings
UNION ALL
SELECT 'predictions' as table_name, COUNT(*) as row_count FROM predictions;
