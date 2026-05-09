"""
AI Validation Service
Validates AI responses for quality, confidence, and hallucination detection
"""

import re
import json
import logging
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class AIValidationService:
    """Service for validating AI responses"""

    # Validation thresholds
    MIN_RESPONSE_LENGTH = 50
    MAX_RESPONSE_LENGTH = 5000
    MIN_CONFIDENCE_THRESHOLD = 0.5
    HIGH_CONFIDENCE_THRESHOLD = 0.8

    # Medical terminology patterns (basic validation)
    MEDICAL_TERMS_PATTERN = re.compile(
        r"\b(symptom|diagnosis|treatment|medication|condition|patient|doctor|"
        r"therapy|disease|syndrome|disorder|infection|inflammation|chronic|acute)\b",
        re.IGNORECASE,
    )

    def __init__(self):
        """Initialize validation service"""
        self.validation_rules = self._load_validation_rules()

    def _load_validation_rules(self) -> Dict[str, Any]:
        """Load validation rules configuration"""
        return {
            "length": {
                "min": self.MIN_RESPONSE_LENGTH,
                "max": self.MAX_RESPONSE_LENGTH,
            },
            "confidence": {
                "min": self.MIN_CONFIDENCE_THRESHOLD,
                "high": self.HIGH_CONFIDENCE_THRESHOLD,
            },
            "format": {"json_required": False, "structured_required": True},
            "medical": {"terminology_check": True, "min_medical_terms": 2},
        }

    def validate_response(
        self,
        response: str,
        expected_format: str = "text",
        context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate AI response comprehensively

        Args:
            response: AI response text
            expected_format: Expected format ('text', 'json', 'structured')
            context: Additional context for validation

        Returns:
            Tuple of (is_valid, validation_result)
        """
        validation_result = {
            "is_valid": True,
            "checks": {},
            "warnings": [],
            "errors": [],
            "confidence_level": "unknown",
        }

        try:
            # 1. Length validation
            length_valid, length_msg = self._validate_length(response)
            validation_result["checks"]["length"] = length_valid
            if not length_valid:
                validation_result["errors"].append(length_msg)
                validation_result["is_valid"] = False

            # 2. Format validation
            format_valid, format_msg = self._validate_format(response, expected_format)
            validation_result["checks"]["format"] = format_valid
            if not format_valid:
                validation_result["errors"].append(format_msg)
                validation_result["is_valid"] = False

            # 3. Completeness check
            complete_valid, complete_msg = self._validate_completeness(
                response, expected_format
            )
            validation_result["checks"]["completeness"] = complete_valid
            if not complete_valid:
                validation_result["warnings"].append(complete_msg)

            # 4. Medical terminology validation
            medical_valid, medical_msg = self._validate_medical_terminology(response)
            validation_result["checks"]["medical_terminology"] = medical_valid
            if not medical_valid:
                validation_result["warnings"].append(medical_msg)

            # 5. Coherence check
            coherence_valid, coherence_msg = self._validate_coherence(response)
            validation_result["checks"]["coherence"] = coherence_valid
            if not coherence_valid:
                validation_result["warnings"].append(coherence_msg)

            # 6. Hallucination detection
            hallucination_detected, hallucination_msg = self._detect_hallucination(
                response, context
            )
            validation_result["checks"]["hallucination"] = not hallucination_detected
            if hallucination_detected:
                validation_result["errors"].append(hallucination_msg)
                validation_result["is_valid"] = False

        except Exception as e:
            logger.error(f"Error during validation: {str(e)}")
            validation_result["is_valid"] = False
            validation_result["errors"].append(f"Validation error: {str(e)}")

        return validation_result["is_valid"], validation_result

    def _validate_length(self, response: str) -> Tuple[bool, str]:
        """Validate response length"""
        length = len(response)
        min_len = self.validation_rules["length"]["min"]
        max_len = self.validation_rules["length"]["max"]

        if length < min_len:
            return False, f"Response too short ({length} < {min_len} characters)"
        if length > max_len:
            return False, f"Response too long ({length} > {max_len} characters)"

        return True, "Length valid"

    def _validate_format(self, response: str, expected_format: str) -> Tuple[bool, str]:
        """Validate response format"""
        if expected_format == "json":
            try:
                json.loads(response)
                return True, "Valid JSON format"
            except json.JSONDecodeError as e:
                return False, f"Invalid JSON format: {str(e)}"

        elif expected_format == "structured":
            # Check for basic structure (paragraphs, lists, etc.)
            has_structure = (
                "\n\n" in response  # Paragraphs
                or "\n-" in response  # Lists
                or "\n1." in response  # Numbered lists
                or "\n*" in response  # Bullet points
            )
            if not has_structure:
                return False, "Response lacks structure (no paragraphs or lists)"

        return True, "Format valid"

    def _validate_completeness(
        self, response: str, expected_format: str
    ) -> Tuple[bool, str]:
        """Validate response completeness"""
        # Check if response seems complete (not cut off)
        if response.endswith("..."):
            return False, "Response appears incomplete (ends with ...)"

        # Check for common incomplete patterns
        incomplete_patterns = [
            r"\.\.\.$",  # Ends with ...
            r"[^.!?]$",  # Doesn't end with punctuation
            r"\bin progress\b",  # Contains "in progress"
            r"\bto be continued\b",  # Contains "to be continued"
        ]

        for pattern in incomplete_patterns:
            if re.search(pattern, response, re.IGNORECASE):
                return False, "Response appears incomplete"

        return True, "Response appears complete"

    def _validate_medical_terminology(self, response: str) -> Tuple[bool, str]:
        """Validate presence of medical terminology"""
        if not self.validation_rules["medical"]["terminology_check"]:
            return True, "Medical terminology check disabled"

        # Count medical terms
        medical_terms = self.MEDICAL_TERMS_PATTERN.findall(response)
        min_terms = self.validation_rules["medical"]["min_medical_terms"]

        if len(medical_terms) < min_terms:
            return (
                False,
                f"Insufficient medical terminology (found {len(medical_terms)}, expected {min_terms}+)",
            )

        return True, f"Medical terminology present ({len(medical_terms)} terms found)"

    def _validate_coherence(self, response: str) -> Tuple[bool, str]:
        """Validate response coherence"""
        # Check for repeated sentences
        sentences = response.split(".")
        unique_sentences = set(s.strip() for s in sentences if s.strip())

        if len(sentences) > 3 and len(unique_sentences) < len(sentences) * 0.8:
            return False, "Response contains significant repetition"

        # Check for contradictions (basic)
        contradiction_patterns = [
            (r"\bnot\b.*\bis\b", r"\bis\b.*\bnot\b"),
            (r"\byes\b", r"\bno\b"),
            (r"\bsafe\b", r"\bunsafe\b"),
        ]

        for pattern1, pattern2 in contradiction_patterns:
            if re.search(pattern1, response, re.IGNORECASE) and re.search(
                pattern2, response, re.IGNORECASE
            ):
                return False, "Response may contain contradictions"

        return True, "Response appears coherent"

    def _detect_hallucination(
        self, response: str, context: Optional[Dict[str, Any]]
    ) -> Tuple[bool, str]:
        """Detect potential hallucinations"""
        # Check for overly specific claims without context
        specific_patterns = [
            r"\d+(?:\.\d+)?%",  # Specific percentages
            r"\b\d{4}\b",  # Years
            r"\bexactly\b",  # Absolute claims
            r"\balways\b",  # Universal claims
            r"\bnever\b",  # Universal negations
        ]

        specific_claims = []
        for pattern in specific_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            specific_claims.extend(matches)

        # If many specific claims without supporting context, flag as potential hallucination
        if len(specific_claims) > 5 and not context:
            return (
                True,
                "Response contains many specific claims without supporting context",
            )

        # Check for made-up medical terms (very basic check)
        suspicious_patterns = [
            r"\b[A-Z]{3,}itis\b",  # Made-up conditions ending in -itis
            r"\b[A-Z]{3,}osis\b",  # Made-up conditions ending in -osis
        ]

        for pattern in suspicious_patterns:
            if re.search(pattern, response):
                return True, "Response may contain fabricated medical terms"

        return False, "No obvious hallucinations detected"

    def calculate_confidence_score(
        self,
        response: str,
        validation_result: Dict[str, Any],
        model_confidence: Optional[float] = None,
    ) -> float:
        """
        Calculate overall confidence score

        Args:
            response: AI response text
            validation_result: Validation result from validate_response
            model_confidence: Model's own confidence score (if available)

        Returns:
            Confidence score (0.0 to 1.0)
        """
        # Start with model confidence or default
        confidence = model_confidence if model_confidence is not None else 0.7

        # Adjust based on validation checks
        checks = validation_result.get("checks", {})

        # Reduce confidence for failed checks
        if not checks.get("length", True):
            confidence *= 0.7
        if not checks.get("format", True):
            confidence *= 0.8
        if not checks.get("completeness", True):
            confidence *= 0.9
        if not checks.get("medical_terminology", True):
            confidence *= 0.9
        if not checks.get("coherence", True):
            confidence *= 0.8
        if not checks.get("hallucination", True):
            confidence *= 0.5  # Significant reduction for hallucinations

        # Adjust based on warnings
        warning_count = len(validation_result.get("warnings", []))
        if warning_count > 0:
            confidence *= 1.0 - (warning_count * 0.05)  # 5% reduction per warning

        # Ensure confidence is in valid range
        confidence = max(0.0, min(1.0, confidence))

        return round(confidence, 3)

    def get_confidence_level(self, confidence_score: float) -> str:
        """Get confidence level label"""
        if confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD:
            return "high"
        elif confidence_score >= self.MIN_CONFIDENCE_THRESHOLD:
            return "medium"
        else:
            return "low"

    def should_flag_for_review(
        self, confidence_score: float, validation_result: Dict[str, Any]
    ) -> bool:
        """Determine if response should be flagged for human review"""
        # Flag if low confidence
        if confidence_score < self.MIN_CONFIDENCE_THRESHOLD:
            return True

        # Flag if validation failed
        if not validation_result.get("is_valid", False):
            return True

        # Flag if hallucination detected
        if not validation_result.get("checks", {}).get("hallucination", True):
            return True

        # Flag if multiple errors
        if len(validation_result.get("errors", [])) > 1:
            return True

        return False

    def get_fallback_action(self, validation_result: Dict[str, Any]) -> str:
        """Determine fallback action for failed validation"""
        # Check for errors in validation result
        _ = validation_result.get("errors", [])

        # If hallucination detected, reject immediately
        if not validation_result.get("checks", {}).get("hallucination", True):
            return "reject"

        # If format error, retry with different format
        if not validation_result.get("checks", {}).get("format", True):
            return "retry_with_format_fix"

        # If length error, retry with length constraint
        if not validation_result.get("checks", {}).get("length", True):
            return "retry_with_length_fix"

        # Default: flag for human review
        return "flag_for_review"


# Singleton instance
_validation_service = None


def get_validation_service() -> AIValidationService:
    """Get validation service instance"""
    global _validation_service
    if _validation_service is None:
        _validation_service = AIValidationService()
    return _validation_service
