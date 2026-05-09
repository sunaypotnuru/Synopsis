"""
FastAPI wrapper for IEC 62304 Traceability System
Provides REST API endpoints for requirements traceability management
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging

from iec62304_traceability import TraceabilityMatrix, SafetyClass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="IEC 62304 Traceability API",
    description="Requirements Traceability Matrix System API",
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

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "netra_ai",
    "user": "netra_ai",
    "password": "secure_password",
}

# Initialize traceability system
traceability = TraceabilityMatrix(DB_CONFIG)


# Pydantic models
class RequirementResponse(BaseModel):
    id: str
    title: str
    description: str
    type: str
    priority: str
    safety_class: str
    rationale: str
    verification_method: str
    status: str
    parent_requirement_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


class DesignElementResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    safety_class: str
    created_at: Optional[datetime] = None


class TraceabilityResponse(BaseModel):
    requirement: Dict
    design_elements: List[Dict]
    implementations: List[Dict]
    test_cases: List[Dict]
    traceability_complete: bool


class CoverageStats(BaseModel):
    total_requirements: int
    requirements_with_design: int
    requirements_with_tests: int
    fully_traced_requirements: int
    design_coverage: str
    test_coverage: str
    full_traceability: str
    test_statistics: Dict


class TraceabilityMatrixRow(BaseModel):
    requirement_id: str
    requirement_title: str
    requirement_type: str
    safety_class: str
    requirement_status: str
    design_count: int
    test_count: int
    traceability_status: str


# API Endpoints


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "IEC 62304 Traceability API",
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/requirements", response_model=List[RequirementResponse])
async def get_requirements(
    safety_class: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
):
    """Get all requirements with optional filters"""
    try:
        conn = traceability.connect_db()
        try:
            with conn.cursor() as cur:
                query = "SELECT * FROM requirements WHERE 1=1"
                params = []

                if safety_class:
                    query += " AND safety_class = %s"
                    params.append(safety_class)

                if status:
                    query += " AND status = %s"
                    params.append(status)

                if type:
                    query += " AND type = %s"
                    params.append(type)

                query += " ORDER BY id"

                cur.execute(query, params)

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/requirements/{requirement_id}", response_model=RequirementResponse)
async def get_requirement(requirement_id: str):
    """Get a specific requirement"""
    try:
        conn = traceability.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM requirements WHERE id = %s", (requirement_id,)
                )
                row = cur.fetchone()

                if not row:
                    raise HTTPException(status_code=404, detail="Requirement not found")

                columns = [desc[0] for desc in cur.description]
                return dict(zip(columns, row))
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching requirement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/requirements/{requirement_id}/traceability", response_model=TraceabilityResponse
)
async def get_requirement_traceability(requirement_id: str):
    """Get complete traceability for a requirement"""
    try:
        result = traceability.get_traceability_for_requirement(requirement_id)

        if not result:
            raise HTTPException(status_code=404, detail="Requirement not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching traceability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/design-elements", response_model=List[DesignElementResponse])
async def get_design_elements(safety_class: Optional[str] = None):
    """Get all design elements"""
    try:
        conn = traceability.connect_db()
        try:
            with conn.cursor() as cur:
                query = "SELECT * FROM design_elements WHERE 1=1"
                params = []

                if safety_class:
                    query += " AND safety_class = %s"
                    params.append(safety_class)

                query += " ORDER BY id"

                cur.execute(query, params)

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching design elements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/traceability-matrix", response_model=List[TraceabilityMatrixRow])
async def get_traceability_matrix(safety_class: Optional[str] = None):
    """Get complete traceability matrix"""
    try:
        safety_class_enum = SafetyClass(safety_class) if safety_class else None
        matrix = traceability.generate_traceability_matrix(safety_class_enum)
        return matrix
    except Exception as e:
        logger.error(f"Error generating traceability matrix: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coverage-stats", response_model=CoverageStats)
async def get_coverage_statistics():
    """Get traceability coverage statistics"""
    try:
        stats = traceability.get_coverage_statistics()
        return stats
    except Exception as e:
        logger.error(f"Error fetching coverage statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/export-csv")
async def export_traceability_csv():
    """Export traceability matrix to CSV"""
    try:
        import tempfile
        import os
        from fastapi.responses import FileResponse

        # Create temporary file
        fd, temp_path = tempfile.mkstemp(suffix=".csv")
        os.close(fd)

        # Export to CSV
        traceability.export_traceability_matrix_csv(temp_path)

        # Return file
        return FileResponse(
            temp_path,
            media_type="text/csv",
            filename=f'traceability-matrix-{datetime.now().strftime("%Y%m%d")}.csv',
        )
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/validate")
async def validate_traceability():
    """Validate traceability completeness"""
    try:
        validation = traceability.validate_traceability()
        return validation
    except Exception as e:
        logger.error(f"Error validating traceability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/test-cases")
async def get_test_cases(status: Optional[str] = None, type: Optional[str] = None):
    """Get all test cases"""
    try:
        conn = traceability.connect_db()
        try:
            with conn.cursor() as cur:
                query = "SELECT * FROM test_cases WHERE 1=1"
                params = []

                if status:
                    query += " AND status = %s"
                    params.append(status)

                if type:
                    query += " AND type = %s"
                    params.append(type)

                query += " ORDER BY id"

                cur.execute(query, params)

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching test cases: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/implementations")
async def get_implementations():
    """Get all implementations"""
    try:
        conn = traceability.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM implementations ORDER BY id")

                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))

                return results
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Error fetching implementations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/safety-classes")
async def get_safety_classes():
    """Get list of safety classes"""
    return {
        "safety_classes": [
            {
                "value": "A",
                "name": "Class A",
                "description": "No injury or damage to health",
            },
            {"value": "B", "name": "Class B", "description": "Non-serious injury"},
            {"value": "C", "name": "Class C", "description": "Death or serious injury"},
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
