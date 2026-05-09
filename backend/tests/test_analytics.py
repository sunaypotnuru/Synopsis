"""
Tests for Analytics Service and API
Comprehensive test coverage for admin dashboard analytics
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.services.analytics_service import AnalyticsService, get_analytics_service
from app.models.user import User
from app.models.appointment import Appointment
from app.models.ai_consultation import AIConsultation
from app.models.message import Message, Conversation
from app.services.cache import cache_service
import json


class TestAnalyticsService:
    """Test suite for AnalyticsService"""

    @pytest.fixture
    def analytics_service(self, db_session: Session):
        """Create analytics service instance"""
        return AnalyticsService(db_session)

    @pytest.fixture
    def sample_users(self, db_session: Session):
        """Create sample users for testing"""
        users = []
        roles = ['patient', 'doctor', 'admin']
        
        for i in range(15):
            user = User(
                email=f"user{i}@test.com",
                username=f"user{i}",
                hashed_password="hashed",
                role=roles[i % 3],
                created_at=datetime.utcnow() - timedelta(days=30-i)
            )
            db_session.add(user)
            users.append(user)
        
        db_session.commit()
        return users

    @pytest.fixture
    def sample_appointments(self, db_session: Session, sample_users):
        """Create sample appointments for testing"""
        appointments = []
        statuses = ['scheduled', 'completed', 'cancelled']
        
        for i in range(30):
            appointment = Appointment(
                user_id=sample_users[i % len(sample_users)].id,
                doctor_id=sample_users[1].id,
                scheduled_time=datetime.utcnow() + timedelta(days=i),
                status=statuses[i % 3],
                reason=f"Test appointment {i}",
                created_at=datetime.utcnow() - timedelta(days=20-i//2)
            )
            db_session.add(appointment)
            appointments.append(appointment)
        
        db_session.commit()
        return appointments

    @pytest.fixture
    def sample_consultations(self, db_session: Session, sample_users):
        """Create sample AI consultations for testing"""
        consultations = []
        
        for i in range(20):
            consultation = AIConsultation(
                user_id=sample_users[i % len(sample_users)].id,
                symptoms=f"Symptom {i}",
                diagnosis="Test diagnosis",
                confidence_score=0.5 + (i % 5) * 0.1,
                created_at=datetime.utcnow() - timedelta(days=15-i//2)
            )
            db_session.add(consultation)
            consultations.append(consultation)
        
        db_session.commit()
        return consultations

    @pytest.fixture
    def sample_messages(self, db_session: Session, sample_users):
        """Create sample messages for testing"""
        # Create conversations
        conversations = []
        for i in range(5):
            conv = Conversation(
                created_at=datetime.utcnow() - timedelta(days=10-i)
            )
            db_session.add(conv)
            conversations.append(conv)
        db_session.commit()

        # Create messages
        messages = []
        for i in range(50):
            message = Message(
                conversation_id=conversations[i % len(conversations)].id,
                sender_id=sample_users[i % len(sample_users)].id,
                content=f"Test message {i}",
                created_at=datetime.utcnow() - timedelta(days=10-i//10)
            )
            db_session.add(message)
            messages.append(message)
        
        db_session.commit()
        return messages

    # ==================== USER ANALYTICS TESTS ====================

    def test_get_user_analytics_basic(self, analytics_service, sample_users):
        """Test basic user analytics retrieval"""
        result = analytics_service.get_user_analytics()
        
        assert 'total_users' in result
        assert 'users_by_role' in result
        assert 'new_users' in result
        assert 'active_users' in result
        assert 'growth_rate' in result
        assert 'daily_active_users' in result
        assert result['total_users'] == len(sample_users)

    def test_get_user_analytics_by_role(self, analytics_service, sample_users):
        """Test user analytics grouped by role"""
        result = analytics_service.get_user_analytics()
        
        users_by_role = result['users_by_role']
        assert 'patient' in users_by_role
        assert 'doctor' in users_by_role
        assert 'admin' in users_by_role
        assert sum(users_by_role.values()) == len(sample_users)

    def test_get_user_analytics_date_range(self, analytics_service, sample_users):
        """Test user analytics with custom date range"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        result = analytics_service.get_user_analytics(start_date, end_date)
        
        assert result['period']['start'] == start_date.isoformat()
        assert result['period']['end'] == end_date.isoformat()

    def test_get_user_analytics_growth_rate(self, analytics_service, sample_users):
        """Test user growth rate calculation"""
        result = analytics_service.get_user_analytics()
        
        assert 'growth_rate' in result
        assert isinstance(result['growth_rate'], (int, float))

    def test_get_user_analytics_dau(self, analytics_service, sample_users):
        """Test daily active users calculation"""
        result = analytics_service.get_user_analytics()
        
        dau_data = result['daily_active_users']
        assert len(dau_data) == 7
        assert all('date' in day and 'active_users' in day for day in dau_data)

    def test_get_user_analytics_caching(self, analytics_service, sample_users):
        """Test that user analytics are cached"""
        # Clear cache first
        cache_service.clear()
        
        # First call
        result1 = analytics_service.get_user_analytics()
        
        # Second call should return cached result
        result2 = analytics_service.get_user_analytics()
        
        assert result1 == result2

    # ==================== APPOINTMENT ANALYTICS TESTS ====================

    def test_get_appointment_analytics_basic(self, analytics_service, sample_appointments):
        """Test basic appointment analytics retrieval"""
        result = analytics_service.get_appointment_analytics()
        
        assert 'total_appointments' in result
        assert 'appointments_by_status' in result
        assert 'completed' in result
        assert 'cancelled' in result
        assert 'completion_rate' in result
        assert 'cancellation_rate' in result

    def test_get_appointment_analytics_by_status(self, analytics_service, sample_appointments):
        """Test appointment analytics grouped by status"""
        result = analytics_service.get_appointment_analytics()
        
        by_status = result['appointments_by_status']
        assert 'scheduled' in by_status or 'completed' in by_status or 'cancelled' in by_status
        assert sum(by_status.values()) == result['total_appointments']

    def test_get_appointment_analytics_rates(self, analytics_service, sample_appointments):
        """Test completion and cancellation rate calculations"""
        result = analytics_service.get_appointment_analytics()
        
        completion_rate = result['completion_rate']
        cancellation_rate = result['cancellation_rate']
        
        assert 0 <= completion_rate <= 100
        assert 0 <= cancellation_rate <= 100
        assert isinstance(completion_rate, (int, float))
        assert isinstance(cancellation_rate, (int, float))

    def test_get_appointment_analytics_daily_trends(self, analytics_service, sample_appointments):
        """Test daily appointment trends"""
        result = analytics_service.get_appointment_analytics()
        
        daily_trends = result['daily_trends']
        assert len(daily_trends) == 7
        assert all('date' in day and 'appointments' in day for day in daily_trends)

    def test_get_appointment_analytics_peak_hours(self, analytics_service, sample_appointments):
        """Test peak hours calculation"""
        result = analytics_service.get_appointment_analytics()
        
        peak_hours = result['peak_hours']
        assert isinstance(peak_hours, list)
        for hour_data in peak_hours:
            assert 'hour' in hour_data
            assert 'count' in hour_data
            assert 0 <= hour_data['hour'] <= 23

    def test_get_appointment_analytics_avg_per_day(self, analytics_service, sample_appointments):
        """Test average appointments per day calculation"""
        result = analytics_service.get_appointment_analytics()
        
        assert 'avg_per_day' in result
        assert result['avg_per_day'] >= 0

    # ==================== AI USAGE ANALYTICS TESTS ====================

    def test_get_ai_usage_analytics_basic(self, analytics_service, sample_consultations):
        """Test basic AI usage analytics retrieval"""
        result = analytics_service.get_ai_usage_analytics()
        
        assert 'total_consultations' in result
        assert 'avg_confidence_score' in result
        assert 'confidence_distribution' in result
        assert 'daily_trends' in result

    def test_get_ai_usage_analytics_confidence_distribution(self, analytics_service, sample_consultations):
        """Test confidence score distribution"""
        result = analytics_service.get_ai_usage_analytics()
        
        distribution = result['confidence_distribution']
        assert 'high' in distribution
        assert 'medium' in distribution
        assert 'low' in distribution
        
        total = distribution['high'] + distribution['medium'] + distribution['low']
        assert total == result['total_consultations']

    def test_get_ai_usage_analytics_avg_confidence(self, analytics_service, sample_consultations):
        """Test average confidence score calculation"""
        result = analytics_service.get_ai_usage_analytics()
        
        avg_confidence = result['avg_confidence_score']
        assert 0 <= avg_confidence <= 1
        assert isinstance(avg_confidence, float)

    def test_get_ai_usage_analytics_daily_trends(self, analytics_service, sample_consultations):
        """Test daily AI usage trends"""
        result = analytics_service.get_ai_usage_analytics()
        
        daily_trends = result['daily_trends']
        assert len(daily_trends) == 7
        for day in daily_trends:
            assert 'date' in day
            assert 'consultations' in day
            assert 'avg_confidence' in day

    # ==================== REVENUE ANALYTICS TESTS ====================

    def test_get_revenue_analytics_basic(self, analytics_service, sample_appointments):
        """Test basic revenue analytics retrieval"""
        result = analytics_service.get_revenue_analytics()
        
        assert 'total_revenue' in result
        assert 'completed_appointments' in result
        assert 'avg_revenue_per_appointment' in result
        assert 'revenue_growth' in result
        assert 'daily_trends' in result

    def test_get_revenue_analytics_calculation(self, analytics_service, sample_appointments):
        """Test revenue calculation accuracy"""
        result = analytics_service.get_revenue_analytics()
        
        expected_revenue = result['completed_appointments'] * result['avg_revenue_per_appointment']
        assert result['total_revenue'] == expected_revenue

    def test_get_revenue_analytics_growth(self, analytics_service, sample_appointments):
        """Test revenue growth rate calculation"""
        result = analytics_service.get_revenue_analytics()
        
        assert 'revenue_growth' in result
        assert isinstance(result['revenue_growth'], (int, float))

    def test_get_revenue_analytics_daily_trends(self, analytics_service, sample_appointments):
        """Test daily revenue trends"""
        result = analytics_service.get_revenue_analytics()
        
        daily_trends = result['daily_trends']
        assert len(daily_trends) == 7
        for day in daily_trends:
            assert 'date' in day
            assert 'revenue' in day
            assert 'appointments' in day

    # ==================== SYSTEM PERFORMANCE TESTS ====================

    def test_get_system_performance_basic(self, analytics_service, sample_users):
        """Test basic system performance metrics"""
        result = analytics_service.get_system_performance()
        
        assert 'active_sessions' in result
        assert 'database_stats' in result
        assert 'timestamp' in result

    def test_get_system_performance_database_stats(self, analytics_service, sample_users):
        """Test database statistics"""
        result = analytics_service.get_system_performance()
        
        db_stats = result['database_stats']
        assert 'total_users' in db_stats
        assert 'total_appointments' in db_stats
        assert 'total_consultations' in db_stats
        assert 'total_messages' in db_stats

    # ==================== MESSAGING ANALYTICS TESTS ====================

    def test_get_messaging_analytics_basic(self, analytics_service, sample_messages):
        """Test basic messaging analytics retrieval"""
        result = analytics_service.get_messaging_analytics()
        
        assert 'total_messages' in result
        assert 'active_conversations' in result
        assert 'active_users' in result
        assert 'avg_messages_per_conversation' in result

    def test_get_messaging_analytics_avg_calculation(self, analytics_service, sample_messages):
        """Test average messages per conversation calculation"""
        result = analytics_service.get_messaging_analytics()
        
        if result['active_conversations'] > 0:
            expected_avg = result['total_messages'] / result['active_conversations']
            assert abs(result['avg_messages_per_conversation'] - expected_avg) < 0.01

    def test_get_messaging_analytics_daily_trends(self, analytics_service, sample_messages):
        """Test daily messaging trends"""
        result = analytics_service.get_messaging_analytics()
        
        daily_trends = result['daily_trends']
        assert len(daily_trends) == 7
        for day in daily_trends:
            assert 'date' in day
            assert 'messages' in day
            assert 'conversations' in day

    # ==================== OVERVIEW TESTS ====================

    def test_get_overview_basic(self, analytics_service, sample_users, sample_appointments, 
                                sample_consultations, sample_messages):
        """Test overview analytics retrieval"""
        result = analytics_service.get_overview()
        
        assert 'overview' in result
        assert 'users' in result
        assert 'appointments' in result
        assert 'ai_usage' in result
        assert 'revenue' in result
        assert 'messaging' in result
        assert 'system' in result
        assert 'generated_at' in result

    def test_get_overview_summary(self, analytics_service, sample_users, sample_appointments):
        """Test overview summary metrics"""
        result = analytics_service.get_overview()
        
        overview = result['overview']
        assert 'total_users' in overview
        assert 'new_users_30d' in overview
        assert 'total_appointments_30d' in overview
        assert 'completion_rate' in overview
        assert 'ai_consultations_30d' in overview

    # ==================== EDGE CASES ====================

    def test_analytics_with_no_data(self, analytics_service):
        """Test analytics with empty database"""
        result = analytics_service.get_user_analytics()
        
        assert result['total_users'] == 0
        assert result['new_users'] == 0

    def test_analytics_with_future_dates(self, analytics_service, sample_users):
        """Test analytics with future date range"""
        start_date = datetime.utcnow() + timedelta(days=10)
        end_date = datetime.utcnow() + timedelta(days=20)
        
        result = analytics_service.get_user_analytics(start_date, end_date)
        
        assert result['new_users'] == 0

    def test_analytics_with_single_day(self, analytics_service, sample_users):
        """Test analytics with single day range"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        result = analytics_service.get_user_analytics(today, tomorrow)
        
        assert 'total_users' in result


class TestAnalyticsAPI:
    """Test suite for Analytics API endpoints"""

    @pytest.fixture
    def admin_user(self, db_session: Session):
        """Create admin user for testing"""
        user = User(
            email="admin@test.com",
            username="admin",
            hashed_password="hashed",
            role="admin"
        )
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def regular_user(self, db_session: Session):
        """Create regular user for testing"""
        user = User(
            email="user@test.com",
            username="user",
            hashed_password="hashed",
            role="patient"
        )
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def admin_token(self, client: TestClient, admin_user):
        """Get admin authentication token"""
        # Mock token generation
        return "admin_token"

    @pytest.fixture
    def user_token(self, client: TestClient, regular_user):
        """Get regular user authentication token"""
        # Mock token generation
        return "user_token"

    # ==================== AUTHORIZATION TESTS ====================

    def test_analytics_requires_authentication(self, client: TestClient):
        """Test that analytics endpoints require authentication"""
        response = client.get("/api/v1/analytics/overview")
        assert response.status_code == 401

    def test_analytics_requires_admin_role(self, client: TestClient, user_token):
        """Test that analytics endpoints require admin role"""
        response = client.get(
            "/api/v1/analytics/overview",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403

    # ==================== ENDPOINT TESTS ====================

    def test_get_overview_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/overview endpoint"""
        response = client.get(
            "/api/v1/analytics/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'overview' in data

    def test_get_user_analytics_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/users endpoint"""
        response = client.get(
            "/api/v1/analytics/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_users' in data

    def test_get_appointment_analytics_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/appointments endpoint"""
        response = client.get(
            "/api/v1/analytics/appointments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_appointments' in data

    def test_get_ai_usage_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/ai-usage endpoint"""
        response = client.get(
            "/api/v1/analytics/ai-usage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_consultations' in data

    def test_get_revenue_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/revenue endpoint"""
        response = client.get(
            "/api/v1/analytics/revenue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_revenue' in data

    def test_get_system_performance_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/system-performance endpoint"""
        response = client.get(
            "/api/v1/analytics/system-performance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'active_sessions' in data

    def test_get_messaging_endpoint(self, client: TestClient, admin_token):
        """Test GET /analytics/messaging endpoint"""
        response = client.get(
            "/api/v1/analytics/messaging",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_messages' in data

    # ==================== QUERY PARAMETER TESTS ====================

    def test_analytics_with_date_range(self, client: TestClient, admin_token):
        """Test analytics endpoints with date range parameters"""
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = client.get(
            f"/api/v1/analytics/users?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

    def test_analytics_with_days_parameter(self, client: TestClient, admin_token):
        """Test analytics endpoints with days parameter"""
        response = client.get(
            "/api/v1/analytics/users?days=7",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

    def test_analytics_with_invalid_date_format(self, client: TestClient, admin_token):
        """Test analytics endpoints with invalid date format"""
        response = client.get(
            "/api/v1/analytics/users?start_date=invalid",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400

    def test_analytics_with_invalid_date_range(self, client: TestClient, admin_token):
        """Test analytics endpoints with invalid date range (start after end)"""
        start_date = datetime.utcnow().isoformat()
        end_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        response = client.get(
            f"/api/v1/analytics/users?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400

    # ==================== EXPORT TESTS ====================

    def test_export_analytics_json(self, client: TestClient, admin_token):
        """Test analytics export in JSON format"""
        response = client.get(
            "/api/v1/analytics/export?format=json",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert response.headers['content-type'] == 'application/json'

    def test_export_analytics_csv(self, client: TestClient, admin_token):
        """Test analytics export in CSV format"""
        response = client.get(
            "/api/v1/analytics/export?format=csv",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert 'text/csv' in response.headers['content-type']
        assert 'Content-Disposition' in response.headers

    def test_export_analytics_invalid_format(self, client: TestClient, admin_token):
        """Test analytics export with invalid format"""
        response = client.get(
            "/api/v1/analytics/export?format=xml",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 422  # Validation error

    # ==================== RATE LIMITING TESTS ====================

    def test_analytics_rate_limiting(self, client: TestClient, admin_token):
        """Test rate limiting on analytics endpoints"""
        # Make multiple requests
        for _ in range(35):  # Exceeds 30 requests per minute limit
            response = client.get(
                "/api/v1/analytics/overview",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        # Last request should be rate limited
        assert response.status_code == 429
