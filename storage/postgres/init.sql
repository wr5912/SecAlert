-- PostgreSQL Schema for SecAlert Phase 1
-- UUID primary key, JSONB for raw and OCSF events, optimized indexes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    src_ip INET,
    src_port INTEGER,
    dst_ip INET,
    dst_port INTEGER,
    protocol VARCHAR(20),
    severity VARCHAR(20),
    alert_signature VARCHAR(500),
    raw_event JSONB NOT NULL,
    ocsf_event JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns (per research)
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_source_type ON alerts(source_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_src_ip ON alerts(src_ip);
CREATE INDEX IF NOT EXISTS idx_alerts_dst_ip ON alerts(dst_ip);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- GIN index on JSONB fields for flexible querying
CREATE INDEX IF NOT EXISTS idx_alerts_raw_event ON alerts USING GIN (raw_event);
CREATE INDEX IF NOT EXISTS idx_alerts_ocsf_event ON alerts USING GIN (ocsf_event);

-- Partial index for active high-severity alerts
CREATE INDEX IF NOT EXISTS idx_alerts_active_high ON alerts(timestamp DESC)
    WHERE severity IN ('high', 'critical');

-- Comment on table
COMMENT ON TABLE alerts IS 'Security alerts from heterogeneous devices, normalized to OCSF format';
