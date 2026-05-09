from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.sql import func
from app.db.models import Base

class AIRateLimit(Base):
    """Stub model for AI Rate Limiting"""
    __tablename__ = "ai_rate_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, unique=True)
    tier = Column(String)
    requests_today = Column(Integer, default=0)
    tokens_today = Column(Integer, default=0)
    cost_today = Column(Float, default=0.0)
    daily_reset_at = Column(DateTime(timezone=True))
    last_request_at = Column(DateTime(timezone=True), nullable=True)
