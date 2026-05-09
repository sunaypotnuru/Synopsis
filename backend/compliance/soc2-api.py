"""
FastAPI wrapper for SOC 2 Evidence Collector
Provides REST API endpoints for SOC 2 evidence collection and management
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging
import json

from soc2_evidence_collector import SOC2EvidenceCollector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SOC 2 Evidence API",
    description="SOC 2 Evidence Collection and Management API",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
CONFIG = {
    "evidence_dir": "./soc2-evidence",
    "database": {
        "host": "localhost",
        "port": 5432,
        "database": "netra_ai",
        "user": "netra_ai",
        "password": "secure_password",
    },
    "github_token": "your_github_token",
    "github_repo": "netra-ai/netra-ai-platform",
}

# Initialize evidence collector
collector = SOC2EvidenceCollector(CONFIG)


# Pydantic models
class ControlResponse(BaseModel):
    control_id: str
    control_name: str
    control_category: str
    implementation_status: str
    test_result: Optional[str] = None
    last_tested: Optional[datetime] = None
    evidence_count: int


class EvidenceResponse(BaseModel):
    id: int
    control_id: str
    control_name: str
    evidence_type: str
    evidence_data: Dict
    collection_date: datetime
    evidence_file_path: Optional[str] = None
    notes: Optional[str] = None


class CollectionRequest(BaseModel):
    control_ids: Optional[List[str]] = None
    force_refresh: bool = False


class ReportRequest(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    control_categories: Optional[List[str]] = None


# API Endpoints


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"service": "SOC 2 Evidence API", "status": "healthy", "version": "1.0.0"}


@app.get("/controls", response_model=List[ControlResponse])
async def get_controls(category: Optional[str] = None):
    """Get all SOC 2 controls with status"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(**CONFIG["database"])
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT 
                        c.control_id,
                        c.control_name,
                        c.control_category,
                        c.implementation_status,
                        c.test_result,
                        c.last_tested,
                        COUNT(e.id) as evidence_count
                    FROM soc2_control_status c
                    LEFT JOIN soc2_evidence e ON c.control_id = e.control_id
                    WHERE 1=1
                """
                params = []

                if category:
                    query += " AND c.control_category = %s"
                    params.append(category)

                query += """
                    GROUP BY c.control_id, c.control_name, c.control_category,
                             c.implementation_status, c.test_result, c.last_tested
                    ORDER BY c.control_id
                """

                cur.execute(query, params)
                results = cur.fetchall()

                return [dict(r) for r in results]
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching controls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/controls/{control_id}", response_model=ControlResponse)
async def get_control(control_id: str):
    """Get a specific control"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(**CONFIG["database"])
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT 
                        c.control_id,
                        c.control_name,
                        c.control_category,
                        c.implementation_status,
                        c.test_result,
                        c.last_tested,
                        COUNT(e.id) as evidence_count
                    FROM soc2_control_status c
                    LEFT JOIN soc2_evidence e ON c.control_id = e.control_id
                    WHERE c.control_id = %s
                    GROUP BY c.control_id, c.control_name, c.control_category,
                             c.implementation_status, c.test_result, c.last_tested
                """,
                    (control_id,),
                )

                result = cur.fetchone()

                if not result:
                    raise HTTPException(status_code=404, detail="Control not found")

                return dict(result)
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching control: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/evidence", response_model=List[EvidenceResponse])
async def get_evidence(
    control_id: Optional[str] = None,
    evidence_type: Optional[str] = None,
    days: int = Query(30, description="Number of days to retrieve"),
):
    """Get evidence records"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(**CONFIG["database"])
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT *
                    FROM soc2_evidence
                    WHERE collection_date >= NOW() - INTERVAL '%s days'
                """
                params = [days]

                if control_id:
                    query += " AND control_id = %s"
                    params.append(control_id)

                if evidence_type:
                    query += " AND evidence_type = %s"
                    params.append(evidence_type)

                query += " ORDER BY collection_date DESC"

                cur.execute(query, params)
                results = cur.fetchall()

                # Parse JSON evidence_data
                for result in results:
                    if isinstance(result["evidence_data"], str):
                        result["evidence_data"] = json.loads(result["evidence_data"])

                return [dict(r) for r in results]
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/evidence/{control_id}", response_model=List[EvidenceResponse])
async def get_control_evidence(control_id: str):
    """Get all evidence for a specific control"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(**CONFIG["database"])
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM soc2_evidence
                    WHERE control_id = %s
                    ORDER BY collection_date DESC
                """,
                    (control_id,),
                )

                results = cur.fetchall()

                # Parse JSON evidence_data
                for result in results:
                    if isinstance(result["evidence_data"], str):
                        result["evidence_data"] = json.loads(result["evidence_data"])

                return [dict(r) for r in results]
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching control evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/collect-evidence")
async def collect_evidence(
    request: CollectionRequest, background_tasks: BackgroundTasks
):
    """Trigger evidence collection"""
    try:
        # Run collection in background
        background_tasks.add_task(
            _collect_evidence_task, request.control_ids, request.force_refresh
        )

        return {
            "status": "started",
            "message": "Evidence collection started in background",
            "control_ids": request.control_ids or "all",
        }
    except Exception as e:
        logger.error(f"Error starting evidence collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _collect_evidence_task(control_ids: Optional[List[str]], force_refresh: bool):
    """Background task for evidence collection"""
    try:
        logger.info(
            f"Starting evidence collection for controls: {control_ids or 'all'}"
        )

        if control_ids:
            # Collect evidence for specific controls
            evidence_list = []
            for control_id in control_ids:
                if control_id.startswith("CC6"):
                    evidence_list.extend(collector.collect_cc6_evidence())
                elif control_id.startswith("CC7"):
                    evidence_list.extend(collector.collect_cc7_evidence())
                elif control_id.startswith("CC8"):
                    evidence_list.extend(collector.collect_cc8_evidence())
                # Add more control categories as needed
        else:
            # Collect all evidence
            evidence_list = collector.collect_all_evidence()

        logger.info(
            f"Evidence collection completed: {len(evidence_list)} items collected"
        )
    except Exception as e:
        logger.error(f"Error in evidence collection task: {e}")


@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    """Generate SOC 2 evidence report"""
    try:
        import tempfile
        import os
        from fastapi.responses import FileResponse

        # Create temporary file
        fd, temp_path = tempfile.mkstemp(suffix=".json")
        os.close(fd)

        # Generate report
        collector.generate_evidence_report(temp_path)

        # Return file
        return FileResponse(
            temp_path,
            media_type="application/json",
            filename=f'soc2-evidence-report-{datetime.now().strftime("%Y%m%d")}.json',
        )
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/statistics")
async def get_statistics():
    """Get SOC 2 compliance statistics"""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(**CONFIG["database"])
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Total controls
                cur.execute("SELECT COUNT(*) as total FROM soc2_control_status")
                total_controls = cur.fetchone()["total"]

                # Implemented controls
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM soc2_control_status
                    WHERE implementation_status = 'implemented'
                """)
                implemented = cur.fetchone()["count"]

                # Tested controls
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM soc2_control_status
                    WHERE test_result = 'pass'
                """)
                tested = cur.fetchone()["count"]

                # Evidence count
                cur.execute("SELECT COUNT(*) as count FROM soc2_evidence")
                evidence_count = cur.fetchone()["count"]

                # Controls by category
                cur.execute("""
                    SELECT 
                        control_category,
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE implementation_status = 'implemented') as implemented,
                        COUNT(*) FILTER (WHERE test_result = 'pass') as tested
                    FROM soc2_control_status
                    GROUP BY control_category
                    ORDER BY control_category
                """)
                by_category = cur.fetchall()

                return {
                    "total_controls": total_controls,
                    "implemented_controls": implemented,
                    "tested_controls": tested,
                    "total_evidence": evidence_count,
                    "implementation_rate": (
                        f"{(implemented/total_controls*100):.1f}%"
                        if total_controls > 0
                        else "0%"
                    ),
                    "test_pass_rate": (
                        f"{(tested/total_controls*100):.1f}%"
                        if total_controls > 0
                        else "0%"
                    ),
                    "by_category": [dict(c) for c in by_category],
                }
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/categories")
async def get_categories():
    """Get list of control categories"""
    return {
        "categories": [
            {"code": "CC", "name": "Common Criteria (Security)", "controls": 28},
            {"code": "A", "name": "Availability", "controls": 3},
            {"code": "C", "name": "Confidentiality", "controls": 4},
            {"code": "PI", "name": "Processing Integrity", "controls": 4},
            {"code": "P", "name": "Privacy", "controls": 8},
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
