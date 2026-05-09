from fastapi import APIRouter, Depends
from pydantic import BaseModel
import asyncio
from typing import Optional
import random

from app.core.security import get_current_user

router = APIRouter(prefix="/insurance", tags=["Insurance"])


class InsuranceVerifyRequest(BaseModel):
    provider: str
    policy_number: str
    patient_name: str
    date_of_birth: Optional[str] = None


class InsuranceVerifyResponse(BaseModel):
    verified: bool
    status: str
    coverage_active: bool
    copay_amount: float
    deductible_remaining: float
    message: str


@router.get("")
async def get_insurance(current_user=Depends(get_current_user)):
    """Return patient's saved insurance records (mock)."""
    return {"insurance_records": [], "message": "No insurance records on file yet."}


@router.post("/verify", response_model=InsuranceVerifyResponse)
async def verify_insurance(
    req: InsuranceVerifyRequest, current_user=Depends(get_current_user)
):
    """
    Mock endpoint to ping a TPA aggregator and verify insurance coverage.
    In production, this would integrate with Change Healthcare, Eligible,
    or specific APIs.
    """
    # Simulate network latency to TPA Aggregator API
    await asyncio.sleep(1.5)

    # We will use the policy number length to mock a failure scenario
    if len(req.policy_number) < 5 or "INVALID" in req.policy_number.upper():
        return InsuranceVerifyResponse(
            verified=False,
            status="INVALID_POLICY_NUMBER",
            coverage_active=False,
            copay_amount=0.0,
            deductible_remaining=0.0,
            message="The policy number could not be found in the clearinghouse network.",
        )
    if "EXPIRED" in req.policy_number.upper():
        return InsuranceVerifyResponse(
            verified=True,
            status="COVERAGE_INACTIVE",
            coverage_active=False,
            copay_amount=0.0,
            deductible_remaining=0.0,
            message="Policy found, but coverage has expired or lapsed.",
        )

    # Success scenario with mock data
    mock_copay = random.choice([0.0, 15.0, 25.0, 50.0])
    mock_deductible = random.choice([0.0, 250.0, 500.0, 1500.0])

    return InsuranceVerifyResponse(
        verified=True,
        status="ACTIVE",
        coverage_active=True,
        copay_amount=mock_copay,
        deductible_remaining=mock_deductible,
        message=f"Insurance verified successfully with {req.provider}.",
    )
