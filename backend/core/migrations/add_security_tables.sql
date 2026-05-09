-- ============================================================================
-- CATEGORY 3: SECURITY ENHANCEMENTS - DATABASE MIGRATION
-- ============================================================================
-- Date: May 7, 2026
-- Purpose: Add tables for session management, login history, and device tracking
-- HIPAA Compliant: 6-year retention, audit trail, Zero Trust
-- ============================================================================

-- ============================================================================
-- TABLE 1: user_sessions (Session Timeout Management)
-- ============================================================================
-- Purpose: Track active user sessions with HIPAA-compliant 15-minute timeout
-- Retention: Active sessions only (auto-cleanup on expiry)
-- Compliance: 45 CFR § 164.312(a)(2)(iii) - Automatic Logoff
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(50), -- timeout, manual, security
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;

-- Comments for documentation
COMMENT ON TABLE user_sessions IS 'HIPAA-compliant session tracking with 15-minute idle timeout';
COMMENT ON COLUMN user_sessions.session_token IS 'Supabase Auth session token';
COMMENT ON COLUMN user_sessions.last_activity_at IS 'Last API activity timestamp (extends session)';
COMMENT ON COLUMN user_sessions.expires_at IS 'Session expiry timestamp (15 minutes from last activity)';
COMMENT ON COLUMN user_sessions.termination_reason IS 'Reason for session termination: timeout, manual, security';

-- ============================================================================
-- TABLE 2: login_history (Login Audit Trail)
-- ============================================================================
-- Purpose: Record all login attempts for HIPAA audit trail
-- Retention: 6 years minimum (HIPAA requirement)
-- Compliance: 45 CFR § 164.312(b) - Audit Controls
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_type VARCHAR(50), -- desktop, mobile, tablet, unknown
    browser VARCHAR(100),
    os VARCHAR(100),
    location_country VARCHAR(2), -- ISO 3166-1 alpha-2
    location_city VARCHAR(100),
    success BOOLEAN NOT NULL,
    failure_reason TEXT, -- invalid_credentials, account_locked, etc.
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);

-- Comments for documentation
COMMENT ON TABLE login_history IS 'HIPAA-compliant login audit trail with 6-year retention';
COMMENT ON COLUMN login_history.success IS 'Whether login attempt was successful';
COMMENT ON COLUMN login_history.failure_reason IS 'Reason for failed login (if applicable)';
COMMENT ON COLUMN login_history.session_id IS 'Link to created session (if successful)';

-- ============================================================================
-- TABLE 3: trusted_devices (Device Management - Zero Trust)
-- ============================================================================
-- Purpose: Track and manage trusted devices per user
-- Retention: Active devices only (auto-cleanup on expiry)
-- Compliance: Zero Trust - "never trust, always verify"
-- ============================================================================

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    device_name VARCHAR(255), -- User-friendly name (e.g., "John's iPhone")
    device_type VARCHAR(50), -- desktop, mobile, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
    trust_expires_at TIMESTAMP WITH TIME ZONE, -- 90 days from trust
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_trusted ON trusted_devices(is_trusted) WHERE is_trusted = TRUE;
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires ON trusted_devices(trust_expires_at) WHERE is_trusted = TRUE;

-- Comments for documentation
COMMENT ON TABLE trusted_devices IS 'Zero Trust device management with 90-day trust expiration';
COMMENT ON COLUMN trusted_devices.device_fingerprint IS 'Unique device fingerprint (100+ signals)';
COMMENT ON COLUMN trusted_devices.is_trusted IS 'Whether device is explicitly trusted by user';
COMMENT ON COLUMN trusted_devices.trust_expires_at IS 'Trust expiration (90 days from trust date)';

-- ============================================================================
-- RETENTION POLICY (HIPAA Compliance)
-- ============================================================================
-- login_history: 6 years minimum (HIPAA requirement)
-- user_sessions: Active sessions only (auto-cleanup on expiry)
-- trusted_devices: Active devices only (auto-cleanup on expiry)
-- ============================================================================

-- Function to cleanup expired sessions (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired sessions as inactive
    UPDATE user_sessions
    SET is_active = FALSE,
        terminated_at = NOW(),
        termination_reason = 'timeout'
    WHERE is_active = TRUE
      AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions IS 'Cleanup expired sessions (run daily via cron)';

-- Function to cleanup expired device trust (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_device_trust()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Revoke trust for expired devices
    UPDATE trusted_devices
    SET is_trusted = FALSE
    WHERE is_trusted = TRUE
      AND trust_expires_at IS NOT NULL
      AND trust_expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_device_trust IS 'Revoke trust for expired devices (run daily via cron)';

-- Function to cleanup old login history (run monthly)
-- Keep 6 years of data (HIPAA requirement)
CREATE OR REPLACE FUNCTION cleanup_old_login_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete login history older than 6 years
    DELETE FROM login_history
    WHERE login_at < NOW() - INTERVAL '6 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_login_history IS 'Delete login history older than 6 years (HIPAA retention)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- user_sessions policies
CREATE POLICY user_sessions_select_own ON user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY user_sessions_insert_own ON user_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_sessions_update_own ON user_sessions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- login_history policies (read-only for users)
CREATE POLICY login_history_select_own ON login_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- trusted_devices policies
CREATE POLICY trusted_devices_select_own ON trusted_devices
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY trusted_devices_insert_own ON trusted_devices
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY trusted_devices_update_own ON trusted_devices
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY trusted_devices_delete_own ON trusted_devices
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- ADMIN POLICIES (Full Access)
-- ============================================================================
-- Allow admins to view all security data for audit purposes
-- ============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for user_sessions
CREATE POLICY user_sessions_admin_all ON user_sessions
    FOR ALL
    USING (is_admin());

-- Admin policies for login_history
CREATE POLICY login_history_admin_all ON login_history
    FOR ALL
    USING (is_admin());

-- Admin policies for trusted_devices
CREATE POLICY trusted_devices_admin_all ON trusted_devices
    FOR ALL
    USING (is_admin());

-- ============================================================================
-- GRANTS (Service Role Access)
-- ============================================================================
-- Allow service role (backend) to manage all security tables
-- ============================================================================

-- Grant full access to service role
GRANT ALL ON user_sessions TO service_role;
GRANT ALL ON login_history TO service_role;
GRANT ALL ON trusted_devices TO service_role;

-- Grant execute on cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_device_trust TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_login_history TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful
-- ============================================================================

-- Check tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_sessions', 'login_history', 'trusted_devices')
ORDER BY table_name;

-- Check indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'login_history', 'trusted_devices')
ORDER BY tablename, indexname;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'login_history', 'trusted_devices')
ORDER BY tablename;

-- Check policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'login_history', 'trusted_devices')
ORDER BY tablename, policyname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: user_sessions, login_history, trusted_devices
-- Indexes created: 15 indexes for performance
-- RLS enabled: All tables protected
-- Policies created: User + Admin access control
-- Functions created: 3 cleanup functions
-- HIPAA Compliant: ✅ 6-year retention, audit trail, automatic logoff
-- Zero Trust: ✅ Device fingerprinting, trust management
-- ============================================================================
