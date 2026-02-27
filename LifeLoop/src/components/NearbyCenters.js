// src/components/AIWasteAnalyzer/NearbyCentersSection.js - React Native
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
} from "react-native";
import {
  fetchNearbyCenters,
  getUserLocation,
  getMaterialIcon,
} from "../utils/recyclingCenters";

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const CenterCard = ({ center, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNavigate = () => {
    const url = center.googleMapsUrl;
    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) Linking.openURL(url);
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.centerCard,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={styles.centerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.centerName} numberOfLines={2}>
            {center.name}
          </Text>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>
              📏 {center.distanceText} away
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.navigateBtn}
        onPress={handleNavigate}
        activeOpacity={0.85}
      >
        <Text style={styles.navigateBtnText}>🚗 Navigate</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const NearbyCentersSection = ({ material }) => {
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState([]);
  const [error, setError] = useState(null);

  const sectionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sectionAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (material) loadNearbyCenters();
  }, [material]);

  const loadNearbyCenters = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔍 Requesting location permission...");
      const location = await getUserLocation();
      console.log("✅ Location obtained:", location);

      const nearbyCenters = await fetchNearbyCenters(material, location);
      console.log("✅ Centers fetched:", nearbyCenters.length);
      setCenters(nearbyCenters);

      if (nearbyCenters.length === 0) {
        console.log("ℹ️ No centers found within 50km");
      }
    } catch (err) {
      console.error("❌ Center fetch error:", err.message);

      // Map geolocation error codes to messages
      const messages = {
        1: "Location access denied. Please enable location services in Settings.",
        2: "Unable to determine your location. Check device GPS and internet.",
        3: "Location request timed out. Please try again.",
      };

      const errorMsg =
        messages[err.code] ||
        err.message ||
        "Failed to load recycling centers.";
      setError(errorMsg);

      // Show fallback message
      console.log("⚠️ Using fallback suggestion");
    } finally {
      setLoading(false);
    }
  };

  const materialIcon = getMaterialIcon(material);

  return (
    <Animated.View style={[styles.section, { opacity: sectionAnim }]}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Text style={styles.sectionIconText}>📍</Text>
        </View>
        <Text style={styles.sectionTitle}>Nearby Recycling Centers</Text>
      </View>

      {/* Material badge */}
      {material ? (
        <View style={styles.materialBadge}>
          <Text style={styles.materialBadgeText}>
            {materialIcon} Showing centers for {material}
          </Text>
        </View>
      ) : null}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.loadingText}>
            Finding recycling centers near you...
          </Text>
        </View>
      )}

      {/* Error with better UX */}
      {!loading && error && (
        <View style={styles.errorState}>
          <Text style={styles.errorStateIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.errorStateText}>{error}</Text>
            <Text style={styles.errorStateHint}>
              💡 Quick tip: Search "{material || "recycling"} centers near me"
              in Google Maps
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={loadNearbyCenters}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>🔄 Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty */}
      {!loading && !error && centers.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔍</Text>
          <Text style={styles.emptyStateText}>
            No recycling centers found nearby.{"\n"}
            Try expanding your search area or check local waste management
            services.
          </Text>
        </View>
      )}

      {/* Centers list */}
      {!loading &&
        !error &&
        centers.length > 0 &&
        centers.map((center, i) => (
          <CenterCard key={center.id} center={center} index={i} />
        ))}
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#131c2e",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },

  // Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  sectionIconBox: {
    width: 48,
    height: 48,
    backgroundColor: "#166534",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconText: { fontSize: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
    flex: 1,
  },

  // Material badge
  materialBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(74,222,128,0.12)",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  materialBadgeText: {
    color: "#4ade80",
    fontWeight: "600",
    fontSize: 14,
  },

  // Loading
  loadingContainer: { alignItems: "center", paddingVertical: 32, gap: 14 },
  loadingText: { color: "#94a3b8", fontSize: 14 },

  // Error
  errorState: {
    backgroundColor: "rgba(251,191,36,0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#fbbf24",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  errorStateIcon: { fontSize: 24 },
  errorStateText: {
    color: "#f1f5f9",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  errorStateHint: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: "italic",
  },
  retryBtn: {
    backgroundColor: "#131c2e",
    borderWidth: 2,
    borderColor: "#fbbf24",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  retryBtnText: { color: "#fbbf24", fontWeight: "700", fontSize: 13 },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: { fontSize: 48, marginBottom: 14, opacity: 0.5 },
  emptyStateText: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },

  // Center Card
  centerCard: {
    backgroundColor: "#0a0f1e",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
    gap: 12,
  },
  centerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  centerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
    lineHeight: 21,
    marginBottom: 8,
  },
  distanceBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#131c2e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  distanceBadgeText: { color: "#4ade80", fontWeight: "600", fontSize: 12 },
  navigateBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  navigateBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 14 },
});

export default NearbyCentersSection;
