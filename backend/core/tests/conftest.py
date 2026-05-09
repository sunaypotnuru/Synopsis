"""
Pytest configuration and fixtures
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Test client for API testing"""
    return TestClient(app)


@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    return {
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": "test@example.com",
        "role": "patient",
    }


@pytest.fixture
def mock_doctor():
    """Mock authenticated doctor"""
    return {
        "sub": "00000000-0000-0000-0000-000000000002",
        "email": "doctor@example.com",
        "role": "doctor",
    }


@pytest.fixture
def mock_admin():
    """Mock authenticated admin"""
    return {
        "sub": "00000000-0000-0000-0000-000000000003",
        "email": "admin@example.com",
        "role": "admin",
    }


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Cleanup test data after each test"""
    yield
    # Add cleanup logic here if needed
