"""
Secure File Upload Utilities for Netra AI
==========================================
Provides content-type validation, magic-byte checking, filename sanitisation,
and file-size limits for all medical image uploads.
"""

import hashlib
import uuid
import re
import logging
from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

# Allowed MIME types and their corresponding magic byte signatures
_ALLOWED_IMAGE_TYPES: dict[str, list[bytes]] = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/jpg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],  # RIFF....WEBP
    "image/bmp": [b"BM"],
    "image/tif": [b"II*\x00", b"MM\x00*"],
}

# Maximum file size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024


class SecureFileUpload:
    """
    Utility class for validating and processing medical image uploads securely.
    """

    @staticmethod
    async def validate_image_upload(file: UploadFile) -> bytes:
        """
        Validates an uploaded image file for:
          - Allowed MIME type
          - Magic byte signature (prevents MIME spoofing)
          - Maximum file size (10 MB)

        Args:
            file: The uploaded file from the FastAPI request.

        Returns:
            The raw bytes content of the validated file.

        Raises:
            HTTPException 400 — if the file fails any security check.
        """
        # 1. Content-type check
        content_type = (file.content_type or "").lower()
        if content_type not in _ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File type '{content_type}' is not allowed. "
                    "Please upload a JPEG, PNG, WebP, BMP, or TIFF image."
                ),
            )

        # 2. Read content
        content = await file.read()

        # 3. File size check
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds the {MAX_FILE_SIZE // (1024 * 1024)} MB limit.",
            )

        # 4. Magic byte validation (prevents MIME spoofing)
        magic_signatures = _ALLOWED_IMAGE_TYPES[content_type]
        ok = any(content.startswith(sig) for sig in magic_signatures)

        # Special case: WebP — RIFF header + 'WEBP' at offset 8
        if content_type == "image/webp":
            ok = content.startswith(b"RIFF") and content[8:12] == b"WEBP"

        if not ok:
            logger.warning(
                "File magic bytes do not match declared content-type '%s'. "
                "Possible MIME spoofing attempt.",
                content_type,
            )
            raise HTTPException(
                status_code=400,
                detail="File content does not match the declared file type. Upload rejected.",
            )

        return content

    @staticmethod
    def generate_secure_filename(original_filename: str | None, user_id: str) -> str:
        """
        Generate a secure, unique filename for storage.

        Strips the original name, keeps only the extension, and prepends a
        hash of the user_id + a UUID so that filenames cannot be guessed.

        Args:
            original_filename: The original filename provided by the client.
            user_id: The authenticated user's UUID for namespacing.

        Returns:
            A sanitised, unique filename string.
        """
        # Determine extension
        ext = "jpg"
        if original_filename:
            # Strip path traversal characters
            safe_name = re.sub(r"[^\w.\-]", "_", original_filename)
            parts = safe_name.rsplit(".", 1)
            if len(parts) == 2 and parts[1].lower() in {
                "jpg",
                "jpeg",
                "png",
                "webp",
                "bmp",
                "tif",
                "tiff",
            }:
                ext = parts[1].lower()

        # User-scoped prefix (first 8 chars of SHA-256 of user_id)
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:8]
        unique_id = uuid.uuid4().hex

        return f"{user_hash}_{unique_id}.{ext}"

    @staticmethod
    def sanitise_filename(filename: str | None, max_length: int = 255) -> str:
        """
        Returns a safe version of the original filename, trimmed to max_length.
        """
        if not filename:
            return "unknown"
        safe = re.sub(r"[^\w.\-]", "_", filename)
        return safe[:max_length]
