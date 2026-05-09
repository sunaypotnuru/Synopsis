"""
SQLAlchemy ORM Models for Analytics Service
These are minimal model definitions to support the analytics_service.py queries.
Note: The main application uses Supabase directly, not SQLAlchemy ORM.
"""

from sqlalchemy import Column, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User model for analytics queries"""

    __tablename__ = "profiles_patient"  # Matches Supabase table name

    id = Column(String, primary_key=True)
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Appointment(Base):
    """Appointment model for analytics queries"""

    __tablename__ = "appointments"

    id = Column(String, primary_key=True)
    user_id = Column(String)
    patient_id = Column(String)
    doctor_id = Column(String)
    status = Column(String)
    scheduled_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIConsultation(Base):
    """AI Consultation model for analytics queries"""

    __tablename__ = "ai_consultations"

    id = Column(String, primary_key=True)
    user_id = Column(String)
    confidence_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Message(Base):
    """Message model for analytics queries"""

    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    sender_id = Column(String)
    recipient_id = Column(String)
    conversation_id = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
