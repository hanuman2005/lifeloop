// src/screens/DigitalTwin.js
// Install: expo install react-native-maps
// Install: npm install socket.io-client

import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, TouchableOpacity, Dimensions,
} from "react-native";
import MapView, { Heatmap, Polyline, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { io } from "socket.io-client";
import { impactAPI } from "../services/api";
import Toast from "react-native-toast-message";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";
const { width: SW, height: SH } = Dimensions.get("window");

const DigitalTwinScreen = () => {
  const mapRef = useRef(null);
  const socketRef = useRef(null);

  const [data, setData] = useState({ points: [], flows: [] });
  const [loading, setLoading] = useState(true);
  const [pulseMarkers, setPulseMarkers] = useState([]);

  // Computed stats
  const totalDonations = data.points.reduce((s, p) => s + (p.count || 0), 0);
  const totalCO2 = data.points.reduce((s, p) => s + (p.impact?.co2SavedKg || 0), 0);

  useEffect(() => {
    fetchData();
    setupSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await impactAPI.getDigitalTwin();
      if (response.data?.data) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch digital twin data:", error);
      Toast.show({ type: "error", text1: "Failed to load map data" });
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    try {
      socketRef.current = io(API_URL, { transports: ["websocket"] });
      socketRef.current.on("digitalTwin.update", (update) => {
        if (update?.location) {
          const marker = {
            id: Date.now(),
            coordinate: {
              latitude: update.location[1],
              longitude: update.location[0],
            },
          };
          setPulseMarkers((prev) => [...prev, marker]);
          setTimeout(() => {
            setPulseMarkers((prev) => prev.filter((m) => m.id !== marker.id));
          }, 5000);
        }
      });
    } catch (e) {
      console.warn("Socket setup failed:", e);
    }
  };

  // Build heatmap points for react-native-maps
  const heatmapPoints = data.points
    .filter((p) => p.lat && p.lng)
    .map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
      weight: Math.min((p.count || 1) / 10, 1),
    }));

  // Initial region centered on India
  const initialRegion = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 20,
    longitudeDelta: 20,
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🌍 Digital Twin Impact</Text>
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statChipValue}>{totalDonations}</Text>
            <Text style={s.statChipLabel}>Donations</Text>
          </View>
          <View style={s.statChipDivider} />
          <View style={s.statChip}>
            <Text style={s.statChipValue}>{totalCO2.toFixed(1)}kg</Text>
            <Text style={s.statChipLabel}>CO₂ Saved</Text>
          </View>
          <View style={s.statChipDivider} />
          <View style={s.statChip}>
            <Text style={s.statChipValue}>{data.flows?.length || 0}</Text>
            <Text style={s.statChipLabel}>Active Flows</Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={s.mapWrap}>
        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={s.loadingText}>Loading map data...</Text>
          </View>
        )}

        <MapView
          ref={mapRef}
          style={s.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          customMapStyle={darkMapStyle}
          showsUserLocation={false}
          showsCompass
        >
          {/* Heatmap layer */}
          {heatmapPoints.length > 0 && (
            <Heatmap
              points={heatmapPoints}
              opacity={0.8}
              radius={40}
              gradient={{
                colors: ["#00f2fe", "#4facfe", "#43e97b", "#f9ca24", "#f0932b", "#eb4d4b"],
                startPoints: [0.01, 0.25, 0.5, 0.75, 0.9, 1.0],
                colorMapSize: 256,
              }}
            />
          )}

          {/* Flow lines */}
          {data.flows?.map((flow, idx) =>
            flow.from && flow.to ? (
              <Polyline
                key={`flow-${idx}`}
                coordinates={[
                  { latitude: flow.from[1], longitude: flow.from[0] },
                  { latitude: flow.to[1], longitude: flow.to[0] },
                ]}
                strokeColor="rgba(102,126,234,0.7)"
                strokeWidth={2}
              />
            ) : null
          )}

          {/* Live pulse markers from socket */}
          {pulseMarkers.map((marker) => (
            <Marker key={marker.id} coordinate={marker.coordinate}>
              <View style={s.pulseMarker}>
                <View style={s.pulseInner} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Refresh button */}
        <TouchableOpacity style={s.refreshBtn} onPress={fetchData}>
          <Text style={s.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Impact points list */}
      {data.points.length > 0 && (
        <View style={s.pointsWrap}>
          <Text style={s.pointsTitle}>📍 Impact Hotspots</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pointsList}>
            {data.points.slice(0, 10).map((point, idx) => (
              <TouchableOpacity
                key={idx}
                style={s.pointChip}
                onPress={() => {
                  if (mapRef.current && point.lat && point.lng) {
                    mapRef.current.animateToRegion({
                      latitude: point.lat,
                      longitude: point.lng,
                      latitudeDelta: 2,
                      longitudeDelta: 2,
                    }, 800);
                  }
                }}
              >
                <Text style={s.pointChipCount}>{point.count || 0}</Text>
                <Text style={s.pointChipLabel}>donations</Text>
                <Text style={s.pointChipCO2}>{(point.impact?.co2SavedKg || 0).toFixed(1)}kg CO₂</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

// Google Maps dark style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0f1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e2d45" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#131c2e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#131c2e" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#1e2d45" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1a2436" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
];

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },

  header: {
    backgroundColor: "#131c2e",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#f1f5f9", marginBottom: 10 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  statChip: { flex: 1, alignItems: "center" },
  statChipValue: { fontSize: 18, fontWeight: "800", color: "#4ade80" },
  statChipLabel: { fontSize: 11, color: "#64748b", marginTop: 1 },
  statChipDivider: { width: 1, height: 30, backgroundColor: "#1e2d45" },

  mapWrap: { flex: 1, position: "relative" },
  map: { flex: 1 },

  loadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(10,15,30,0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: { color: "#94a3b8", marginTop: 10, fontSize: 14 },

  pulseMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(74,222,128,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4ade80",
  },
  pulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ade80",
  },

  refreshBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#131c2e",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  refreshBtnText: { fontSize: 20 },

  pointsWrap: {
    backgroundColor: "#131c2e",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
  },
  pointsTitle: { fontSize: 13, fontWeight: "700", color: "#94a3b8", paddingHorizontal: 14, marginBottom: 8 },
  pointsList: { paddingHorizontal: 14, gap: 8 },
  pointChip: {
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1,
    borderColor: "#334155",
  },
  pointChipCount: { fontSize: 20, fontWeight: "800", color: "#4ade80" },
  pointChipLabel: { fontSize: 10, color: "#64748b" },
  pointChipCO2: { fontSize: 11, color: "#60a5fa", marginTop: 3, fontWeight: "600" },
});

export default DigitalTwinScreen;