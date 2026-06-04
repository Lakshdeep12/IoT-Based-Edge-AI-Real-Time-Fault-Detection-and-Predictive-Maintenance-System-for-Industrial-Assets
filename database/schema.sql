CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    name VARCHAR,
    role VARCHAR NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    location VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'healthy',
    health INTEGER NOT NULL DEFAULT 100,
    failure_prob DOUBLE PRECISION NOT NULL DEFAULT 0,
    rul INTEGER NOT NULL DEFAULT 180,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telemetry (
    telemetry_id SERIAL PRIMARY KEY,
    device_id VARCHAR NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    vibration_mps2 DOUBLE PRECISION NOT NULL,
    temperature_c DOUBLE PRECISION NOT NULL,
    runtime DOUBLE PRECISION NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_telemetry_device_recorded_at ON telemetry(device_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS predictions (
    prediction_id SERIAL PRIMARY KEY,
    device_id VARCHAR NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    telemetry_id INTEGER REFERENCES telemetry(telemetry_id) ON DELETE SET NULL,
    ml_model_used VARCHAR NOT NULL,
    predicted_state VARCHAR NOT NULL,
    predicted_code INTEGER NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    time_to_failure_sec DOUBLE PRECISION,
    failure_probability DOUBLE PRECISION,
    remaining_useful_life DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_predictions_device_recorded_at ON predictions(device_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id SERIAL PRIMARY KEY,
    device_id VARCHAR NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    prediction_id INTEGER REFERENCES predictions(prediction_id) ON DELETE SET NULL,
    alert_type VARCHAR NOT NULL,
    llm_remediation_guide TEXT,
    severity VARCHAR NOT NULL DEFAULT 'warning',
    status VARCHAR NOT NULL DEFAULT 'active',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_alerts_device_status ON alerts(device_id, status);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    log_id SERIAL PRIMARY KEY,
    device_id VARCHAR NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    alert_id INTEGER REFERENCES alerts(alert_id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    technician VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
