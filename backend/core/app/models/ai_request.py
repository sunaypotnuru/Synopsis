from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.sql import func
from app.db.models import Base

class AIRequest(Base):
    """Stub model for AI Request monitoring"""
    __tablename__ = "ai_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    model_name = Column(String)
    prompt_template = Column(String, nullable=True)
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    total_tokens = Column(Integer)
    response_time_ms = Column(Integer)
    confidence_score = Column(Float)
    success = Column(Boolean)
    error_message = Column(String, nullable=True)
    cost_usd = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
