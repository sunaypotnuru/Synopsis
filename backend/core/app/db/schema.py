"""
db/schema.py — Single source of truth for all database table and column names.

Every route file imports from here. If the schema changes, update ONLY this file.
Never hardcode table or column names directly in route files.
"""

# ─── Table Names ────────────────────────────────────────────────────────────────


class Tables:
    # Auth / Profiles
    PROFILES_PATIENT = "profiles_patient"
    PROFILES_DOCTOR = "profiles_doctor"

    # Appointments & Scheduling
    APPOINTMENTS = "appointments"
    WAITLIST = "waitlist"

    # Messaging
    MESSAGES = "messages"

    # Notifications
    NOTIFICATIONS = "notifications"
    NOTIFICATION_PREFS = "notification_preferences"

    # Gamification
    GAMIFICATION = "gamification"  # Main gamification table
    ACHIEVEMENTS = "achievements"
    USER_ACHIEVEMENTS = "user_achievements"
    USER_POINTS = "user_points"
    LOGIN_STREAKS = "login_streaks"  # NOT "user_streaks"
    BADGES = "badges"
    USER_BADGES = "user_badges"
    CHALLENGES = "challenges"
    USER_CHALLENGES = "user_challenges"

    # Medical Records
    SCANS = "scans"
    PRESCRIPTIONS = "prescriptions"
    PRESCRIPTION_TEMPLATES = "prescription_templates"
    MEDICATIONS = "medications"
    MEDICATION_LOGS = "medication_logs"
    VITALS_LOG = "vitals_log"
    CLINICAL_NOTES = "clinical_notes"
    NOTE_TEMPLATES = "note_templates"
    RISK_ASSESSMENTS = "risk_assessments"
    FOLLOW_UP_SURVEYS = "follow_up_surveys"
    RATINGS = "ratings"
    MENTAL_HEALTH_SCREENINGS = "mental_health_screenings"

    # Health Goals
    HEALTH_GOALS = "health_goals"
    GOAL_PROGRESS = "goal_progress"
    GOAL_ACHIEVEMENTS = "goal_achievements"

    # Documents & Timeline
    DOCUMENTS = "documents"
    TIMELINE_EVENTS = "timeline_events"

    # Family
    FAMILY_MEMBERS = "family_members"

    # Referrals
    REFERRALS = "referrals"
    MEDICAL_REFERRALS = "medical_referrals"

    # Complaints
    COMPLAINTS = "complaints"
    COMPLAINT_MESSAGES = "complaint_messages"

    # Audit / Security
    AUDIT_LOGS = "audit_logs"
    USER_SESSIONS = "user_sessions"

    # Team & Public
    TEAM_MEMBERS = "team_members"

    # Risk & Mental Health
    RISK_ASSESSMENTS = "risk_assessments"
    MENTAL_HEALTH_SCREENINGS = "mental_health_screenings"

    # Complaints
    COMPLAINTS = "complaints"
    COMPLAINT_MESSAGES = "complaint_messages"


# ─── Column Maps ────────────────────────────────────────────────────────────────
# Each inner class lists the EXACT column names as they exist in the DB schema.
# Use these instead of string literals in queries.


class Col:

    class Messages:
        ID = "id"
        SENDER_ID = "sender_id"
        RECIPIENT_ID = "recipient_id"
        CONTENT = "content"
        ATTACHMENT_URL = "attachment_url"
        READ = "read"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Notifications:
        ID = "id"
        USER_ID = "user_id"
        TYPE = "type"
        TITLE = "title"
        MESSAGE = "message"
        DATA = "data"  # JSONB — store extra fields here
        READ = "read"
        CHANNEL = "channel"  # 'email' | 'sms' | 'both'
        EMAIL_STATUS = "email_status"
        SMS_STATUS = "sms_status"
        PROVIDER_MESSAGE_ID = "provider_message_id"
        SENT_AT = "sent_at"
        DELIVERED_AT = "delivered_at"
        ERROR_MESSAGE = "error_message"
        CREATED_AT = "created_at"
        # NOTE: no read_at, no action_url, no status, no priority, no channels columns

    class NotificationPrefs:
        ID = "id"
        USER_ID = "user_id"
        EMAIL_ENABLED = "email_enabled"
        PUSH_ENABLED = "push_enabled"
        SMS_ENABLED = "sms_enabled"
        IN_APP_ENABLED = "in_app_enabled"
        APPOINTMENT_REMINDERS = "appointment_reminders"
        SCAN_RESULTS = "scan_results"
        PRESCRIPTION_UPDATES = "prescription_updates"
        MARKETING = "marketing"
        NEWSLETTER = "newsletter"
        QUIET_HOURS_START = "quiet_hours_start"
        QUIET_HOURS_END = "quiet_hours_end"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class FollowUpSurveys:
        ID = "id"
        PATIENT_ID = "patient_id"
        DOCTOR_ID = "doctor_id"
        APPOINTMENT_ID = "appointment_id"
        RESPONSE = "response"  # text feedback — NOT "review", NOT "feedback"
        RATING = "rating"  # integer 1-5
        ANSWERED_AT = "answered_at"
        # NOTE: no "review" column, no "feedback" column, no "created_at" column

    class UserPoints:
        ID = "id"
        USER_ID = "user_id"
        TOTAL_POINTS = "total_points"  # NOT "points"
        POINTS_EARNED_THIS_MONTH = "points_earned_this_month"
        POINTS_REDEEMED = "points_redeemed"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"
        # NOTE: no "level" column, no "achievements" column, no "achievement_id" column

    class LoginStreaks:
        ID = "id"
        USER_ID = "user_id"
        CURRENT_STREAK = "current_streak"
        LONGEST_STREAK = "longest_streak"
        LAST_LOGIN_DATE = "last_login_date"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Achievements:
        ID = "id"
        CODE = "code"
        NAME = "name"
        TITLE = "title"
        DESCRIPTION = "description"
        ICON = "icon"
        POINTS = "points"
        CATEGORY = "category"
        REQUIREMENT_TYPE = "requirement_type"
        REQUIREMENT_VALUE = "requirement_value"
        TARGET_VALUE = "target_value"
        ROLE_TYPE = "role_type"
        CREATED_AT = "created_at"

    class UserAchievements:
        ID = "id"
        USER_ID = "user_id"
        ACHIEVEMENT_ID = "achievement_id"
        PROGRESS = "progress"
        IS_COMPLETED = "is_completed"
        COMPLETED_AT = "completed_at"
        CREATED_AT = "created_at"

    class TimelineEvents:
        ID = "id"
        USER_ID = "user_id"  # NOT "patient_id"
        EVENT_TYPE = "event_type"  # NOT "category"
        EVENT_DATE = "event_date"  # TIMESTAMPTZ
        TITLE = "title"
        DESCRIPTION = "description"
        METADATA = "metadata"
        RELATED_ID = "related_id"
        CREATED_AT = "created_at"

    class Documents:
        ID = "id"
        PATIENT_ID = "patient_id"
        UPLOADED_BY = "uploaded_by"
        TITLE = "title"
        DESCRIPTION = "description"
        FILE_URL = "file_url"
        FILE_NAME = "file_name"
        FILE_TYPE = "file_type"
        FILE_SIZE = "file_size"
        CATEGORY = "category"
        DOCUMENT_TYPE = "document_type"
        TAGS = "tags"
        IS_SHARED = "is_shared"
        SHARED_WITH = "shared_with"
        SHARED_WITH_DOCTOR_ID = "shared_with_doctor_id"
        SHARED_AT = "shared_at"
        NOTES = "notes"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Appointments:
        ID = "id"
        PATIENT_ID = "patient_id"
        DOCTOR_ID = "doctor_id"
        SCHEDULED_AT = "scheduled_at"
        STATUS = "status"
        TYPE = "type"
        REASON = "reason"
        NOTES = "notes"
        CONSULTATION_FEE = "consultation_fee"
        PAYMENT_STATUS = "payment_status"
        PAYMENT_METHOD = "payment_method"
        PAID_AT = "paid_at"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class ProfilesPatient:
        ID = "id"
        EMAIL = "email"
        FULL_NAME = "full_name"
        DATE_OF_BIRTH = "date_of_birth"
        AGE = "age"
        GENDER = "gender"
        BLOOD_TYPE = "blood_type"
        PHONE = "phone"
        HEALTH_SCORE = "health_score"
        POINTS = "points"
        LOGIN_STREAK = "login_streak"
        LAST_LOGIN_DATE = "last_login_date"
        LANGUAGE = "language"
        AVATAR_URL = "avatar_url"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"
        # NOTE: no "preferred_language" column — use "language"

    class ProfilesDoctor:
        ID = "id"
        EMAIL = "email"
        FULL_NAME = "full_name"
        SPECIALTY = "specialty"
        RATING = "rating"
        IS_VERIFIED = "is_verified"
        CONSULTATION_FEE = "consultation_fee"
        BIO = "bio"
        EXPERIENCE_YEARS = "experience_years"
        LICENSE_NUMBER = "license_number"
        AVAILABILITY = "availability"
        PHONE = "phone"
        AVATAR_URL = "avatar_url"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Scans:
        ID = "id"
        PATIENT_ID = "patient_id"
        DOCTOR_ID = "doctor_id"
        IMAGE_URL = "image_url"
        PREDICTION = "prediction"
        CONFIDENCE = "confidence"  # NOT "confidence_score"
        HEMOGLOBIN_ESTIMATE = "hemoglobin_estimate"  # NOT "hemoglobin_level"
        RECOMMENDATIONS = "recommendations"
        REVIEWED_BY = "reviewed_by"
        REVIEWED_AT = "reviewed_at"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Prescriptions:
        ID = "id"
        PATIENT_ID = "patient_id"
        DOCTOR_ID = "doctor_id"
        APPOINTMENT_ID = "appointment_id"
        MEDICATIONS = "medications"
        NOTES = "notes"
        STATUS = "status"
        PDF_URL = "pdf_url"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Medications:
        ID = "id"
        PATIENT_ID = "patient_id"
        NAME = "name"
        DOSAGE = "dosage"
        FREQUENCY = "frequency"
        TIME_SLOTS = "time_slots"
        REMINDER_TIMES = "reminder_times"
        REMINDER_ENABLED = "reminder_enabled"
        ADHERENCE_RATE = "adherence_rate"
        START_DATE = "start_date"
        END_DATE = "end_date"
        IS_ACTIVE = "is_active"
        PRESCRIPTION_ID = "prescription_id"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class VitalsLog:
        ID = "id"
        PATIENT_ID = "patient_id"
        TRACKER_TYPE = "tracker_type"
        VALUE = "value"
        UNIT = "unit"
        NOTES = "notes"
        LOGGED_AT = "logged_at"

    class FamilyMembers:
        ID = "id"
        PRIMARY_USER_ID = "primary_user_id"
        MEMBER_USER_ID = "member_user_id"
        NAME = "name"
        RELATION = "relation"
        RELATIONSHIP = "relationship"
        DATE_OF_BIRTH = "date_of_birth"
        AGE = "age"
        GENDER = "gender"
        BLOOD_GROUP = "blood_group"
        PHONE = "phone"
        EMAIL = "email"
        MEDICAL_CONDITIONS = "medical_conditions"
        ALLERGIES = "allergies"
        CAN_VIEW_RECORDS = "can_view_records"
        CAN_BOOK_APPOINTMENTS = "can_book_appointments"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class Referrals:
        ID = "id"
        REFERRER_ID = "referrer_id"
        REFEREE_ID = "referee_id"
        REFERRAL_CODE = "referral_code"
        STATUS = "status"
        REWARD_POINTS = "reward_points"
        CREATED_AT = "created_at"
        COMPLETED_AT = "completed_at"

    class MedicalReferrals:
        ID = "id"
        REFERRING_DOCTOR_ID = "referring_doctor_id"
        TARGET_DOCTOR_ID = "target_doctor_id"
        PATIENT_ID = "patient_id"
        REASON = "reason"
        URGENCY = "urgency"
        STATUS = "status"
        NOTES = "notes"
        TARGET_NOTES = "target_notes"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"
        # NOTE: no "access_token" column

    class Waitlist:
        ID = "id"
        PATIENT_ID = "patient_id"
        DOCTOR_ID = "doctor_id"
        PREFERRED_DATE = "preferred_date"
        PREFERRED_TIME = "preferred_time"
        REASON = "reason"
        PRIORITY = "priority"
        STATUS = "status"
        NOTIFIED_AT = "notified_at"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class TeamMembers:
        ID = "id"
        NAME = "name"
        ROLE = "role"
        BIO = "bio"
        AVATAR_URL = "avatar_url"
        EMAIL = "email"
        LINKEDIN_URL = "linkedin_url"
        TWITTER_URL = "twitter_url"
        DISPLAY_ORDER = "display_order"
        IS_ACTIVE = "is_active"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class RiskAssessments:
        ID = "id"
        PATIENT_ID = "patient_id"
        ASSESSMENT_TYPE = "assessment_type"
        RISK_SCORE = "risk_score"
        RISK_LEVEL = "risk_level"
        FACTORS = "factors"
        RECOMMENDATIONS = "recommendations"
        ASSESSED_BY = "assessed_by"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class MentalHealthScreenings:
        ID = "id"
        PATIENT_ID = "patient_id"
        SCREENING_TYPE = "screening_type"
        SCORE = "score"
        SEVERITY = "severity"
        RESPONSES = "responses"
        RECOMMENDATIONS = "recommendations"
        CREATED_AT = "created_at"

    class Complaints:
        ID = "id"
        USER_ID = "user_id"
        SUBJECT = "subject"
        DESCRIPTION = "description"
        STATUS = "status"
        PRIORITY = "priority"
        ASSIGNED_TO = "assigned_to"
        RESOLVED_AT = "resolved_at"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class ComplaintMessages:
        ID = "id"
        COMPLAINT_ID = "complaint_id"
        SENDER_ID = "sender_id"
        MESSAGE = "message"
        IS_INTERNAL = "is_internal"
        CREATED_AT = "created_at"

    class Ratings:
        ID = "id"
        DOCTOR_ID = "doctor_id"
        PATIENT_ID = "patient_id"
        APPOINTMENT_ID = "appointment_id"
        RATING = "rating"
        REVIEW = "review"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class AuditLogs:
        ID = "id"
        USER_ID = "user_id"
        ACTION = "action"
        TABLE_NAME = "table_name"
        RESOURCE_TYPE = "resource_type"
        RESOURCE_ID = "resource_id"
        OLD_DATA = "old_data"
        NEW_DATA = "new_data"
        IP_ADDRESS = "ip_address"
        USER_AGENT = "user_agent"
        STATUS = "status"
        CREATED_AT = "created_at"

    class Badges:
        ID = "id"
        NAME = "name"
        DESCRIPTION = "description"
        ICON = "icon"
        CATEGORY = "category"
        REQUIREMENT_TYPE = "requirement_type"
        REQUIREMENT_VALUE = "requirement_value"
        RARITY = "rarity"
        POINTS_REWARD = "points_reward"
        CREATED_AT = "created_at"

    class UserBadges:
        ID = "id"
        USER_ID = "user_id"
        BADGE_ID = "badge_id"
        EARNED_AT = "earned_at"

    class Challenges:
        ID = "id"
        NAME = "name"
        DESCRIPTION = "description"
        TYPE = "type"
        CATEGORY = "category"
        TARGET_VALUE = "target_value"
        REWARD_POINTS = "reward_points"
        REWARD_BADGE_ID = "reward_badge_id"
        START_DATE = "start_date"
        END_DATE = "end_date"
        IS_ACTIVE = "is_active"
        CREATED_AT = "created_at"

    class UserChallenges:
        ID = "id"
        USER_ID = "user_id"
        CHALLENGE_ID = "challenge_id"
        CURRENT_PROGRESS = "current_progress"
        COMPLETED = "completed"
        COMPLETED_AT = "completed_at"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class ClinicalNotes:
        ID = "id"
        PATIENT_ID = "patient_id"
        DOCTOR_ID = "doctor_id"
        APPOINTMENT_ID = "appointment_id"
        NOTE_TYPE = "note_type"
        CONTENT = "content"
        SUBJECTIVE = "subjective"
        OBJECTIVE = "objective"
        ASSESSMENT = "assessment"
        PLAN = "plan"
        TEMPLATE_ID = "template_id"
        IS_AI_GENERATED = "is_ai_generated"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class PrescriptionTemplates:
        ID = "id"
        DOCTOR_ID = "doctor_id"
        NAME = "name"
        MEDICATION_NAME = "medication_name"
        DOSAGE = "dosage"
        FREQUENCY = "frequency"
        DURATION = "duration"
        INSTRUCTIONS = "instructions"
        IS_FAVORITE = "is_favorite"
        USE_COUNT = "use_count"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class NoteTemplates:
        ID = "id"
        DOCTOR_ID = "doctor_id"
        NAME = "name"
        NOTE_TYPE = "note_type"
        TEMPLATE_CONTENT = "template_content"
        IS_FAVORITE = "is_favorite"
        USE_COUNT = "use_count"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class MedicationLogs:
        ID = "id"
        MEDICATION_ID = "medication_id"
        PATIENT_ID = "patient_id"
        SCHEDULED_AT = "scheduled_at"
        TAKEN_AT = "taken_at"
        STATUS = "status"
        NOTES = "notes"
        CREATED_AT = "created_at"

    class HealthGoals:
        ID = "id"
        PATIENT_ID = "patient_id"
        GOAL_TYPE = "goal_type"
        TITLE = "title"
        DESCRIPTION = "description"
        TARGET_VALUE = "target_value"
        CURRENT_VALUE = "current_value"
        UNIT = "unit"
        START_DATE = "start_date"
        TARGET_DATE = "target_date"
        STATUS = "status"
        PROGRESS_PERCENTAGE = "progress_percentage"
        CREATED_AT = "created_at"
        UPDATED_AT = "updated_at"

    class GoalProgress:
        ID = "id"
        GOAL_ID = "goal_id"
        VALUE = "value"
        RECORDED_AT = "recorded_at"
        NOTES = "notes"

    class GoalAchievements:
        ID = "id"
        PATIENT_ID = "patient_id"
        GOAL_ID = "goal_id"
        ACHIEVEMENT_TYPE = "achievement_type"
        TITLE = "title"
        DESCRIPTION = "description"
        BADGE_ICON = "badge_icon"
        EARNED_AT = "earned_at"
