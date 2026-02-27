// src/components/AIMatchSuggestions.js - React Native | ML-Powered Matching
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";
import Toast from "react-native-toast-message";

// ═══════════════════════════════════════════════════════════════════════════
// Match Score Badge Component
// ═══════════════════════════════════════════════════════════════════════════
const ScoreBadge = ({ score, confidence }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Color based on score
  const getColor = () => {
    if (score >= 85) return { bg: "#dcfce7", text: "#16a34a" };
    if (score >= 70) return { bg: "#dbeafe", text: "#2563eb" };
    if (score >= 55) return { bg: "#fef3c7", text: "#d97706" };
    return { bg: "#f3f4f6", text: "#6b7280" };
  };

  const colors = getColor();

  return (
    <Animated.View
      style={[
        s.scoreBadge,
        { backgroundColor: colors.bg, transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Text style={[s.scoreValue, { color: colors.text }]}>{score}%</Text>
      <Text style={[s.scoreLabel, { color: colors.text }]}>{confidence}</Text>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Factor Badge Component
// ═══════════════════════════════════════════════════════════════════════════
const FactorBadge = ({ icon, points, label }) => (
  <View style={s.factorBadge}>
    <Text style={s.factorIcon}>{icon}</Text>
    <View>
      <Text style={s.factorPoints}>{points} pts</Text>
      <Text style={s.factorLabel}>{label}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// Match Card Component
// ═══════════════════════════════════════════════════════════════════════════
const MatchCard = ({ match, index, onAssign, onViewProfile, assigning }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getBorderColor = () => {
    if (match.score >= 85) return "#16a34a";
    if (match.score >= 70) return "#2563eb";
    if (match.score >= 55) return "#d97706";
    return "#1e2d45";
  };

  return (
    <Animated.View
      style={[
        s.matchCard,
        {
          borderColor: getBorderColor(),
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Header with user info and score */}
      <View style={s.matchHeader}>
        <View style={s.userInfo}>
          <Image
            source={{
              uri:
                match.recipient.avatar ||
                `https://ui-avatars.com/api/?name=${match.recipient.firstName}&background=4ade80&color=fff`,
            }}
            style={s.avatar}
          />
          <View style={s.userDetails}>
            <Text style={s.userName} numberOfLines={1}>
              {match.recipient.firstName} {match.recipient.lastName}
            </Text>
            <View style={s.userMeta}>
              <Text style={s.userMetaText}>
                ⭐ {match.recipient.rating?.average?.toFixed(1) || "New"}
              </Text>
              {match.recipient.badges?.includes("verified") && (
                <Text style={s.verifiedBadge}>✅ Verified</Text>
              )}
            </View>
          </View>
        </View>

        <ScoreBadge score={match.score} confidence={match.confidence} />
      </View>

      {/* Match factors */}
      <View style={s.factorsGrid}>
        <FactorBadge
          icon="📍"
          points={match.factors.proximity || 0}
          label="Location"
        />
        <FactorBadge
          icon="✅"
          points={match.factors.completionRate || 0}
          label="Reliability"
        />
        <FactorBadge
          icon="⭐"
          points={match.factors.rating || 0}
          label="Rating"
        />
        {match.factors.categoryMatch > 0 && (
          <FactorBadge
            icon="🎯"
            points={match.factors.categoryMatch}
            label="Category"
          />
        )}
      </View>

      {/* AI Recommendation */}
      <View style={s.recommendationBox}>
        <Text style={s.recommendationIcon}>💡</Text>
        <Text style={s.recommendationText}>{match.recommendation}</Text>
      </View>

      {/* Action buttons */}
      <View style={s.actionButtons}>
        <TouchableOpacity
          style={[s.btn, s.btnSecondary]}
          onPress={onViewProfile}
          disabled={assigning}
        >
          <Text style={s.btnTextSecondary}>👤 Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, s.btnPrimary, assigning && s.btnDisabled]}
          onPress={onAssign}
          disabled={assigning}
        >
          {assigning ? (
            <ActivityIndicator color="#0a0f1e" size="small" />
          ) : (
            <Text style={s.btnTextPrimary}>✅ Assign ({match.score}%)</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const AIMatchSuggestions = ({ listingId, onAssign }) => {
  const navigation = useNavigation();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchMatches();

    // Animate header
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse AI badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [listingId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/listings/${listingId}/match-suggestions`);
      setMatches(response.data?.matches || []);
    } catch (err) {
      console.error("Fetch matches error:", err);
      Toast.show({ type: "error", text1: "Failed to load AI suggestions" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (recipientId, matchScore) => {
    Alert.alert(
      "Assign Listing",
      `Assign to this recipient? Match score: ${matchScore}%`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            setAssigning(recipientId);
            try {
              await api.post(`/listings/${listingId}/assign`, {
                recipientId,
                message: "Assigned via AI match",
              });
              Toast.show({
                type: "success",
                text1: `✅ Assigned! Match: ${matchScore}%`,
              });
              if (onAssign) onAssign();
            } catch (err) {
              Toast.show({
                type: "error",
                text1: err.response?.data?.message || "Assignment failed",
              });
            } finally {
              setAssigning(null);
            }
          },
        },
      ]
    );
  };

  const handleAutoAssign = () => {
    if (!matches[0]) return;

    Alert.alert(
      "Auto-Assign",
      `Auto-assign to top match (${matches[0].score}%)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const response = await api.post(
                `/listings/${listingId}/auto-assign`
              );
              Toast.show({
                type: "success",
                text1: `🎯 Auto-assigned! Match: ${response.data.match.score}%`,
              });
              if (onAssign) onAssign();
            } catch (err) {
              Toast.show({
                type: "error",
                text1: err.response?.data?.message || "Auto-assign failed",
              });
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (userId) => {
    navigation.navigate("Profile", { userId });
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.container}>
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <Text style={s.headerTitle}>🤖 AI Match Suggestions</Text>
        </Animated.View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.loadingText}>AI Analyzing...</Text>
        </View>
      </View>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (matches.length === 0) {
    return (
      <View style={s.container}>
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <Text style={s.headerTitle}>🤖 AI Match Suggestions</Text>
        </Animated.View>
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>🤖</Text>
          <Text style={s.emptyTitle}>No matches found yet</Text>
          <Text style={s.emptySub}>AI will keep analyzing for the best recipients!</Text>
        </View>
      </View>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <Text style={s.headerTitle}>🤖 AI Match Suggestions</Text>
        <Animated.View
          style={[s.aiBadge, { transform: [{ scale: badgePulse }] }]}
        >
          <Text style={s.aiBadgeText}>Powered by ML</Text>
        </Animated.View>
      </Animated.View>

      {/* Match cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {matches.map((match, index) => (
          <MatchCard
            key={match.recipient._id}
            match={match}
            index={index}
            onAssign={() => handleAssign(match.recipient._id, match.score)}
            onViewProfile={() => handleViewProfile(match.recipient._id)}
            assigning={assigning === match.recipient._id}
          />
        ))}

        {/* Auto-assign button */}
        {matches.length > 0 && (
          <TouchableOpacity
            style={[s.autoAssignBtn, assigning && s.btnDisabled]}
            onPress={handleAutoAssign}
            disabled={!!assigning}
          >
            <Text style={s.autoAssignBtnText}>
              🎯 Auto-Assign to Top Match ({matches[0].score}%)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
    flexWrap: "wrap",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
  },
  aiBadge: {
    backgroundColor: "#4ade80",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0a0f1e",
  },

  // Loading
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#94a3b8",
  },

  // Empty State
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },

  // Match Card
  matchCard: {
    backgroundColor: "#0a0f1e",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
  },

  // Match Header
  matchHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#4ade80",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userMetaText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  verifiedBadge: {
    fontSize: 11,
    color: "#4ade80",
  },

  // Score Badge
  scoreBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  // Factors Grid
  factorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  factorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  factorIcon: {
    fontSize: 16,
  },
  factorPoints: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4ade80",
  },
  factorLabel: {
    fontSize: 9,
    color: "#64748b",
  },

  // Recommendation
  recommendationBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4ade80",
  },
  recommendationIcon: {
    fontSize: 18,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
    fontStyle: "italic",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#4ade80",
  },
  btnSecondary: {
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnTextPrimary: {
    color: "#0a0f1e",
    fontWeight: "700",
    fontSize: 13,
  },
  btnTextSecondary: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 13,
  },

  // Auto-assign Button
  autoAssignBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  autoAssignBtnText: {
    color: "#0a0f1e",
    fontWeight: "800",
    fontSize: 14,
  },
});

export default AIMatchSuggestions;