"""
Comprehensive tests for Appointment Service (Category 2).

Tests cover:
- Overlap detection
- Available slots calculation
- Schedule appointment with validation
- Reschedule with overlap check
- Cancel with policy enforcement
- Buffer time management
- Authorization checks

Run with: pytest backend/core/tests/test_appointment_service.py -v
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

# Import components to test
from app.services.appointment_service import (
    AppointmentService,
    AppointmentConflictError,
    DoctorUnavailableError,
    get_appointment_service
)


# ============================================================================
# OVERLAP DETECTION TESTS
# ============================================================================

class TestOverlapDetection:
    """Test overlap detection algorithm."""
    
    @pytest.mark.asyncio
    async def test_no_overlap_when_no_appointments(self):
        """Test no overlap when doctor has no appointments."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock empty result
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = []
            
            has_overlap = await service.check_overlap(
                doctor_id="doctor-1",
                scheduled_at=datetime(2026, 5, 10, 10, 0, tzinfo=ZoneInfo("UTC")),
                duration_minutes=30
            )
            
            assert has_overlap is False
    
    @pytest.mark.asyncio
    async def test_overlap_detected_same_time(self):
        """Test overlap when appointment at exact same time."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock existing appointment at 10:00
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {
                    "id": "appt-1",
                    "scheduled_at": "2026-05-10T10:00:00+00:00",
                    "duration_minutes": 30
                }
            ]
            
            # Try to book at 10:00
            has_overlap = await service.check_overlap(
                doctor_id="doctor-1",
                scheduled_at=datetime(2026, 5, 10, 10, 0, tzinfo=ZoneInfo("UTC")),
                duration_minutes=30
            )
            
            assert has_overlap is True
    
    @pytest.mark.asyncio
    async def test_overlap_detected_partial(self):
        """Test overlap when appointments partially overlap."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Existing appointment: 10:00-10:30 (+ 5 min buffer = 10:35)
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {
                    "id": "appt-1",
                    "scheduled_at": "2026-05-10T10:00:00+00:00",
                    "duration_minutes": 30
                }
            ]
            
            # Try to book at 10:20 (overlaps with existing)
            has_overlap = await service.check_overlap(
                doctor_id="doctor-1",
                scheduled_at=datetime(2026, 5, 10, 10, 20, tzinfo=ZoneInfo("UTC")),
                duration_minutes=30
            )
            
            assert has_overlap is True
    
    @pytest.mark.asyncio
    async def test_no_overlap_with_buffer(self):
        """Test no overlap when buffer time is respected."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Existing appointment: 10:00-10:30 (+ 5 min buffer = 10:35)
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {
                    "id": "appt-1",
                    "scheduled_at": "2026-05-10T10:00:00+00:00",
                    "duration_minutes": 30
                }
            ]
            
            # Book at 10:35 (exactly after buffer)
            has_overlap = await service.check_overlap(
                doctor_id="doctor-1",
                scheduled_at=datetime(2026, 5, 10, 10, 35, tzinfo=ZoneInfo("UTC")),
                duration_minutes=30
            )
            
            assert has_overlap is False
    
    @pytest.mark.asyncio
    async def test_overlap_excludes_appointment_for_reschedule(self):
        """Test overlap check excludes specific appointment (for rescheduling)."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock existing appointment
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.neq.return_value.execute.return_value.data = []
            
            has_overlap = await service.check_overlap(
                doctor_id="doctor-1",
                scheduled_at=datetime(2026, 5, 10, 10, 0, tzinfo=ZoneInfo("UTC")),
                duration_minutes=30,
                exclude_appointment_id="appt-1"
            )
            
            assert has_overlap is False


# ============================================================================
# AVAILABLE SLOTS TESTS
# ============================================================================

class TestAvailableSlots:
    """Test available slots calculation."""
    
    @pytest.mark.asyncio
    async def test_all_slots_available_when_no_appointments(self):
        """Test all slots available when no appointments."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.gte.return_value.lte.return_value.order.return_value.execute.return_value.data = []
            
            date = datetime(2026, 5, 10, tzinfo=ZoneInfo("UTC"))
            slots = await service.get_available_slots(
                doctor_id="doctor-1",
                date=date,
                slot_duration=30
            )
            
            # Should have multiple slots between 9 AM and 5 PM
            assert len(slots) > 0
            assert all(slot["duration_minutes"] == 30 for slot in slots)
    
    @pytest.mark.asyncio
    async def test_slots_exclude_booked_times(self):
        """Test slots exclude already booked times."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock appointment at 10:00-10:30
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.gte.return_value.lte.return_value.order.return_value.execute.return_value.data = [
                {
                    "scheduled_at": "2026-05-10T10:00:00+00:00",
                    "duration_minutes": 30
                }
            ]
            
            date = datetime(2026, 5, 10, tzinfo=ZoneInfo("UTC"))
            slots = await service.get_available_slots(
                doctor_id="doctor-1",
                date=date,
                slot_duration=30
            )
            
            # Verify no slot overlaps with 10:00-10:35 (including buffer)
            for slot in slots:
                slot_start = datetime.fromisoformat(slot["start"])
                slot_end = datetime.fromisoformat(slot["end"])
                
                booked_start = datetime(2026, 5, 10, 10, 0, tzinfo=ZoneInfo("UTC"))
                booked_end = datetime(2026, 5, 10, 10, 35, tzinfo=ZoneInfo("UTC"))
                
                # No overlap
                assert not (slot_start < booked_end and slot_end > booked_start)


# ============================================================================
# SCHEDULE APPOINTMENT TESTS
# ============================================================================

class TestScheduleAppointment:
    """Test appointment scheduling with validation."""
    
    @pytest.mark.asyncio
    async def test_schedule_success(self):
        """Test successful appointment scheduling."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # No overlap
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = []
            
            # Mock successful insert
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "id": "appt-new",
                "patient_id": "patient-1",
                "doctor_id": "doctor-1",
                "scheduled_at": "2026-05-10T10:00:00+00:00",
                "status": "booked"
            }]
            
            result = await service.schedule_appointment(
                patient_id="patient-1",
                doctor_id="doctor-1",
                scheduled_at=datetime(2026, 5, 10, 10, 0, tzinfo=ZoneInfo("UTC")),
                appointment_type="video",
                reason="Consultation"
            )
            
            assert result["id"] == "appt-new"
            assert result["status"] == "booked"
    
    @pytest.mark.asyncio
    async def test_schedule_fails_on_overlap(self):
        """Test scheduling fails when overlap detected."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock overlap
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
                {
                    "id": "appt-1",
                    "scheduled_at": "2026-05-10T10:00:00+00:00",
                    "duration_minutes": 30
                }
            ]
            
            with pytest.raises(AppointmentConflictError):
                await service.schedule_appointment(
                    patient_id="patient-1",
                    doctor_id="doctor-1",
                    scheduled_at=datetime(2026, 5, 10, 10, 0, tzinfo=ZoneInfo("UTC")),
                    appointment_type="video",
                    reason="Consultation"
                )
    
    @pytest.mark.asyncio
    async def test_schedule_fails_outside_working_hours(self):
        """Test scheduling fails outside working hours."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # No overlap
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = []
            
            # Try to book at 8 AM (before 9 AM)
            with pytest.raises(DoctorUnavailableError):
                await service.schedule_appointment(
                    patient_id="patient-1",
                    doctor_id="doctor-1",
                    scheduled_at=datetime(2026, 5, 10, 8, 0, tzinfo=ZoneInfo("UTC")),
                    appointment_type="video",
                    reason="Consultation"
                )


# ============================================================================
# RESCHEDULE TESTS
# ============================================================================

class TestRescheduleAppointment:
    """Test appointment rescheduling."""
    
    @pytest.mark.asyncio
    async def test_reschedule_success(self):
        """Test successful rescheduling."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock existing appointment
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
                "id": "appt-1",
                "patient_id": "patient-1",
                "doctor_id": "doctor-1",
                "scheduled_at": "2026-05-10T10:00:00+00:00",
                "duration_minutes": 30
            }
            
            # No overlap at new time
            mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.neq.return_value.execute.return_value.data = []
            
            # Mock successful update
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
                "id": "appt-1",
                "scheduled_at": "2026-05-10T14:00:00+00:00",
                "status": "rescheduled"
            }]
            
            result = await service.reschedule_appointment(
                appointment_id="appt-1",
                new_scheduled_at=datetime(2026, 5, 10, 14, 0, tzinfo=ZoneInfo("UTC")),
                user_id="patient-1",
                user_role="patient"
            )
            
            assert result["status"] == "rescheduled"
    
    @pytest.mark.asyncio
    async def test_reschedule_fails_unauthorized(self):
        """Test rescheduling fails for unauthorized user."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock existing appointment
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
                "id": "appt-1",
                "patient_id": "patient-1",
                "doctor_id": "doctor-1"
            }
            
            with pytest.raises(PermissionError):
                await service.reschedule_appointment(
                    appointment_id="appt-1",
                    new_scheduled_at=datetime(2026, 5, 10, 14, 0, tzinfo=ZoneInfo("UTC")),
                    user_id="patient-2",  # Different patient
                    user_role="patient"
                )


# ============================================================================
# CANCEL TESTS
# ============================================================================

class TestCancelAppointment:
    """Test appointment cancellation."""
    
    @pytest.mark.asyncio
    async def test_cancel_success(self):
        """Test successful cancellation."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock existing appointment (48 hours away)
            future_time = datetime.now(ZoneInfo("UTC")) + timedelta(hours=48)
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
                "id": "appt-1",
                "patient_id": "patient-1",
                "doctor_id": "doctor-1",
                "scheduled_at": future_time.isoformat()
            }
            
            # Mock successful update
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
                "id": "appt-1",
                "status": "cancelled",
                "is_late_cancellation": False
            }]
            
            result = await service.cancel_appointment(
                appointment_id="appt-1",
                user_id="patient-1",
                user_role="patient",
                reason="Personal reasons"
            )
            
            assert result["status"] == "cancelled"
            assert result["is_late_cancellation"] is False
    
    @pytest.mark.asyncio
    async def test_cancel_marks_late_cancellation(self):
        """Test cancellation within 24 hours is marked as late."""
        service = AppointmentService()
        
        with patch('app.services.appointment_service.supabase') as mock_supabase:
            # Mock existing appointment (12 hours away - within 24h window)
            future_time = datetime.now(ZoneInfo("UTC")) + timedelta(hours=12)
            mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
                "id": "appt-1",
                "patient_id": "patient-1",
                "doctor_id": "doctor-1",
                "scheduled_at": future_time.isoformat()
            }
            
            # Mock successful update
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
                "id": "appt-1",
                "status": "cancelled",
                "is_late_cancellation": True
            }]
            
            result = await service.cancel_appointment(
                appointment_id="appt-1",
                user_id="patient-1",
                user_role="patient"
            )
            
            assert result["is_late_cancellation"] is True


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:
    """Integration tests for complete flows."""
    
    @pytest.mark.asyncio
    async def test_singleton_service(self):
        """Test service singleton pattern."""
        service1 = get_appointment_service()
        service2 = get_appointment_service()
        
        assert service1 is service2


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
