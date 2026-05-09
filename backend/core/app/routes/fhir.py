from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import uuid

router = APIRouter(tags=["FHIR R4 Server"])

# Mock DB for FHIR resources
MOCK_FHIR_DB: Dict[str, List[Dict[str, Any]]] = {
    "Patient": [
        {
            "resourceType": "Patient",
            "id": "1",
            "active": True,
            "name": [{"use": "official", "family": "Doe", "given": ["John"]}],
            "gender": "male",
            "birthDate": "1980-01-01",
        }
    ],
    "Observation": [],
    "Condition": [],
}


@router.get("/fhir/{resource_type}")
async def get_fhir_resources(resource_type: str, _count: int = 10, _offset: int = 0):
    """Get FHIR resources by type."""
    if resource_type not in MOCK_FHIR_DB:
        # Initialize an empty list if this is a supported but empty resource type
        # For simplicity, we just return an empty bundle
        return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}

    resources = MOCK_FHIR_DB[resource_type]
    paginated = resources[_offset : _offset + _count]

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(resources),
        "entry": [{"resource": r} for r in paginated],
    }


@router.get("/fhir/{resource_type}/{resource_id}")
async def get_fhir_resource(resource_type: str, resource_id: str):
    if resource_type not in MOCK_FHIR_DB:
        raise HTTPException(status_code=404, detail="Resource type not found")

    for r in MOCK_FHIR_DB[resource_type]:
        if r["id"] == resource_id:
            return r

    raise HTTPException(status_code=404, detail="Resource not found")


@router.post("/fhir/{resource_type}")
async def create_fhir_resource(resource_type: str, resource: dict):
    if resource_type not in MOCK_FHIR_DB:
        MOCK_FHIR_DB[resource_type] = []

    # Inject ID and resourceType if missing
    if "id" not in resource:
        resource["id"] = str(uuid.uuid4())
    resource["resourceType"] = resource_type

    MOCK_FHIR_DB[resource_type].append(resource)
    return resource
