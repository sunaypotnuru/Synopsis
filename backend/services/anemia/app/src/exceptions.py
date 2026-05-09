"""
Custom exception classes for the anemia detection system.

This module defines a hierarchy of exceptions used throughout the system
for better error handling and debugging.
"""


class AnemiaDetectionError(Exception):
    """Base exception for anemia detection system."""

    def __init__(self, message: str, details: dict = None):
        """
        Initialize the exception.

        Args:
            message: Error message
            details: Optional dictionary with additional error context
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def __str__(self):
        """Return string representation of the error."""
        if self.details:
            details_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            return f"{self.message} ({details_str})"
        return self.message


class ROIExtractionError(AnemiaDetectionError):
    """
    Raised when ROI extraction fails.

    This can occur when:
    - No fingernail or conjunctiva region is detected
    - Image quality is too poor for segmentation
    - Image format is invalid or corrupted
    """

    pass


class DatasetError(AnemiaDetectionError):
    """
    Raised when dataset loading or validation fails.

    This can occur when:
    - Dataset files are missing or corrupted
    - Label files are malformed
    - Data validation fails
    """

    pass


class ModelError(AnemiaDetectionError):
    """
    Raised when model operations fail.

    This can occur when:
    - Model architecture initialization fails
    - Model loading fails
    - Forward pass encounters errors
    """

    pass


class InferenceError(AnemiaDetectionError):
    """
    Raised when inference fails.

    This can occur when:
    - Model file is invalid or corrupted
    - Input preprocessing fails
    - Prediction computation fails
    """

    pass


class ExplainabilityWarning(Warning):
    """
    Warning for non-critical SHAP computation failures.

    This warning is raised when SHAP explanation generation fails
    but should not block the main evaluation process.
    """

    pass
