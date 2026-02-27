// src/screens/RouteOptimizer.js
// Install: expo install react-native-maps
// Install: npm install react-native-toast-message

import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Dimensions, FlatList,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Toast from "react-native-toast-message";
import { routeAPI } from "../services/api";

const { width: SW } = Dimensions.get("window");

const ROUTE_COLORS = [
  "#667eea", "#22c55e", "#f59e0b", "#3b82f6",
  "#ef4444", "#38a169", "#ecc94b", "#805ad5",
];

const StatCard = ({ value, label, color = "#667eea" }) => (
  <View style={s.statCard}>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const RouteOptimizer = () => {
  const mapRef = useRef(null);

  const [pickups, setPickups] = useState([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(null);

  const depot = { lat: 16.5062, lon: 81.5217, name: "NGO Depot" };

  useEffect(() => {
    fetchPickups();
  }, []);

  // Auto-zoom to routes when optimized
  useEffect(() => {
    if (optimizedRoutes && mapRef.current) {
      const allCoords = [
        { latitude: depot.lat, longitude: depot.lon },
        ...optimizedRoutes.routes.flatMap((r) =>
          r.pickups
            .filter((p) => p.location?.lat && p.location?.lon)
            .map((p) => ({ latitude: p.location.lat, longitude: p.location.lon }))
        ),
      ];
      if (allCoords.length > 1) {
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      }
    }
  }, [optimizedRoutes]);

  const fetchPickups = async () => {
    try {
      const response = await routeAPI.getMyAssignedPickups();
      setPickups(response.data.pickups || []);
      if (response.data.pickups?.length > 0) {
        Toast.show({ type: "success", text1: `Found ${response.data.pickups.length} assigned pickups` });
      }
    } catch (error) {
      console.error("Error fetching pickups:", error);
      Toast.show({ type: "error", text1: "Failed to fetch assigned pickups" });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (pickups.length === 0) {
      Toast.show({ type: "warning", text1: "No pickups to optimize" });
      return;
    }
    setLoading(true);
    try {
      const response = await routeAPI.optimizeRoutes({
        depot,
        pickupIds: pickups.map((p) => p.id),
        vehicleType: "medium_car",
        maxPickupsPerRoute: 10,
      });
      setOptimizedRoutes(response.data);
      setSelectedRouteIdx(0);
      Toast.show({ type: "success", text1: "✅ Routes optimized!" });
    } catch (error) {
      console.error("Optimization error:", error);
      Toast.show({ type: "error", text1: "Failed to optimize routes" });
    } finally {
      setLoading(false);
    }
  };

  const selectRoute = (idx) => {
    setSelectedRouteIdx(idx);
    if (mapRef.current && optimizedRoutes?.routes[idx]) {
      const route = optimizedRoutes.routes[idx];
      const coords = [
        { latitude: depot.lat, longitude: depot.lon },
        ...route.pickups
          .filter((p) => p.location?.lat && p.location?.lon)
          .map((p) => ({ latitude: p.location.lat, longitude: p.location.lon })),
      ];
      if (coords.length > 1) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
          animated: true,
        });
      }
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.fullCenter}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={s.loadingText}>Loading route optimizer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>🚗 Smart Route Optimizer</Text>
          <Text style={s.headerSub}>AI-powered pickup route planning with CO₂ optimization</Text>
        </View>

        {/* Pickup count + Button */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Assigned Pickups: {pickups.length}</Text>
          <TouchableOpacity
            style={[s.optimizeBtn, (loading || pickups.length === 0) && s.optimizeBtnDisabled]}
            onPress={handleOptimize}
            disabled={loading || pickups.length === 0}
          >
            {loading ? (
              <View style={s.btnRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.optimizeBtnText}> Optimizing...</Text>
              </View>
            ) : (
              <Text style={s.optimizeBtnText}>🤖 Optimize Routes with AI</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {optimizedRoutes && (
          <>
            {/* Summary Stats */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>📊 Route Summary</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
                <StatCard value={optimizedRoutes.summary.totalRoutes} label="Routes" color="#667eea" />
                <StatCard value={`${optimizedRoutes.summary.totalDistance}km`} label="Distance" color="#3b82f6" />
                <StatCard value={`${optimizedRoutes.summary.totalCO2}kg`} label="CO₂" color="#f59e0b" />
                <StatCard value={`${optimizedRoutes.summary.estimatedTotalTime}min`} label="Est. Time" color="#22c55e" />
              </ScrollView>
            </View>

            {/* Environmental Savings */}
            <View style={s.greenCard}>
              <Text style={s.greenCardTitle}>🌍 Environmental Savings</Text>
              <View style={s.greenStatsRow}>
                <View style={s.greenStat}>
                  <Text style={s.greenStatValue}>{optimizedRoutes.summary.optimization.distanceSavedKm}km</Text>
                  <Text style={s.greenStatLabel}>Distance Saved</Text>
                </View>
                <View style={s.greenStatDivider} />
                <View style={s.greenStat}>
                  <Text style={s.greenStatValue}>{optimizedRoutes.summary.optimization.co2SavedKg}kg</Text>
                  <Text style={s.greenStatLabel}>CO₂ Saved</Text>
                </View>
                <View style={s.greenStatDivider} />
                <View style={s.greenStat}>
                  <Text style={s.greenStatValue}>{optimizedRoutes.summary.optimization.percentageSaved}%</Text>
                  <Text style={s.greenStatLabel}>Efficiency</Text>
                </View>
              </View>
            </View>

            {/* Map */}
            <View style={s.mapCard}>
              <Text style={s.sectionTitle}>🗺️ Route Map</Text>
              <MapView
                ref={mapRef}
                style={s.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: depot.lat,
                  longitude: depot.lon,
                  latitudeDelta: 0.5,
                  longitudeDelta: 0.5,
                }}
              >
                {/* Depot marker */}
                <Marker
                  coordinate={{ latitude: depot.lat, longitude: depot.lon }}
                  title={depot.name}
                >
                  <View style={s.depotMarker}>
                    <Text style={s.depotMarkerText}>🏢</Text>
                  </View>
                </Marker>

                {/* Route polylines */}
                {optimizedRoutes.routes.map((route, idx) => {
                  const coords = [
                    { latitude: depot.lat, longitude: depot.lon },
                    ...route.pickups
                      .filter((p) => p.location?.lat && p.location?.lon)
                      .map((p) => ({ latitude: p.location.lat, longitude: p.location.lon })),
                  ];
                  const isSelected = selectedRouteIdx === null || selectedRouteIdx === idx;
                  return (
                    <Polyline
                      key={`route-${idx}`}
                      coordinates={coords}
                      strokeColor={ROUTE_COLORS[idx % ROUTE_COLORS.length]}
                      strokeWidth={isSelected ? 5 : 2}
                      lineDashPattern={selectedRouteIdx === idx ? undefined : [6, 8]}
                    />
                  );
                })}

                {/* Selected route pickup markers */}
                {selectedRouteIdx !== null &&
                  optimizedRoutes.routes[selectedRouteIdx]?.pickups
                    .filter((p) => p.location?.lat && p.location?.lon)
                    .map((pickup, i) => (
                      <Marker
                        key={`pickup-${i}`}
                        coordinate={{ latitude: pickup.location.lat, longitude: pickup.location.lon }}
                        title={pickup.donorName}
                        description={`${pickup.itemTitle} (${pickup.quantity} ${pickup.unit || "items"})`}
                      >
                        <View style={[s.pickupMarker, { backgroundColor: ROUTE_COLORS[selectedRouteIdx % ROUTE_COLORS.length] }]}>
                          <Text style={s.pickupMarkerText}>{i + 1}</Text>
                        </View>
                      </Marker>
                    ))}
              </MapView>
            </View>

            {/* Route Cards */}
            <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginTop: 8 }]}>
              Optimized Routes
            </Text>
            {optimizedRoutes.routes.map((route, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  s.routeCard,
                  { borderLeftColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] },
                  selectedRouteIdx === idx && s.routeCardSelected,
                ]}
                onPress={() => selectRoute(idx)}
                activeOpacity={0.8}
              >
                <Text style={s.routeCardTitle}>Route {route.routeNumber}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.routeInfoRow}>
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>Stops</Text>
                    <Text style={s.routeInfoValue}>{route.stops}</Text>
                  </View>
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>Distance</Text>
                    <Text style={s.routeInfoValue}>{route.totalDistance}km</Text>
                  </View>
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>Time</Text>
                    <Text style={s.routeInfoValue}>{route.estimatedTime}min</Text>
                  </View>
                  <View style={s.routeInfoItem}>
                    <Text style={s.routeInfoLabel}>CO₂</Text>
                    <Text style={s.routeInfoValue}>{route.emissions?.co2EmittedKg}kg</Text>
                  </View>
                </ScrollView>

                <View style={s.pickupsList}>
                  {route.pickups.map((pickup, i) => (
                    <View key={i} style={s.pickupItem}>
                      <View style={[s.pickupNum, { backgroundColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] }]}>
                        <Text style={s.pickupNumText}>{i + 1}</Text>
                      </View>
                      <Text style={s.pickupInfo} numberOfLines={1}>
                        {pickup.donorName} — {pickup.itemTitle} ({pickup.quantity} {pickup.unit || "items"})
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  fullCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  loadingText: { color: "#64748b", marginTop: 12, fontSize: 14 },

  header: {
    backgroundColor: "#667eea",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#fff", marginBottom: 4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    margin: 14,
    marginBottom: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 10 },

  optimizeBtn: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  optimizeBtnDisabled: { opacity: 0.5 },
  optimizeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnRow: { flexDirection: "row", alignItems: "center" },

  statsRow: { gap: 10, paddingVertical: 4 },
  statCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    minWidth: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#94a3b8", marginTop: 3 },

  greenCard: {
    backgroundColor: "#667eea",
    borderRadius: 16,
    padding: 16,
    margin: 14,
    marginBottom: 0,
  },
  greenCardTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginBottom: 14 },
  greenStatsRow: { flexDirection: "row", alignItems: "center" },
  greenStat: { flex: 1, alignItems: "center" },
  greenStatValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
  greenStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 3 },
  greenStatDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.3)" },

  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    margin: 14,
    marginBottom: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  map: { height: 380, borderRadius: 12, overflow: "hidden" },

  depotMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 4,
  },
  depotMarkerText: { fontSize: 18 },
  pickupMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
  },
  pickupMarkerText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  routeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  routeCardSelected: {
    borderColor: "#667eea",
    borderWidth: 2,
    elevation: 3,
  },
  routeCardTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 10 },
  routeInfoRow: { gap: 12, marginBottom: 12 },
  routeInfoItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: "center",
  },
  routeInfoLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "500" },
  routeInfoValue: { fontSize: 15, fontWeight: "800", color: "#1e293b", marginTop: 2 },

  pickupsList: { gap: 6 },
  pickupItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  pickupNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pickupNumText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  pickupInfo: { flex: 1, fontSize: 13, color: "#475569" },
});

export default RouteOptimizer;