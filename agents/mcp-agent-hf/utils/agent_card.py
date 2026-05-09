import os
from typing import Dict, Any

def get_agent_card() -> Dict[str, Any]:
    """
    Generate an A2A Specification v1.0 compliant agent card with enhanced SHARP-on-MCP support.
    
    References:
    - https://agents-assemble.devpost.com/
    - A2A Spec v1.0 (supportedInterfaces, securitySchemes, etc.)
    - SHARP-on-MCP for FHIR context propagation
    """
    base_url = os.getenv("MCP_SERVER_URL", "http://localhost:8080")
    
    return {
        "name": "NetraAI Diagnostic Engine",
        "description": "Advanced interoperable healthcare agent providing rapid AI-powered diagnostics for anemia, cataracts, diabetic retinopathy, mental health, and Parkinson's disease using computer vision, audio analysis, and SHARP-on-MCP standards.",
        "version": "2.0.0",
        "publisher": "NetraAI Team",
        "contact": {
            "name": "NetraAI Support",
            "email": "support@netra-ai.com",
            "url": "https://netra-ai.com"
        },
        "defaultInputModes": ["text", "image", "audio"],
        "defaultOutputModes": ["text", "fhir-resource", "diagnostic-report"],
        
        # 💎 ENHANCED SKILLS with marketplace-optimized keywords
        "skills": [
            {
                "name": "Anemia Screening",
                "description": "Non-invasive anemia detection from conjunctival images with hemoglobin estimation per WHO 2023 guidelines. 90% accuracy, $5 per scan vs $50 traditional blood test.",
                "keywords": ["anemia", "hemoglobin", "conjunctiva", "blood-test", "cbc", "iron-deficiency", "vision-based-screening", "point-of-care"]
            },
            {
                "name": "Cataract Detection with XAI",
                "description": "AI-powered cataract screening with explainable AI (Grad-CAM heatmaps) showing decision reasoning. 95.03% accuracy with visual explanations for clinical trust.",
                "keywords": ["cataract", "vision", "ophthalmology", "eye-disease", "lens-opacity", "xai", "explainable-ai", "grad-cam", "blindness-prevention"]
            },
            {
                "name": "Diabetic Retinopathy Screening",
                "description": "5-stage DR classification from fundus images using EfficientNet-B5. Detects microaneurysms, hemorrhages, and proliferative changes. 95% accuracy.",
                "keywords": ["diabetic-retinopathy", "dr", "diabetes", "retinopathy", "fundus", "eye-screening", "blindness", "microaneurysms", "proliferative-dr"]
            },
            {
                "name": "Mental Health Assessment",
                "description": "Multi-modal mental health analysis combining voice biomarkers (Whisper AI), sentiment analysis (MentalBERT), and facial emotion recognition (DeepFace). Detects depression, anxiety, and crisis indicators.",
                "keywords": ["mental-health", "depression", "anxiety", "vocal-biomarkers", "audio-analysis", "sentiment", "emotion-recognition", "crisis-detection", "suicide-prevention"]
            },
            {
                "name": "Parkinson's Disease Screening",
                "description": "Early Parkinson's detection from voice analysis using LightGBM. Analyzes jitter, shimmer, and tremor patterns. 85-92% accuracy, non-invasive.",
                "keywords": ["parkinsons", "parkinson-disease", "neurology", "voice-analysis", "tremor", "movement-disorder", "early-detection", "neurodegenerative"]
            },
            {
                "name": "FHIR Integration",
                "description": "Full FHIR R4 support for patient data retrieval, observation creation, and timeline queries. SHARP-on-MCP compliant for seamless EHR integration.",
                "keywords": ["fhir", "fhir-r4", "ehr-integration", "patient-data", "interoperability", "sharp", "mcp", "healthcare-standards"]
            },
            {
                "name": "Clinical Workflow Orchestration",
                "description": "Intelligent multi-step diagnostic workflows based on chief complaints. Automatically chains appropriate screenings and generates clinical summaries.",
                "keywords": ["workflow", "orchestration", "clinical-decision-support", "multi-agent", "diagnostic-workflow", "care-coordination"]
            }
        ],
        
        # 💎 ENHANCED CAPABILITIES with SHARP and FHIR scopes
        "capabilities": {
            "supportsFHIRContext": True,
            "supportsSHARP": True,
            "supportsXAI": True,
            "supportsMultiModal": True,
            "supportedFHIRVersions": ["4.0.1"],
            "supportedFHIRResources": [
                "Patient",
                "Observation",
                "DiagnosticReport",
                "Condition",
                "MedicationStatement"
            ],
            "fhirScopes": [
                "patient/*.read",
                "Observation.read",
                "DiagnosticReport.read",
                "Condition.read",
                "MedicationStatement.read"
            ],
            "experimental": {
                "ai.promptopinion/fhir-context": {
                    "value": True,
                    "description": "Supports SHARP-on-MCP FHIR context propagation"
                }
            }
        },
        
        "supportedInterfaces": [
            {
                "type": "MCP",
                "url": f"{base_url}/mcp",
                "spec": "https://modelcontextprotocol.io",
                "version": "2025-03-26"
            },
            {
                "type": "HTTP+JSON",
                "url": f"{base_url}/v1/chat/completions",
                "spec": "openai-v1",
                "description": "OpenAI-compatible chat completions interface"
            },
            {
                "type": "JSON-RPC",
                "url": f"{base_url}/rpc",
                "spec": "a2a-v1",
                "version": "1.0",
                "description": "Standard A2A JSON-RPC 2.0 interface"
            }
        ],
        
        "securitySchemes": {
            "apiKeySecurityScheme": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
                "description": "API key required for authenticated access"
            }
        },
        
        "security": [
            {
                "apiKeySecurityScheme": []
            }
        ],
        
        # 💎 METADATA for marketplace discovery
        "metadata": {
            "category": "healthcare-diagnostics",
            "tags": ["ai-diagnostics", "computer-vision", "fhir", "mcp", "a2a", "sharp", "xai"],
            "license": "MIT",
            "repository": "https://github.com/netra-ai/netra-ai",
            "documentation": "https://netra-ai.com/docs"
        }
    }
