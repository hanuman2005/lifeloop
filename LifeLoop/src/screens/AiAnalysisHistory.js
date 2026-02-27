// src/screens/AnalysisHistory.js - React Native | Dark Theme
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";
import Toast from "react-native-toast-message";

// ═══════════════════════════════════════════════════════════════════════════
// Category Icon Mapping
// ═══════════════════════════════════════════════════════════════════════════
const CATEGORY_ICONS = {
  Plastic: "🧴",
  Glass: "🍶",
  Metal: "🥫",
  Paper: "📦",
  Organic: "🥦",
  Electronic: "📱",
  "E-Waste": "📱",
  Textile: "👕",
  "Clothing / Textile": "👕",
  Wood: "🪵",
};

const CATEGORY_COLORS = {
  Plastic: { color: "#3b82f6", bg: "#eff6ff" },
  Glass: { color: "#0891b2", bg: "#ecfeff" },
  Metal: { color: "#6b7280", bg: "#f3f4f6" },
  Paper: { color: "#d97706", bg: "#fef3c7" },
  Organic: { color: "#16a34a", bg: "#dcfce7" },
  Electronic: { color: "#7c3aed", bg: "#ede9fe" },
  "E-Waste": { color: "#7c3aed", bg: "#ede9fe" },
  Textile: { color: "#db2777", bg: "#fce7f3" },
  "Clothing / Textile": { color: "#db2777", bg: "#fce7f3" },
  Wood: { color: "#92400e", bg: "#fef3c7" },
};

const getCategoryIcon = (material) => CATEGORY_ICONS[material] || "📦";

const getCategoryColor = (material) =>
  CATEGORY_COLORS[material] || { color: "#6b7280", bg: "#f3f4f6" };

// ═══════════════════════════════════════════════════════════════════════════
// Stat Card Component
// ═══════════════════════════════════════════════════════════════════════════
const StatCard = ({ icon, value, label, color, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[s.statCard, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Analysis Card Component
// ═══════════════════════════════════════════════════════════════════════════
const AnalysisCard = ({ analysis, onPress, onDelete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const categoryStyle = getCategoryColor(analysis.material);
  const icon = getCategoryIcon(analysis.material);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
        {/* Image thumbnail (if available) */}
        {analysis.imageUrl && (
          <Image
            source={{ uri: analysis.imageUrl }}
            style={s.cardImage}
            resizeMode="cover"
          />
        )}

        {/* Header with icon and title */}
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: categoryStyle.bg }]}>
            <Text style={s.cardIconText}>{icon}</Text>
          </View>
          <View style={s.cardInfo}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {analysis.tfLabel}
            </Text>
            <View
              style={[
                s.cardMaterialBadge,
                {
                  backgroundColor: categoryStyle.bg,
                  borderColor: categoryStyle.color,
                },
              ]}
            >
              <Text
                style={[s.cardMaterialText, { color: categoryStyle.color }]}
              >
                {analysis.material}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={s.cardDetails}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Confidence:</Text>
            <Text style={s.detailValue}>{analysis.confidence}%</Text>
          </View>

          {analysis.analysisCount > 1 && (
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Analyzed:</Text>
              <Text style={s.detailValue}>{analysis.analysisCount}× times</Text>
            </View>
          )}

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Eco Points:</Text>
            <Text style={[s.detailValue, { color: "#4ade80" }]}>
              +{analysis.impact?.ecoScore || 0}
            </Text>
          </View>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>CO₂ Saved:</Text>
            <Text style={[s.detailValue, { color: "#4ade80" }]}>
              {analysis.impact?.carbonSaved || 0} kg
            </Text>
          </View>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Date:</Text>
            <Text style={s.detailValue}>
              {new Date(analysis.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Hazard warning preview */}
        {analysis.hazardIfThrown && (
          <View style={s.hazardPreview}>
            <Text style={s.hazardPreviewIcon}>⚠️</Text>
            <Text style={s.hazardPreviewText} numberOfLines={1}>
              {analysis.hazardIfThrown.substring(0, 60)}...
            </Text>
          </View>
        )}

        {/* Delete button */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => onDelete(analysis._id)}
        >
          <Text style={s.deleteBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Empty State Component
// ═══════════════════════════════════════════════════════════════════════════
const EmptyState = ({ onAnalyze }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={s.emptyWrap}>
      <Animated.Text
        style={[s.emptyIcon, { transform: [{ translateY: bounceAnim }] }]}
      >
        🔍
      </Animated.Text>
      <Text style={s.emptyTitle}>No Analyses Yet</Text>
      <Text style={s.emptySub}>
        Start analyzing items to build your eco-impact history!
      </Text>
      <TouchableOpacity style={s.emptyBtn} onPress={onAnalyze}>
        <Text style={s.emptyBtnText}>🤖 Start First Analysis</Text>
      </TouchableOpacity>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const AnalysisHistory = () => {
  const navigation = useNavigation();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    totalEcoScore: 0,
    totalCarbonSaved: 0,
  });

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { wasteAPI } = await import("../services/api");
      const response = await wasteAPI.getMyHistory();
      const data = response.data?.analyses || response.data || [];

      setAnalyses(data);

      // Calculate stats
      const totalEcoScore = data.reduce(
        (sum, a) => sum + (a.impact?.ecoScore || 0),
        0,
      );
      const totalCarbonSaved = data.reduce(
        (sum, a) => sum + (a.impact?.carbonSaved || 0),
        0,
      );

      setStats({
        total: data.length,
        totalEcoScore,
        totalCarbonSaved: totalCarbonSaved.toFixed(1),
      });
    } catch (err) {
      console.error("History fetch error:", err);
      Toast.show({ type: "error", text1: "Failed to load history" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleAnalysisPress = (analysis) => {
    // Navigate to detail view instead of just showing toast
    navigation.navigate("AnalysisDetail", {
      analysisId: analysis._id,
      analysis,
    });
  };

  const handleDelete = async (analysisId) => {
    Alert.alert(
      "Delete Analysis",
      "Are you sure you want to delete this analysis record?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const { wasteAPI } = await import("../services/api");
              await wasteAPI.delete(analysisId);

              // Remove from list
              setAnalyses(analyses.filter((a) => a._id !== analysisId));

              // Update stats
              const deleted = analyses.find((a) => a._id === analysisId);
              setStats({
                total: stats.total - 1,
                totalEcoScore:
                  stats.totalEcoScore - (deleted?.impact?.ecoScore || 0),
                totalCarbonSaved: (
                  stats.totalCarbonSaved - (deleted?.impact?.carbonSaved || 0)
                ).toFixed(1),
              });

              Toast.show({
                type: "success",
                text1: "Analysis deleted",
              });
            } catch (err) {
              console.error("Delete error:", err);
              Toast.show({
                type: "error",
                text1: "Failed to delete analysis",
              });
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.loadingText}>Loading history…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (analyses.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>📊 Analysis History</Text>
          <View style={{ width: 40 }} />
        </Animated.View>
        <EmptyState onAnalyze={() => navigation.navigate("WasteAnalyzer")} />
      </SafeAreaView>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={analyses}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4ade80"
          />
        }
        ListHeaderComponent={() => (
          <Animated.View style={{ opacity: headerAnim }}>
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={s.backBtnText}>←</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>📊 Analysis History</Text>
                <Text style={s.headerSub}>Track your eco-impact over time</Text>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={s.statsRow}>
              <StatCard
                icon="📋"
                value={stats.total}
                label="Total Analyses"
                color="#4ade80"
                delay={0}
              />
              <StatCard
                icon="🏆"
                value={stats.totalEcoScore}
                label="Eco Points"
                color="#fbbf24"
                delay={80}
              />
              <StatCard
                icon="🌍"
                value={stats.totalCarbonSaved}
                label="kg CO₂ Saved"
                color="#60a5fa"
                delay={160}
              />
            </View>

            <View style={s.listHeader}>
              <Text style={s.listHeaderText}>Your Analyses</Text>
              <Text style={s.listHeaderSub}>{analyses.length} items</Text>
            </View>
          </Animated.View>
        )}
        renderItem={({ item }) => (
          <AnalysisCard
            analysis={item}
            onPress={() => handleAnalysisPress(item)}
            onDelete={handleDelete}
          />
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#94a3b8", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 24, color: "#4ade80", fontWeight: "700" },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f1f5f9",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "600",
  },

  // List Header
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
  },
  listHeaderSub: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  // Analysis Card
  card: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#0a0f1e",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  cardMaterialBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  cardMaterialText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Card Details
  cardDetails: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#0a0f1e",
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 12,
    color: "#f1f5f9",
    fontWeight: "700",
  },

  // Hazard Preview
  hazardPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  hazardPreviewIcon: {
    fontSize: 16,
  },
  hazardPreviewText: {
    fontSize: 11,
    color: "#fca5a5",
    fontWeight: "600",
    flex: 1,
  },

  // Delete Button
  deleteBtn: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  deleteBtnText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "700",
  },

  // Empty State
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 72, marginBottom: 20 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyBtnText: {
    color: "#0a0f1e",
    fontWeight: "800",
    fontSize: 15,
  },
});

export default AnalysisHistory;
