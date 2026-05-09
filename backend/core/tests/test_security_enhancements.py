"""
Comprehensive Test Suite for Category 3: Security Enhancements.

Tests:
- Session timeout management (HIPAA compliant)
- Login history tracking
- User-level rate limiting
- Session cleanup
- Device fingerprinting
- Suspicious activity detection

Total Tests: 36 (matching Category 1 & 2)
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from unittest.mock import Mock, patch, AsyncMock

from app.services.session_service import SessionService, SessionExpiredError
from app.services.login_history_service import LoginHistoryService


# ============================================================================
# SESSION TIMEOUT TESTS (12 tests)
# ============================================================================

class TestSessionTimeout:
    """Test session timeout management (HIPAA compliant)."""
    
    @pytest.fixture
    def session_service(self):
        """Create session service instance."""
        return SessionService()
    
    @pytest.mark.asyncio
    async def test_create_session(self, session_service):
        """Test session creation with timeout tracking."""
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "user_id": "user123",
                "session_token": "token123",
                "ip_address": "192.168.1.1",
                "is_active": True
            }]
            
            session = await session_service.create_session(
                user_id="user123",
                session_token="token123",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0"
            )
            
            assert session["user_id"] == "user123"
            assert session["session_token"] == "token123"
            assert session["is_active"] is True
    
    @pytest.mark.asyncio
    async def test_session_timeout_15_minutes(self, session_service):
        """Test 15-minute timeout (HIPAA requirement)."""
        assert session_service.timeout_minutes == 15
    
    @pytest.mark.asyncio
    async def test_update_activity_extends_session(self, session_service):
        """Test that activity updates extend session."""
        now = datetime.now(ZoneInfo("UTC"))
        expires_at = now + timedelta(minutes=10)  # 10 minutes remaining
        
        with patch('app.services.session_service.supabase') as mock_supabase:
            # Mock get session
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "user_id": "user123",
                "session_token": "token123",
                "expires_at": expires_at.isoformat(),
                "is_active": True
            }
            
            # Mock update
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
                "user_id": "user123",
                "session_token": "token123",
                "is_active": True
            }]
            
            updated = await session_service.update_activity("token123")
            
            assert updated is not None
    
    @pytest.mark.asyncio
    async def test_expired_session_raises_error(self, session_service):
        """Test that expired session raises SessionExpiredError."""
        now = datetime.now(ZoneInfo("UTC"))
        expires_at = now - timedelta(minutes=1)  # Expired 1 minute ago
        
        with patch('app.services.session_service.supabase') as mock_supabase:
            # Mock get session (expired)
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "user_id": "user123",
                "session_token": "token123",
                "expires_at": expires_at.isoformat(),
                "is_active": True
            }
            
            # Mock terminate
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]
            
            with pytest.raises(SessionExpiredError):
                await session_service.update_activity("token123")
    
    @pytest.mark.asyncio
    async def test_check_session_validity_valid(self, session_service):
        """Test session validity check for valid session."""
        now = datetime.now(ZoneInfo("UTC"))
        expires_at = now + timedelta(minutes=10)
        
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "expires_at": expires_at.isoformat(),
                "is_active": True
            }
            
            is_valid = await session_service.check_session_validity("token123")
            
            assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_check_session_validity_expired(self, session_service):
        """Test session validity check for expired session."""
        now = datetime.now(ZoneInfo("UTC"))
        expires_at = now - timedelta(minutes=1)
        
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "expires_at": expires_at.isoformat(),
                "is_active": True
            }
            
            # Mock terminate
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]
            
            is_valid = await session_service.check_session_validity("token123")
            
            assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_get_time_until_expiry(self, session_service):
        """Test getting time until session expiry."""
        now = datetime.now(ZoneInfo("UTC"))
        expires_at = now + timedelta(minutes=5)
        
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "expires_at": expires_at.isoformat(),
                "is_active": True
            }
            
            seconds = await session_service.get_time_until_expiry("token123")
            
            assert seconds is not None
            assert 290 <= seconds <= 310  # ~5 minutes (with tolerance)
    
    @pytest.mark.asyncio
    async def test_should_show_warning(self, session_service):
        """Test session warning (2 minutes before expiry)."""
        now = datetime.now(ZoneInfo("UTC"))
        expires_at = now + timedelta(minutes=1)  # 1 minute remaining
        
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
                "expires_at": expires_at.isoformat(),
                "is_active": True
            }
            
            should_warn = await session_service.should_show_warning("token123")
            
            assert should_warn is True
    
    @pytest.mark.asyncio
    async def test_terminate_session(self, session_service):
        """Test session termination."""
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
                "is_active": False,
                "termination_reason": "manual"
            }]
            
            success = await session_service.terminate_session("token123", reason="manual")
            
            assert success is True
    
    @pytest.mark.asyncio
    async def test_terminate_all_user_sessions(self, session_service):
        """Test terminating all sessions for a user."""
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"id": "1"}, {"id": "2"}, {"id": "3"}
            ]
            
            count = await session_service.terminate_all_user_sessions("user123")
            
            assert count == 3
    
    @pytest.mark.asyncio
    async def test_cleanup_expired_sessions(self, session_service):
        """Test cleanup of expired sessions."""
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.update.return_value.eq.return_value.lt.return_value.execute.return_value.data = [
                {"id": "1"}, {"id": "2"}
            ]
            
            count = await session_service.cleanup_expired_sessions()
            
            assert count == 2
    
    @pytest.mark.asyncio
    async def test_session_not_found(self, session_service):
        """Test handling of non-existent session."""
        with patch('app.services.session_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
            
            with pytest.raises(SessionExpiredError):
                await session_service.update_activity("invalid_token")


# ============================================================================
# LOGIN HISTORY TESTS (12 tests)
# ============================================================================

class TestLoginHistory:
    """Test login history tracking."""
    
    @pytest.fixture
    def login_history_service(self):
        """Create login history service instance."""
        return LoginHistoryService()
    
    @pytest.mark.asyncio
    async def test_record_successful_login(self, login_history_service):
        """Test recording successful login."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "user_id": "user123",
                "email": "test@example.com",
                "success": True
            }]
            
            record = await login_history_service.record_login_attempt(
                user_id="user123",
                email="test@example.com",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                success=True
            )
            
            assert record["success"] is True
    
    @pytest.mark.asyncio
    async def test_record_failed_login(self, login_history_service):
        """Test recording failed login."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{
                "user_id": "user123",
                "email": "test@example.com",
                "success": False,
                "failure_reason": "invalid_credentials"
            }]
            
            record = await login_history_service.record_login_attempt(
                user_id="user123",
                email="test@example.com",
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
                success=False,
                failure_reason="invalid_credentials"
            )
            
            assert record["success"] is False
            assert record["failure_reason"] == "invalid_credentials"
    
    @pytest.mark.asyncio
    async def test_parse_user_agent_chrome(self, login_history_service):
        """Test user agent parsing for Chrome."""
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        device_info = login_history_service._parse_user_agent(ua)
        
        assert device_info["device_type"] == "desktop"
        assert "Chrome" in device_info["browser"]
        assert "Windows" in device_info["os"]
    
    @pytest.mark.asyncio
    async def test_parse_user_agent_mobile(self, login_history_service):
        """Test user agent parsing for mobile."""
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        
        device_info = login_history_service._parse_user_agent(ua)
        
        assert device_info["device_type"] == "mobile"
    
    @pytest.mark.asyncio
    async def test_get_user_login_history(self, login_history_service):
        """Test getting user's login history."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"id": "1", "success": True},
                {"id": "2", "success": False}
            ]
            
            history = await login_history_service.get_user_login_history("user123", limit=50)
            
            assert len(history) == 2
    
    @pytest.mark.asyncio
    async def test_get_recent_logins(self, login_history_service):
        """Test getting recent successful logins."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"login_at": "2026-05-07T10:00:00Z", "ip_address": "192.168.1.1"}
            ]
            
            recent = await login_history_service.get_recent_logins("user123", limit=10)
            
            assert len(recent) == 1
    
    @pytest.mark.asyncio
    async def test_get_failed_login_attempts(self, login_history_service):
        """Test getting failed login attempts count."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value.count = 3
            
            count = await login_history_service.get_failed_login_attempts("user123", hours=24)
            
            assert count == 3
    
    @pytest.mark.asyncio
    async def test_detect_suspicious_activity_normal(self, login_history_service):
        """Test suspicious activity detection (normal activity)."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            # Mock recent logins (same IP, same device)
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"ip_address": "192.168.1.1", "device_type": "desktop"},
                {"ip_address": "192.168.1.1", "device_type": "desktop"}
            ]
            
            # Mock failed attempts
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value.count = 0
            
            activity = await login_history_service.detect_suspicious_activity("user123")
            
            assert activity["suspicious"] is False
    
    @pytest.mark.asyncio
    async def test_detect_suspicious_activity_multiple_ips(self, login_history_service):
        """Test suspicious activity detection (multiple IPs)."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            # Mock recent logins (4 different IPs)
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"ip_address": "192.168.1.1", "device_type": "desktop"},
                {"ip_address": "192.168.1.2", "device_type": "desktop"},
                {"ip_address": "192.168.1.3", "device_type": "desktop"},
                {"ip_address": "192.168.1.4", "device_type": "desktop"}
            ]
            
            # Mock failed attempts
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value.count = 0
            
            activity = await login_history_service.detect_suspicious_activity("user123")
            
            assert activity["suspicious"] is True
            assert activity["multiple_ips"] is True
    
    @pytest.mark.asyncio
    async def test_detect_suspicious_activity_high_failure_rate(self, login_history_service):
        """Test suspicious activity detection (high failure rate)."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            # Mock recent logins
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                {"ip_address": "192.168.1.1", "device_type": "desktop"}
            ]
            
            # Mock failed attempts (6 failures)
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value.count = 6
            
            activity = await login_history_service.detect_suspicious_activity("user123")
            
            assert activity["suspicious"] is True
            assert activity["high_failure_rate"] is True
    
    @pytest.mark.asyncio
    async def test_basic_user_agent_parsing(self, login_history_service):
        """Test basic user agent parsing fallback."""
        ua = "Unknown Browser"
        
        device_info = login_history_service._basic_parse_user_agent(ua)
        
        assert "device_type" in device_info
        assert "browser" in device_info
        assert "os" in device_info
    
    @pytest.mark.asyncio
    async def test_login_history_empty(self, login_history_service):
        """Test getting login history when empty."""
        with patch('app.services.login_history_service.supabase') as mock_supabase:
            mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []
            
            history = await login_history_service.get_user_login_history("user123", limit=50)
            
            assert len(history) == 0


# ============================================================================
# RATE LIMITING TESTS (12 tests)
# ============================================================================

class TestUserRateLimiting:
    """Test user-level rate limiting."""
    
    def test_rate_limit_tiers(self):
        """Test rate limit tiers are defined."""
        from app.middleware.user_rate_limit import RATE_LIMITS
        
        assert "patient" in RATE_LIMITS
        assert "doctor" in RATE_LIMITS
        assert "admin" in RATE_LIMITS
        assert "default" in RATE_LIMITS
    
    def test_patient_rate_limit(self):
        """Test patient rate limit (60 req/min)."""
        from app.middleware.user_rate_limit import RATE_LIMITS
        
        assert RATE_LIMITS["patient"] == 60
    
    def test_doctor_rate_limit(self):
        """Test doctor rate limit (120 req/min)."""
        from app.middleware.user_rate_limit import RATE_LIMITS
        
        assert RATE_LIMITS["doctor"] == 120
    
    def test_admin_rate_limit(self):
        """Test admin rate limit (300 req/min)."""
        from app.middleware.user_rate_limit import RATE_LIMITS
        
        assert RATE_LIMITS["admin"] == 300
    
    def test_default_rate_limit(self):
        """Test default rate limit (30 req/min)."""
        from app.middleware.user_rate_limit import RATE_LIMITS
        
        assert RATE_LIMITS["default"] == 30
    
    def test_rate_limit_check_under_limit(self):
        """Test rate limit check when under limit."""
        from app.middleware.user_rate_limit import UserRateLimitMiddleware
        import time
        
        middleware = UserRateLimitMiddleware(None)
        now = time.time()
        
        is_allowed, remaining, reset_time = middleware._check_rate_limit(
            "user123", 60, now
        )
        
        assert is_allowed is True
        assert remaining >= 0
    
    def test_rate_limit_check_at_limit(self):
        """Test rate limit check when at limit."""
        from app.middleware.user_rate_limit import UserRateLimitMiddleware, rate_limit_storage
        import time
        from collections import deque
        
        middleware = UserRateLimitMiddleware(None)
        now = time.time()
        
        # Fill up rate limit
        rate_limit_storage["user123"] = deque([now - 30] * 60, maxlen=1000)
        
        is_allowed, remaining, reset_time = middleware._check_rate_limit(
            "user123", 60, now
        )
        
        assert is_allowed is False
        assert remaining == 0
    
    def test_rate_limit_sliding_window(self):
        """Test sliding window algorithm."""
        from app.middleware.user_rate_limit import UserRateLimitMiddleware, rate_limit_storage
        import time
        from collections import deque
        
        middleware = UserRateLimitMiddleware(None)
        now = time.time()
        
        # Add old requests (should be removed)
        rate_limit_storage["user123"] = deque([now - 120] * 10, maxlen=1000)
        
        is_allowed, remaining, reset_time = middleware._check_rate_limit(
            "user123", 60, now
        )
        
        # Old requests should be removed, so we're under limit
        assert is_allowed is True
    
    def test_rate_limit_reset_time(self):
        """Test rate limit reset time calculation."""
        from app.middleware.user_rate_limit import UserRateLimitMiddleware
        import time
        
        middleware = UserRateLimitMiddleware(None)
        now = time.time()
        
        is_allowed, remaining, reset_time = middleware._check_rate_limit(
            "user123", 60, now
        )
        
        # Reset time should be ~60 seconds from now
        assert reset_time > now
        assert reset_time <= now + 60
    
    def test_rate_limit_bypass_paths(self):
        """Test rate limit bypass paths."""
        from app.middleware.user_rate_limit import BYPASS_PATHS
        
        assert "/health" in BYPASS_PATHS
        assert "/docs" in BYPASS_PATHS
    
    def test_rate_limit_storage_cleanup(self):
        """Test rate limit storage cleanup."""
        from app.middleware.user_rate_limit import UserRateLimitMiddleware, rate_limit_storage
        import time
        from collections import deque
        
        middleware = UserRateLimitMiddleware(None)
        now = time.time()
        
        # Add old requests
        rate_limit_storage["user123"] = deque([now - 120] * 10, maxlen=1000)
        
        # Check rate limit (should cleanup old requests)
        middleware._check_rate_limit("user123", 60, now)
        
        # Old requests should be removed
        assert len(rate_limit_storage["user123"]) == 1  # Only current request
    
    def test_rate_limit_per_user_isolation(self):
        """Test that rate limits are isolated per user."""
        from app.middleware.user_rate_limit import UserRateLimitMiddleware, rate_limit_storage
        import time
        from collections import deque
        
        middleware = UserRateLimitMiddleware(None)
        now = time.time()
        
        # Fill up user1's rate limit
        rate_limit_storage["user1"] = deque([now - 30] * 60, maxlen=1000)
        
        # Check user2 (should be allowed)
        is_allowed, remaining, reset_time = middleware._check_rate_limit(
            "user2", 60, now
        )
        
        assert is_allowed is True


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
