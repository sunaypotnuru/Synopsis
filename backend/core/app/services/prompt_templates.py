"""
Prompt Template System
Manages versioned prompt templates for consistent AI interactions
"""

import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime

logger = logging.getLogger(__name__)


class PromptTemplate:
    """Represents a prompt template"""

    def __init__(
        self,
        name: str,
        category: str,
        template_text: str,
        variables: List[str],
        version: int = 1,
        is_active: bool = True,
        performance_score: Optional[float] = None,
        usage_count: int = 0,
    ):
        self.name = name
        self.category = category
        self.template_text = template_text
        self.variables = variables
        self.version = version
        self.is_active = is_active
        self.performance_score = performance_score
        self.usage_count = usage_count

    def render(self, **kwargs) -> str:
        """
        Render template with provided variables

        Args:
            **kwargs: Variable values to substitute

        Returns:
            Rendered prompt text
        """
        # Check if all required variables are provided
        missing_vars = set(self.variables) - set(kwargs.keys())
        if missing_vars:
            raise ValueError(f"Missing required variables: {missing_vars}")

        # Substitute variables
        rendered = self.template_text
        for var, value in kwargs.items():
            placeholder = f"{{{var}}}"
            rendered = rendered.replace(placeholder, str(value))

        return rendered

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "category": self.category,
            "template_text": self.template_text,
            "variables": self.variables,
            "version": self.version,
            "is_active": self.is_active,
            "performance_score": self.performance_score,
            "usage_count": self.usage_count,
        }


class PromptTemplateService:
    """Service for managing prompt templates"""

    def __init__(self, db: Session):
        self.db = db
        self._cache = {}  # In-memory cache for templates

    def get_template(self, name: str) -> Optional[PromptTemplate]:
        """
        Get template by name

        Args:
            name: Template name

        Returns:
            PromptTemplate or None if not found
        """
        # Check cache first
        if name in self._cache:
            return self._cache[name]

        # Query database
        try:
            from app.models.prompt_template import (
                PromptTemplateModel,
            )  # Assuming model exists

            template_model = (
                self.db.query(PromptTemplateModel)
                .filter(
                    and_(
                        PromptTemplateModel.name == name,
                        PromptTemplateModel.is_active,
                    )
                )
                .first()
            )

            if not template_model:
                logger.warning(f"Template not found: {name}")
                return None

            # Convert to PromptTemplate
            template = PromptTemplate(
                name=template_model.name,
                category=template_model.category,
                template_text=template_model.template_text,
                variables=(
                    json.loads(template_model.variables)
                    if isinstance(template_model.variables, str)
                    else template_model.variables
                ),
                version=template_model.version,
                is_active=template_model.is_active,
                performance_score=(
                    float(template_model.performance_score)
                    if template_model.performance_score
                    else None
                ),
                usage_count=template_model.usage_count,
            )

            # Cache it
            self._cache[name] = template

            return template

        except Exception as e:
            logger.error(f"Error loading template {name}: {str(e)}")
            return None

    def get_templates_by_category(self, category: str) -> List[PromptTemplate]:
        """
        Get all templates in a category

        Args:
            category: Template category

        Returns:
            List of PromptTemplate objects
        """
        try:
            from app.models.prompt_template import PromptTemplateModel

            template_models = (
                self.db.query(PromptTemplateModel)
                .filter(
                    and_(
                        PromptTemplateModel.category == category,
                        PromptTemplateModel.is_active,
                    )
                )
                .all()
            )

            templates = []
            for model in template_models:
                template = PromptTemplate(
                    name=model.name,
                    category=model.category,
                    template_text=model.template_text,
                    variables=(
                        json.loads(model.variables)
                        if isinstance(model.variables, str)
                        else model.variables
                    ),
                    version=model.version,
                    is_active=model.is_active,
                    performance_score=(
                        float(model.performance_score)
                        if model.performance_score
                        else None
                    ),
                    usage_count=model.usage_count,
                )
                templates.append(template)

            return templates

        except Exception as e:
            logger.error(f"Error loading templates for category {category}: {str(e)}")
            return []

    def render_template(self, name: str, **kwargs) -> Optional[str]:
        """
        Render a template with provided variables

        Args:
            name: Template name
            **kwargs: Variable values

        Returns:
            Rendered prompt text or None if template not found
        """
        template = self.get_template(name)
        if not template:
            return None

        try:
            rendered = template.render(**kwargs)

            # Increment usage count
            self._increment_usage(name)

            return rendered

        except ValueError as e:
            logger.error(f"Error rendering template {name}: {str(e)}")
            return None

    def _increment_usage(self, name: str):
        """Increment template usage count"""
        try:
            from app.models.prompt_template import PromptTemplateModel

            self.db.query(PromptTemplateModel).filter(
                PromptTemplateModel.name == name
            ).update({"usage_count": PromptTemplateModel.usage_count + 1})
            self.db.commit()

        except Exception as e:
            logger.error(f"Error incrementing usage for template {name}: {str(e)}")
            self.db.rollback()

    def update_performance_score(self, name: str, score: float):
        """
        Update template performance score

        Args:
            name: Template name
            score: Performance score (0.0 to 1.0)
        """
        try:
            from app.models.prompt_template import PromptTemplateModel

            self.db.query(PromptTemplateModel).filter(
                PromptTemplateModel.name == name
            ).update({"performance_score": score, "updated_at": datetime.utcnow()})
            self.db.commit()

            # Invalidate cache
            if name in self._cache:
                del self._cache[name]

        except Exception as e:
            logger.error(
                f"Error updating performance score for template {name}: {str(e)}"
            )
            self.db.rollback()

    def create_template(
        self, name: str, category: str, template_text: str, variables: List[str]
    ) -> bool:
        """
        Create a new template

        Args:
            name: Template name (unique)
            category: Template category
            template_text: Template text with {variable} placeholders
            variables: List of variable names

        Returns:
            True if created successfully
        """
        try:
            from app.models.prompt_template import PromptTemplateModel

            # Check if template already exists
            existing = (
                self.db.query(PromptTemplateModel)
                .filter(PromptTemplateModel.name == name)
                .first()
            )

            if existing:
                logger.warning(f"Template already exists: {name}")
                return False

            # Create new template
            new_template = PromptTemplateModel(
                name=name,
                category=category,
                template_text=template_text,
                variables=json.dumps(variables),
                version=1,
                is_active=True,
            )

            self.db.add(new_template)
            self.db.commit()

            logger.info(f"Created template: {name}")
            return True

        except Exception as e:
            logger.error(f"Error creating template {name}: {str(e)}")
            self.db.rollback()
            return False

    def list_all_templates(self) -> List[Dict[str, Any]]:
        """
        List all active templates

        Returns:
            List of template dictionaries
        """
        try:
            from app.models.prompt_template import PromptTemplateModel

            templates = (
                self.db.query(PromptTemplateModel)
                .filter(PromptTemplateModel.is_active)
                .all()
            )

            return [
                {
                    "name": t.name,
                    "category": t.category,
                    "version": t.version,
                    "usage_count": t.usage_count,
                    "performance_score": (
                        float(t.performance_score) if t.performance_score else None
                    ),
                    "variables": (
                        json.loads(t.variables)
                        if isinstance(t.variables, str)
                        else t.variables
                    ),
                }
                for t in templates
            ]

        except Exception as e:
            logger.error(f"Error listing templates: {str(e)}")
            return []

    def clear_cache(self):
        """Clear template cache"""
        self._cache.clear()
        logger.info("Template cache cleared")


# Helper function to get service instance
def get_prompt_template_service(db: Session) -> PromptTemplateService:
    """Get prompt template service instance"""
    return PromptTemplateService(db)


# Pre-defined templates (fallback if database not available)
DEFAULT_TEMPLATES = {
    "symptom_analysis": PromptTemplate(
        name="symptom_analysis",
        category="diagnosis",
        template_text="""Role: You are a medical AI assistant helping to analyze patient symptoms.

Task: Analyze the following symptoms and provide:
1. Possible conditions (ranked by likelihood)
2. Severity assessment (low/medium/high)
3. Recommended next steps
4. Red flags to watch for

Symptoms: {symptoms}
Patient Age: {age}
Patient Gender: {gender}
Medical History: {medical_history}

Format: Respond in JSON with the following structure:
{{
    "possible_conditions": [
        {{"name": "condition", "likelihood": "high/medium/low", "reasoning": "..."}}
    ],
    "severity": "low/medium/high",
    "next_steps": ["step1", "step2"],
    "red_flags": ["flag1", "flag2"]
}}""",
        variables=["symptoms", "age", "gender", "medical_history"],
    ),
    "treatment_recommendation": PromptTemplate(
        name="treatment_recommendation",
        category="treatment",
        template_text="""Role: You are a medical AI assistant providing treatment recommendations.

Task: Based on the diagnosis, suggest appropriate treatment options.

Diagnosis: {diagnosis}
Patient Age: {age}
Allergies: {allergies}
Current Medications: {current_medications}

Provide:
1. First-line treatment options
2. Alternative treatments
3. Lifestyle modifications
4. Follow-up recommendations

Format: Respond in JSON with structured treatment plan.""",
        variables=["diagnosis", "age", "allergies", "current_medications"],
    ),
    "patient_education": PromptTemplate(
        name="patient_education",
        category="education",
        template_text="""Role: You are a medical AI assistant providing patient education.

Task: Explain the following medical condition in simple, patient-friendly language.

Condition: {condition}
Patient Age: {age}
Education Level: {education_level}

Provide:
1. What is this condition?
2. What causes it?
3. What are the symptoms?
4. How is it treated?
5. What can the patient do?

Format: Use simple language, avoid medical jargon, be empathetic and supportive.""",
        variables=["condition", "age", "education_level"],
    ),
}


def get_default_template(name: str) -> Optional[PromptTemplate]:
    """Get default template by name"""
    return DEFAULT_TEMPLATES.get(name)
