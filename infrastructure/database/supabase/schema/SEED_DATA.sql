-- ============================================================
-- NETRA AI — INDUSTRIAL PRODUCTION SEED DATA (v2.4.0 - FINAL SCHEMA SYNC)
-- Description: Synced with master2.sql strict clinical constraints.
-- Patient: Sujay (sunaysujsy@gmail.com)
-- Doctor: Dr. Rohith (rohitpanduru8@gmail.com)
-- Admin: Sunay (sunaypotnuru@gmail.com)
-- ============================================================

DO $$
DECLARE
    -- Stable UUIDs
    admin_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    doctor_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    patient_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    
    -- Model IDs
    anemia_model_id UUID := '11111111-1111-1111-1111-111111111111';
    cataract_model_id UUID := '22222222-2222-2222-2222-222222222222';
    dr_model_id UUID := '33333333-3333-3333-3333-333333333333';
    parkinson_model_id UUID := '44444444-4444-4444-4444-444444444444';
    mental_health_model_id UUID := '55555555-5555-5555-5555-555555555555';
    
    -- Badge IDs
    pioneer_badge_id UUID := 'bbbbbbbb-1111-bbbb-1111-bbbbbbbbbbbb';
    streak_badge_id UUID := 'bbbbbbbb-2222-bbbb-2222-bbbbbbbbbbbb';

    -- Auth Hash
    pw_hash TEXT := crypt('naraYANA8861*', gen_salt('bf'));
BEGIN

    -- 1. AUTH USERS (Core Identities)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, aud, role)
    VALUES 
    (admin_id, 'sunaypotnuru@gmail.com', pw_hash, NOW(), '{"provider":"email"}', '{"full_name":"Sunay","role":"admin"}', NOW() - INTERVAL '30 days', 'authenticated', 'authenticated'),
    (doctor_id, 'rohitpanduru8@gmail.com', pw_hash, NOW(), '{"provider":"email"}', '{"full_name":"Rohith","role":"doctor"}', NOW() - INTERVAL '30 days', 'authenticated', 'authenticated'),
    (patient_id, 'sunaysujsy@gmail.com', pw_hash, NOW(), '{"provider":"email"}', '{"full_name":"Sujay","role":"patient"}', NOW() - INTERVAL '30 days', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider)
    VALUES 
    (admin_id, admin_id, 'sunaypotnuru@gmail.com', jsonb_build_object('sub', admin_id), 'email'),
    (doctor_id, doctor_id, 'rohitpanduru8@gmail.com', jsonb_build_object('sub', doctor_id), 'email'),
    (patient_id, patient_id, 'sunaysujsy@gmail.com', jsonb_build_object('sub', patient_id), 'email')
    ON CONFLICT DO NOTHING;

    -- 2. PROFESSIONAL PROFILES
    INSERT INTO public.profiles_doctor (id, email, full_name, specialty, is_verified, consultation_fee, experience_years, license_number, rating, city)
    VALUES (doctor_id, 'rohitpanduru8@gmail.com', 'Dr. Rohith', 'Hematology & AI Diagnostics', true, 800, 15, 'IBM-Z-2026-MED', 4.95, 'Hyderabad')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles_patient (id, email, full_name, age, gender, blood_type, city, health_score, points, login_streak)
    VALUES (patient_id, 'sunaysujsy@gmail.com', 'Sujay', 26, 'male', 'B+', 'Hyderabad', 90, 1500, 8)
    ON CONFLICT (id) DO NOTHING;

    -- 3. AI MODEL REGISTRY
    INSERT INTO public.ai_models (id, name, version, model_type, medical_domain) VALUES
    (anemia_model_id, 'Netra-Anemia-V2', '2.0.0', 'Classification', 'Hematology'),
    (cataract_model_id, 'Netra-Cataract-V2', '2.0.0', 'Segmentation', 'Ophthalmology'),
    (dr_model_id, 'Netra-DR-V2', '2.0.0', 'Detection', 'Ophthalmology'),
    (parkinson_model_id, 'Netra-Voice-V2', '2.0.0', 'Signal Analysis', 'Neurology'),
    (mental_health_model_id, 'Netra-Sentiment-V1', '1.0.0', 'NLP', 'Psychiatry')
    ON CONFLICT (id) DO NOTHING;

    -- 4. SUJAY'S CLINICAL JOURNEY (7-Day History)
    
    -- Diagnostic Scans (Mapped to master2.sql constraint: normal, mild, moderate, severe, anemic, critical)
    INSERT INTO public.scans (patient_id, ai_model_id, scan_type, image_url, prediction, confidence, explanation_text, created_at) VALUES
    (patient_id, anemia_model_id, 'anemia', 'https://netra-ai.storage/samples/sujay_anemia_conjunctiva.jpg', 'anemic', 0.89, 'Pallor detected in conjunctival tissue.', NOW() - INTERVAL '6 days'),
    (patient_id, cataract_model_id, 'cataract', 'https://netra-ai.storage/samples/sujay_eye_iris.jpg', 'normal', 0.98, 'No opacification detected in lens.', NOW() - INTERVAL '5 days'),
    (patient_id, parkinson_model_id, 'parkinsons', 'https://netra-ai.storage/samples/sujay_voice_spectrogram.png', 'normal', 0.94, 'Vocal stability within normal parameters.', NOW() - INTERVAL '3 days');

    -- Lab Evidence
    INSERT INTO public.patient_lab_results (patient_id, test_name, result_value, units, abnormal_flag, collected_date)
    VALUES (patient_id, 'Hemoglobin (Hb)', 10.2, 'g/dL', 'L', NOW() - INTERVAL '4 days');

    -- Appointments & Meds (Appointment Status 'fulfilled' is valid per master2.sql line 20)
    INSERT INTO public.appointments (patient_id, doctor_id, scheduled_at, status, type, reason)
    VALUES (patient_id, doctor_id, NOW() - INTERVAL '2 days', 'fulfilled', 'video', 'Follow-up for Anemia AI Results');

    INSERT INTO public.patient_medications (patient_id, medication_name, dosage, frequency, prescribed_by, start_date)
    VALUES (patient_id, 'Ferrous Sulfate', '325mg', 'Once daily', doctor_id, NOW() - INTERVAL '1 day');

    -- 5. ENTERPRISE TELEMETRY (Activity Logs)
    INSERT INTO public.activity_logs (user_id, action, created_at) VALUES
    (admin_id, 'Viewed Global Health Analytics Dashboard', NOW() - INTERVAL '1 hour'),
    (admin_id, 'Performed Security Audit of Diagnostic Mesh', NOW() - INTERVAL '3 hours'),
    (doctor_id, 'Accessed Clinical Records: Patient Sujay', NOW() - INTERVAL '2 days'),
    (patient_id, 'Performed Anemia AI Self-Screening', NOW() - INTERVAL '6 days');

    -- 6. PATIENT ENGAGEMENT (Notifications & Badges)
    INSERT INTO public.notifications (user_id, type, title, message, created_at) VALUES
    (patient_id, 'medication', 'Medication Reminder', 'Time to take your Ferrous Sulfate (325mg).', NOW() - INTERVAL '2 hours'),
    (patient_id, 'scan', 'New Scan Result', 'Your Parkinson''s Voice Analysis is ready. Result: Healthy.', NOW() - INTERVAL '3 days');

    INSERT INTO public.badges (id, name, description, icon, points_reward) VALUES
    (pioneer_badge_id, 'Netra Pioneer', 'First successful AI-powered health scan.', '🚀', 500),
    (streak_badge_id, 'Consistency King', 'Maintained a 7-day health tracking streak.', '👑', 1000)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_badges (user_id, badge_id, earned_at) VALUES
    (patient_id, pioneer_badge_id, NOW() - INTERVAL '6 days'),
    (patient_id, streak_badge_id, NOW());

    RAISE NOTICE 'Netra AI Industrial Ecosystem Seeded Successfully.';
END $$;
