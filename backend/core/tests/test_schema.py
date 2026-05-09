"""
Tests for schema.py constants module
"""

from app.db.schema import Tables, Col


class TestTables:
    """Test table name constants"""

    def test_tables_exist(self):
        """Test that all table constants are defined"""
        assert hasattr(Tables, "PROFILES_PATIENT")
        assert hasattr(Tables, "PROFILES_DOCTOR")
        assert hasattr(Tables, "APPOINTMENTS")
        assert hasattr(Tables, "MESSAGES")
        assert hasattr(Tables, "NOTIFICATIONS")
        assert hasattr(Tables, "GAMIFICATION")

    def test_table_names_are_strings(self):
        """Test that table names are strings"""
        assert isinstance(Tables.PROFILES_PATIENT, str)
        assert isinstance(Tables.PROFILES_DOCTOR, str)
        assert isinstance(Tables.APPOINTMENTS, str)

    def test_table_names_lowercase(self):
        """Test that table names are lowercase"""
        assert Tables.PROFILES_PATIENT.islower()
        assert Tables.PROFILES_DOCTOR.islower()
        assert Tables.APPOINTMENTS.islower()


class TestColumns:
    """Test column name constants"""

    def test_column_classes_exist(self):
        """Test that column classes are defined"""
        assert hasattr(Col, "ProfilesPatient")
        assert hasattr(Col, "ProfilesDoctor")
        assert hasattr(Col, "Appointments")
        assert hasattr(Col, "Messages")

    def test_common_columns_exist(self):
        """Test that common columns exist"""
        # ID column should exist in all tables
        assert hasattr(Col.ProfilesPatient, "ID")
        assert hasattr(Col.ProfilesDoctor, "ID")
        assert hasattr(Col.Appointments, "ID")

        # Created_at should exist in most tables
        assert hasattr(Col.ProfilesPatient, "CREATED_AT")
        assert hasattr(Col.Appointments, "CREATED_AT")

    def test_column_names_are_strings(self):
        """Test that column names are strings"""
        assert isinstance(Col.ProfilesPatient.ID, str)
        assert isinstance(Col.ProfilesPatient.EMAIL, str)
        assert isinstance(Col.Appointments.PATIENT_ID, str)

    def test_column_names_lowercase(self):
        """Test that column names are lowercase with underscores"""
        assert Col.ProfilesPatient.ID.islower()
        assert Col.ProfilesPatient.EMAIL.islower()
        assert Col.Appointments.PATIENT_ID.islower()


class TestSchemaConsistency:
    """Test schema consistency"""

    def test_no_duplicate_table_names(self):
        """Test that there are no duplicate table names"""
        table_names = [
            getattr(Tables, attr) for attr in dir(Tables) if not attr.startswith("_")
        ]
        assert len(table_names) == len(set(table_names))

    def test_foreign_key_consistency(self):
        """Test that foreign key columns reference valid tables"""
        # patient_id should reference profiles_patient
        assert Col.Appointments.PATIENT_ID == "patient_id"
        assert Tables.PROFILES_PATIENT == "profiles_patient"

        # doctor_id should reference profiles_doctor
        assert Col.Appointments.DOCTOR_ID == "doctor_id"
        assert Tables.PROFILES_DOCTOR == "profiles_doctor"
