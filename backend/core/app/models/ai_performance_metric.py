from sqlalchemy import Column, Integer, String, Float, Date
from app.db.models import Base

class AIPerformanceMetric(Base):
    """Model for daily aggregated AI performance metrics"""
    __tablename__ = "ai_performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, index=True)
    metric_date = Column(Date, index=True)
    
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    
    avg_response_time_ms = Column(Integer, default=0)
    avg_confidence_score = Column(Float, default=0.0)
    
    total_tokens = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
