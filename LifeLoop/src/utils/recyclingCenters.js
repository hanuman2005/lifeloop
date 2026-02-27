// src/utils/recyclingCenters.js — React Native (Expo)
// Uses expo-location instead of navigator.geolocation (web only)
import * as Location from "expo-location";

// ─── Material helpers ─────────────────────────────────────────────────────
const getMaterialSearchQuery = (material) => {
  const map = {
    Electronic: "electronics recycling e-waste",
    Plastic: "plastic recycling",
    Paper: "paper cardboard recycling",
    Glass: "glass recycling",
    Metal: "metal scrap recycling",
    Textile: "textile recycling clothing donation",
    Organic: "composting facility organic waste",
    Wood: "wood recycling disposal",
  };
  return map[material] || "recycling center";
};

export const getMaterialIcon = (material) => {
  const map = {
    Electronic: "💻",
    Plastic: "♻️",
    Paper: "📄",
    Glass: "🍾",
    Metal: "🔩",
    Textile: "👕",
    Organic: "🌱",
    Wood: "🪵",
  };
  return map[material] || "♻️";
};

// ─── Distance (Haversine) ─────────────────────────────────────────────────
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

// ─── Get user location using expo-location ────────────────────────────────
export const getUserLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude };
};

// ─── Fetch recycling centers from OpenStreetMap (free, no API key) ────────
export const fetchNearbyCenters = async (material, userLocation) => {
  const { lat, lon } = userLocation;
  const query = getMaterialSearchQuery(material);

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=json` +
    `&q=${encodeURIComponent(query)}` +
    `&lat=${lat}&lon=${lon}` +
    `&addressdetails=1` +
    `&limit=10` +
    `&bounded=1` +
    `&viewbox=${lon - 0.5},${lat - 0.5},${lon + 0.5},${lat + 0.5}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "ShareTogether-WasteAnalyzer/1.0" },
  });

  if (!response.ok) throw new Error("Failed to fetch recycling centers");

  const data = await response.json();

  return data
    .map((place) => {
      const pLat = parseFloat(place.lat);
      const pLon = parseFloat(place.lon);
      const distance = calculateDistance(lat, lon, pLat, pLon);
      return {
        id: place.place_id,
        name: place.display_name.split(",")[0] || "Recycling Center",
        fullAddress: place.display_name,
        lat: pLat,
        lon: pLon,
        distance,
        distanceText: formatDistance(distance),
        type: place.type,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLon}`,
      };
    })
    .filter((c) => c.distance <= 50)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
};

export const fetchGenericCenters = (userLocation) =>
  fetchNearbyCenters("Plastic", userLocation);

export const getDistanceToCenter = (userLocation, centerLocation) => {
  const d = calculateDistance(
    userLocation.lat,
    userLocation.lon,
    centerLocation.lat,
    centerLocation.lon,
  );
  return formatDistance(d);
};
