// src/components/ImpactDashboard/PersonalImpact.js - React Native
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import ImpactCard from "./ImpactCard";
import { impactAPI } from "../services/api";
import Toast from "react-native-toast-message";

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const SectionCard = ({ children }) => {
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
      style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      {children}
    </Animated.View>
  );
};

const ProgressBar = ({ progress }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(progress, 100),
      duration: 1500,
      useNativeDriver: false, // width animation needs false
    }).start();
  }, [progress]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: widthInterpolated }]} />
    </View>
  );
};

const AchievementBadge = ({ text, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.achievement, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.achievementText}>{text}</Text>
    </Animated.View>
  );
};

const ActivityRow = ({ activity, index }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const isDonated = activity.type === "donated";

  return (
    <Animated.View
      style={[styles.activityItem, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
    >
      <Text style={styles.activityIcon}>{isDonated ? "📤" : "📥"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {isDonated ? "Donated" : "Received"}: {activity.listing?.title || "Item"}
        </Text>
        <Text style={styles.activityDate}>
          {new Date(activity.completedAt).toLocaleDateString("en-IN")} •{" "}
          Saved {activity.impact?.wastePreventedKg?.toFixed(1) || 0}kg waste
        </Text>
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const PersonalImpact = () => {
  const { user }              = useAuth();
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);

  const rankPulse = useRef(new Animated.Value(1)).current;

  const userType    = data?.userType || user?.userType?.toLowerCase() || "";
  const isDonor     = userType === "donor"     || userType === "both";
  const isRecipient = userType === "recipient";

  useEffect(() => { fetchImpactData(); }, []);

  // Rank badge pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rankPulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(rankPulse, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    ).start();
  }, []);

  const fetchImpactData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await impactAPI.getPersonalImpact();
      if (response.data.success) {
        setData(response.data);
      } else {
        throw new Error(response.data.message || "Failed to load impact data");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load impact data");
      Toast.show({ type: "error", text1: "Failed to load your impact data" });
    } finally {
      setLoading(false);
    }
  };

  // ── Export as share sheet (replaces PDF/CSV download) ─────
  const handleShare = async () => {
    if (!data?.impact) return;
    const { impact } = data;
    const shareText =
      `🌍 My LifeLoop Impact Report\n\n` +
      `♻️ Waste Prevented: ${impact.totalWastePreventedKg?.toFixed(1) || 0} kg\n` +
      `🌳 CO₂ Saved: ${impact.totalCO2SavedKg?.toFixed(1) || 0} kg (${impact.treesEquivalent || 0} trees)\n` +
      `💧 Water Saved: ${impact.totalWaterSavedLiters || 0} L\n` +
      `📦 Items Shared: ${impact.totalMealsProvided || 0}\n\n` +
      `Join me on LifeLoop and make a difference! 🌱`;

    try {
      await Share.share({ message: shareText });
    } catch {}
  };

  // ── Loading ───────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Loading your impact... 🌍</Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchImpactData}>
          <Text style={styles.retryBtnText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data?.impact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No impact data available</Text>
      </View>
    );
  }

  const { impact, milestones, rank, recentActivities } = data;

  const subtitleText = isDonor
    ? "Making a difference, one donation at a time"
    : isRecipient
    ? "See your positive impact from items received!"
    : "Making a difference in your community";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your Environmental Impact 🌍</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
        </View>
        {/* Share replaces PDF/CSV on mobile */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.shareBtnText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Impact Cards */}
      <ImpactCard
        icon="♻️"
        value={impact.totalWastePreventedKg || 0}
        label={isDonor ? "Waste Prevented" : "Waste Diverted"}
        subtitle={isDonor ? "Kilograms saved from landfills" : "Waste kept out of landfill"}
        decimals={1}
        suffix=" kg"
        gradient="linear-gradient(135deg, #48bb78 0%, #38a169 100%)"
      />
      <ImpactCard
        icon="🌍"
        value={impact.totalCO2SavedKg || 0}
        label={isDonor ? "CO₂ Saved" : "CO₂ Offset"}
        subtitle={isDonor ? `Equivalent to ${impact.treesEquivalent || 0} trees` : "Your share of CO₂ reduction"}
        decimals={1}
        suffix=" kg"
        gradient="linear-gradient(135deg, #4299e1 0%, #3182ce 100%)"
      />
      {isDonor && (
        <ImpactCard
          icon="🍽️"
          value={impact.totalMealsProvided || 0}
          label="Items Shared"
          subtitle="Helping our community"
          gradient="linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)"
        />
      )}
      {isRecipient && (
        <ImpactCard
          icon="📦"
          value={impact.totalItemsReceived || impact.totalMealsProvided || 0}
          label="Items Received"
          subtitle="Support you've received"
          gradient="linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)"
        />
      )}
      <ImpactCard
        icon="💧"
        value={impact.totalWaterSavedLiters || 0}
        label="Water Saved"
        subtitle="Liters conserved"
        decimals={0}
        suffix=" L"
        gradient="linear-gradient(135deg, #4fd1c5 0%, #38b2ac 100%)"
      />

      {/* Rank Card */}
      {rank && (
        <SectionCard>
          <View style={styles.rankCard}>
            <Animated.Text
              style={[styles.rankEmoji, { transform: [{ scale: rankPulse }] }]}
            >
              {rank.position <= 3 ? "🏆" : rank.position <= 10 ? "⭐" : "✨"}
            </Animated.Text>
            <Text style={styles.rankText}>Rank #{rank.position || "N/A"}</Text>
            <Text style={styles.rankSubtext}>
              out of {rank.total || 0} community members
            </Text>
          </View>
        </SectionCard>
      )}

      {/* Achievements */}
      {milestones && (
        <SectionCard>
          <Text style={styles.sectionTitle}>🎯 Your Achievements</Text>

          {milestones.achieved?.length > 0 && (
            <View style={styles.achievementsList}>
              {milestones.achieved.map((a, i) => (
                <AchievementBadge key={i} text={a} index={i} />
              ))}
            </View>
          )}

          {milestones.nextMilestone && (
            <View style={styles.nextMilestone}>
              <Text style={styles.nextMilestoneTitle}>
                Next: {milestones.nextMilestone.message}
              </Text>
              <Text style={styles.nextMilestoneDesc}>
                {milestones.nextMilestone.description}
              </Text>
              <ProgressBar progress={milestones.nextMilestone.progress || 0} />
              <Text style={styles.progressLabel}>
                {(milestones.nextMilestone.progress || 0).toFixed(0)}% Complete
              </Text>
            </View>
          )}
        </SectionCard>
      )}

      {/* Recent Activities */}
      {recentActivities?.length > 0 && (
        <SectionCard>
          <Text style={styles.sectionTitle}>📋 Recent Activities</Text>
          {recentActivities.map((activity, i) => (
            <ActivityRow key={i} activity={activity} index={i} />
          ))}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  title:    { fontSize: 24, fontWeight: "800", color: "#f1f5f9", marginBottom: 4, flex: 1 },
  subtitle: { fontSize: 13, color: "#94a3b8", lineHeight: 18 },
  shareBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  shareBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 13 },

  // Loading / Error
  loadingText: { color: "#94a3b8", fontSize: 14, marginTop: 12 },
  errorIcon:   { fontSize: 40, marginBottom: 12 },
  errorText:   { color: "#ef4444", fontSize: 14, textAlign: "center", marginBottom: 16 },
  retryBtn:    { backgroundColor: "#4ade80", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  retryBtnText:{ color: "#0a0f1e", fontWeight: "700" },

  // Section
  section: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#f1f5f9", marginBottom: 14 },

  // Rank
  rankCard:    { alignItems: "center", paddingVertical: 8 },
  rankEmoji:   { fontSize: 48, marginBottom: 10 },
  rankText:    { fontSize: 22, fontWeight: "800", color: "#f1f5f9", marginBottom: 4 },
  rankSubtext: { fontSize: 13, color: "#94a3b8" },

  // Achievements
  achievementsList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  achievement: {
    backgroundColor: "#1e2d45",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  achievementText: { color: "#4ade80", fontWeight: "600", fontSize: 13 },

  // Next milestone
  nextMilestone: {
    backgroundColor: "#1e2d45",
    borderRadius: 14,
    padding: 14,
  },
  nextMilestoneTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  nextMilestoneDesc:  { color: "#94a3b8", fontSize: 12, marginBottom: 10 },
  progressTrack: {
    height: 10,
    backgroundColor: "#334155",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ade80",
    borderRadius: 5,
  },
  progressLabel: { color: "#94a3b8", fontSize: 12, textAlign: "right", marginTop: 6 },

  // Activity
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  activityIcon:  { fontSize: 24 },
  activityTitle: { color: "#f1f5f9", fontWeight: "600", fontSize: 13, marginBottom: 3 },
  activityDate:  { color: "#94a3b8", fontSize: 12 },
});

export default PersonalImpact;