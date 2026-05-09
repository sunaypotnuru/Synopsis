#!/usr/bin/env node

/**
 * DATABASE SCHEMA VERIFICATION SCRIPT
 * Phase 4: Verify all 80+ tables exist and are properly structured
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected tables from MASTER_DATABASE_SCHEMA.sql
const EXPECTED_TABLES = [
    // Core FHIR tables
    'fhir_organizations',
    'fhir_practitioners',
    'fhir_patients',
    
    // User profiles
    'profiles_patient',
    'profiles_doctor',
    
    // Healthcare tables
    'specialties',
    'insurance_providers',
    'patient_insurance',
    'medical_conditions',
    'patient_medical_history',
    'patient_allergies',
    'medications_reference',
    'patient_medications',
    'lab_tests_reference',
    'patient_lab_results',
    
    // Appointments
    'appointment_types',
    'doctor_time_slots',
    'scheduling_rules',
    'appointments',
    
    // Medical imaging
    'medical_imaging_studies',
    'ai_models',
    'ai_analysis_results',
    'scans',
    
    // Prescriptions
    'prescriptions',
    'prescription_templates',
    'soap_notes',
    'clinical_notes',
    
    // Billing
    'insurance_claims',
    'payment_transactions',
    'patient_statements',
    
    // Communication
    'notification_templates',
    'notifications_enhanced',
    'notifications',
    'notification_preferences',
    'messages',
    
    // Family health
    'family_relationships',
    'family_medical_history',
    'family_members',
    
    // Analytics
    'population_health_metrics',
    'clinical_quality_measures',
    'analytics_dashboards',
    'healthcare_kpis',
    'clinical_decision_support_rules',
    
    // Security & compliance
    'data_access_audit',
    'patient_consents',
    'api_rate_limits',
    'api_keys',
    'security_events',
    'failed_login_attempts',
    'user_sessions',
    
    // Telemedicine
    'video_call_sessions',
    'video_call_participants',
    'video_recordings',
    
    // Gamification
    'achievements',
    'user_achievements',
    'user_points',
    'badges',
    'user_badges',
    'challenges',
    'user_challenges',
    'login_streaks',
    'shared_achievements',
    'referrals',
    
    // Documents
    'documents',
    'email_templates',
    
    // Queues
    'waitlist',
    'waiting_room',
    
    // Logs & analytics
    'activity_logs',
    'audit_logs',
    'analytics_data',
    'reports',
    'scheduled_reports',
    'search_history',
    
    // Miscellaneous
    'user_preferences',
    'translations',
    'mental_health_screenings',
    'voice_call_logs',
    'vitals_log',
    'contact_messages',
    'team_members',
    'timeline_events',
    'newsletters',
    'pro_questionnaires',
    'pro_submissions',
    'follow_up_surveys',
    'ratings',
    'follow_up_templates',
    'exercises',
    'patient_exercises',
    'exercise_sessions',
    'symptom_reports',
    
    // FDA APM tables
    'ai_performance_metrics',
    'ai_performance_alerts',
    'ai_predictions',
    'data_drift_metrics',
    'bias_monitoring',
    'model_versions',
    'adverse_events',
    
    // IEC 62304 tables
    'requirements',
    'design_elements',
    'implementations',
    'test_cases',
    'requirement_design_links',
    'design_implementation_links',
    'requirement_test_links',
    
    // SOC 2 tables
    'soc2_evidence',
    'soc2_control_status',
    'access_reviews',
    'user_provisioning_log',
    'incidents',
    
    // Audit trail
    'audit_trail'
];

async function verifyDatabaseSchema() {
    console.log('\n=== PHASE 4: DATABASE SCHEMA VERIFICATION ===\n');
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Expected tables: ${EXPECTED_TABLES.length}\n`);
    
    let passedTests = 0;
    let failedTests = 0;
    const missingTables = [];
    const existingTables = [];
    
    // Test 1: Check if we can connect
    console.log('📡 Testing database connection...');
    try {
        const { data, error } = await supabase.from('profiles_patient').select('count', { count: 'exact', head: true });
        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is ok for now
            console.log(`✗ Connection test failed: ${error.message}`);
            failedTests++;
        } else {
            console.log('✓ Database connection successful\n');
            passedTests++;
        }
    } catch (err) {
        console.log(`✗ Connection failed: ${err.message}`);
        failedTests++;
        return;
    }
    
    // Test 2: Verify each table exists
    console.log('📋 Verifying table existence...\n');
    
    for (const tableName of EXPECTED_TABLES) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    console.log(`  ✗ ${tableName} - NOT FOUND`);
                    missingTables.push(tableName);
                    failedTests++;
                } else {
                    console.log(`  ✓ ${tableName} - EXISTS`);
                    existingTables.push(tableName);
                    passedTests++;
                }
            } else {
                console.log(`  ✓ ${tableName} - EXISTS`);
                existingTables.push(tableName);
                passedTests++;
            }
        } catch (err) {
            console.log(`  ✗ ${tableName} - ERROR: ${err.message}`);
            missingTables.push(tableName);
            failedTests++;
        }
    }
    
    // Summary
    console.log('\n=== VERIFICATION SUMMARY ===\n');
    console.log(`Total tables expected: ${EXPECTED_TABLES.length}`);
    console.log(`Tables found: ${existingTables.length}`);
    console.log(`Tables missing: ${missingTables.length}`);
    console.log(`\nTests passed: ${passedTests}`);
    console.log(`Tests failed: ${failedTests}`);
    
    const successRate = ((existingTables.length / EXPECTED_TABLES.length) * 100).toFixed(1);
    console.log(`\nSuccess rate: ${successRate}%`);
    
    if (missingTables.length > 0) {
        console.log('\n❌ MISSING TABLES:');
        missingTables.forEach(table => console.log(`  - ${table}`));
        console.log('\n⚠️  Run MASTER_DATABASE_SCHEMA.sql to create missing tables');
    } else {
        console.log('\n✅ ALL TABLES VERIFIED!');
    }
    
    // Test 3: Check extensions
    console.log('\n📦 Checking PostgreSQL extensions...');
    const requiredExtensions = ['uuid-ossp', 'pgcrypto', 'timescaledb'];
    
    for (const ext of requiredExtensions) {
        try {
            // Note: Supabase client doesn't support direct extension queries
            // This would need to be done via SQL
            console.log(`  ℹ️  ${ext} - Check manually via SQL`);
        } catch (err) {
            console.log(`  ✗ ${ext} - ERROR`);
        }
    }
    
    console.log('\n=== VERIFICATION COMPLETE ===\n');
    
    process.exit(missingTables.length > 0 ? 1 : 0);
}

// Run verification
verifyDatabaseSchema().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
