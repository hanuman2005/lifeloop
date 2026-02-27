// src/screens/NearbyMapScreen.js
// Priority 2 — Nearest Recycler/Donation Map
// No Google Maps API needed — uses built-in MapView with seeded data

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Dimensions,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const { width: SW } = Dimensions.get("window");
const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

const TYPE_CONFIG = {
  recycler: { icon: "♻️", label: "Recycler", color: "#3b82f6" },
  ewaste: { icon: "💻", label: "E-Waste Center", color: "#7c3aed" },
  donation: { icon: "🎁", label: "Donation Center", color: "#ec4899" },
  compost: { icon: "🌿", label: "Compost Center", color: "#16a34a" },
  kabadiwala: { icon: "🛺", label: "Kabadiwala", color: "#f59e0b" },
  pickup: { icon: "🚛", label: "Pickup Service", color: "#06b6d4" },
};

const FILTERS = [
  { id: "all", label: "All", icon: "📍" },
  { id: "recycler", label: "Recycling", icon: "♻️" },
  { id: "ewaste", label: "E-Waste", icon: "💻" },
  { id: "donation", label: "Donation", icon: "🎁" },
  { id: "kabadiwala", label: "Kabadiwala", icon: "🛺" },
  { id: "compost", label: "Compost", icon: "🌿" },
];

export default function NearbyMapScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const suggestedCategory = route.params?.category; // passed from WasteAnalyzer

  const [centers, setCenters] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [location, setLocation] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getLocationAndLoad();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [centers, filter, search]);

  const getLocationAndLoad = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 16.4329,
        lng = 81.6918; // default: Narasapur

      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      setLocation({ lat, lng });
      await loadCenters(lat, lng);
      await loadPrices();
    } catch (err) {
      console.error("Location error:", err.message);
      await loadCenters(16.4329, 81.6918);
    }
  };

  const loadCenters = async (lat, lng) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(
        `${API}/api/map/nearby?lat=${lat}&lng=${lng}&radius=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json.success) {
        setCenters(json.data);
        setFiltered(json.data);
      }
    } catch (err) {
      console.error("loadCenters error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPrices = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API}/api/map/prices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setPrices(json.prices);
    } catch (err) {}
  };

  const applyFilter = () => {
    let result = [...centers];
    if (filter !== "all") result = result.filter((c) => c.type === filter);
    if (search.trim())
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.city.toLowerCase().includes(search.toLowerCase()),
      );
    setFiltered(result);
  };

  const callCenter = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openMaps = (center) => {
    const [lng, lat] = center.coordinates;
    Linking.openURL(
      `https://maps.google.com/?q=${lat},${lng}&query=${encodeURIComponent(center.name)}`,
    );
  };

  const schedulePickup = (center) => {
    nav.navigate("PickupSchedule", { center });
  };

  if (loading)
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={s.loadingText}>Finding centers near you...</Text>
      </View>
    );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Nearby Centers</Text>
          <Text style={s.headerSub}>{filtered.length} centers found</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or city..."
          placeholderTextColor="#7f8c8d"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category suggestion banner */}
      {suggestedCategory && (
        <View style={s.suggestionBanner}>
          <Text style={s.suggestionText}>
            💡 Showing centers that accept{" "}
            <Text style={s.suggestionBold}>{suggestedCategory}</Text>
          </Text>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[s.filterChip, filter === f.id && s.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={s.filterIcon}>{f.icon}</Text>
            <Text
              style={[s.filterLabel, filter === f.id && s.filterLabelActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Location info */}
        {location && (
          <View style={s.locationInfo}>
            <Text style={s.locationIcon}>📍</Text>
            <Text style={s.locationText}>
              Showing centers within 50km of your location
            </Text>
          </View>
        )}

        {/* Centers list */}
        {filtered.length > 0 ? (
          filtered.map((center, i) => {
            const cfg = TYPE_CONFIG[center.type] || TYPE_CONFIG.recycler;
            const isSelected = selected === i;

            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.centerCard,
                  isSelected && s.centerCardSelected,
                  { borderColor: isSelected ? cfg.color : "#1a2744" },
                ]}
                onPress={() => setSelected(isSelected ? null : i)}
                activeOpacity={0.8}
              >
                {/* Card header */}
                <View style={s.centerHeader}>
                  <View
                    style={[s.typeIcon, { backgroundColor: cfg.color + "22" }]}
                  >
                    <Text style={s.typeIconText}>{cfg.icon}</Text>
                  </View>
                  <View style={s.centerInfo}>
                    <View style={s.centerNameRow}>
                      <Text style={s.centerName}>{center.name}</Text>
                      {center.isVerified && (
                        <Text style={s.verifiedBadge}>✓ Verified</Text>
                      )}
                    </View>
                    <Text style={s.centerType}>
                      {cfg.label} · {center.city}
                    </Text>
                    <Text style={s.centerAddress}>{center.address}</Text>
                  </View>
                  <View style={s.distanceBadge}>
                    <Text style={s.distanceText}>{center.distance}km</Text>
                  </View>
                </View>

                {/* Accepts chips */}
                <View style={s.acceptsRow}>
                  {center.accepts?.map((a, j) => (
                    <View
                      key={j}
                      style={[
                        s.acceptChip,
                        suggestedCategory === a && s.acceptChipHighlight,
                      ]}
                    >
                      <Text
                        style={[
                          s.acceptText,
                          suggestedCategory === a && s.acceptTextHighlight,
                        ]}
                      >
                        {a}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Hours */}
                <View style={s.hoursRow}>
                  <Text style={s.hoursIcon}>🕐</Text>
                  <Text style={s.hoursText}>
                    {center.hours || "Call for hours"}
                  </Text>
                </View>

                {/* Prices if kabadiwala */}
                {center.type === "kabadiwala" && center.pricePerKg && (
                  <View style={s.pricesRow}>
                    {Object.entries(center.pricePerKg).map(
                      ([mat, price], j) => (
                        <View key={j} style={s.priceChip}>
                          <Text style={s.priceText}>
                            {mat}: ₹{price}/kg
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                )}

                {/* Expanded actions */}
                {isSelected && (
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: cfg.color }]}
                      onPress={() => callCenter(center.phone)}
                    >
                      <Text style={s.actionBtnText}>📞 Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.actionBtnOutline}
                      onPress={() => openMaps(center)}
                    >
                      <Text
                        style={[s.actionBtnOutlineText, { color: cfg.color }]}
                      >
                        🗺️ Directions
                      </Text>
                    </TouchableOpacity>
                    {(center.type === "kabadiwala" ||
                      center.type === "pickup") && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: "#27ae60" }]}
                        onPress={() => schedulePickup(center)}
                      >
                        <Text style={s.actionBtnText}>📅 Schedule</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🗺️</Text>
            <Text style={s.emptyTitle}>No centers found nearby</Text>
            <Text style={s.emptySubtext}>
              Try expanding the radius or changing the filter
            </Text>
          </View>
        )}

        {/* Current prices section */}
        {Object.keys(prices).length > 0 && (
          <View style={s.pricesSection}>
            <Text style={s.pricesSectionTitle}>
              💰 Current Kabadiwala Prices
            </Text>
            <Text style={s.pricesSectionSub}>Market rates — February 2026</Text>
            {Object.entries(prices).map(([category, items], i) => (
              <View key={i} style={s.priceCategory}>
                <Text style={s.priceCategoryName}>{category}</Text>
                {Object.entries(items).map(([item, price], j) => (
                  <View key={j} style={s.priceRow}>
                    <Text style={s.priceItemName}>{item}</Text>
                    <Text style={s.priceItemPrice}>{price}</Text>
                  </View>
                ))}
              </View>
            ))}
            <Text style={s.pricesNote}>
              * Prices vary by condition, quantity, and location
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0f1e" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0f1e",
  },
  loadingText: { color: "#7f8c8d", marginTop: 12, fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a2744",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#fff", fontSize: 18 },
  headerText: { marginLeft: 12 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#7f8c8d", fontSize: 12, marginTop: 1 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1a2744",
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  searchClear: { color: "#7f8c8d", fontSize: 16, paddingLeft: 8 },

  suggestionBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#1e3a2f",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#27ae60",
  },
  suggestionText: { color: "#7f8c8d", fontSize: 13 },
  suggestionBold: { color: "#27ae60", fontWeight: "700" },

  filterScroll: { maxHeight: 48, marginBottom: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1b2e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#1a2744",
    gap: 4,
  },
  filterChipActive: { backgroundColor: "#27ae60", borderColor: "#27ae60" },
  filterIcon: { fontSize: 14 },
  filterLabel: { color: "#7f8c8d", fontSize: 13, fontWeight: "600" },
  filterLabelActive: { color: "#fff" },

  scroll: { flex: 1 },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 6,
  },
  locationIcon: { fontSize: 14 },
  locationText: { color: "#7f8c8d", fontSize: 12 },

  centerCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#0d1b2e",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  centerCardSelected: { borderWidth: 2 },
  centerHeader: { flexDirection: "row", gap: 12, marginBottom: 10 },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconText: { fontSize: 22 },
  centerInfo: { flex: 1 },
  centerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  centerName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  verifiedBadge: {
    color: "#27ae60",
    fontSize: 11,
    backgroundColor: "#1e3a2f",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  centerType: { color: "#7f8c8d", fontSize: 12, marginTop: 2 },
  centerAddress: { color: "#566573", fontSize: 12, marginTop: 1 },
  distanceBadge: {
    backgroundColor: "#1a2744",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  distanceText: { color: "#27ae60", fontSize: 12, fontWeight: "700" },

  acceptsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  acceptChip: {
    backgroundColor: "#1a2744",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  acceptChipHighlight: {
    backgroundColor: "#1e3a2f",
    borderWidth: 1,
    borderColor: "#27ae60",
  },
  acceptText: { color: "#7f8c8d", fontSize: 11 },
  acceptTextHighlight: { color: "#27ae60", fontWeight: "600" },

  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  hoursIcon: { fontSize: 13 },
  hoursText: { color: "#7f8c8d", fontSize: 12 },

  pricesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  priceChip: {
    backgroundColor: "#f59e0b22",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#f59e0b44",
  },
  priceText: { color: "#f59e0b", fontSize: 11, fontWeight: "600" },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1a2744",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1a2744",
  },
  actionBtnOutlineText: { fontWeight: "700", fontSize: 13 },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtext: { color: "#7f8c8d", fontSize: 13 },

  pricesSection: {
    margin: 16,
    backgroundColor: "#0d1b2e",
    borderRadius: 16,
    padding: 16,
  },
  pricesSectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  pricesSectionSub: { color: "#7f8c8d", fontSize: 12, marginBottom: 14 },
  priceCategory: { marginBottom: 14 },
  priceCategoryName: {
    color: "#27ae60",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  priceItemName: { color: "#cdd9e5", fontSize: 13 },
  priceItemPrice: { color: "#f59e0b", fontSize: 13, fontWeight: "600" },
  pricesNote: {
    color: "#566573",
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
});
