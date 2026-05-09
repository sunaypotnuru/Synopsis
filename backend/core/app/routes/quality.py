from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import logging
from PIL import Image
import io
import numpy as np

from app.core.security import get_current_user
from app.models.schemas import TokenPayload

router = APIRouter(prefix="/quality", tags=["quality"])
logger = logging.getLogger(__name__)


def assess_image_quality(image_bytes: bytes) -> dict:
    """
    Assess the quality of an uploaded image.
    Returns quality metrics and recommendations.
    """
    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Get image dimensions
        width, height = image.size

        # Convert to numpy array for analysis
        img_array = np.array(image)

        # Check resolution
        min_resolution = 640
        resolution_ok = width >= min_resolution and height >= min_resolution

        # Calculate brightness
        brightness = np.mean(img_array)
        brightness_ok = 50 < brightness < 200

        # Calculate contrast (standard deviation)
        contrast = np.std(img_array)
        contrast_ok = contrast > 30

        # Calculate sharpness (Laplacian variance)
        gray = np.mean(img_array, axis=2)
        laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
        sharpness = np.var(
            np.abs(np.convolve(gray.flatten(), laplacian.flatten(), mode="same"))
        )
        sharpness_ok = sharpness > 100

        # Overall quality score (0-100)
        quality_score = 0
        if resolution_ok:
            quality_score += 30
        if brightness_ok:
            quality_score += 25
        if contrast_ok:
            quality_score += 25
        if sharpness_ok:
            quality_score += 20

        # Determine quality level
        if quality_score >= 80:
            quality_level = "excellent"
        elif quality_score >= 60:
            quality_level = "good"
        elif quality_score >= 40:
            quality_level = "fair"
        else:
            quality_level = "poor"

        # Generate recommendations
        recommendations = []
        if not resolution_ok:
            recommendations.append(
                f"Image resolution is too low. Minimum {min_resolution}x{min_resolution} required."
            )
        if not brightness_ok:
            if brightness < 50:
                recommendations.append(
                    "Image is too dark. Please ensure good lighting."
                )
            else:
                recommendations.append(
                    "Image is too bright. Reduce lighting or exposure."
                )
        if not contrast_ok:
            recommendations.append(
                "Image has low contrast. Ensure clear focus on the subject."
            )
        if not sharpness_ok:
            recommendations.append(
                "Image appears blurry. Hold camera steady and ensure proper focus."
            )

        if not recommendations:
            recommendations.append("Image quality is good for analysis.")

        return {
            "quality_score": quality_score,
            "quality_level": quality_level,
            "metrics": {
                "resolution": f"{width}x{height}",
                "brightness": round(brightness, 2),
                "contrast": round(contrast, 2),
                "sharpness": round(sharpness, 2),
            },
            "checks": {
                "resolution": resolution_ok,
                "brightness": brightness_ok,
                "contrast": contrast_ok,
                "sharpness": sharpness_ok,
            },
            "recommendations": recommendations,
            "acceptable": quality_score >= 40,
        }

    except Exception as e:
        logger.error(f"Error assessing image quality: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")


@router.post("/assess")
async def assess_quality(
    file: UploadFile = File(...), current_user: TokenPayload = Depends(get_current_user)
):
    """
    Assess the quality of an uploaded image before processing.
    Returns quality metrics and recommendations.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read file
        contents = await file.read()

        # Assess quality
        assessment = assess_image_quality(contents)

        logger.info(
            f"Image quality assessed for user {current_user.sub}: {assessment['quality_level']}"
        )

        return assessment

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in quality assessment endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to assess image quality")
