"""
Integration test: Anemia Detection AI Microservice.

This test verifies connectivity to the anemia-service microservice.
It is automatically SKIPPED if the service is not reachable (e.g. in CI
without docker-compose). When running with the full stack, the service
should be reachable at http://anemia-service:8001.
"""

import pytest
import requests

TEST_IMAGE_URL = (
    "https://raw.githubusercontent.com/opencv/opencv/master/samples/data/lena.jpg"
)
ANEMIA_SERVICE_URL = "http://anemia-service:8001"


def _service_is_available() -> bool:
    """Return True if the anemia-service health endpoint responds."""
    try:
        r = requests.get(f"{ANEMIA_SERVICE_URL}/health", timeout=3)
        return r.status_code < 500
    except Exception:
        return False


@pytest.mark.skipif(
    not _service_is_available(),
    reason="anemia-service not reachable in this environment — skipping integration test",
)
def test_anemia_service_predict() -> None:
    """
    Integration test: anemia-service /predict endpoint.

    Sends a POST request with a sample image URL and verifies that the
    service returns HTTP 200 with a successful prediction payload.
    """
    print("Testing direct connection to AI Microservice...")

    res = requests.post(
        f"{ANEMIA_SERVICE_URL}/predict",
        json={
            "image_url": TEST_IMAGE_URL,
            "patient_id": "test1234",
            "scan_id": "scan9999",
        },
        timeout=10,
    )

    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")

    assert (
        res.status_code == 200
    ), f"Expected HTTP 200 from anemia-service, got {res.status_code}: {res.text}"
    data = res.json()
    assert data.get("success"), f"AI Microservice returned success=False: {data}"
