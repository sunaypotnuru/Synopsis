-- ============================================================
-- Migration: 001_fix_appointment_status.sql
-- Description: Fix appointment status constraint to include all values used in code
-- Priority: CRITICAL
-- Estimated Time: 5 minutes
-- Rollback: Restore original constraint
-- ============================================================

-- Drop existing constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add new constraint with all status values used in code
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN (
  -- FHIR R4 standard values
  'proposed',      -- Appointment proposed by provider
  'pending',       -- Awaiting confirmation
  'booked',        -- Confirmed by patient
  'arrived',       -- Patient has arrived
  'fulfilled',     -- Appointment completed
  'cancelled',     -- Appointment cancelled
  'noshow',        -- Patient did not show up
  'entered-in-error', -- Created by mistake
  
  -- Additional values used in Netra AI backend
  'scheduled',     -- Scheduled (used as default)
  'confirmed',     -- Confirmed by both parties
  'completed',     -- Completed (alias for fulfilled)
  'in_progress',   -- Currently in progress
  'rescheduled',   -- Rescheduled to new time
  'waitlist'       -- On waitlist
));

-- Update default value to match code usage
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'scheduled';

-- Add comment for documentation
COMMENT ON COLUMN appointments.status IS 
'Appointment status. Uses FHIR R4 standard values plus custom values for Netra AI workflow.';

-- Verify no existing data violates new constraint
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM appointments
  WHERE status NOT IN (
    'proposed', 'pending', 'booked', 'arrived', 'fulfilled', 
    'cancelled', 'noshow', 'entered-in-error',
    'scheduled', 'confirmed', 'completed', 'in_progress', 
    'rescheduled', 'waitlist'
  );
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % appointments with invalid status values', invalid_count;
  END IF;
  
  RAISE NOTICE 'All existing appointment statuses are valid';
END $$;

-- Show current status distribution
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM appointments
GROUP BY status
ORDER BY count DESC;


-- ============================================================

-- ============================================================
-- Migration: 002_fix_duration_column.sql
-- Description: Add duration_minutes column as alias for estimated_duration
-- Priority: CRITICAL
-- Estimated Time: 5 minutes
-- Rollback: DROP COLUMN duration_minutes
-- ============================================================

-- Check if estimated_duration column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'estimated_duration'
  ) THEN
    RAISE EXCEPTION 'Column estimated_duration does not exist in appointments table';
  END IF;
END $$;

-- Add duration_minutes as computed column (no code changes needed)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER 
GENERATED ALWAYS AS (COALESCE(estimated_duration, 30)) STORED;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_duration 
ON appointments(duration_minutes);

-- Add comment
COMMENT ON COLUMN appointments.duration_minutes IS 
'Computed column: Alias for estimated_duration for backward compatibility with backend code. Defaults to 30 minutes if NULL.';

-- Verify column works
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count
  FROM appointments
  WHERE duration_minutes IS NOT NULL;
  
  RAISE NOTICE 'Successfully created duration_minutes column. % appointments have duration values.', test_count;
END $$;

-- Show duration distribution
SELECT 
  duration_minutes,
  COUNT(*) as count
FROM appointments
GROUP BY duration_minutes
ORDER BY duration_minutes;


-- ============================================================

-- ============================================================
-- Migration: 003_fix_reminder_columns.sql
-- Description: Add reminder columns with names matching backend code
-- Priority: CRITICAL
-- Estimated Time: 10 minutes
-- Rollback: DROP COLUMN reminder_24h_sent, reminder_1h_sent, etc.
-- ============================================================

-- Add reminder_24h_sent column (matches backend code)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN 
DEFAULT FALSE;

-- Add reminder_1h_sent column (matches backend code)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN 
DEFAULT FALSE;

-- Add timestamp columns used in backend code
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ;

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

-- Add indexes for reminder queries (runs every 5 minutes)
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_24h 
ON appointments(scheduled_at, reminder_24h_sent)
WHERE reminder_24h_sent = FALSE 
  AND status IN ('booked', 'scheduled', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_1h 
ON appointments(scheduled_at, reminder_1h_sent)
WHERE reminder_1h_sent = FALSE 
  AND status IN ('booked', 'scheduled', 'confirmed');

-- Add comments
COMMENT ON COLUMN appointments.reminder_24h_sent IS 
'TRUE if 24-hour reminder has been sent to patient';

COMMENT ON COLUMN appointments.reminder_1h_sent IS 
'TRUE if 1-hour reminder has been sent to patient';

COMMENT ON COLUMN appointments.reminder_24h_sent_at IS 
'Timestamp when 24-hour reminder was sent';

COMMENT ON COLUMN appointments.reminder_1h_sent_at IS 
'Timestamp when 1-hour reminder was sent';

-- If old columns exist (reminder_sent_24h, reminder_sent_1h), create sync trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'reminder_sent_24h'
  ) THEN
    -- Create trigger to keep old and new columns in sync
    CREATE OR REPLACE FUNCTION sync_reminder_columns()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Sync 24h reminder
      IF NEW.reminder_24h_sent IS DISTINCT FROM OLD.reminder_24h_sent THEN
        NEW.reminder_sent_24h := NEW.reminder_24h_sent;
      END IF;
      IF NEW.reminder_sent_24h IS DISTINCT FROM OLD.reminder_sent_24h THEN
        NEW.reminder_24h_sent := NEW.reminder_sent_24h;
      END IF;
      
      -- Sync 1h reminder
      IF NEW.reminder_1h_sent IS DISTINCT FROM OLD.reminder_1h_sent THEN
        NEW.reminder_sent_1h := NEW.reminder_1h_sent;
      END IF;
      IF NEW.reminder_sent_1h IS DISTINCT FROM OLD.reminder_sent_1h THEN
        NEW.reminder_1h_sent := NEW.reminder_sent_1h;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS sync_reminder_columns_trigger ON appointments;
    CREATE TRIGGER sync_reminder_columns_trigger
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION sync_reminder_columns();
    
    RAISE NOTICE 'Created sync trigger for old and new reminder columns';
  ELSE
    RAISE NOTICE 'Old reminder columns do not exist, no sync needed';
  END IF;
END $$;

-- Verify columns exist
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'appointments'
    AND column_name IN ('reminder_24h_sent', 'reminder_1h_sent', 
                        'reminder_24h_sent_at', 'reminder_1h_sent_at');
  
  IF col_count = 4 THEN
    RAISE NOTICE 'All 4 reminder columns created successfully';
  ELSE
    RAISE EXCEPTION 'Expected 4 reminder columns, found %', col_count;
  END IF;
END $$;

-- Show reminder statistics
SELECT 
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE reminder_24h_sent = TRUE) as reminders_24h_sent,
  COUNT(*) FILTER (WHERE reminder_1h_sent = TRUE) as reminders_1h_sent,
  COUNT(*) FILTER (WHERE reminder_24h_sent = FALSE AND scheduled_at > NOW()) as pending_24h_reminders,
  COUNT(*) FILTER (WHERE reminder_1h_sent = FALSE AND scheduled_at > NOW()) as pending_1h_reminders
FROM appointments
WHERE status IN ('booked', 'scheduled', 'confirmed');


-- ============================================================

-- ============================================================
-- Migration: 004_add_missing_appointment_columns.sql
-- Description: Add columns referenced in backend code but missing from schema
-- Priority: CRITICAL
-- Estimated Time: 5 minutes
-- Rollback: DROP COLUMN is_late_cancellation, payment_status
-- ============================================================

-- Add is_late_cancellation column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS is_late_cancellation BOOLEAN DEFAULT FALSE;

-- Add payment_status column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- Add CHECK constraint for payment_status
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_payment_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'waived'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_late_cancellation 
ON appointments(is_late_cancellation, cancelled_at)
WHERE is_late_cancellation = TRUE;

CREATE INDEX IF NOT EXISTS idx_appointments_payment_status 
ON appointments(payment_status, scheduled_at)
WHERE payment_status != 'paid';

-- Add comments for documentation
COMMENT ON COLUMN appointments.is_late_cancellation IS 
'TRUE if appointment was cancelled less than 24 hours before scheduled time. Used for cancellation policy enforcement and analytics.';

COMMENT ON COLUMN appointments.payment_status IS 
'Payment status for the appointment consultation fee. Values: pending (awaiting payment), paid (payment received), failed (payment failed), refunded (payment refunded), waived (fee waived).';

-- Verify columns exist
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'appointments'
    AND column_name IN ('is_late_cancellation', 'payment_status');
  
  IF col_count = 2 THEN
    RAISE NOTICE 'Both columns created successfully';
  ELSE
    RAISE EXCEPTION 'Expected 2 columns, found %', col_count;
  END IF;
END $$;

-- Show payment status distribution
SELECT 
  payment_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM appointments
GROUP BY payment_status
ORDER BY count DESC;

-- Show late cancellation statistics
SELECT 
  COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,
  COUNT(*) FILTER (WHERE is_late_cancellation = TRUE) as late_cancellations,
  ROUND(
    COUNT(*) FILTER (WHERE is_late_cancellation = TRUE) * 100.0 / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'cancelled'), 0),
    2
  ) as late_cancellation_rate
FROM appointments;


-- ============================================================

-- ============================================================
-- Migration: 005_add_prescription_pdf_url.sql
-- Description: Add pdf_url column to prescriptions table
-- Priority: CRITICAL
-- Estimated Time: 3 minutes
-- Rollback: DROP COLUMN pdf_url
-- ============================================================

-- Add pdf_url column
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add CHECK constraint for URL format (basic validation)
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_pdf_url_check;
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_pdf_url_check
CHECK (pdf_url IS NULL OR pdf_url ~ '^https?://');

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_prescriptions_pdf_url 
ON prescriptions(id, pdf_url) 
WHERE pdf_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN prescriptions.pdf_url IS 
'URL to the generated PDF prescription document stored in Supabase Storage (prescriptions bucket). Generated after prescription creation.';

-- Verify column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prescriptions' AND column_name = 'pdf_url'
  ) THEN
    RAISE NOTICE 'Column pdf_url created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create pdf_url column';
  END IF;
END $$;

-- Show PDF generation statistics
SELECT 
  COUNT(*) as total_prescriptions,
  COUNT(pdf_url) as prescriptions_with_pdf,
  ROUND(COUNT(pdf_url) * 100.0 / NULLIF(COUNT(*), 0), 2) as pdf_generation_rate
FROM prescriptions;


-- ============================================================

-- ============================================================
-- Migration: 006_add_status_constraints.sql
-- Description: Add CHECK constraints for status columns to validate values
-- Priority: HIGH
-- Estimated Time: 10 minutes
-- Rollback: DROP CONSTRAINT for each table
-- ============================================================

-- Scans: prediction constraint
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_prediction_check;
ALTER TABLE scans ADD CONSTRAINT scans_prediction_check 
CHECK (prediction IN (
  'normal',    -- No abnormality detected
  'mild',      -- Mild condition
  'moderate',  -- Moderate condition
  'severe',    -- Severe condition
  'anemic',    -- Anemia detected
  'critical'   -- Critical condition requiring immediate attention
));

COMMENT ON COLUMN scans.prediction IS 
'AI prediction result. Values: normal, mild, moderate, severe, anemic, critical';

-- Video consultations: status constraint
ALTER TABLE video_consultations DROP CONSTRAINT IF EXISTS video_consultations_status_check;
ALTER TABLE video_consultations ADD CONSTRAINT video_consultations_status_check
CHECK (status IN (
  'waiting',         -- Patient in waiting room
  'active',          -- Consultation in progress
  'completed',       -- Consultation completed normally
  'cancelled',       -- Consultation cancelled
  'emergency_ended'  -- Consultation ended due to emergency
));

COMMENT ON COLUMN video_consultations.status IS 
'Consultation status. Values: waiting, active, completed, cancelled, emergency_ended';

-- Notifications: email_status constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_email_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_email_status_check
CHECK (email_status IN (
  'pending',    -- Email queued for sending
  'sent',       -- Email sent to provider
  'delivered',  -- Email delivered to recipient
  'failed',     -- Email sending failed
  'bounced'     -- Email bounced back
));

COMMENT ON COLUMN notifications.email_status IS 
'Email delivery status. Values: pending, sent, delivered, failed, bounced';

-- Notifications: sms_status constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sms_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_sms_status_check
CHECK (sms_status IN (
  'pending',    -- SMS queued for sending
  'sent',       -- SMS sent to provider
  'delivered',  -- SMS delivered to recipient
  'failed'      -- SMS sending failed
));

COMMENT ON COLUMN notifications.sms_status IS 
'SMS delivery status. Values: pending, sent, delivered, failed';

-- Prescriptions: status constraint
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check
CHECK (status IN (
  'draft',      -- Draft prescription (not finalized)
  'active',     -- Active prescription
  'completed',  -- Prescription completed (all doses taken)
  'cancelled',  -- Prescription cancelled
  'expired',    -- Prescription expired
  'suspended'   -- Prescription temporarily suspended
));

COMMENT ON COLUMN prescriptions.status IS 
'Prescription status. Values: draft, active, completed, cancelled, expired, suspended';

-- Verify constraints were added
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'CHECK'
    AND constraint_name IN (
      'scans_prediction_check',
      'video_consultations_status_check',
      'notifications_email_status_check',
      'notifications_sms_status_check',
      'prescriptions_status_check'
    );
  
  IF constraint_count = 5 THEN
    RAISE NOTICE 'All 5 status constraints created successfully';
  ELSE
    RAISE WARNING 'Expected 5 constraints, found %. Some may already exist.', constraint_count;
  END IF;
END $$;

-- Show status distributions
SELECT 'scans.prediction' as table_column, prediction as value, COUNT(*) as count
FROM scans GROUP BY prediction
UNION ALL
SELECT 'video_consultations.status', status, COUNT(*)
FROM video_consultations GROUP BY status
UNION ALL
SELECT 'notifications.email_status', email_status, COUNT(*)
FROM notifications WHERE email_status IS NOT NULL GROUP BY email_status
UNION ALL
SELECT 'notifications.sms_status', sms_status, COUNT(*)
FROM notifications WHERE sms_status IS NOT NULL GROUP BY sms_status
UNION ALL
SELECT 'prescriptions.status', status, COUNT(*)
FROM prescriptions GROUP BY status
ORDER BY table_column, count DESC;


-- ============================================================

-- ============================================================

-- ============================================================
-- Migration: 008_fix_messaging_schema.sql
-- Description: Align messaging tables with backend MessageService requirements
-- Priority: CRITICAL
-- Estimated Time: 5 minutes
-- Rollback: DROP columns added
-- ============================================================

-- Fix public.messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix public.conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Fix public.conversation_participants
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add additional constraints
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'file', 'system', 'voice', 'video'));

-- Verify columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_deleted'
  ) THEN
    RAISE NOTICE 'Messaging schema successfully aligned with backend';
  ELSE
    RAISE EXCEPTION 'Failed to align messaging schema';
  END IF;
END $$;


-- ============================================================

-- ============================================================
-- Migration: 007_add_performance_indexes.sql
-- Description: Add indexes for frequently queried columns to improve performance
-- Priority: HIGH
-- Estimated Time: 15 minutes (depends on data volume)
-- Rollback: DROP INDEX for each index
-- ============================================================

-- ============================================================
-- APPOINTMENTS INDEXES
-- ============================================================

-- Status + Scheduled (for reminder queries - runs every 5 minutes)
CREATE INDEX IF NOT EXISTS idx_appointments_status_scheduled 
ON appointments(status, scheduled_at) 
WHERE status IN ('booked', 'scheduled', 'confirmed');

-- Doctor + Scheduled (for doctor dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_scheduled_active
ON appointments(doctor_id, scheduled_at DESC)
WHERE status IN ('booked', 'scheduled', 'confirmed');

-- Patient + Scheduled (for patient dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_scheduled_active
ON appointments(patient_id, scheduled_at DESC)
WHERE status IN ('booked', 'scheduled', 'confirmed');

-- Cancelled appointments (for analytics)
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled
ON appointments(cancelled_at DESC, cancelled_by)
WHERE status = 'cancelled';

-- ============================================================
-- SCANS INDEXES
-- ============================================================

-- Patient + Created (for patient history - most common query)
CREATE INDEX IF NOT EXISTS idx_scans_patient_created 
ON scans(patient_id, created_at DESC);

-- Reviewed status (for doctor pending scans)
CREATE INDEX IF NOT EXISTS idx_scans_pending_review 
ON scans(created_at DESC)
WHERE reviewed_by IS NULL;

-- Scan type + Created (for analytics)
CREATE INDEX IF NOT EXISTS idx_scans_type_created
ON scans(scan_type, created_at DESC);

-- ============================================================
-- NOTIFICATIONS INDEXES
-- ============================================================

-- User + Read + Created (for unread notifications - most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, created_at DESC) 
WHERE read = FALSE;

-- User + Type (for notification filtering)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
ON notifications(user_id, type, created_at DESC);

-- Delivery status (for monitoring)
CREATE INDEX IF NOT EXISTS idx_notifications_email_pending
ON notifications(email_status, created_at)
WHERE email_status = 'pending';

-- ============================================================
-- PRESCRIPTIONS INDEXES
-- ============================================================

-- Patient + Created (for patient prescriptions)
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created
ON prescriptions(patient_id, created_at DESC);

-- Doctor + Created (for doctor prescriptions)
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_created
ON prescriptions(doctor_id, created_at DESC);

-- Appointment (for prescription lookup by appointment)
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment
ON prescriptions(appointment_id)
WHERE appointment_id IS NOT NULL;

-- Status (for active prescriptions)
CREATE INDEX IF NOT EXISTS idx_prescriptions_active
ON prescriptions(status, created_at DESC)
WHERE status = 'active';

-- ============================================================
-- CLINICAL NOTES INDEXES
-- ============================================================

-- Patient + Created (for patient timeline)
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_created
ON clinical_notes(patient_id, created_at DESC);

-- Doctor + Created (for doctor's notes)
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor_created
ON clinical_notes(doctor_id, created_at DESC);

-- Appointment (for notes by appointment)
CREATE INDEX IF NOT EXISTS idx_clinical_notes_appointment
ON clinical_notes(appointment_id)
WHERE appointment_id IS NOT NULL;

-- ============================================================
-- VIDEO CONSULTATIONS INDEXES
-- ============================================================

-- Session ID (for quick lookups - most common query)
CREATE INDEX IF NOT EXISTS idx_video_consultations_session
ON video_consultations(session_id);

-- Status (for active consultations)
CREATE INDEX IF NOT EXISTS idx_video_consultations_active
ON video_consultations(status, started_at DESC)
WHERE status IN ('waiting', 'active');

-- Doctor + Status (for doctor's active consultations)
CREATE INDEX IF NOT EXISTS idx_video_consultations_doctor_active
ON video_consultations(doctor_id, status, started_at DESC)
WHERE status IN ('waiting', 'active');

-- Patient + Status (for patient's consultations)
CREATE INDEX IF NOT EXISTS idx_video_consultations_patient
ON video_consultations(patient_id, started_at DESC);

-- ============================================================
-- PROFILES INDEXES
-- ============================================================

-- Doctor: Specialty + Verified (for doctor search)
CREATE INDEX IF NOT EXISTS idx_profiles_doctor_specialty_verified
ON profiles_doctor(specialty, is_verified, rating DESC)
WHERE is_verified = TRUE;

-- Doctor: Full name search (for autocomplete)
CREATE INDEX IF NOT EXISTS idx_profiles_doctor_name_search
ON profiles_doctor USING gin(to_tsvector('english', full_name))
WHERE is_verified = TRUE;

-- Patient: Email (for lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_patient_email
ON profiles_patient(email);

-- ============================================================
-- MESSAGES INDEXES
-- ============================================================

-- Conversation + Created (for message history)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC)
WHERE is_deleted = FALSE;

-- Sender + Created (for sent messages)
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON messages(sender_id, created_at DESC)
WHERE is_deleted = FALSE;

-- ============================================================
-- VERIFY INDEXES
-- ============================================================

DO $$
DECLARE
  index_count INTEGER;
  expected_count INTEGER := 30;  -- Update this if you add/remove indexes
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND indexname IN (
      'idx_appointments_status_scheduled',
      'idx_appointments_doctor_scheduled_active',
      'idx_appointments_patient_scheduled_active',
      'idx_appointments_cancelled',
      'idx_scans_patient_created',
      'idx_scans_pending_review',
      'idx_scans_type_created',
      'idx_notifications_user_unread',
      'idx_notifications_user_type',
      'idx_notifications_email_pending',
      'idx_prescriptions_patient_created',
      'idx_prescriptions_doctor_created',
      'idx_prescriptions_appointment',
      'idx_prescriptions_active',
      'idx_clinical_notes_patient_created',
      'idx_clinical_notes_doctor_created',
      'idx_clinical_notes_appointment',
      'idx_video_consultations_session',
      'idx_video_consultations_active',
      'idx_video_consultations_doctor_active',
      'idx_video_consultations_patient',
      'idx_profiles_doctor_specialty_verified',
      'idx_profiles_doctor_name_search',
      'idx_profiles_patient_email',
      'idx_messages_conversation_created',
      'idx_messages_sender_created'
    );
  
  RAISE NOTICE 'Created % out of % expected indexes', index_count, expected_count;
  
  IF index_count < expected_count THEN
    RAISE WARNING 'Some indexes may not have been created. Check for errors above.';
  END IF;
END $$;

-- Show index sizes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 20;

-- Show total index size
SELECT 
  pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as total_index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';


-- ============================================================

-- ============================================================
-- VERIFICATION SCRIPT
-- Run this after all migrations to verify fixes were successful
-- ============================================================

SELECT '============================================================' as header
UNION ALL SELECT 'DATABASE SCHEMA FIX VERIFICATION'
UNION ALL SELECT '============================================================';

-- ============================================================
-- 1. VERIFY APPOINTMENT STATUS CONSTRAINT
-- ============================================================
SELECT '1. Checking appointment status constraint...' as step;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'appointments_status_check'
        AND check_clause LIKE '%scheduled%'
        AND check_clause LIKE '%confirmed%'
        AND check_clause LIKE '%completed%'
    ) THEN '✅ PASS: Appointment status constraint includes all required values'
    ELSE '❌ FAIL: Appointment status constraint missing required values'
  END as result;

-- Show current status distribution
SELECT 'Current status distribution:' as info;
SELECT 
  status,
  COUNT(*) as count
FROM appointments
GROUP BY status
ORDER BY count DESC;

-- ============================================================
-- 2. VERIFY DURATION COLUMN
-- ============================================================
SELECT '2. Checking duration_minutes column...' as step;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'appointments' 
        AND column_name = 'duration_minutes'
    ) THEN '✅ PASS: duration_minutes column exists'
    ELSE '❌ FAIL: duration_minutes column missing'
  END as result;

-- Show duration statistics
SELECT 'Duration statistics:' as info;
SELECT 
  ROUND(AVG(duration_minutes), 2) as avg_duration_min,
  MIN(duration_minutes) as min_duration_min,
  MAX(duration_minutes) as max_duration_min,
  COUNT(*) FILTER (WHERE duration_minutes IS NULL) as null_count
FROM appointments;

-- ============================================================
-- 3. VERIFY REMINDER COLUMNS
-- ============================================================
SELECT '3. Checking reminder columns...' as step;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'appointments' 
        AND column_name IN ('reminder_24h_sent', 'reminder_1h_sent', 
                            'reminder_24h_sent_at', 'reminder_1h_sent_at')
    ) = 4 THEN '✅ PASS: All 4 reminder columns exist'
    ELSE '❌ FAIL: Some reminder columns missing'
  END as result;

-- Show reminder statistics
SELECT 'Reminder statistics:' as info;
SELECT 
  COUNT(*) FILTER (WHERE reminder_24h_sent = TRUE) as reminders_24h_sent,
  COUNT(*) FILTER (WHERE reminder_1h_sent = TRUE) as reminders_1h_sent,
  COUNT(*) FILTER (WHERE reminder_24h_sent = FALSE AND scheduled_at > NOW()) as pending_24h,
  COUNT(*) FILTER (WHERE reminder_1h_sent = FALSE AND scheduled_at > NOW()) as pending_1h
FROM appointments
WHERE status IN ('booked', 'scheduled', 'confirmed');

-- ============================================================
-- 4. VERIFY MISSING APPOINTMENT COLUMNS
-- ============================================================
SELECT '4. Checking missing appointment columns...' as step;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'appointments' 
        AND column_name IN ('is_late_cancellation', 'payment_status')
    ) = 2 THEN '✅ PASS: is_late_cancellation and payment_status columns exist'
    ELSE '❌ FAIL: Some columns missing'
  END as result;

-- Show payment status distribution
SELECT 'Payment status distribution:' as info;
SELECT 
  payment_status,
  COUNT(*) as count
FROM appointments
GROUP BY payment_status
ORDER BY count DESC;

-- ============================================================
-- 5. VERIFY PRESCRIPTION PDF_URL COLUMN
-- ============================================================
SELECT '5. Checking prescription pdf_url column...' as step;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'prescriptions' 
        AND column_name = 'pdf_url'
    ) THEN '✅ PASS: pdf_url column exists'
    ELSE '❌ FAIL: pdf_url column missing'
  END as result;

-- Show PDF generation statistics
SELECT 'PDF generation statistics:' as info;
SELECT 
  COUNT(*) as total_prescriptions,
  COUNT(pdf_url) as with_pdf,
  ROUND(COUNT(pdf_url) * 100.0 / NULLIF(COUNT(*), 0), 2) || '%' as generation_rate
FROM prescriptions;

-- ============================================================
-- 6. VERIFY STATUS CONSTRAINTS
-- ============================================================
SELECT '6. Checking status validation constraints...' as step;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.check_constraints
      WHERE constraint_name IN (
        'scans_prediction_check',
        'video_consultations_status_check',
        'notifications_email_status_check',
        'notifications_sms_status_check',
        'prescriptions_status_check'
      )
    ) >= 5 THEN '✅ PASS: All status constraints exist'
    ELSE '❌ FAIL: Some status constraints missing'
  END as result;

-- ============================================================
-- 7. VERIFY PERFORMANCE INDEXES
-- ============================================================
SELECT '7. Checking performance indexes...' as step;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        AND indexname IN (
          'idx_appointments_status_scheduled',
          'idx_appointments_doctor_scheduled_active',
          'idx_appointments_patient_scheduled_active',
          'idx_scans_patient_created',
          'idx_notifications_user_unread',
          'idx_prescriptions_patient_created',
          'idx_prescriptions_doctor_created',
          'idx_clinical_notes_patient_created',
          'idx_video_consultations_session'
        )
    ) >= 9 THEN '✅ PASS: Key performance indexes exist'
    ELSE '⚠️  WARNING: Some indexes may be missing'
  END as result;

-- Show index count
SELECT 'Index statistics:' as info;
SELECT 
  COUNT(*) as total_custom_indexes,
  pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as total_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- ============================================================
-- 8. VERIFY NO INVALID DATA
-- ============================================================
SELECT '8. Checking for invalid data...' as step;

-- Check for invalid appointment statuses
SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM appointments
      WHERE status NOT IN (
        'proposed', 'pending', 'booked', 'arrived', 'fulfilled', 
        'cancelled', 'noshow', 'entered-in-error',
        'scheduled', 'confirmed', 'completed', 'in_progress', 
        'rescheduled', 'waitlist'
      )
    ) = 0 THEN '✅ PASS: No invalid appointment statuses'
    ELSE '❌ FAIL: Found invalid appointment statuses'
  END as result;

-- Check for NULL durations
SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM appointments
      WHERE duration_minutes IS NULL
    ) = 0 THEN '✅ PASS: No NULL durations'
    ELSE '⚠️  WARNING: Found appointments with NULL duration'
  END as result;

-- ============================================================
-- 9. OVERALL SUMMARY
-- ============================================================
SELECT '============================================================' as footer
UNION ALL SELECT 'OVERALL SUMMARY'
UNION ALL SELECT '============================================================';

SELECT 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name IN ('duration_minutes', 'reminder_24h_sent', 'reminder_1h_sent', 'is_late_cancellation', 'payment_status')) as appointments_new_cols,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'pdf_url') as prescriptions_new_cols,
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_type = 'CHECK' AND table_name IN ('appointments', 'prescriptions', 'scans', 'notifications', 'video_consultations')) as total_check_constraints,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as total_performance_indexes;

SELECT 'VERIFICATION COMPLETE' as status;
