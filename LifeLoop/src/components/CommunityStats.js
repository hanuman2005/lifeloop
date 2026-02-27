// src/components/ImpactDashboard/CommunityStats.js - React Native
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import ImpactCard from "./ImpactCard";
import { impactAPI } from "../services/api";
import Toast from "react-native-toast-message";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const getCategoryIcon = (category) => {
  const icons = {
    produce:          "🍎",
    "canned-goods":   "🥫",
    dairy:            "🥛",
    bakery:           "🍞",
    "household-items":"🏠",
    clothing:         "👕",
    electronics:      "📱",
    furniture:        "🛋️",
    books:            "📚",
    toys:             "🧸",
    other:            "📦",
  };
  return icons[category] || "📦";
};

const getRankBgColor = (rank) => {
  if (rank === 1) return "#ffd700";
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  return "#1e2d45";
};

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const SectionCard = ({ children, style }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.section,
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const LeaderboardItem = ({ donor, index }) => {
  const isTop3 = index < 3;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <View style={[styles.leaderboardItem, isTop3 && styles.leaderboardItemTop3]}>
      <View style={[styles.rankBadge, { backgroundColor: getRankBgColor(index + 1) }]}>
        <Text style={styles.rankBadgeText}>
          {isTop3 ? medals[index] : `#${index + 1}`}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>
          {donor.user
            ? `${donor.user.firstName || ""} ${donor.user.lastName || ""}`.trim()
            : "Anonymous"}
        </Text>
        <Text style={styles.userStats}>
          {donor.wasteKg?.toFixed(1) || 0}kg waste • {donor.co2Kg?.toFixed(1) || 0}kg CO₂ • {donor.count || 0} donations
        </Text>
      </View>
    </View>
  );
};

const TrendingCard = ({ category, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 80,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.trendingCard, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.trendingIcon}>{getCategoryIcon(category._id)}</Text>
      <Text style={styles.trendingName} numberOfLines={1}>
        {category._id || "Other"}
      </Text>
      <Text style={styles.trendingCount}>{category.count || 0} donations</Text>
    </Animated.View>
  );
};

const StatBox = ({ value, label }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const CommunityStats = () => {
  const { user }             = useAuth();
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);

  const userType   = user?.userType?.toLowerCase() || "";
  const isDonor    = userType === "donor"     || userType === "both";
  const isRecipient= userType === "recipient";

  useEffect(() => { fetchCommunityData(); }, []);

  const fetchCommunityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await impactAPI.getCommunityImpact();
      if (response.data.success) {
        setData(response.data);
      } else {
        throw new Error(response.data.message || "Failed to load community data");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load community data");
      Toast.show({ type: "error", text1: "Failed to load community data" });
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ───────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Loading community impact... 🌍</Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchCommunityData}>
          <Text style={styles.retryBtnText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty ─────────────────────────────
  if (!data?.community) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No community data available</Text>
      </View>
    );
  }

  const { community, topDonors, trendingCategories, stats } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Community Impact 🌟</Text>
        <Text style={styles.subtitle}>Together, we're making a difference</Text>
      </View>

      {/* Impact Cards */}
      <ImpactCard
        icon="♻️"
        value={community.totalWastePreventedKg || 0}
        label={isDonor ? "Total Waste Prevented" : "Total Waste Diverted"}
        subtitle={isDonor ? "Community-wide impact" : "Waste kept out of landfill"}
        decimals={1}
        suffix=" kg"
        gradient="linear-gradient(135deg, #48bb78 0%, #38a169 100%)"
      />
      <ImpactCard
        icon="🌍"
        value={community.totalCO2SavedKg || 0}
        label={isDonor ? "Total CO₂ Saved" : "CO₂ Offset"}
        subtitle={isDonor ? `${community.treesEquivalent || 0} trees equivalent` : "CO₂ reduction by community"}
        decimals={1}
        suffix=" kg"
        gradient="linear-gradient(135deg, #4299e1 0%, #3182ce 100%)"
      />
      {isDonor && (
        <ImpactCard
          icon="📦"
          value={community.totalItemsSaved || community.totalMealsProvided || 0}
          label="Items Shared"
          subtitle="Helping our community"
          gradient="linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)"
        />
      )}
      {isRecipient && (
        <ImpactCard
          icon="📦"
          value={community.totalItemsReceived || community.totalMealsProvided || 0}
          label="Items Received"
          subtitle="Support received by community"
          gradient="linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)"
        />
      )}
      <ImpactCard
        icon="👥"
        value={stats?.activeUsersThisWeek || 0}
        label="Active This Week"
        subtitle="Growing every day"
        gradient="linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)"
      />

      {/* Leaderboard */}
      {topDonors?.length > 0 && (
        <SectionCard>
          <Text style={styles.sectionTitle}>🏆 Top Contributors</Text>
          {topDonors.slice(0, 10).map((donor, i) => (
            <LeaderboardItem key={i} donor={donor} index={i} />
          ))}
        </SectionCard>
      )}

      {/* Trending */}
      {trendingCategories?.length > 0 && (
        <SectionCard>
          <Text style={styles.sectionTitle}>🔥 Trending This Week</Text>
          <View style={styles.trendingGrid}>
            {trendingCategories.map((cat, i) => (
              <TrendingCard key={i} category={cat} index={i} />
            ))}
          </View>
        </SectionCard>
      )}

      {/* Weekly Stats */}
      {stats && (
        <SectionCard>
          <Text style={styles.sectionTitle}>📊 This Week's Activity</Text>
          <View style={styles.statsRow}>
            <StatBox value={stats.activeUsersThisWeek || 0}    label="Active Users" />
            <StatBox value={stats.transactionsThisWeek || 0}   label="Transactions" />
            <StatBox value={community.totalTransactions || 0}  label="All-Time Total" />
          </View>
        </SectionCard>
      )}
    </ScrollView>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#0a0f1e" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  // Header
  header:   { marginBottom: 20 },
  title:    { fontSize: 26, fontWeight: "800", color: "#f1f5f9", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#94a3b8" },

  // Loading / Error
  loadingText: { color: "#94a3b8", fontSize: 14, marginTop: 12 },
  errorIcon:   { fontSize: 40, marginBottom: 12 },
  errorText:   { color: "#ef4444", fontSize: 14, textAlign: "center", marginBottom: 16 },
  retryBtn:    { backgroundColor: "#4ade80", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  retryBtnText:{ color: "#0a0f1e", fontWeight: "700" },

  // Section card
  section: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#f1f5f9", marginBottom: 14 },

  // Leaderboard
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1e2d45",
    marginBottom: 10,
  },
  leaderboardItemTop3: { backgroundColor: "rgba(255,215,0,0.15)" },
  rankBadge: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: { fontSize: 18, fontWeight: "800" },
  userName:      { color: "#f1f5f9", fontWeight: "700", fontSize: 14, marginBottom: 3 },
  userStats:     { color: "#94a3b8", fontSize: 12 },

  // Trending
  trendingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  trendingCard: {
    backgroundColor: "#5a3e9a",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    width: "30%",
    minWidth: 90,
  },
  trendingIcon:  { fontSize: 28, marginBottom: 6 },
  trendingName:  { color: "#fff", fontWeight: "700", fontSize: 12, textAlign: "center", marginBottom: 4, textTransform: "capitalize" },
  trendingCount: { color: "rgba(255,255,255,0.8)", fontSize: 11 },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#4ade80", marginBottom: 4 },
  statLabel: { color: "#94a3b8", fontSize: 12, textAlign: "center" },
});

export default CommunityStats;