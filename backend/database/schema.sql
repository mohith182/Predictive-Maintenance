-- PostgreSQL Schema for AI-Based Machine Health Prediction System
-- Final Year Project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and alert recipients
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    location VARCHAR(100),
    installation_date DATE,
    status VARCHAR(20) DEFAULT 'NORMAL' CHECK (status IN ('NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE')),
    last_maintenance DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sensor readings table (raw data from machines)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    temperature DECIMAL(10, 2) NOT NULL,
    vibration DECIMAL(10, 4) NOT NULL,
    current DECIMAL(10, 4) NOT NULL,
    pressure DECIMAL(10, 2),
    runtime_hours INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for fast time-series queries
    CONSTRAINT sensor_readings_machine_timestamp_idx UNIQUE (machine_id, timestamp)
);

-- Predictions table (ML model outputs)
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    sensor_reading_id UUID REFERENCES sensor_readings(id) ON DELETE CASCADE,
    health_status VARCHAR(20) NOT NULL CHECK (health_status IN ('NORMAL', 'WARNING', 'CRITICAL')),
    predicted_rul INTEGER NOT NULL,  -- Remaining Useful Life in cycles
    confidence_score DECIMAL(5, 4) NOT NULL,  -- 0.0 to 1.0
    model_version VARCHAR(20) DEFAULT 'v1.0',
    prediction_time_ms INTEGER,  -- Prediction latency in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table (for warning/critical conditions)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert recipients (which users receive alerts for which machines)
CREATE TABLE IF NOT EXISTS alert_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    alert_types VARCHAR(50)[] DEFAULT ARRAY['WARNING', 'CRITICAL'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, machine_id)
);

-- Model training history
CREATE TABLE IF NOT EXISTS model_training_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    accuracy DECIMAL(5, 4),
    precision_score DECIMAL(5, 4),
    recall_score DECIMAL(5, 4),
    f1_score DECIMAL(5, 4),
    mae DECIMAL(10, 4),
    r2_score DECIMAL(5, 4),
    training_samples INTEGER,
    training_duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_machine_id ON sensor_readings(machine_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_machine_id ON predictions(machine_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_machine_id ON alerts(machine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(is_acknowledged);

-- Insert sample machines
INSERT INTO machines (machine_id, name, type, location, status) VALUES
('MCH-001', 'CNC Machine Alpha', 'CNC Mill', 'Building A, Floor 1', 'NORMAL'),
('MCH-002', 'Hydraulic Press Beta', 'Hydraulic Press', 'Building A, Floor 2', 'NORMAL'),
('MCH-003', 'Industrial Robot Gamma', 'Robot Arm', 'Building B, Floor 1', 'NORMAL'),
('MCH-004', 'Conveyor System Delta', 'Conveyor', 'Building B, Floor 1', 'NORMAL'),
('MCH-005', 'Compressor Epsilon', 'Air Compressor', 'Building C, Basement', 'NORMAL'),
('MCH-006', 'Lathe Machine Zeta', 'CNC Lathe', 'Building A, Floor 1', 'NORMAL')
ON CONFLICT (machine_id) DO NOTHING;

-- Function to update timestamp on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to trigger ML prediction after sensor reading insert (called from Node.js)
-- This is just a placeholder - actual prediction is done via HTTP call to FastAPI
CREATE OR REPLACE FUNCTION notify_new_sensor_reading()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_sensor_reading', json_build_object(
        'id', NEW.id,
        'machine_id', NEW.machine_id,
        'temperature', NEW.temperature,
        'vibration', NEW.vibration,
        'current', NEW.current,
        'pressure', NEW.pressure,
        'runtime_hours', NEW.runtime_hours,
        'timestamp', NEW.timestamp
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify on new sensor reading
CREATE TRIGGER sensor_reading_notify
    AFTER INSERT ON sensor_readings
    FOR EACH ROW EXECUTE FUNCTION notify_new_sensor_reading();

-- View for machine health overview
CREATE OR REPLACE VIEW machine_health_overview AS
SELECT 
    m.id,
    m.machine_id,
    m.name,
    m.type,
    m.location,
    m.status,
    p.health_status as latest_health_status,
    p.predicted_rul as latest_rul,
    p.confidence_score as latest_confidence,
    sr.temperature as latest_temperature,
    sr.vibration as latest_vibration,
    sr.current as latest_current,
    sr.timestamp as last_reading_time,
    (SELECT COUNT(*) FROM alerts a WHERE a.machine_id = m.id AND a.is_acknowledged = false) as unacknowledged_alerts
FROM machines m
LEFT JOIN LATERAL (
    SELECT * FROM predictions 
    WHERE machine_id = m.id 
    ORDER BY created_at DESC 
    LIMIT 1
) p ON true
LEFT JOIN LATERAL (
    SELECT * FROM sensor_readings 
    WHERE machine_id = m.id 
    ORDER BY timestamp DESC 
    LIMIT 1
) sr ON true;
