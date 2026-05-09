"""
Crisis Detection System - Rule-based + NLP
NO TRAINING NEEDED - Uses keyword matching + sentiment analysis
Based on research from NIH, Frontiers, and suicide prevention studies
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# Crisis keywords database (from research)
CRISIS_KEYWORDS = {
    "explicit_suicidal": {
        "keywords": [
            "kill myself",
            "suicide",
            "end my life",
            "want to die",
            "better off dead",
            "no reason to live",
            "suicide plan",
            "overdose",
            "jump off",
            "hang myself",
            "shoot myself",
            "end it all",
            "take my life",
            "not worth living",
        ],
        "weight": 10,
        "severity": "CRITICAL",
    },
    "implicit_suicidal": {
        "keywords": [
            "can't go on",
            "no way out",
            "hopeless",
            "worthless",
            "burden to everyone",
            "world without me",
            "say goodbye",
            "final decision",
            "peace at last",
            "give up",
            "no point",
            "can't take it",
            "too much pain",
        ],
        "weight": 7,
        "severity": "HIGH",
    },
    "self_harm": {
        "keywords": [
            "cut myself",
            "hurt myself",
            "self-harm",
            "burning myself",
            "punish myself",
            "deserve pain",
            "harm myself",
            "cutting",
            "self-injury",
        ],
        "weight": 8,
        "severity": "HIGH",
    },
    "severe_depression": {
        "keywords": [
            "completely hopeless",
            "nothing matters",
            "empty inside",
            "numb",
            "can't feel anything",
            "dead inside",
            "no future",
            "pointless",
            "meaningless",
            "can't function",
            "can't cope",
        ],
        "weight": 5,
        "severity": "MODERATE",
    },
    "severe_anxiety": {
        "keywords": [
            "panic attack",
            "can't breathe",
            "heart racing",
            "going crazy",
            "losing control",
            "terrified",
            "constant fear",
            "overwhelming anxiety",
        ],
        "weight": 4,
        "severity": "MODERATE",
    },
}

# Hotline information
CRISIS_HOTLINES = [
    {
        "name": "National Suicide Prevention Lifeline",
        "number": "988",
        "description": "24/7 free and confidential support",
        "type": "call",
    },
    {
        "name": "Crisis Text Line",
        "number": "Text HOME to 741741",
        "description": "24/7 text support",
        "type": "text",
    },
    {
        "name": "SAMHSA National Helpline",
        "number": "1-800-662-4357",
        "description": "Mental health and substance abuse",
        "type": "call",
    },
    {
        "name": "Veterans Crisis Line",
        "number": "988 then press 1",
        "description": "For veterans and their families",
        "type": "call",
    },
]


def detect_crisis(transcription: str, acoustic_features: Dict = None) -> Dict:
    """
    Detect crisis situation from transcription and acoustic features

    Detection methods:
    1. Keyword matching (explicit + implicit)
    2. Sentiment analysis
    3. Acoustic indicators (if available)
    4. Risk scoring

    Args:
        transcription: Text from voice recording
        acoustic_features: Optional acoustic features

    Returns:
        dict: {
            'crisis': bool,
            'risk_level': str ('LOW', 'MODERATE', 'HIGH', 'CRITICAL'),
            'risk_score': int (0-100),
            'alerts': list of detected issues,
            'action': str (recommended action),
            'hotlines': list of crisis hotlines,
            'immediate_steps': list of immediate actions
        }
    """
    risk_score = 0
    alerts = []
    detected_categories = set()

    text_lower = transcription.lower()

    # 1. KEYWORD DETECTION
    logger.info("Performing crisis keyword detection...")

    for category, data in CRISIS_KEYWORDS.items():
        for keyword in data["keywords"]:
            if keyword in text_lower:
                risk_score += data["weight"]
                alerts.append(
                    {
                        "type": "keyword",
                        "category": category,
                        "keyword": keyword,
                        "severity": data["severity"],
                        "weight": data["weight"],
                    }
                )
                detected_categories.add(category)
                logger.warning(
                    f"Crisis keyword detected: {keyword} (category: {category})"
                )

    # 2. SENTIMENT ANALYSIS (Simple)
    negative_words = [
        "sad",
        "depressed",
        "anxious",
        "scared",
        "afraid",
        "worried",
        "terrible",
        "awful",
        "horrible",
        "miserable",
        "desperate",
    ]
    negative_count = sum(1 for word in negative_words if word in text_lower)
    if negative_count > 5:
        risk_score += 3
        alerts.append(
            {
                "type": "sentiment",
                "category": "high_negative_sentiment",
                "severity": "MODERATE",
                "weight": 3,
            }
        )

    # 3. ACOUSTIC INDICATORS (if available)
    if acoustic_features:
        logger.info("Analyzing acoustic indicators for crisis...")

        # Monotone voice (severe depression)
        if acoustic_features.get("f0_std", 30) < 10:
            risk_score += 3
            alerts.append(
                {
                    "type": "acoustic",
                    "category": "monotone_voice",
                    "severity": "MODERATE",
                    "weight": 3,
                }
            )

        # Very slow speech (severe depression)
        if acoustic_features.get("speech_rate", 150) < 80:
            risk_score += 3
            alerts.append(
                {
                    "type": "acoustic",
                    "category": "very_slow_speech",
                    "severity": "MODERATE",
                    "weight": 3,
                }
            )

        # Flat affect (low energy variation)
        if acoustic_features.get("rms_std", 0.05) < 0.01:
            risk_score += 2
            alerts.append(
                {
                    "type": "acoustic",
                    "category": "flat_affect",
                    "severity": "MODERATE",
                    "weight": 2,
                }
            )

    # 4. FIRST-PERSON PRONOUN ANALYSIS (excessive self-focus)
    first_person_pronouns = ["i ", "me ", "my ", "myself ", "i'm ", "i've "]
    first_person_count = sum(
        text_lower.count(pronoun) for pronoun in first_person_pronouns
    )
    word_count = len(text_lower.split())

    if word_count > 0:
        first_person_ratio = first_person_count / word_count
        if first_person_ratio > 0.15:  # >15% self-focus
            risk_score += 2
            alerts.append(
                {
                    "type": "linguistic",
                    "category": "excessive_self_focus",
                    "severity": "LOW",
                    "weight": 2,
                }
            )

    # 5. DETERMINE RISK LEVEL
    if risk_score >= 30 or "explicit_suicidal" in detected_categories:
        risk_level = "CRITICAL"
        action = "IMMEDIATE_INTERVENTION"
        crisis = True
    elif (
        risk_score >= 20
        or "implicit_suicidal" in detected_categories
        or "self_harm" in detected_categories
    ):
        risk_level = "HIGH"
        action = "URGENT_FOLLOW_UP"
        crisis = True
    elif risk_score >= 10:
        risk_level = "MODERATE"
        action = "SCHEDULE_APPOINTMENT"
        crisis = False
    else:
        risk_level = "LOW"
        action = "ROUTINE_MONITORING"
        crisis = False

    # 6. PREPARE RESPONSE
    response = {
        "crisis": crisis,
        "risk_level": risk_level,
        "risk_score": min(100, risk_score),
        "alerts": alerts,
        "action": action,
        "detected_categories": list(detected_categories),
    }

    # Add hotlines and immediate steps for crisis situations
    if crisis:
        response["hotlines"] = CRISIS_HOTLINES
        response["immediate_steps"] = get_immediate_steps(risk_level)
        response["message"] = get_crisis_message(risk_level)

    logger.info(
        f"Crisis detection complete: risk_level={risk_level}, risk_score={risk_score}"
    )

    return response


def get_immediate_steps(risk_level: str) -> List[str]:
    """
    Get immediate action steps based on risk level
    """
    if risk_level == "CRITICAL":
        return [
            "Call 988 (Suicide Prevention Lifeline) immediately",
            "Do not leave the person alone",
            "Remove access to means of self-harm",
            "Go to nearest emergency room if in immediate danger",
            "Contact a trusted friend or family member",
            "Stay in a safe environment",
        ]
    elif risk_level == "HIGH":
        return [
            "Call 988 or text HOME to 741741 for support",
            "Reach out to a trusted friend or family member",
            "Schedule an urgent appointment with a mental health professional",
            "Avoid being alone for extended periods",
            "Practice grounding techniques (5-4-3-2-1 method)",
            "Remove access to means of self-harm as a precaution",
        ]
    else:
        return [
            "Consider talking to a mental health professional",
            "Reach out to supportive friends or family",
            "Practice self-care activities",
            "Monitor your mood and symptoms",
            "Use coping strategies (breathing exercises, mindfulness)",
        ]


def get_crisis_message(risk_level: str) -> str:
    """
    Get appropriate crisis message based on risk level
    """
    if risk_level == "CRITICAL":
        return (
            "We detected that you may be in crisis and experiencing thoughts of self-harm or suicide. "
            "Your safety is the top priority. Please reach out for immediate help. "
            "You are not alone, and support is available 24/7."
        )
    elif risk_level == "HIGH":
        return (
            "We're concerned about what you're experiencing. "
            "It sounds like you're going through a very difficult time. "
            "Please consider reaching out for professional support. "
            "Help is available, and you don't have to face this alone."
        )
    else:
        return (
            "Thank you for sharing how you're feeling. "
            "If you're experiencing distress, please don't hesitate to reach out for support."
        )


def get_coping_strategy(
    depression_score: float, anxiety_score: float, stress_score: float
) -> str:
    """
    Get personalized coping strategy based on scores
    """
    strategies = []

    if anxiety_score > 0.6:
        strategies.append(
            "Try box breathing: Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4. Repeat 5 times."
        )

    if depression_score > 0.6:
        strategies.append(
            "Behavioral activation: Do one small enjoyable activity today, even if you don't feel like it."
        )

    if stress_score > 0.6:
        strategies.append(
            "Progressive muscle relaxation: Tense and relax each muscle group for 5 seconds, starting from your toes."
        )

    if not strategies:
        strategies.append(
            "Mindfulness: Take 5 minutes to focus on your breath and observe your thoughts without judgment."
        )

    return " | ".join(strategies)


if __name__ == "__main__":
    # Test crisis detection

    print("Test 1: Critical crisis")
    result = detect_crisis("I can't take it anymore. I want to kill myself.")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Risk Score: {result['risk_score']}")
    print(f"Crisis: {result['crisis']}")
    print(f"Alerts: {len(result['alerts'])}")
    print()

    print("Test 2: High risk")
    result = detect_crisis("I feel completely hopeless and see no way out of this.")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Risk Score: {result['risk_score']}")
    print(f"Crisis: {result['crisis']}")
    print()

    print("Test 3: Low risk")
    result = detect_crisis("I've been feeling a bit stressed with work lately.")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Risk Score: {result['risk_score']}")
    print(f"Crisis: {result['crisis']}")
    print()

    print("All tests complete!")
