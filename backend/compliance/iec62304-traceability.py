"""
IEC 62304 Requirements Traceability Matrix System
Manages requirements, design, implementation, and testing traceability
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RequirementType(Enum):
    """Requirement types per IEC 62304"""

    FUNCTIONAL = "functional"
    PERFORMANCE = "performance"
    INTERFACE = "interface"
    SECURITY = "security"
    USABILITY = "usability"
    REGULATORY = "regulatory"


class SafetyClass(Enum):
    """IEC 62304 Safety Classes"""

    CLASS_A = "A"  # No injury or damage to health
    CLASS_B = "B"  # Non-serious injury
    CLASS_C = "C"  # Death or serious injury


class VerificationMethod(Enum):
    """Verification methods"""

    TEST = "test"
    REVIEW = "review"
    ANALYSIS = "analysis"
    DEMONSTRATION = "demonstration"


class RequirementStatus(Enum):
    """Requirement lifecycle status"""

    DRAFT = "draft"
    APPROVED = "approved"
    IMPLEMENTED = "implemented"
    VERIFIED = "verified"
    VALIDATED = "validated"


@dataclass
class Requirement:
    """Software requirement"""

    id: str
    title: str
    description: str
    type: RequirementType
    priority: str  # Critical, High, Medium, Low
    safety_class: SafetyClass
    rationale: str
    verification_method: VerificationMethod
    status: RequirementStatus
    parent_requirement_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


@dataclass
class DesignElement:
    """Design element (architecture, detailed design)"""

    id: str
    name: str
    description: str
    type: str  # component, module, class, function
    safety_class: SafetyClass
    requirements: List[str]  # Requirement IDs
    interfaces: List[str]
    created_at: Optional[datetime] = None


@dataclass
class Implementation:
    """Implementation (code)"""

    id: str
    file_path: str
    function_name: Optional[str] = None
    class_name: Optional[str] = None
    design_elements: List[str]  # Design element IDs
    git_commit: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class TestCase:
    """Test case"""

    id: str
    name: str
    description: str
    type: str  # unit, integration, system
    requirements: List[str]  # Requirement IDs
    design_elements: List[str]  # Design element IDs
    test_procedure: str
    expected_result: str
    actual_result: Optional[str] = None
    status: str  # pass, fail, blocked, not_run
    executed_by: Optional[str] = None
    executed_at: Optional[datetime] = None


class TraceabilityMatrix:
    """IEC 62304 Traceability Matrix System"""

    def __init__(self, db_config: Dict):
        self.db_config = db_config

    def connect_db(self):
        """Connect to database"""
        return psycopg2.connect(**self.db_config)

    def create_requirement(self, requirement: Requirement) -> str:
        """Create new requirement"""
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO requirements (
                        id, title, description, type, priority, safety_class,
                        rationale, verification_method, status, parent_requirement_id,
                        created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """,
                    (
                        requirement.id,
                        requirement.title,
                        requirement.description,
                        requirement.type.value,
                        requirement.priority,
                        requirement.safety_class.value,
                        requirement.rationale,
                        requirement.verification_method.value,
                        requirement.status.value,
                        requirement.parent_requirement_id,
                        requirement.created_by,
                    ),
                )
                req_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Created requirement: {req_id}")
                return req_id
        finally:
            conn.close()

    def link_requirement_to_design(self, requirement_id: str, design_element_id: str):
        """Link requirement to design element"""
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO requirement_design_links (requirement_id, design_element_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """,
                    (requirement_id, design_element_id),
                )
                conn.commit()
                logger.info(
                    f"Linked requirement {requirement_id} to design {design_element_id}"
                )
        finally:
            conn.close()

    def link_design_to_implementation(
        self, design_element_id: str, implementation_id: str
    ):
        """Link design element to implementation"""
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO design_implementation_links (design_element_id, implementation_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """,
                    (design_element_id, implementation_id),
                )
                conn.commit()
                logger.info(
                    f"Linked design {design_element_id} to implementation {implementation_id}"
                )
        finally:
            conn.close()

    def link_requirement_to_test(self, requirement_id: str, test_case_id: str):
        """Link requirement to test case"""
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO requirement_test_links (requirement_id, test_case_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """,
                    (requirement_id, test_case_id),
                )
                conn.commit()
                logger.info(
                    f"Linked requirement {requirement_id} to test {test_case_id}"
                )
        finally:
            conn.close()

    def get_traceability_for_requirement(self, requirement_id: str) -> Dict:
        """Get complete traceability for a requirement"""
        conn = self.connect_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get requirement
                cur.execute(
                    "SELECT * FROM requirements WHERE id = %s", (requirement_id,)
                )
                requirement = cur.fetchone()

                if not requirement:
                    return None

                # Get linked design elements
                cur.execute(
                    """
                    SELECT de.* FROM design_elements de
                    JOIN requirement_design_links rdl ON de.id = rdl.design_element_id
                    WHERE rdl.requirement_id = %s
                """,
                    (requirement_id,),
                )
                design_elements = cur.fetchall()

                # Get linked implementations
                cur.execute(
                    """
                    SELECT DISTINCT i.* FROM implementations i
                    JOIN design_implementation_links dil ON i.id = dil.implementation_id
                    JOIN requirement_design_links rdl ON dil.design_element_id = rdl.design_element_id
                    WHERE rdl.requirement_id = %s
                """,
                    (requirement_id,),
                )
                implementations = cur.fetchall()

                # Get linked test cases
                cur.execute(
                    """
                    SELECT tc.* FROM test_cases tc
                    JOIN requirement_test_links rtl ON tc.id = rtl.test_case_id
                    WHERE rtl.requirement_id = %s
                """,
                    (requirement_id,),
                )
                test_cases = cur.fetchall()

                return {
                    "requirement": dict(requirement),
                    "design_elements": [dict(de) for de in design_elements],
                    "implementations": [dict(i) for i in implementations],
                    "test_cases": [dict(tc) for tc in test_cases],
                    "traceability_complete": len(design_elements) > 0
                    and len(test_cases) > 0,
                }
        finally:
            conn.close()

    def generate_traceability_matrix(
        self, safety_class: Optional[SafetyClass] = None
    ) -> List[Dict]:
        """Generate complete traceability matrix"""
        conn = self.connect_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Build query
                query = """
                    SELECT 
                        r.id as requirement_id,
                        r.title as requirement_title,
                        r.type as requirement_type,
                        r.safety_class,
                        r.status as requirement_status,
                        COUNT(DISTINCT rdl.design_element_id) as design_count,
                        COUNT(DISTINCT rtl.test_case_id) as test_count,
                        CASE 
                            WHEN COUNT(DISTINCT rdl.design_element_id) > 0 
                            AND COUNT(DISTINCT rtl.test_case_id) > 0 
                            THEN 'complete'
                            ELSE 'incomplete'
                        END as traceability_status
                    FROM requirements r
                    LEFT JOIN requirement_design_links rdl ON r.id = rdl.requirement_id
                    LEFT JOIN requirement_test_links rtl ON r.id = rtl.requirement_id
                """

                params = []
                if safety_class:
                    query += " WHERE r.safety_class = %s"
                    params.append(safety_class.value)

                query += """
                    GROUP BY r.id, r.title, r.type, r.safety_class, r.status
                    ORDER BY r.id
                """

                cur.execute(query, params)
                results = cur.fetchall()

                return [dict(r) for r in results]
        finally:
            conn.close()

    def get_coverage_statistics(self) -> Dict:
        """Get traceability coverage statistics"""
        conn = self.connect_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Total requirements
                cur.execute("SELECT COUNT(*) as total FROM requirements")
                total_requirements = cur.fetchone()["total"]

                # Requirements with design
                cur.execute("""
                    SELECT COUNT(DISTINCT requirement_id) as count
                    FROM requirement_design_links
                """)
                requirements_with_design = cur.fetchone()["count"]

                # Requirements with tests
                cur.execute("""
                    SELECT COUNT(DISTINCT requirement_id) as count
                    FROM requirement_test_links
                """)
                requirements_with_tests = cur.fetchone()["count"]

                # Requirements fully traced
                cur.execute("""
                    SELECT COUNT(DISTINCT r.id) as count
                    FROM requirements r
                    WHERE EXISTS (
                        SELECT 1 FROM requirement_design_links rdl 
                        WHERE rdl.requirement_id = r.id
                    )
                    AND EXISTS (
                        SELECT 1 FROM requirement_test_links rtl 
                        WHERE rtl.requirement_id = r.id
                    )
                """)
                fully_traced = cur.fetchone()["count"]

                # Test pass rate
                cur.execute("""
                    SELECT 
                        COUNT(*) FILTER (WHERE status = 'pass') as passed,
                        COUNT(*) FILTER (WHERE status = 'fail') as failed,
                        COUNT(*) FILTER (WHERE status = 'not_run') as not_run,
                        COUNT(*) as total
                    FROM test_cases
                """)
                test_stats = cur.fetchone()

                return {
                    "total_requirements": total_requirements,
                    "requirements_with_design": requirements_with_design,
                    "requirements_with_tests": requirements_with_tests,
                    "fully_traced_requirements": fully_traced,
                    "design_coverage": (
                        f"{(requirements_with_design/total_requirements*100):.1f}%"
                        if total_requirements > 0
                        else "0%"
                    ),
                    "test_coverage": (
                        f"{(requirements_with_tests/total_requirements*100):.1f}%"
                        if total_requirements > 0
                        else "0%"
                    ),
                    "full_traceability": (
                        f"{(fully_traced/total_requirements*100):.1f}%"
                        if total_requirements > 0
                        else "0%"
                    ),
                    "test_statistics": {
                        "total": test_stats["total"],
                        "passed": test_stats["passed"],
                        "failed": test_stats["failed"],
                        "not_run": test_stats["not_run"],
                        "pass_rate": (
                            f"{(test_stats['passed']/test_stats['total']*100):.1f}%"
                            if test_stats["total"] > 0
                            else "0%"
                        ),
                    },
                }
        finally:
            conn.close()

    def export_traceability_matrix_csv(self, output_file: str):
        """Export traceability matrix to CSV for auditors"""
        import csv

        matrix = self.generate_traceability_matrix()

        with open(output_file, "w", newline="") as f:
            if matrix:
                writer = csv.DictWriter(f, fieldnames=matrix[0].keys())
                writer.writeheader()
                writer.writerows(matrix)

        logger.info(f"Exported traceability matrix to {output_file}")

    def validate_traceability(self) -> Dict:
        """Validate traceability completeness"""
        conn = self.connect_db()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Find requirements without design
                cur.execute("""
                    SELECT id, title FROM requirements r
                    WHERE NOT EXISTS (
                        SELECT 1 FROM requirement_design_links rdl 
                        WHERE rdl.requirement_id = r.id
                    )
                """)
                missing_design = cur.fetchall()

                # Find requirements without tests
                cur.execute("""
                    SELECT id, title FROM requirements r
                    WHERE NOT EXISTS (
                        SELECT 1 FROM requirement_test_links rtl 
                        WHERE rtl.requirement_id = r.id
                    )
                """)
                missing_tests = cur.fetchall()

                # Find failed tests
                cur.execute("""
                    SELECT id, name, requirements FROM test_cases
                    WHERE status = 'fail'
                """)
                failed_tests = cur.fetchall()

                return {
                    "valid": len(missing_design) == 0
                    and len(missing_tests) == 0
                    and len(failed_tests) == 0,
                    "requirements_missing_design": [dict(r) for r in missing_design],
                    "requirements_missing_tests": [dict(r) for r in missing_tests],
                    "failed_tests": [dict(t) for t in failed_tests],
                    "total_issues": len(missing_design)
                    + len(missing_tests)
                    + len(failed_tests),
                }
        finally:
            conn.close()


# Example usage
if __name__ == "__main__":
    db_config = {
        "host": "localhost",
        "port": 5432,
        "database": "netra_ai",
        "user": "netra_ai",
        "password": "secure_password",
    }

    tm = TraceabilityMatrix(db_config)

    # Get coverage statistics
    stats = tm.get_coverage_statistics()
    print(json.dumps(stats, indent=2))

    # Validate traceability
    validation = tm.validate_traceability()
    print(json.dumps(validation, indent=2, default=str))

    # Export matrix
    tm.export_traceability_matrix_csv("traceability-matrix.csv")
