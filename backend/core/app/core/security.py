import logging
from fastapi import Depends, HTTPException, status  # type: ignore
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials  # type: ignore
from fastapi import Request  # type: ignore
from typing import Dict, Any
import jwt  # type: ignore
import os

from app.core.config import settings  # type: ignore
from app.models.schemas import TokenPayload, UserRole  # type: ignore

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


async def get_current_user_ws(token: str) -> Dict[str, Any]:
    """
    Get current user from WebSocket token.

    Args:
        token: JWT token from query parameter

    Returns:
        User payload dict

    Raises:
        HTTPException: If authentication fails
    """
    try:
        payload = verify_supabase_jwt(token)
        return payload
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verify a Supabase JWT token.
    """
    jwt_secret = settings.SUPABASE_JWT_SECRET
    if not jwt_secret:
        logger.error("SUPABASE_JWT_SECRET not configured - authentication impossible")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service misconfigured",
        )

    try:
        # Check token algorithm first
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")

        if alg in ["RS256", "ES256"]:
            # Supabase uses RS256/ES256 for newer projects -> Use JWKS
            # We don't cache locally in this simple implementation, let PyJWKClient handle it
            supabase_url = settings.SUPABASE_URL.rstrip("/")
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            jwks_client = jwt.PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                leeway=60,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False,
                },
            )
        else:
            # Fallback to legacy HS256 with symmetric secret
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                leeway=60,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False,
                },
            )

        # Additional security checks
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )

        if not payload.get("email"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing email",
            )

        return payload

    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        logger.warning("JWT invalid audience")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        logger.warning("JWT invalid issuer")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidSignatureError:
        logger.warning("JWT signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT validation failed: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected JWT verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenPayload:
    """
    Get current user with maximum security.
    Supports a local DEV-only bypass when settings.BYPASS_AUTH is enabled.

    SECURITY: Bypass auth is ONLY allowed in development/testing environments.
    """
    # Check environment first - NEVER allow bypass in production
    environment = os.getenv("ENVIRONMENT", "development").lower()

    # DEV / demo bypass controlled by backend settings only.
    # This allows local UI testing without Supabase sessions while still keeping
    # production secure (BYPASS_AUTH defaults to False and is blocked in prod).
    # Only trust backend configuration for bypass mode.
    # Do not allow frontend env vars to influence backend auth decisions.
    is_bypass_active = settings.BYPASS_AUTH

    # CRITICAL SECURITY CHECK: Prevent bypass in production
    if is_bypass_active and environment == "production":
        logger.critical(
            "🚨 SECURITY VIOLATION: BYPASS_AUTH enabled in production environment!"
        )
        logger.critical("🚨 This is a critical security misconfiguration")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication bypass cannot be enabled in production",
        )

    if is_bypass_active:
        demo_email = request.headers.get("X-Demo-Email")
        demo_role = request.headers.get("X-Demo-Role")

        # If no explicit role header, infer from request path for seamless dev experience
        if not demo_role:
            path = request.url.path
            if "/api/v1/doctor" in path:
                demo_role = "doctor"
            elif "/api/v1/admin" in path:
                demo_role = "admin"
            else:
                demo_role = "patient"

        demo_role = demo_role.lower()
        if not demo_email:
            demo_email = f"demo+{demo_role}@example.com"

        try:
            role = UserRole(demo_role)
        except ValueError:
            role = UserRole.PATIENT

        # DYNAMIC UUID LOOKUP FOR SEEDED ACCOUNTS
        # This ensures that even in bypass mode, we get the real data for presentation accounts
        user_id = "00000000-0000-0000-0000-000000000000"
        try:
            from app.services.supabase import supabase

            table = (
                "profiles_doctor"
                if demo_role in ["doctor", "admin"]
                else "profiles_patient"
            )
            res = (
                supabase.table(table)
                .select("id")
                .eq("email", demo_email)
                .maybe_single()
                .execute()
            )
            if res and hasattr(res, "data") and res.data:
                # Type safe access
                data = res.data
                if isinstance(data, list) and len(data) > 0:
                    user_id = str(data[0].get("id", user_id))
                elif isinstance(data, dict):
                    user_id = str(data.get("id", user_id))

                logger.info(
                    f"Bypass Lookup: Found real UUID {user_id} for {demo_email}"
                )
        except Exception as e:
            logger.warning(f"Bypass UUID lookup failed for {demo_email}: {e}")

        logger.info(f"Using BYPASS AUTH for {demo_role}: {demo_email} (ID: {user_id})")
        return TokenPayload(
            sub=user_id,
            email=demo_email,
            role=role,
        )

    if not credentials:
        logger.warning("Authentication attempt without credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # JWT format validation: must have 3 parts separated by dots (header.payload.signature)
    if not token or token.count(".") != 2:
        logger.warning("Authentication attempt with invalid JWT format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Basic token length check
    if len(token) < 10:
        logger.warning("Authentication attempt with token too short")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = verify_supabase_jwt(token)
    except HTTPException:
        # Re-raise HTTP exceptions from JWT verification
        raise
    except Exception as e:
        logger.error(f"Unexpected authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract and validate user metadata
    user_metadata = payload.get("user_metadata", {})
    role_str = user_metadata.get("role", "patient")

    # Validate role
    try:
        role = UserRole(role_str.lower())
    except ValueError:
        logger.warning(f"Invalid role in token: {role_str}")
        role = UserRole.PATIENT  # Default to least privileged role

    # Additional security checks
    user_id_str = str(payload.get("sub", ""))
    email_str = str(payload.get("email", ""))

    if not user_id_str or not email_str:
        logger.warning("Token missing required user information")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user information",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Log successful authentication (without sensitive data)
    logger.info(
        f"User authenticated: {email_str[:3]}***@{email_str.split('@')[1] if '@' in email_str else 'unknown'}"
    )

    return TokenPayload(sub=user_id_str, email=email_str, role=role)


def get_current_patient(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    # A patient (or admin) can access patient routes
    if current_user.role not in [UserRole.PATIENT, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def get_current_doctor(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    # A doctor (or admin) can access doctor routes
    if current_user.role not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def get_current_admin(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
