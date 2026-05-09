from authlib.integrations.requests_client import OAuth2Session
from authlib.oauth2.rfc6749 import TokenMixin
import os
from typing import Dict, Optional
import time


class SMARTonFHIRClient:
    """
    SMART on FHIR Client implementation using Authlib.
    Supports OAuth 2.0 Launch flow for EHR integration.
    """

    def __init__(self):
        self.client_id = os.getenv("OAUTH_CLIENT_ID")
        self.client_secret = os.getenv("OAUTH_CLIENT_SECRET")
        self.token_url = os.getenv("OAUTH_TOKEN_URL")
        self.authorize_url = os.getenv("OAUTH_AUTHORIZE_URL")
        self.scope = os.getenv(
            "OAUTH_SCOPE",
            "patient/Patient.read patient/Observation.read launch openid fhirUser",
        )

    def get_authorization_url(
        self, redirect_uri: str, state: str, launch: Optional[str] = None
    ) -> str:
        """Generate the authorization URL for the SMART launch."""
        client = OAuth2Session(
            self.client_id, scope=self.scope, redirect_uri=redirect_uri
        )
        extra_params = {}
        if launch:
            extra_params["launch"] = launch

        authorization_url, _ = client.create_authorization_url(
            self.authorize_url, state=state, **extra_params
        )
        return authorization_url

    async def fetch_token(self, authorization_response: str, redirect_uri: str) -> Dict:
        """Fetch the access token using the authorization response."""
        client = OAuth2Session(
            self.client_id,
            self.client_secret,
            scope=self.scope,
            redirect_uri=redirect_uri,
        )
        token = client.fetch_token(
            self.token_url, authorization_response=authorization_response
        )
        return token

    def validate_token(self, token: str) -> bool:
        """
        Validate the bearer token.
        In a production environment, this would check against the introspection endpoint
        or validate the JWT signature.
        """
        # Placeholder for demonstration - in production, use Authlib's ResourceProtector
        return len(token) > 20


class TokenStorage(TokenMixin):
    """Token storage implementation for Supabase persistence."""

    @staticmethod
    def save_token(user_id: str, token: Dict):
        from supabase import create_client

        supabase = create_client(
            os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        )

        data = {
            "user_id": user_id,
            "access_token": token.get("access_token"),
            "refresh_token": token.get("refresh_token"),
            "expires_at": time.time() + token.get("expires_in", 3600),
            "patient_id": token.get("patient"),
        }
        supabase.table("oauth_tokens").upsert(data).execute()


smart_client = SMARTonFHIRClient()
