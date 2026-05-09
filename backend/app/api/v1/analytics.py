"""
Analytics API Endpoints
Admin-only endpoints for dashboard analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.analytics_service import get_analytics_service
from app.middleware.rate_limit import rate_limit
import logging
import csv
import io
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure user is admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user


def parse_date_range(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    days: int = 30
) -> tuple[datetime, datetime]:
    """
    Parse date range from query parameters
    
    Args:
        start_date: Start date string (ISO format)
        end_date: End date string (ISO format)
        days: Default number of days if dates not provided
        
    Returns:
        Tuple of (start_date, end_date) as datetime objects
    """
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format.")
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format.")
    
    if start >= end:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")
    
    return start, end


@router.get("/overview")
@rate_limit(max_requests=30, window_seconds=60)
async def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get overview analytics dashboard with all key metrics
    
    **Admin only**
    
    Returns comprehensive overview including:
    - User statistics
    - Appointment metrics
    - AI usage analytics
    - Revenue estimates
    - Messaging statistics
    - System performance
    """
    try:
        analytics_service = get_analytics_service(db)
        overview = analytics_service.get_overview()
        return overview
    except Exception as e:
        logger.error(f"Error getting overview analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics overview")


@router.get("/users")
@rate_limit(max_requests=30, window_seconds=60)
async def get_user_analytics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get user analytics
    
    **Admin only**
    
    Includes:
    - Total users by role
    - New registrations
    - Active users
    - Growth rate
    - Daily active users (DAU)
    
    Query Parameters:
    - start_date: Start date in ISO format (optional)
    - end_date: End date in ISO format (optional)
    - days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        start, end = parse_date_range(start_date, end_date, days)
        analytics_service = get_analytics_service(db)
        user_analytics = analytics_service.get_user_analytics(start, end)
        return user_analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user analytics")


@router.get("/appointments")
@rate_limit(max_requests=30, window_seconds=60)
async def get_appointment_analytics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get appointment analytics
    
    **Admin only**
    
    Includes:
    - Total appointments by status
    - Completion and cancellation rates
    - Daily trends
    - Peak hours
    - Average appointments per day
    
    Query Parameters:
    - start_date: Start date in ISO format (optional)
    - end_date: End date in ISO format (optional)
    - days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        start, end = parse_date_range(start_date, end_date, days)
        analytics_service = get_analytics_service(db)
        appointment_analytics = analytics_service.get_appointment_analytics(start, end)
        return appointment_analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appointment analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve appointment analytics")


@router.get("/ai-usage")
@rate_limit(max_requests=30, window_seconds=60)
async def get_ai_usage_analytics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get AI consultation usage analytics
    
    **Admin only**
    
    Includes:
    - Total consultations
    - Average confidence score
    - Confidence distribution (high/medium/low)
    - Daily trends
    
    Query Parameters:
    - start_date: Start date in ISO format (optional)
    - end_date: End date in ISO format (optional)
    - days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        start, end = parse_date_range(start_date, end_date, days)
        analytics_service = get_analytics_service(db)
        ai_analytics = analytics_service.get_ai_usage_analytics(start, end)
        return ai_analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI usage analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve AI usage analytics")


@router.get("/revenue")
@rate_limit(max_requests=30, window_seconds=60)
async def get_revenue_analytics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get revenue analytics
    
    **Admin only**
    
    Includes:
    - Total estimated revenue
    - Completed appointments
    - Revenue growth rate
    - Daily revenue trends
    
    Note: Revenue is estimated based on completed appointments.
    Actual payment integration pending.
    
    Query Parameters:
    - start_date: Start date in ISO format (optional)
    - end_date: End date in ISO format (optional)
    - days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        start, end = parse_date_range(start_date, end_date, days)
        analytics_service = get_analytics_service(db)
        revenue_analytics = analytics_service.get_revenue_analytics(start, end)
        return revenue_analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting revenue analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve revenue analytics")


@router.get("/system-performance")
@rate_limit(max_requests=30, window_seconds=60)
async def get_system_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get system performance metrics
    
    **Admin only**
    
    Includes:
    - Active sessions
    - Database statistics
    - Cache statistics
    - System health indicators
    """
    try:
        analytics_service = get_analytics_service(db)
        performance = analytics_service.get_system_performance()
        return performance
    except Exception as e:
        logger.error(f"Error getting system performance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system performance")


@router.get("/messaging")
@rate_limit(max_requests=30, window_seconds=60)
async def get_messaging_analytics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get messaging system analytics
    
    **Admin only**
    
    Includes:
    - Total messages
    - Active conversations
    - Active users
    - Average messages per conversation
    - Daily trends
    
    Query Parameters:
    - start_date: Start date in ISO format (optional)
    - end_date: End date in ISO format (optional)
    - days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        start, end = parse_date_range(start_date, end_date, days)
        analytics_service = get_analytics_service(db)
        messaging_analytics = analytics_service.get_messaging_analytics(start, end)
        return messaging_analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messaging analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve messaging analytics")


@router.get("/export")
@rate_limit(max_requests=10, window_seconds=60)
async def export_analytics(
    format: str = Query("csv", regex="^(csv|json)$", description="Export format: csv or json"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    days: int = Query(30, ge=1, le=365, description="Number of days (if dates not provided)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Export analytics data
    
    **Admin only**
    
    Exports comprehensive analytics data in CSV or JSON format.
    
    Query Parameters:
    - format: Export format (csv or json)
    - start_date: Start date in ISO format (optional)
    - end_date: End date in ISO format (optional)
    - days: Number of days to analyze (default: 30, max: 365)
    """
    try:
        start, end = parse_date_range(start_date, end_date, days)
        analytics_service = get_analytics_service(db)
        
        # Get all analytics data
        overview = analytics_service.get_overview()
        
        if format == "json":
            # Return JSON format
            from fastapi.responses import JSONResponse
            return JSONResponse(content=overview)
        
        elif format == "csv":
            # Create CSV export
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(['Metric', 'Value', 'Period'])
            
            # Write overview metrics
            period = f"{start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')}"
            overview_data = overview.get('overview', {})
            
            for key, value in overview_data.items():
                writer.writerow([key.replace('_', ' ').title(), value, period])
            
            # Get CSV content
            csv_content = output.getvalue()
            output.close()
            
            # Return as streaming response
            return StreamingResponse(
                iter([csv_content]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=analytics_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export analytics")
