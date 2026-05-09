"""
Centralized error handling utilities
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging
import uuid
import re
import html

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API error class"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseError(APIError):
    """Database operation errors"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Database error: {message}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class ValidationError(APIError):
    """Input validation errors"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Validation error: {message}",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class AuthenticationError(APIError):
    """Authentication errors"""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(APIError):
    """Authorization errors"""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(APIError):
    """Resource not found errors"""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ConflictError(APIError):
    """Resource conflict errors"""

    def __init__(self, message: str):
        super().__init__(
            message=f"Conflict: {message}", status_code=status.HTTP_409_CONFLICT
        )


def handle_database_error(error: Exception, operation: str) -> HTTPException:
    """
    Handle database errors consistently

    Args:
        error: The exception that occurred
        operation: Description of the operation that failed

    Returns:
        HTTPException with appropriate status code and message
    """
    error_msg = str(error).lower()

    # Foreign key violation
    if "foreign key" in error_msg or "violates foreign key constraint" in error_msg:
        logger.error(f"Foreign key violation during {operation}: {error}")
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Referenced resource does not exist",
        )

    # Unique constraint violation
    if "unique" in error_msg or "duplicate key" in error_msg:
        logger.error(f"Unique constraint violation during {operation}: {error}")
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Resource already exists"
        )

    # Not null violation
    if "not null" in error_msg or "null value" in error_msg:
        logger.error(f"Not null violation during {operation}: {error}")
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Required field missing",
        )

    # Generic database error
    logger.error(f"Database error during {operation}: {error}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Database operation failed",
    )


def safe_database_operation(operation_name: str):
    """
    Decorator for safe database operations with error handling

    Usage:
        @safe_database_operation("create user")
        def create_user(data):
            return supabase.table("users").insert(data).execute()
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                raise handle_database_error(e, operation_name)

        return wrapper

    return decorator


def validate_uuid(value: str, field_name: str = "id") -> str:
    """
    Validate UUID format

    Args:
        value: The UUID string to validate
        field_name: Name of the field for error messages

    Returns:
        The validated UUID string

    Raises:
        ValidationError: If UUID is invalid
    """
    try:
        uuid.UUID(value)
        return value
    except (ValueError, AttributeError):
        raise ValidationError(f"Invalid {field_name}: must be a valid UUID")


def validate_email(email: str) -> str:
    """
    Validate email format

    Args:
        email: The email string to validate

    Returns:
        The validated email string

    Raises:
        ValidationError: If email is invalid
    """
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_regex, email):
        raise ValidationError(f"Invalid email format: {email}")
    return email.lower()


def validate_phone(phone: str) -> str:
    """
    Validate phone number format

    Args:
        phone: The phone string to validate

    Returns:
        The validated phone string

    Raises:
        ValidationError: If phone is invalid
    """
    # Remove all non-digit characters
    digits = re.sub(r"\D", "", phone)

    # Check if it's a valid length (10-15 digits)
    if len(digits) < 10 or len(digits) > 15:
        raise ValidationError("Invalid phone number: must be 10-15 digits")

    return phone


def sanitize_input(value: str, max_length: int = 1000) -> str:
    """
    Sanitize user input to prevent XSS and injection attacks

    Args:
        value: The input string to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string

    Raises:
        ValidationError: If input is too long
    """
    if len(value) > max_length:
        raise ValidationError(f"Input too long: maximum {max_length} characters")

    # Remove potentially dangerous characters
    return html.escape(value.strip())
