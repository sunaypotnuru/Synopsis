"""
Initialize Supabase Storage buckets on application startup.
This ensures all required buckets exist before any upload operations.
"""

import logging
from app.services.supabase import supabase

logger = logging.getLogger(__name__)

# Define all required buckets with their configuration
REQUIRED_BUCKETS = {
    "scan-images": {
        "public": False,
        "description": "Private bucket for patient scan images",
    },
    "documents": {
        "public": False,
        "description": "Private bucket for patient documents",
    },
    "documents-private": {
        "public": False,
        "description": "Private bucket for sensitive documents",
    },
    "avatars": {"public": True, "description": "Public bucket for user avatars"},
}


def initialize_storage_buckets():
    """Create all required storage buckets if they don't already exist."""
    try:
        # Get list of existing buckets
        existing_buckets = []
        try:
            response = supabase.storage.list_buckets()
            if response:
                existing_buckets = [bucket.name for bucket in response]
        except Exception as e:
            logger.warning(
                f"Could not list buckets: {e}. Will attempt to create anyway."
            )

        # Create missing buckets
        for bucket_name, config in REQUIRED_BUCKETS.items():
            if bucket_name not in existing_buckets:
                try:
                    supabase.storage.create_bucket(
                        bucket_name, options={"public": config.get("public", False)}
                    )
                    logger.info(f"✅ Created storage bucket: {bucket_name}")
                except Exception as e:
                    if (
                        "already exists" in str(e).lower()
                        or "bucket already exists" in str(e).lower()
                    ):
                        logger.info(f"✅ Bucket already exists: {bucket_name}")
                    else:
                        logger.error(f"❌ Failed to create bucket {bucket_name}: {e}")
            else:
                logger.info(f"✅ Bucket already exists: {bucket_name}")

        logger.info("✅ Storage buckets initialized successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Critical error initializing storage: {e}")
        return False
