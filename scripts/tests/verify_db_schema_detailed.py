#!/usr/bin/env python3
"""
DATABASE SCHEMA VERIFICATION SCRIPT
Phase 4: Verify all 80+ tables exist and are properly structured
"""

import os
import sys
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
    sys.exit(1)

# Expected tables from MASTER_DATABASE_SCHEMA.sql
EXPECTED_TABLES = [
    # Core FHIR tables
    'fhir_organizations', 'fhir_practitioners', 'fhir_patients',
    
    # User profiles
    'profiles_patient', 'profiles_doctor',
    
    # Healthcare tables
    'specialties', 'insurance_providers', 'patient_insurance',
    'medical_conditions', 'patient_medical_history', 'patient_allergies',
    'medications_reference', 'patient_medications', 'lab_tests_reference',
    'patient_lab_results',
    
    # Appointments
    'appointment_types', 'doctor_time_slots', 'scheduling_rules', 'appointments',
    
    # Medical imaging
    'medical_imaging_studies', 'ai_models', 'ai_analysis_results', 'scans',
    
    # Prescriptions
    'prescriptions', 'prescription_templates', 'soap_notes', 'clinical_notes',
    
    # Billing
    'insurance_claims', 'payment_transactions', 'patient_statements',
    
    # Communication
    'notification_templates', 'notifications_enhanced', 'notifications',
    'notification_preferences', 'messages',
    
    # Family health
    'family_relationships', 'family_medical_history', 'family_members',
    
    # Analytics
    'population_health_metrics', 'clinical_quality_measures',
    'analytics_dashboards', 'healthcare_kpis', 'clinical_decision_support_rules',
    
    # Security & compliance
    'data_access_audit', 'patient_consents', 'api_rate_limits', 'api_keys',
    'security_events', 'failed_login_attempts', 'user_sessions',
    
    # Telemedicine
    'video_call_sessions', 'video_call_participants', 'video_recordings',
    
    # Gamification
    'achievements', 'user_achievements', 'user_points', 'badges', 'user_badges',
    'challenges', 'user_challenges', 'login_streaks', 'shared_achievements', 'referrals',
    
    # Documents
    'documents', 'email_templates',
    
    # Queues
    'waitlist', 'waiting_room',
    
    # Logs & analytics
    'activity_logs', 'audit_logs', 'analytics_data', 'reports',
    'scheduled_reports', 'search_history',
    
    # Miscellaneous
    'user_preferences', 'translations', 'mental_health_screenings',
    'voice_call_logs', 'vitals_log', 'contact_messages', 'team_members',
    'timeline_events', 'newsletters', 'pro_questionnaires', 'pro_submissions',
    'follow_up_surveys', 'ratings', 'follow_up_templates', 'exercises',
    'patient_exercises', 'exercise_sessions', 'symptom_reports',
    
    # FDA APM tables
    'ai_performance_metrics', 'ai_performance_alerts', 'ai_predictions',
    'data_drift_metrics', 'bias_monitoring', 'model_versions', 'adverse_events',
    
    # IEC 62304 tables
    'requirements', 'design_elements', 'implementations', 'test_cases',
    'requirement_design_links', 'design_implementation_links', 'requirement_test_links',
    
    # SOC 2 tables
    'soc2_evidence', 'soc2_control_status', 'access_reviews',
    'user_provisioning_log', 'incidents',
    
    # Audit trail
    'audit_trail'
]

def check_table_exists(table_name):
    """Check if a table exists in Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Prefer': 'count=exact'
    }
    
    try:
        response = requests.get(url, headers=headers, params={'limit': 0})
        
        if response.status_code == 200:
            return True, 'EXISTS'
        elif response.status_code == 404 or 'does not exist' in response.text:
            return False, 'NOT FOUND'
        else:
            return False, f'ERROR: {response.status_code}'
    except Exception as e:
        return False, f'ERROR: {str(e)}'

def main():
    print('\n=== PHASE 4: DATABASE SCHEMA VERIFICATION ===\n')
    print(f'Supabase URL: {SUPABASE_URL}')
    print(f'Expected tables: {len(EXPECTED_TABLES)}\n')
    
    passed_tests = 0
    failed_tests = 0
    missing_tables = []
    existing_tables = []
    
    # Test connection
    print('📡 Testing database connection...')
    exists, status = check_table_exists('profiles_patient')
    if exists or 'NOT FOUND' in status:
        print('✓ Database connection successful\n')
        passed_tests += 1
    else:
        print(f'✗ Connection test failed: {status}')
        failed_tests += 1
        return
    
    # Verify each table
    print('📋 Verifying table existence...\n')
    
    for table_name in EXPECTED_TABLES:
        exists, status = check_table_exists(table_name)
        
        if exists:
            print(f'  ✓ {table_name} - {status}')
            existing_tables.append(table_name)
            passed_tests += 1
        else:
            print(f'  ✗ {table_name} - {status}')
            missing_tables.append(table_name)
            failed_tests += 1
    
    # Summary
    print('\n=== VERIFICATION SUMMARY ===\n')
    print(f'Total tables expected: {len(EXPECTED_TABLES)}')
    print(f'Tables found: {len(existing_tables)}')
    print(f'Tables missing: {len(missing_tables)}')
    print(f'\nTests passed: {passed_tests}')
    print(f'Tests failed: {failed_tests}')
    
    success_rate = (len(existing_tables) / len(EXPECTED_TABLES)) * 100
    print(f'\nSuccess rate: {success_rate:.1f}%')
    
    if missing_tables:
        print('\n❌ MISSING TABLES:')
        for table in missing_tables[:20]:  # Show first 20
            print(f'  - {table}')
        if len(missing_tables) > 20:
            print(f'  ... and {len(missing_tables) - 20} more')
        print('\n⚠️  Run MASTER_DATABASE_SCHEMA.sql to create missing tables')
        print('   File: infrastructure/database/MASTER_DATABASE_SCHEMA.sql')
    else:
        print('\n✅ ALL TABLES VERIFIED!')
    
    print('\n=== VERIFICATION COMPLETE ===\n')
    
    sys.exit(0 if not missing_tables else 1)

if __name__ == '__main__':
    main()
