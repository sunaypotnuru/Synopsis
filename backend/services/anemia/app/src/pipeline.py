"""
pipeline.py - Complete pipeline with organized image saving
Supports both TensorFlow (legacy) and PyTorch (new 99.63% accuracy) models
"""

import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check which model to use based on environment variable or model availability
USE_PYTORCH = os.getenv("USE_PYTORCH_MODEL", "true").lower() == "true"


def get_pipeline():
    """
    Get the appropriate pipeline based on configuration.
    Defaults to PyTorch pipeline for better accuracy.
    """
    if USE_PYTORCH:
        try:
            from .simple_pytorch_pipeline import get_simple_pytorch_pipeline

            return get_simple_pytorch_pipeline()
        except Exception as e:
            logger.error(f"Failed to load PyTorch pipeline: {e}")
            logger.info("Falling back to TensorFlow pipeline")
            # Fall back to TensorFlow if PyTorch fails
            from .tensorflow_pipeline import get_tensorflow_pipeline

            return get_tensorflow_pipeline()
    else:
        # Use TensorFlow pipeline
        from .tensorflow_pipeline import get_tensorflow_pipeline

        return get_tensorflow_pipeline()
