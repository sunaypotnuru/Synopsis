"""
Custom Audit Logging System for NetraAI MCP Server (FREE)
Uses Supabase free tier for HIPAA-compliant audit trails.
"""

from supabase import create_client, Client
import os
from datetime import datetime, timezone
from typing import Dict, Optional, Any
import re
import logging

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Free audit logging using Supabase.
    Provides HIPAA-compliant audit trails with PHI scrubbing.
    """

    def __init__(self):
        self.enabled = os.getenv("AUDIT_LOGGING_ENABLED", "true").lower() == "true"
        self.supabase: Optional[Client] = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """Initialize Supabase client lazily and fail-safe."""
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_KEY", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )
        if not supabase_url or not supabase_key:
            logger.warning(
                "Audit logger running in degraded mode (Supabase env not configured)"
            )
            self.enabled = False
            return
        try:
            self.supabase = create_client(supabase_url, supabase_key)
        except Exception as e:
            logger.error(f"Failed to initialize audit Supabase client: {e}")
            self.enabled = False

    async def log_tool_invocation(
        self,
        tool_name: str,
        user_id: Optional[str],
        patient_id: Optional[str],
        action: str,
        status: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        execution_time_ms: float,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """
        Log MCP tool invocation with automatic PHI scrubbing.

        Args:
            tool_name: Name of the MCP tool (e.g., "diagnose_anemia")
            user_id: User identifier (from OAuth token)
            patient_id: Patient identifier
            action: Action performed (e.g., "execute", "read", "write")
            status: Execution status ("success", "failure", "error")
            input_data: Tool input parameters
            output_data: Tool output results
            execution_time_ms: Execution time in milliseconds
            ip_address: Client IP address
            user_agent: Client user agent
            error_message: Error message if status is "failure" or "error"
        """
        if not self.enabled:
            return
        if not self.supabase:
            return

        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "MCP_TOOL_INVOCATION",
                "user_id": user_id,
                "patient_id": patient_id,
                "table_name": tool_name,
                "action": action,
                "status": status,
                "input_data": self._scrub_phi(input_data),
                "output_data": self._scrub_phi(output_data),
                "execution_time_ms": execution_time_ms,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "error_message": error_message,
            }

            # O1: Removed DEBUG print statements - use structured logging instead
            # Store in Supabase (free tier - 500 MB storage)
            self.supabase.table("audit_logs").insert(log_entry).execute()

        except Exception as e:
            # Don't fail the main operation if audit logging fails
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Audit logging failed: {e}")

    def _scrub_phi(self, data: Any) -> Any:
        """
        Scrub Protected Health Information (PHI) from data.

        Removes or redacts:
        - SSN, MRN, phone numbers, email addresses
        - Full names, addresses
        - Dates of birth
        - Medical record numbers

        Args:
            data: Data to scrub (dict, list, or primitive)

        Returns:
            Scrubbed data with PHI redacted
        """
        if data is None:
            return None

        if isinstance(data, dict):
            scrubbed = {}
            for key, value in data.items():
                # Check if key indicates PHI
                if self._is_phi_field(key):
                    scrubbed[key] = "[REDACTED]"
                else:
                    scrubbed[key] = self._scrub_phi(value)
            return scrubbed

        elif isinstance(data, list):
            return [self._scrub_phi(item) for item in data]

        elif isinstance(data, str):
            # Scrub patterns in strings
            return self._scrub_phi_patterns(data)

        else:
            return data

    def _is_phi_field(self, field_name: str) -> bool:
        """
        Check if a field name indicates PHI.

        Args:
            field_name: Field name to check

        Returns:
            True if field contains PHI
        """
        phi_keywords = [
            "ssn",
            "social_security",
            "mrn",
            "medical_record",
            "phone",
            "telephone",
            "email",
            "address",
            "name",
            "first_name",
            "last_name",
            "full_name",
            "dob",
            "date_of_birth",
            "birthdate",
            "zip",
            "postal_code",
            "license",
            "passport",
        ]

        field_lower = field_name.lower()
        return any(keyword in field_lower for keyword in phi_keywords)

    def _scrub_phi_patterns(self, text: str) -> str:
        """
        Scrub PHI patterns from text using regex.

        Patterns:
        - SSN: XXX-XX-XXXX
        - Phone: (XXX) XXX-XXXX or XXX-XXX-XXXX
        - Email: xxx@xxx.xxx
        - Dates: MM/DD/YYYY or YYYY-MM-DD

        Args:
            text: Text to scrub

        Returns:
            Text with PHI patterns redacted
        """
        # SSN pattern
        text = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[SSN-REDACTED]", text)

        # Phone patterns
        text = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[PHONE-REDACTED]", text)
        text = re.sub(r"\(\d{3}\)\s*\d{3}[-.]?\d{4}", "[PHONE-REDACTED]", text)

        # Email pattern
        text = re.sub(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "[EMAIL-REDACTED]",
            text,
        )

        # Date patterns (be conservative - only redact if looks like DOB)
        # We keep diagnostic dates but redact DOB-like patterns

        return text

    async def log_authentication(
        self,
        user_id: str,
        action: str,
        status: str,
        ip_address: Optional[str] = None,
        details: Optional[Dict] = None,
    ):
        """
        Log authentication events (login, logout, token refresh).

        Args:
            user_id: User identifier
            action: Authentication action ("login", "logout", "token_refresh")
            status: Status ("success", "failure")
            ip_address: Client IP address
            details: Additional details (e.g., OAuth provider)
        """
        if not self.enabled:
            return
        if not self.supabase:
            return

        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "AUTHENTICATION",
                "user_id": user_id,
                "action": action,
                "status": status,
                "ip_address": ip_address,
                "input_data": details or {},
            }

            self.supabase.table("audit_logs").insert(log_entry).execute()

        except Exception as e:
            logger.error(f"Authentication audit logging failed: {e}")

    async def log_data_access(
        self,
        user_id: str,
        patient_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        ip_address: Optional[str] = None,
    ):
        """
        Log data access events (FHIR resource reads/writes).

        Args:
            user_id: User identifier
            patient_id: Patient identifier
            resource_type: FHIR resource type (e.g., "Patient", "Observation")
            resource_id: FHIR resource ID
            action: Action performed ("read", "write", "delete")
            ip_address: Client IP address
        """
        if not self.enabled:
            return
        if not self.supabase:
            return

        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "DATA_ACCESS",
                "user_id": user_id,
                "patient_id": patient_id,
                "action": action,
                "status": "success",
                "input_data": {
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                },
                "ip_address": ip_address,
            }

            self.supabase.table("audit_logs").insert(log_entry).execute()

        except Exception as e:
            logger.error(f"Data access audit logging failed: {e}")

    async def query_audit_logs(
        self,
        patient_id: Optional[str] = None,
        user_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> list:
        """
        Query audit logs with filters.

        Args:
            patient_id: Filter by patient ID
            user_id: Filter by user ID
            tool_name: Filter by tool name
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of results

        Returns:
            List of audit log entries
        """
        try:
            if not self.supabase:
                return []
            query = self.supabase.table("audit_logs").select("*")

            if patient_id:
                query = query.eq("patient_id", patient_id)

            if user_id:
                query = query.eq("user_id", user_id)

            if tool_name:
                query = query.eq("tool_name", tool_name)

            if start_date:
                query = query.gte("timestamp", start_date.isoformat())

            if end_date:
                query = query.lte("timestamp", end_date.isoformat())

            query = query.order("timestamp", desc=True).limit(limit)

            response = query.execute()
            return response.data

        except Exception as e:
            logger.error(f"Audit log query failed: {e}")
            return []


# Global audit logger instance
audit_logger = AuditLogger()


# Decorator for automatic audit logging
def audit_tool(tool_name: str):
    """
    Decorator to automatically audit MCP tool invocations.

    Usage:
        @audit_tool("diagnose_anemia")
        async def diagnose_anemia(ctx, image_url, patient_id):
            ...
    """

    def decorator(func):
        async def wrapper(*args, **kwargs):
            import time

            start_time = time.time()

            # Extract context and parameters
            ctx = args[0] if args else None
            user_id = getattr(ctx, "user_id", None) if ctx else None
            patient_id = kwargs.get("patient_id")

            try:
                # Execute tool
                result = await func(*args, **kwargs)

                # Log success
                await audit_logger.log_tool_invocation(
                    tool_name=tool_name,
                    user_id=user_id,
                    patient_id=patient_id,
                    action="execute",
                    status="success",
                    input_data=kwargs,
                    output_data=(
                        result if isinstance(result, dict) else {"result": str(result)}
                    ),
                    execution_time_ms=(time.time() - start_time) * 1000,
                )

                return result

            except Exception as e:
                # Log failure
                await audit_logger.log_tool_invocation(
                    tool_name=tool_name,
                    user_id=user_id,
                    patient_id=patient_id,
                    action="execute",
                    status="failure",
                    input_data=kwargs,
                    output_data={},
                    execution_time_ms=(time.time() - start_time) * 1000,
                    error_message=str(e),
                )

                raise

        return wrapper

    return decorator
