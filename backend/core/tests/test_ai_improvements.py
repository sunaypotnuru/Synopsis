"""
Comprehensive Tests for Category 8: AI Improvements
Tests for validation, templates, monitoring, rate limiting, and context management
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.services.ai_validation_service import AIValidationService, get_validation_service
from app.services.prompt_templates import PromptTemplate, PromptTemplateService, get_default_template
from app.services.ai_monitoring_service import AIMonitoringService, get_monitoring_service
from app.services.ai_rate_limit_service import AIRateLimitService, get_rate_limit_service
from app.services.context_manager import ContextManager, ConversationMemory, get_context_manager


# ==================== AI VALIDATION SERVICE TESTS ====================

class TestAIValidationService:
    """Test suite for AI Validation Service"""

    @pytest.fixture
    def validation_service(self):
        """Create validation service instance"""
        return AIValidationService()

    def test_validate_response_valid(self, validation_service):
        """Test validation of a valid response"""
        response = "The patient presents with symptoms of fever and headache. " \
                  "Possible diagnosis includes viral infection or flu. " \
                  "Recommended treatment includes rest and hydration."
        
        is_valid, result = validation_service.validate_response(response, 'text')
        
        assert is_valid is True
        assert result['checks']['length'] is True
        assert result['checks']['format'] is True
        assert len(result['errors']) == 0

    def test_validate_response_too_short(self, validation_service):
        """Test validation fails for too short response"""
        response = "Short response"
        
        is_valid, result = validation_service.validate_response(response, 'text')
        
        assert is_valid is False
        assert result['checks']['length'] is False
        assert any('too short' in error.lower() for error in result['errors'])

    def test_validate_response_too_long(self, validation_service):
        """Test validation fails for too long response"""
        response = "A" * 6000  # Exceeds max length
        
        is_valid, result = validation_service.validate_response(response, 'text')
        
        assert is_valid is False
        assert result['checks']['length'] is False

    def test_validate_json_format_valid(self, validation_service):
        """Test JSON format validation with valid JSON"""
        response = '{"diagnosis": "flu", "severity": "medium", "treatment": "rest"}'
        
        is_valid, result = validation_service.validate_response(response, 'json')
        
        assert is_valid is True
        assert result['checks']['format'] is True

    def test_validate_json_format_invalid(self, validation_service):
        """Test JSON format validation with invalid JSON"""
        response = '{diagnosis: flu, severity: medium}'  # Invalid JSON
        
        is_valid, result = validation_service.validate_response(response, 'json')
        
        assert is_valid is False
        assert result['checks']['format'] is False

    def test_validate_medical_terminology(self, validation_service):
        """Test medical terminology validation"""
        response = "The patient has symptoms of fever and requires treatment with medication."
        
        is_valid, result = validation_service.validate_response(response, 'text')
        
        assert result['checks']['medical_terminology'] is True

    def test_validate_coherence(self, validation_service):
        """Test coherence checking"""
        response = "The treatment is safe. The treatment is safe. The treatment is safe."
        
        is_valid, result = validation_service.validate_response(response, 'text')
        
        # Should detect repetition
        assert result['checks']['coherence'] is False

    def test_detect_hallucination(self, validation_service):
        """Test hallucination detection"""
        # Response with many specific claims without context
        response = "This condition affects exactly 47.3% of patients in 2019. " \
                  "Studies show always 100% recovery rate. Never any side effects."
        
        is_valid, result = validation_service.validate_response(response, 'text')
        
        # Should detect potential hallucination
        assert result['checks']['hallucination'] is False

    def test_calculate_confidence_score(self, validation_service):
        """Test confidence score calculation"""
        response = "Patient presents with fever and headache. Diagnosis: viral infection."
        
        is_valid, result = validation_service.validate_response(response, 'text')
        confidence = validation_service.calculate_confidence_score(response, result, 0.8)
        
        assert 0.0 <= confidence <= 1.0
        assert isinstance(confidence, float)

    def test_get_confidence_level(self, validation_service):
        """Test confidence level classification"""
        assert validation_service.get_confidence_level(0.9) == 'high'
        assert validation_service.get_confidence_level(0.6) == 'medium'
        assert validation_service.get_confidence_level(0.3) == 'low'

    def test_should_flag_for_review(self, validation_service):
        """Test flagging for human review"""
        response = "Test response with medical symptoms and treatment recommendations."
        is_valid, result = validation_service.validate_response(response, 'text')
        
        # Low confidence should flag for review
        should_flag = validation_service.should_flag_for_review(0.3, result)
        assert should_flag is True
        
        # High confidence should not flag
        should_flag = validation_service.should_flag_for_review(0.9, result)
        assert should_flag is False


# ==================== PROMPT TEMPLATE TESTS ====================

class TestPromptTemplates:
    """Test suite for Prompt Template System"""

    def test_template_creation(self):
        """Test creating a template"""
        template = PromptTemplate(
            name='test_template',
            category='test',
            template_text='Hello {name}, you are {age} years old.',
            variables=['name', 'age']
        )
        
        assert template.name == 'test_template'
        assert template.category == 'test'
        assert len(template.variables) == 2

    def test_template_render(self):
        """Test rendering a template"""
        template = PromptTemplate(
            name='test_template',
            category='test',
            template_text='Hello {name}, you are {age} years old.',
            variables=['name', 'age']
        )
        
        rendered = template.render(name='John', age='30')
        
        assert 'John' in rendered
        assert '30' in rendered
        assert '{name}' not in rendered

    def test_template_render_missing_variable(self):
        """Test rendering fails with missing variable"""
        template = PromptTemplate(
            name='test_template',
            category='test',
            template_text='Hello {name}, you are {age} years old.',
            variables=['name', 'age']
        )
        
        with pytest.raises(ValueError):
            template.render(name='John')  # Missing 'age'

    def test_default_templates_exist(self):
        """Test that default templates are available"""
        symptom_template = get_default_template('symptom_analysis')
        
        assert symptom_template is not None
        assert symptom_template.name == 'symptom_analysis'
        assert 'symptoms' in symptom_template.variables

    def test_default_template_render(self):
        """Test rendering a default template"""
        template = get_default_template('symptom_analysis')
        assert template is not None
        
        rendered = template.render(
            symptoms='fever, headache',
            age='35',
            gender='female',
            medical_history='none'
        )
        
        assert 'fever, headache' in rendered
        assert '35' in rendered
        assert 'female' in rendered

    def test_template_to_dict(self):
        """Test converting template to dictionary"""
        template = PromptTemplate(
            name='test',
            category='test',
            template_text='Test {var}',
            variables=['var']
        )
        
        template_dict = template.to_dict()
        
        assert template_dict['name'] == 'test'
        assert template_dict['category'] == 'test'
        assert 'var' in template_dict['variables']

    def test_multiple_default_templates(self):
        """Test multiple default templates are available"""
        templates = ['symptom_analysis', 'treatment_recommendation', 'patient_education']
        
        for template_name in templates:
            template = get_default_template(template_name)
            assert template is not None
            assert template.name == template_name


# ==================== AI MONITORING SERVICE TESTS ====================

class TestAIMonitoringService:
    """Test suite for AI Monitoring Service"""

    @pytest.fixture
    def monitoring_service(self, db_session: Session):
        """Create monitoring service instance"""
        return AIMonitoringService(db_session)

    def test_track_request_success(self, monitoring_service):
        """Test tracking a successful AI request"""
        result = monitoring_service.track_request(
            user_id='user123',
            model_name='gpt-3.5-turbo',
            prompt_template='symptom_analysis',
            input_tokens=150,
            output_tokens=300,
            response_time_ms=1200,
            confidence_score=0.85,
            success=True,
            cost_usd=0.0007
        )
        
        assert result is True

    def test_track_request_failure(self, monitoring_service):
        """Test tracking a failed AI request"""
        result = monitoring_service.track_request(
            user_id='user123',
            model_name='gpt-3.5-turbo',
            prompt_template='symptom_analysis',
            input_tokens=150,
            output_tokens=0,
            response_time_ms=5000,
            confidence_score=0.0,
            success=False,
            error_message='Model timeout',
            cost_usd=0.0
        )
        
        assert result is True

    def test_get_real_time_metrics(self, monitoring_service):
        """Test getting real-time metrics"""
        metrics = monitoring_service.get_real_time_metrics('gpt-3.5-turbo')
        
        assert 'total_requests' in metrics
        assert 'success_rate' in metrics
        assert 'avg_response_time_ms' in metrics

    def test_detect_drift_insufficient_data(self, monitoring_service):
        """Test drift detection with insufficient data"""
        drift = monitoring_service.detect_drift('gpt-3.5-turbo', days=7)
        
        assert 'drift_detected' in drift
        # With no data, should not detect drift
        assert drift['drift_detected'] is False

    def test_model_comparison(self, monitoring_service):
        """Test model comparison"""
        comparison = monitoring_service.get_model_comparison(days=7)
        
        assert isinstance(comparison, list)


# ==================== AI RATE LIMITING TESTS ====================

class TestAIRateLimitService:
    """Test suite for AI Rate Limiting Service"""

    @pytest.fixture
    def rate_limit_service(self, db_session: Session):
        """Create rate limit service instance"""
        return AIRateLimitService(db_session)

    def test_get_user_limits_free(self, rate_limit_service):
        """Test getting limits for free tier"""
        limits = rate_limit_service.get_user_limits('free')
        
        assert limits['rpm'] == 2
        assert limits['rpd'] == 10
        assert limits['tpd'] == 10000

    def test_get_user_limits_doctor(self, rate_limit_service):
        """Test getting limits for doctor tier"""
        limits = rate_limit_service.get_user_limits('doctor')
        
        assert limits['rpm'] == 20
        assert limits['rpd'] == 200
        assert limits['tpd'] == 200000

    def test_get_user_limits_admin(self, rate_limit_service):
        """Test getting limits for admin tier"""
        limits = rate_limit_service.get_user_limits('admin')
        
        assert limits['rpm'] == 50
        assert limits['rpd'] is None  # Unlimited
        assert limits['cpd'] is None  # Unlimited

    def test_check_rate_limit_allowed(self, rate_limit_service):
        """Test rate limit check when allowed"""
        allowed, reason, usage = rate_limit_service.check_rate_limit(
            user_id='user123',
            user_role='patient',
            estimated_tokens=100,
            estimated_cost=0.001
        )
        
        assert allowed is True
        assert reason is None

    def test_estimate_cost_gpt35(self, rate_limit_service):
        """Test cost estimation for GPT-3.5"""
        cost = rate_limit_service.estimate_cost('gpt-3.5-turbo', 1000, 500)
        
        assert cost > 0
        assert isinstance(cost, float)

    def test_estimate_cost_local(self, rate_limit_service):
        """Test cost estimation for local model"""
        cost = rate_limit_service.estimate_cost('local', 1000, 500)
        
        assert cost == 0.0  # Local models are free

    def test_get_usage_stats(self, rate_limit_service):
        """Test getting usage statistics"""
        stats = rate_limit_service.get_usage_stats('user123')
        
        assert 'requests_today' in stats
        assert 'tokens_today' in stats
        assert 'cost_today' in stats

    def test_get_remaining_quota(self, rate_limit_service):
        """Test getting remaining quota"""
        remaining = rate_limit_service.get_remaining_quota('user123', 'patient')
        
        assert 'requests' in remaining
        assert 'tokens' in remaining
        assert 'cost_usd' in remaining


# ==================== CONTEXT MANAGER TESTS ====================

class TestContextManager:
    """Test suite for Context Manager"""

    def test_context_manager_creation(self):
        """Test creating a context manager"""
        context = ContextManager('gpt-3.5-turbo')
        
        assert context.model_name == 'gpt-3.5-turbo'
        assert context.context_window == 4096

    def test_get_context_window(self):
        """Test getting context window size"""
        context = ContextManager('gpt-4')
        
        assert context.get_context_window() == 8192

    def test_estimate_tokens(self):
        """Test token estimation"""
        context = ContextManager()
        
        tokens = context.estimate_tokens("This is a test message")
        
        assert tokens > 0
        assert isinstance(tokens, int)

    def test_add_message(self):
        """Test adding a message"""
        context = ContextManager()
        
        result = context.add_message('user', 'Hello, I need help')
        
        assert result is True
        assert len(context.messages) == 1
        assert context.total_tokens > 0

    def test_add_multiple_messages(self):
        """Test adding multiple messages"""
        context = ContextManager()
        
        context.add_message('system', 'You are a medical assistant')
        context.add_message('user', 'I have a headache')
        context.add_message('assistant', 'I can help with that')
        
        assert len(context.messages) == 3

    def test_get_messages_for_api(self):
        """Test getting messages in API format"""
        context = ContextManager()
        
        context.add_message('user', 'Hello')
        context.add_message('assistant', 'Hi there')
        
        messages = context.get_messages_for_api()
        
        assert len(messages) == 2
        assert messages[0]['role'] == 'user'
        assert messages[0]['content'] == 'Hello'

    def test_context_pruning(self):
        """Test automatic context pruning"""
        context = ContextManager('default')  # Small context window
        
        # Add many messages to trigger pruning
        for i in range(20):
            context.add_message('user', f'Message {i}' * 100)
        
        # Should have pruned some messages
        assert len(context.messages) < 20

    def test_compress_context(self):
        """Test context compression"""
        context = ContextManager()
        
        # Add several messages
        for i in range(10):
            context.add_message('user', f'Message {i}')
        
        result = context.compress_context()
        
        assert result is True
        assert len(context.messages) < 10  # Should be compressed

    def test_clear_context(self):
        """Test clearing context"""
        context = ContextManager()
        
        context.add_message('user', 'Hello')
        context.add_message('assistant', 'Hi')
        
        context.clear_context(keep_system=False)
        
        assert len(context.messages) == 0
        assert context.total_tokens == 0

    def test_get_context_stats(self):
        """Test getting context statistics"""
        context = ContextManager('gpt-3.5-turbo')
        
        context.add_message('user', 'Test message')
        
        stats = context.get_context_stats()
        
        assert stats['model'] == 'gpt-3.5-turbo'
        assert stats['message_count'] == 1
        assert stats['total_tokens'] > 0

    def test_should_compress(self):
        """Test compression threshold check"""
        context = ContextManager()
        
        # Empty context should not need compression
        assert context.should_compress() is False

    def test_export_import_context(self):
        """Test exporting and importing context"""
        context1 = ContextManager('gpt-4')
        context1.add_message('user', 'Hello')
        
        # Export
        exported = context1.export_context()
        
        # Import to new context
        context2 = ContextManager()
        result = context2.import_context(exported)
        
        assert result is True
        assert context2.model_name == 'gpt-4'
        assert len(context2.messages) == 1


# ==================== CONVERSATION MEMORY TESTS ====================

class TestConversationMemory:
    """Test suite for Conversation Memory"""

    def test_memory_creation(self):
        """Test creating conversation memory"""
        memory = ConversationMemory()
        
        assert len(memory.short_term) == 0
        assert len(memory.long_term) == 0
        assert len(memory.working) == 0

    def test_add_to_short_term(self):
        """Test adding to short-term memory"""
        memory = ConversationMemory()
        
        memory.add_to_short_term({'role': 'user', 'content': 'Hello'})
        
        assert len(memory.short_term) == 1

    def test_short_term_limit(self):
        """Test short-term memory limit"""
        memory = ConversationMemory()
        
        # Add more than 10 messages
        for i in range(15):
            memory.add_to_short_term({'role': 'user', 'content': f'Message {i}'})
        
        # Should keep only last 10
        assert len(memory.short_term) == 10

    def test_add_to_long_term(self):
        """Test adding to long-term memory"""
        memory = ConversationMemory()
        
        memory.add_to_long_term('patient_age', 35)
        
        assert memory.get_from_long_term('patient_age') == 35

    def test_working_context(self):
        """Test working context"""
        memory = ConversationMemory()
        
        memory.set_working_context('current_task', 'diagnosis')
        
        assert memory.get_working_context('current_task') == 'diagnosis'

    def test_clear_working_context(self):
        """Test clearing working context"""
        memory = ConversationMemory()
        
        memory.set_working_context('task', 'test')
        memory.clear_working_context()
        
        assert len(memory.working) == 0

    def test_memory_summary(self):
        """Test getting memory summary"""
        memory = ConversationMemory()
        
        memory.add_to_short_term({'content': 'test'})
        memory.add_to_long_term('key', 'value')
        memory.set_working_context('task', 'test')
        
        summary = memory.get_memory_summary()
        
        assert summary['short_term_count'] == 1
        assert summary['long_term_count'] == 1
        assert summary['working_context_count'] == 1


# ==================== INTEGRATION TESTS ====================

class TestAIImprovementsIntegration:
    """Integration tests for AI Improvements"""

    def test_validation_with_templates(self):
        """Test validation with template-generated prompts"""
        template = get_default_template('symptom_analysis')
        validation_service = get_validation_service()
        
        assert template is not None
        # Render template
        prompt = template.render(
            symptoms='fever, cough',
            age='30',
            gender='male',
            medical_history='none'
        )
        
        # Validate the prompt
        is_valid, result = validation_service.validate_response(prompt, 'text')
        
        assert is_valid is True

    def test_context_with_templates(self):
        """Test context manager with templates"""
        template = get_default_template('patient_education')
        context = get_context_manager('gpt-3.5-turbo')
        
        # Add system message
        context.add_message('system', 'You are a medical AI assistant')
        
        assert template is not None
        # Add user message with template
        prompt = template.render(
            condition='diabetes',
            age='45',
            education_level='high school'
        )
        context.add_message('user', prompt)
        
        messages = context.get_messages_for_api()
        
        assert len(messages) == 2
        assert 'diabetes' in messages[1]['content']

    def test_full_ai_request_flow(self):
        """Test complete AI request flow with all services"""
        # 1. Check rate limit
        # 2. Use template
        # 3. Manage context
        # 4. Validate response
        # 5. Track metrics
        
        template = get_default_template('symptom_analysis')
        context = get_context_manager('gpt-3.5-turbo')
        validation_service = get_validation_service()
        
        assert template is not None
        # Render prompt
        prompt = template.render(
            symptoms='headache',
            age='35',
            gender='female',
            medical_history='none'
        )
        
        # Add to context
        context.add_message('user', prompt)
        
        # Simulate AI response
        ai_response = "Based on the symptoms, possible diagnosis is tension headache."
        
        # Validate response
        is_valid, result = validation_service.validate_response(ai_response, 'text')
        
        assert is_valid is True
        assert context.total_tokens > 0

    def test_rate_limit_with_cost_estimation(self, db_session: Session):
        """Test rate limiting with cost estimation"""
        rate_limit_service = get_rate_limit_service(db_session)
        
        # Estimate cost
        cost = rate_limit_service.estimate_cost('gpt-3.5-turbo', 500, 300)
        
        # Check rate limit
        allowed, reason, usage = rate_limit_service.check_rate_limit(
            user_id='test_user',
            user_role='patient',
            estimated_tokens=800,
            estimated_cost=cost
        )
        
        assert allowed is True
        assert cost > 0


# ==================== PYTEST CONFIGURATION ====================

@pytest.fixture
def db_session():
    """Mock database session for testing"""
    from unittest.mock import MagicMock
    from datetime import datetime, timezone
    
    mock_db = MagicMock()
    
    # Helper to create mock objects with default numeric values
    class MockModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
            if 'created_at' not in kwargs:
                self.created_at = datetime.now(timezone.utc)
            if 'success' not in kwargs:
                self.success = True

    mock_query = MagicMock()
    mock_filter = MagicMock()
    
    # Default return values for common queries
    mock_filter.first.return_value = MockModel(
        requests_today=0, 
        tokens_today=0, 
        cost_today=0.0,
        daily_reset_at=datetime.now(timezone.utc),
        last_request_at=None
    )
    mock_filter.all.return_value = []
    
    mock_query.filter.return_value = mock_filter
    mock_query.order_by.return_value = mock_filter
    mock_query.distinct.return_value = mock_query
    mock_db.query.return_value = mock_query
    
    return mock_db


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
