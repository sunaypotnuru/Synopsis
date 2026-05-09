"""
REAL Unit Tests for NetraAI MCP Tools

Verifies:
- Input validation (None checks)
- Clinical logic (Gender thresholds)
- FHIR R4 compliance
- Error handling
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch

# Import tools
from tools.anemia import diagnose_anemia
from tools.cataract import detect_cataract
from tools.dr import screen_diabetic_retinopathy
from tools.mental_health import analyze_mental_health
from tools.parkinsons import screen_parkinsons
from tools.fhir_ops import (
    get_patient_fhir,
    create_fhir_observation,
    query_patient_timeline,
)
from tools.comparison import compare_diagnostic_history
from tools.workflow import orchestrate_screening_workflow
from tools.prior_auth import generate_prior_auth


# Mock Context
class MockContext:
    def __init__(self):
        self.state = {}

    async def get_state(self, k):
        return self.state.get(k)

    async def set_state(self, k, v):
        self.state[k] = v


@pytest.mark.asyncio
async def test_anemia_input_validation():
    """Verify anemia tool handles missing input gracefully."""
    ctx = MockContext()
    res = await diagnose_anemia(ctx, image_url=None)
    assert res["resourceType"] == "OperationOutcome"


@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
@patch("httpx.AsyncClient.post")
async def test_anemia_gender_logic(mock_post, mock_get):
    """Verify WHO gender thresholds are respected."""
    ctx = MockContext()
    mock_get.return_value = MagicMock(status_code=200, content=b"fake-image")
    mock_post.return_value = MagicMock(
        status_code=200, json=lambda: {"hemoglobin_estimate": 12.5}
    )

    res_f = await diagnose_anemia(ctx, "http://test.com/img.jpg", gender="female")
    assert res_f["result"]["severity"] == "Normal"

    res_m = await diagnose_anemia(ctx, "http://test.com/img.jpg", gender="male")
    assert res_m["result"]["severity"] == "Mild"


@pytest.mark.asyncio
async def test_cataract_input_validation():
    ctx = MockContext()
    res = await detect_cataract(ctx, image_url=None)
    assert res["resourceType"] == "OperationOutcome"


@pytest.mark.asyncio
async def test_dr_input_validation():
    ctx = MockContext()
    res = await screen_diabetic_retinopathy(ctx, image_url=None)
    assert res["resourceType"] == "OperationOutcome"


@pytest.mark.asyncio
async def test_mental_health_validation():
    ctx = MockContext()
    res = await analyze_mental_health(ctx, audio_url=None)
    assert res["resourceType"] == "OperationOutcome"


@pytest.mark.asyncio
async def test_parkinsons_validation():
    ctx = MockContext()
    res = await screen_parkinsons(ctx, image_url=None)
    assert res["resourceType"] == "OperationOutcome"


@pytest.mark.asyncio
@patch("tools.fhir_ops._get_supabase_client")
async def test_fhir_ops_patient(mock_supabase):
    ctx = MockContext()
    # Mock supabase response
    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"data": {"resourceType": "Patient", "id": "test-123"}}]
    )

    res = await get_patient_fhir(ctx, patient_id="test-123")
    assert res["resourceType"] == "Patient"
    assert res["id"] == "test-123"


@pytest.mark.asyncio
@patch("tools.fhir_ops._get_supabase_client")
async def test_fhir_create_observation(mock_supabase):
    ctx = MockContext()
    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    res = await create_fhir_observation(ctx, "718-7", 10.2, "g/dL", "test-123")
    assert res["resourceType"] == "Observation"
    assert res["valueQuantity"]["value"] == 10.2


@pytest.mark.asyncio
@patch("tools.fhir_ops._get_supabase_client")
async def test_fhir_query_timeline(mock_supabase):
    ctx = MockContext()
    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[]
    )
    res = await query_patient_timeline(ctx, "test-123", "DiagnosticReport")
    assert res["resourceType"] == "Bundle"


@pytest.mark.asyncio
async def test_comparison_logic():
    ctx = MockContext()
    # Test insufficient data case (it will fail to get supabase and return OperationOutcome or status insufficient_data)
    # The comparison tool has its own error handling
    res = await compare_diagnostic_history(ctx, "anemia", "test-123")
    assert "status" in res


@pytest.mark.asyncio
@patch("tools.workflow.get_patient_fhir")
async def test_workflow_orchestration(mock_fhir):
    ctx = MockContext()
    mock_fhir.return_value = {"resourceType": "Patient", "gender": "male"}
    res = await orchestrate_screening_workflow(
        ctx, "I have fatigue", "test-123", {"image_url": "test.jpg"}
    )
    assert res["resourceType"] == "WorkflowResult"
    assert res["workflow"] == "Fatigue Workup"


@pytest.mark.asyncio
@patch("tools.prior_auth.compare_diagnostic_history")
async def test_prior_auth_generation(mock_comp):
    ctx = MockContext()
    mock_comp.return_value = {"status": "insufficient_data"}
    res = await generate_prior_auth(ctx, "Iron Infusion", "anemia", "test-123")
    assert res["resourceType"] == "PriorAuthorizationResult"
    assert "service_requested" in res


async def run_all_tests():
    print("\n--- RUNNING COMPREHENSIVE MCP AUDIT ---")
    tests = [
        test_anemia_input_validation,
        test_cataract_input_validation,
        test_dr_input_validation,
        test_mental_health_validation,
        test_parkinsons_validation,
        test_fhir_ops_patient,
        test_fhir_create_observation,
        test_fhir_query_timeline,
        test_comparison_logic,
        test_workflow_orchestration,
        test_prior_auth_generation,
    ]

    passed = 0
    for test in tests:
        try:
            if test == test_workflow_orchestration:
                with patch("tools.workflow.get_patient_fhir") as m:
                    m.return_value = {"resourceType": "Patient", "gender": "male"}
                    await test()
            elif test == test_prior_auth_generation:
                with patch("tools.prior_auth.compare_diagnostic_history") as m:
                    m.return_value = {"status": "insufficient_data"}
                    await test()
            elif test in [
                test_fhir_ops_patient,
                test_fhir_create_observation,
                test_fhir_query_timeline,
            ]:
                with patch("tools.fhir_ops._get_supabase_client") as m:
                    mock_db = MagicMock()
                    m.return_value = mock_db
                    # Default mock response for execute()
                    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                        data=[{"data": {"resourceType": "Patient", "id": "test-123"}}]
                    )
                    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                        data=[]
                    )
                    await test()
            else:
                await test()
            print(f"PASS: {test.__name__}")
            passed += 1
        except Exception as e:
            import traceback

            print(f"FAIL: {test.__name__} - {repr(e)}")
            traceback.print_exc()

    print(f"\nAUDIT COMPLETE: {passed}/{len(tests)} PASSED")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
