import { motion } from "motion/react";
import { MapPin, Phone, Clock, Navigation, Star, List, Grid, AlertCircle, Loader, Compass, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, StandaloneSearchBox } from '@react-google-maps/api';
import { toast } from "sonner";
import { useTranslation } from "../../lib/i18n";

interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  rating?: number;
  distance?: number;
  feature?: string;
  hours?: string;
  type?: string;
  specialties?: string[];
  calculated_dist?: number;
  display_dist?: string;
}

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

// Helper for client-side distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function NearbyHospitalsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"list" | "grid">("list");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES
  });

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const onSearchLoad = (ref: google.maps.places.SearchBox) => {
    searchBoxRef.current = ref;
  };

  const onPlacesChanged = () => {
    const places = searchBoxRef.current?.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      if (place.geometry?.location) {
        const newLoc = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setSearchLocation(newLoc);
        if (map) {
          map.panTo(newLoc);
          map.setZoom(15);
        }
      }
    }
  };

  // Fetch hospitals from backend
  const {
    data: hospitalsData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["hospitals", userLocation?.lat, userLocation?.lng, searchLocation?.lat, searchLocation?.lng],
    queryFn: async () => {
      const params = new URLSearchParams();
      // If we have search location, prioritize it for the backend query
      const loc = searchLocation || userLocation;
      if (loc) {
        params.append("lat", loc.lat.toString());
        params.append("lon", loc.lng.toString());
      }
      params.append("distance_km", "100"); // Search wider radius
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/hospitals?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load hospitals");
      return response.json();
    },
    enabled: true
  });

  // Client-side enrichment and sorting
  const hospitals = (hospitalsData as Hospital[]).map(h => {
    const origin = searchLocation || userLocation || { lat: 19.0760, lng: 72.8777 };
    const dist = calculateDistance(origin.lat, origin.lng, h.latitude, h.longitude);
    return {
      ...h,
      calculated_dist: dist,
      display_dist: dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`
    };
  }).sort((a, b) => (a.calculated_dist || 0) - (b.calculated_dist || 0));

  const handleEnableLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLoc);
          setSearchLocation(null); // Clear search override
          if (map) map.panTo(newLoc);
        },
        (error) => {
          console.error("Location access denied:", error);
          toast.error(t('patient.hospitals.location_denied', "Location access denied. Showing default area."));
          // Default to Mumbai if denied
          setUserLocation({ lat: 19.0760, lng: 72.8777 });
        },
        { enableHighAccuracy: true }
      );
    }
  }, [t]);

  // Auto-detect location on mount
  useEffect(() => {
    handleEnableLocation();
  }, [handleEnableLocation]);

  const handleGetDirections = (h: Hospital) => {
    const destination = encodeURIComponent(h.address || h.name);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
  };

  if (isLoading && !isLoaded) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#0D9488] animate-spin mx-auto mb-4" />
          <p className="text-[#0F172A]">{t('patient.hospitals.loading', "Loading nearby hospitals...")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">
            {t('patient.hospitals.error_title', "Unable to Load Hospitals")}
          </h2>
          <p className="text-[#64748B] mb-6">
            {t('patient.hospitals.error_desc', "Error loading hospital data. Please try again later.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F8FAFC]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
              {t('patient.hospitals.title', "Nearby Hospitals & Clinics")}
            </h1>
            <p className="text-[#64748B]">
              {t('patient.hospitals.desc', "Find hospitals and diagnostic centers near you for physical consultation")}
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="w-full md:w-96 relative">
            {isLoaded && (
              <StandaloneSearchBox
                onLoad={onSearchLoad}
                onPlacesChanged={onPlacesChanged}
              >
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0D9488] transition-colors" />
                  <input
                    type="text"
                    placeholder={t('patient.hospitals.search_placeholder', "Search address or city...")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/10 outline-none transition-all shadow-sm bg-white"
                  />
                </div>
              </StandaloneSearchBox>
            )}
          </div>
        </motion.div>

        <div className="mb-8 relative">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button
              className="bg-white hover:bg-gray-50 text-[#0F172A] !py-1 !px-3 h-9 text-xs rounded-xl shadow-lg border border-gray-100 font-semibold"
              onClick={handleEnableLocation}
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5 text-[#0D9488]" />{" "}
              {userLocation ? t('patient.hospitals.using_gps', "My Location") : t('patient.hospitals.enable_gps', "Use GPS")}
            </Button>
            <Button
              variant="outline"
              className="bg-white/90 backdrop-blur-md hover:bg-white text-gray-700 !py-1 !px-3 h-9 text-xs rounded-xl border-white shadow-lg"
              onClick={() => {
                setUserLocation(null);
                setSearchLocation(null);
                if (map) {
                  map.setZoom(12);
                  map.panTo({ lat: 19.0760, lng: 72.8777 });
                }
              }}
            >
              <Compass className="w-3.5 h-3.5 mr-1.5 text-gray-500" /> {t('patient.hospitals.reset_map', "Reset")}
            </Button>
          </div>

          <Card className="h-[500px] w-full bg-slate-50 border-4 border-white relative overflow-hidden rounded-[2.5rem] shadow-2xl">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={searchLocation || userLocation || { lat: 19.0760, lng: 72.8777 }}
                zoom={searchLocation ? 15 : 12}
                onLoad={m => setMap(m)}
                onUnmount={onUnmount}
                options={{
                  styles: mapStyles,
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true
                }}
              >
                {(userLocation || searchLocation) && (
                  <Marker 
                    position={searchLocation || userLocation!} 
                    icon={{
                      url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    }}
                    title={t('patient.hospitals.you_are_here', "Current View Point")}
                  />
                )}
                {hospitals.map((h: Hospital) => (
                  <Marker
                    key={h.id}
                    position={{ lat: h.latitude, lng: h.longitude }}
                    onClick={() => setSelectedHospital(h)}
                    title={h.name}
                  />
                ))}
                {selectedHospital && (
                  <InfoWindow
                    position={{ lat: selectedHospital.latitude, lng: selectedHospital.longitude }}
                    onCloseClick={() => setSelectedHospital(null)}
                  >
                    <div className="p-2 min-w-[220px]">
                      <h4 className="font-bold text-sm text-[#0F172A]">{selectedHospital.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-1">{selectedHospital.address}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs font-bold text-[#0D9488]">{selectedHospital.display_dist}</span>
                        <Button size="sm" className="h-7 text-[11px] px-3 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg" onClick={() => handleGetDirections(selectedHospital)}>
                          {t('common.directions', "Directions")}
                        </Button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-gray-50">
                <Loader className="w-10 h-10 animate-spin mb-3 text-[#0D9488]" />
                <p className="font-medium tracking-wide uppercase text-xs">{t('patient.hospitals.loading_map', "Initializing Neural Map...")}</p>
              </div>
            )}
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse"></span>
            <p className="text-sm font-semibold text-[#0F172A]">
              {t('patient.hospitals.results_found', { defaultValue: "{{count}} hospitals near your view", count: hospitals.length })}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-200/50 backdrop-blur-sm rounded-xl p-1 border border-gray-100">
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-white shadow-md text-[#0D9488]" : "text-gray-500 hover:text-gray-700"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition-all ${view === "grid" ? "bg-white shadow-md text-[#0D9488]" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hospital Cards */}
        <div
          className={
            view === "grid"
              ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {hospitals.map((h, i: number) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card
                className={`p-6 border border-white/60 bg-white/70 backdrop-blur-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group rounded-[2.2rem] ${view === "list" ? "flex items-center gap-8" : ""}`}
              >
                <div className={`${view === "list" ? "flex-1" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[#0F172A] text-xl group-hover:text-[#0D9488] transition-colors">
                        {h.name}
                      </h3>
                      <p className="text-sm text-[#64748B] flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0D9488]" /> {h.address}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-black text-[#0D9488] whitespace-nowrap">
                        {h.display_dist}
                      </span>
                      <div className="flex items-center gap-1 text-[#F59E0B]">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-bold">{h.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {h.specialties?.map((s: string) => (
                      <span
                        key={s}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 text-[#64748B] font-semibold uppercase tracking-wider"
                      >
                        {s}
                      </span>
                    ))}
                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9] font-bold uppercase tracking-wider">
                      {h.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm font-medium text-[#64748B]">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0D9488]" /> {h.hours}
                    </span>
                    {h.phone && (
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#0D9488]" /> {h.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`${view === "list" ? "flex flex-col gap-3 min-w-[140px]" : "grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-100"}`}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-2xl border-gray-200 text-[#0F172A] hover:bg-gray-50 font-bold h-11"
                    onClick={() => h.phone && (window.location.href = `tel:${h.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" /> {t('common.call', "Call")}
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-2xl bg-gradient-to-r from-[#0D9488] to-[#0F766E] hover:from-[#0F766E] hover:to-[#0D9488] text-white font-bold shadow-lg shadow-[#0D9488]/20 h-11"
                    onClick={() => handleGetDirections(h)}
                  >
                    <Navigation className="w-4 h-4 mr-2" /> {t('common.go', "Go")}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const mapStyles = [
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi.medical",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "stylers": [{ "visibility": "off" }]
  }
];
