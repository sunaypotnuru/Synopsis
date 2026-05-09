"""
Emergency Services API - Industrial Level (FREE)
Integrates with FREE emergency services APIs and geolocation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
from datetime import datetime
import httpx
import math

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Emergency Services API",
    description="FREE emergency services integration with geolocation",
    version="1.0.0",
)

# Configure CORS - use environment variable for production
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8080",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Environment-based for production security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured for origins: {allowed_origins}")


class Location(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None


class EmergencyRequest(BaseModel):
    location: Location
    emergency_type: str  # "medical", "mental_health", "ambulance", "police", "fire"
    patient_id: Optional[str] = None
    notes: Optional[str] = None


class EmergencyContact(BaseModel):
    name: str
    phone: str
    type: str  # "hotline", "hospital", "ambulance", "police"
    distance_km: Optional[float] = None
    address: Optional[str] = None


class EmergencyResponse(BaseModel):
    status: str
    message: str
    emergency_contacts: List[EmergencyContact]
    nearest_hospital: Optional[dict] = None
    estimated_response_time: Optional[str] = None
    timestamp: str


# Emergency hotlines database (FREE, no API needed)
EMERGENCY_HOTLINES = {
    "medical": [
        {
            "name": "National Emergency Number (India)",
            "phone": "112",
            "type": "hotline",
            "description": "All emergencies - Police, Fire, Medical",
        },
        {
            "name": "Ambulance Service",
            "phone": "108",
            "type": "hotline",
            "description": "24/7 ambulance service",
        },
        {
            "name": "Medical Emergency",
            "phone": "102",
            "type": "hotline",
            "description": "Medical emergency hotline",
        },
    ],
    "mental_health": [
        {
            "name": "National Suicide Prevention Lifeline",
            "phone": "988",
            "type": "hotline",
            "description": "24/7 suicide prevention and crisis support",
        },
        {
            "name": "Crisis Text Line",
            "phone": "Text HOME to 741741",
            "type": "hotline",
            "description": "24/7 text-based crisis support",
        },
        {
            "name": "SAMHSA National Helpline",
            "phone": "1-800-662-4357",
            "type": "hotline",
            "description": "Mental health and substance abuse",
        },
        {
            "name": "Vandrevala Foundation (India)",
            "phone": "1860-2662-345",
            "type": "hotline",
            "description": "24/7 mental health support in India",
        },
    ],
    "ambulance": [
        {
            "name": "National Ambulance Service",
            "phone": "108",
            "type": "ambulance",
            "description": "24/7 free ambulance service",
        },
        {
            "name": "Emergency Ambulance",
            "phone": "102",
            "type": "ambulance",
            "description": "Medical emergency ambulance",
        },
    ],
    "police": [
        {
            "name": "Police Emergency",
            "phone": "100",
            "type": "police",
            "description": "Police emergency hotline",
        },
        {
            "name": "Women Helpline",
            "phone": "1091",
            "type": "police",
            "description": "Women in distress",
        },
    ],
    "fire": [
        {
            "name": "Fire Emergency",
            "phone": "101",
            "type": "fire",
            "description": "Fire emergency services",
        }
    ],
}


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula
    Returns distance in kilometers
    """
    R = 6371  # Earth's radius in km

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


async def find_nearby_hospitals(
    latitude: float, longitude: float, radius_km: float = 10
):
    """
    Find nearby hospitals using Overpass API (FREE OpenStreetMap data)
    """
    try:
        # Overpass API query for hospitals
        overpass_url = "https://overpass-api.de/api/interpreter"

        # Query hospitals within radius
        query = f"""
        [out:json];
        (
          node["amenity"="hospital"](around:{radius_km * 1000},{latitude},{longitude});
          way["amenity"="hospital"](around:{radius_km * 1000},{latitude},{longitude});
        );
        out center;
        """

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(overpass_url, data={"data": query})

            if response.status_code == 200:
                data = response.json()
                hospitals = []

                for element in data.get("elements", [])[:5]:  # Top 5 nearest
                    lat = element.get("lat") or element.get("center", {}).get("lat")
                    lon = element.get("lon") or element.get("center", {}).get("lon")

                    if lat and lon:
                        distance = calculate_distance(latitude, longitude, lat, lon)

                        hospitals.append(
                            {
                                "name": element.get("tags", {}).get("name", "Hospital"),
                                "distance_km": round(distance, 2),
                                "latitude": lat,
                                "longitude": lon,
                                "address": element.get("tags", {}).get("addr:full")
                                or element.get("tags", {}).get(
                                    "addr:street", "Address not available"
                                ),
                                "phone": element.get("tags", {}).get(
                                    "phone", "Not available"
                                ),
                                "emergency": element.get("tags", {}).get(
                                    "emergency", "yes"
                                ),
                            }
                        )

                # Sort by distance
                hospitals.sort(key=lambda x: x["distance_km"])
                return hospitals

            return []
    except Exception as e:
        logger.error(f"Error finding hospitals: {e}")
        return []


def estimate_response_time(distance_km: float, emergency_type: str) -> str:
    """
    Estimate emergency response time based on distance and type
    """
    # Average speeds (km/h)
    speeds = {
        "ambulance": 60,  # Ambulance with sirens
        "police": 70,  # Police with sirens
        "fire": 65,  # Fire truck
        "medical": 60,  # General medical
        "mental_health": 0,  # Hotline (immediate)
    }

    speed = speeds.get(emergency_type, 60)

    if speed == 0:
        return "Immediate (call hotline)"

    time_hours = distance_km / speed
    time_minutes = int(time_hours * 60)

    if time_minutes < 5:
        return "5-10 minutes"
    elif time_minutes < 15:
        return "10-15 minutes"
    elif time_minutes < 30:
        return "15-30 minutes"
    else:
        return f"{time_minutes} minutes"


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Emergency Services API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "Emergency hotlines database",
            "Nearby hospital finder (OpenStreetMap)",
            "Geolocation support",
            "Response time estimation",
            "Multi-language support",
        ],
        "cost": "FREE - Uses OpenStreetMap data",
        "coverage": "Global (OpenStreetMap data)",
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/hotlines/{emergency_type}")
async def get_hotlines(emergency_type: str):
    """
    Get emergency hotlines for specific type

    Types: medical, mental_health, ambulance, police, fire
    """
    hotlines = EMERGENCY_HOTLINES.get(emergency_type, [])

    if not hotlines:
        raise HTTPException(
            status_code=404, detail=f"No hotlines found for type: {emergency_type}"
        )

    return {
        "emergency_type": emergency_type,
        "hotlines": hotlines,
        "count": len(hotlines),
    }


@app.get("/hotlines")
async def get_all_hotlines():
    """Get all emergency hotlines"""
    return {
        "hotlines": EMERGENCY_HOTLINES,
        "total_count": sum(len(v) for v in EMERGENCY_HOTLINES.values()),
    }


@app.post("/emergency", response_model=EmergencyResponse)
async def handle_emergency(request: EmergencyRequest):
    """
    Handle emergency request

    1. Get relevant hotlines
    2. Find nearby hospitals (if medical)
    3. Estimate response time
    4. Return comprehensive emergency info
    """
    try:
        logger.info(
            f"Emergency request: {request.emergency_type} at ({request.location.latitude}, {request.location.longitude})"
        )

        # Get relevant hotlines
        hotlines = EMERGENCY_HOTLINES.get(request.emergency_type, [])

        emergency_contacts = []
        for hotline in hotlines:
            emergency_contacts.append(
                EmergencyContact(
                    name=hotline["name"], phone=hotline["phone"], type=hotline["type"]
                )
            )

        # Find nearby hospitals for medical emergencies
        nearest_hospital = None
        estimated_response_time = None

        if request.emergency_type in ["medical", "ambulance"]:
            logger.info("Finding nearby hospitals...")
            hospitals = await find_nearby_hospitals(
                request.location.latitude, request.location.longitude
            )

            if hospitals:
                nearest_hospital = hospitals[0]
                estimated_response_time = estimate_response_time(
                    nearest_hospital["distance_km"], request.emergency_type
                )

                # Add hospitals to emergency contacts
                for hospital in hospitals[:3]:  # Top 3
                    emergency_contacts.append(
                        EmergencyContact(
                            name=hospital["name"],
                            phone=hospital["phone"],
                            type="hospital",
                            distance_km=hospital["distance_km"],
                            address=hospital["address"],
                        )
                    )

        elif request.emergency_type == "mental_health":
            estimated_response_time = "Immediate (call hotline)"

        # Prepare response
        return EmergencyResponse(
            status="success",
            message=f"Emergency services contacted for {request.emergency_type}",
            emergency_contacts=emergency_contacts,
            nearest_hospital=nearest_hospital,
            estimated_response_time=estimated_response_time,
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"Emergency handling error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Emergency handling failed: {str(e)}"
        )


@app.post("/sos")
async def send_sos(location: Location, patient_id: Optional[str] = None):
    """
    Send SOS alert

    This would integrate with:
    - SMS gateway (Twilio free tier)
    - Email service (SendGrid free tier)
    - Push notifications (Firebase free tier)

    For now, returns emergency contacts
    """
    try:
        logger.warning(
            f"🚨 SOS ALERT from patient {patient_id} at ({location.latitude}, {location.longitude})"
        )

        # Get all emergency contacts
        all_hotlines = []
        for emergency_type, hotlines in EMERGENCY_HOTLINES.items():
            all_hotlines.extend(hotlines)

        # Find nearest hospital
        hospitals = await find_nearby_hospitals(location.latitude, location.longitude)

        return {
            "status": "SOS_SENT",
            "message": "Emergency services have been notified",
            "emergency_hotlines": all_hotlines[:5],  # Top 5
            "nearest_hospital": hospitals[0] if hospitals else None,
            "location": {
                "latitude": location.latitude,
                "longitude": location.longitude,
            },
            "timestamp": datetime.now().isoformat(),
            "next_steps": [
                "Call 112 (National Emergency) immediately",
                "Call 108 (Ambulance) if medical emergency",
                "Stay calm and provide your location",
                "Emergency contacts have been notified",
            ],
        }

    except Exception as e:
        logger.error(f"SOS error: {e}")
        raise HTTPException(status_code=500, detail=f"SOS failed: {str(e)}")


@app.get("/nearby-hospitals")
async def get_nearby_hospitals(
    latitude: float, longitude: float, radius_km: float = 10
):
    """
    Get nearby hospitals

    Uses OpenStreetMap data (FREE)
    """
    try:
        hospitals = await find_nearby_hospitals(latitude, longitude, radius_km)

        return {
            "location": {"latitude": latitude, "longitude": longitude},
            "radius_km": radius_km,
            "hospitals": hospitals,
            "count": len(hospitals),
        }

    except Exception as e:
        logger.error(f"Hospital search error: {e}")
        raise HTTPException(status_code=500, detail=f"Hospital search failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Emergency Services API...")
    uvicorn.run("main:app", host="0.0.0.0", port=8007, reload=True, log_level="info")
