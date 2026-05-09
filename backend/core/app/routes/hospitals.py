from fastapi import APIRouter, Query
from typing import List, Optional
import math
from pydantic import BaseModel
import logging
import os
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


class Hospital(BaseModel):
    id: int
    name: str
    address: str
    distance: str
    latitude: float
    longitude: float
    rating: float
    phone: str
    hours: str
    specialties: List[str]
    type: str


def calculate_distance(lat1, lon1, lat2, lon2):
    """Haversine formula to calculate distance in km."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Mock hospitals across different cities
ALL_HOSPITALS = [
    # Mumbai
    {
        "id": 1,
        "name": "Apollo Hospitals",
        "address": "Navi Mumbai, Maharashtra 400703",
        "latitude": 19.0176,
        "longitude": 73.0196,
        "rating": 4.8,
        "phone": "+91-22-6789-0123",
        "hours": "24/7",
        "specialties": ["Hematology", "General Medicine"],
        "type": "Multi-specialty",
    },
    {
        "id": 2,
        "name": "Fortis Hospital",
        "address": "Mumbai Central, Maharashtra 400008",
        "latitude": 19.0176,
        "longitude": 72.8479,
        "rating": 4.7,
        "phone": "+91-22-6150-1234",
        "hours": "24/7",
        "specialties": ["Internal Medicine"],
        "type": "Multi-specialty",
    },
    # Hyderabad (Financial District area)
    {
        "id": 101,
        "name": "AIG Hospitals",
        "address": "Gachibowli, Hyderabad, Telangana 500032",
        "latitude": 17.4435,
        "longitude": 78.3489,
        "rating": 4.9,
        "phone": "+91-40-4244-4244",
        "hours": "24/7",
        "specialties": ["Gastroenterology", "Hematology"],
        "type": "Super-specialty",
    },
    {
        "id": 102,
        "name": "Continental Hospitals",
        "address": "Nanakramguda, Hyderabad, Telangana 500032",
        "latitude": 17.4194,
        "longitude": 78.3424,
        "rating": 4.8,
        "phone": "+91-40-6700-0000",
        "hours": "24/7",
        "specialties": ["Emergency Medicine", "General Medicine"],
        "type": "Multi-specialty",
    },
    # Delhi (AIIMS area)
    {
        "id": 201,
        "name": "AIIMS Delhi",
        "address": "Ansari Nagar, New Delhi 110029",
        "latitude": 28.5672,
        "longitude": 77.2100,
        "rating": 4.9,
        "phone": "+91-11-2658-8500",
        "hours": "24/7",
        "specialties": ["All Specializations"],
        "type": "Government",
    },
    {
        "id": 202,
        "name": "Safdarjung Hospital",
        "address": "Ansari Nagar East, New Delhi 110029",
        "latitude": 28.5670,
        "longitude": 77.2078,
        "rating": 4.2,
        "phone": "+91-11-2673-0000",
        "hours": "24/7",
        "specialties": ["Emergency", "Surgery"],
        "type": "Government",
    },
    # Bangalore
    {
        "id": 301,
        "name": "Manipal Hospital",
        "address": "HAL Airport Road, Bangalore, Karnataka 560017",
        "latitude": 12.9592,
        "longitude": 77.6444,
        "rating": 4.6,
        "phone": "+91-80-2521-1200",
        "hours": "24/7",
        "specialties": ["Cardiology", "Neurology"],
        "type": "Multi-specialty",
    },
    {
        "id": 302,
        "name": "Narayana Health City",
        "address": "Bommasandra Industrial Area, Bangalore 560099",
        "latitude": 12.8126,
        "longitude": 77.6944,
        "rating": 4.7,
        "phone": "+91-80-7122-2222",
        "hours": "24/7",
        "specialties": ["Cardiac Surgery", "Hematology"],
        "type": "Super-specialty",
    },
    # Chennai
    {
        "id": 401,
        "name": "Apollo Main Hospital",
        "address": "Greams Road, Chennai, Tamil Nadu 600006",
        "latitude": 13.0612,
        "longitude": 80.2526,
        "rating": 4.8,
        "phone": "+91-44-2829-3333",
        "hours": "24/7",
        "specialties": ["Transplant", "General Medicine"],
        "type": "Multi-specialty",
    },
    # Kolkata
    {
        "id": 501,
        "name": "AMRI Hospitals",
        "address": "Dhakuria, Kolkata, West Bengal 700029",
        "latitude": 22.5085,
        "longitude": 88.3615,
        "rating": 4.5,
        "phone": "+91-33-6680-0000",
        "hours": "24/7",
        "specialties": ["Orthopedics", "Critical Care"],
        "type": "Multi-specialty",
    },
]


@router.get("", response_model=List[Hospital])
async def get_nearby_hospitals(
    lat: Optional[float] = None, lon: Optional[float] = None, distance_km: int = 10
):
    """Get hospitals near a location (returns calculated distances)."""

    # Try real Google Places API if key is available
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if api_key and lat and lon:
        try:
            async with httpx.AsyncClient() as client:
                # search for 'hospital' in radius
                url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    "location": f"{lat},{lon}",
                    "radius": distance_km * 1000,
                    "type": "hospital",
                    "key": api_key,
                }
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                if data.get("status") == "OK":
                    results = []
                    for i, place in enumerate(data.get("results", [])[:20]):
                        p_lat = place["geometry"]["location"]["lat"]
                        p_lng = place["geometry"]["location"]["lng"]
                        dist = calculate_distance(lat, lon, p_lat, p_lng)

                        results.append(
                            {
                                "id": 1000 + i,
                                "name": place["name"],
                                "address": place.get("vicinity", "Address unknown"),
                                "distance": f"{dist:.1f} km",
                                "latitude": p_lat,
                                "longitude": p_lng,
                                "rating": place.get("rating", 4.0),
                                "phone": "+91-0000-0000",  # Phone requires extra Place Details call
                                "hours": "24/7",
                                "specialties": ["General Medical"],
                                "type": "Medical Facility",
                            }
                        )
                    return results
        except Exception as e:
            logger.error(f"Google Places API failed: {e}")
            # Fallback to mock data

    # Fallback to Mock Data
    results = []
    search_lat = lat if lat else 19.0760
    search_lon = lon if lon else 72.8777

    for h in ALL_HOSPITALS:
        dist = calculate_distance(search_lat, search_lon, h["latitude"], h["longitude"])
        # Use a larger threshold for mock data fallback to ensure user sees SOMETHING
        if dist <= max(distance_km, 100):
            h_copy = h.copy()
            h_copy["distance"] = f"{dist:.1f} km"
            results.append(h_copy)

    # Sort by distance
    def _dist_key(x: dict) -> float:
        return float(str(x["distance"]).split()[0])

    results.sort(key=_dist_key)
    return results[:10]  # Return top 10 closest


@router.get("/search")
async def search_hospitals(q: str = Query(..., min_length=1)):
    """Search hospitals by name or location."""
    q_lower = q.lower()
    results = [
        h
        for h in ALL_HOSPITALS
        if q_lower in str(h["name"]).lower() or q_lower in str(h["address"]).lower()
    ]
    # Add dummy distance for search results
    for r in results:
        r["distance"] = "Search Result"
    return results
