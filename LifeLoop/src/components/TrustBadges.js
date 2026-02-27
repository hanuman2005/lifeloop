// src/components/TrustBadges/index.js — React Native
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Animated } from "react-native";
import { useEffect, useRef } from "react";

// ─── Badge info lookup ────────────────────────────────────────────────────
const getBadgeInfo = (badgeType) => {
  const badges = {
    verified_contributor: { icon: "🌟", label: "Verified Contributor", color: "#4ade80", bg: "rgba(74,222,128,0.15)",  border: "rgba(74,222,128,0.3)"  },
    trusted_recipient:    { icon: "🎯", label: "Trusted Recipient",    color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  border: "rgba(96,165,250,0.3)"  },
    community_champion:   { icon: "🏆", label: "Community Champion",   color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.3)"  },
    power_donor:          { icon: "💎", label: "Power Donor",          color: "#a78bfa", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.3)" },
    early_adopter:        { icon: "🚀", label: "Early Adopter",        color: "#fb923c", bg: "rgba(251,146,60,0.15)",  border: "rgba(251,146,60,0.3)"  },
    reliability_star:     { icon: "⭐", label: "Reliability Star",     color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.3)"  },
  };
  return badges[badgeType] || { icon: "✨", label: badgeType, color: "#94a3b8", bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)" };
};

// ─── Animated badge pill ──────────────────────────────────────────────────
const BadgePill = ({ badge, index }) => {
  const info      = getBadgeInfo(badge.badge || badge);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 80, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, delay: index * 80, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>
      <View style={[s.badge, { backgroundColor: info.bg, borderColor: info.border }]}>
        <Text style={s.badgeIcon}>{info.icon}</Text>
        <Text style={[s.badgeLabel, { color: info.color }]}>{info.label}</Text>
      </View>
    </Animated.View>
  );
};

// ─── Trust Score pill ────────────────────────────────────────────────────
const TrustScorePill = ({ score }) => {
  const color  = score >= 80 ? "#4ade80" : score >= 50 ? "#f59e0b" : "#f87171";
  const bg     = score >= 80 ? "rgba(74,222,128,0.15)" : score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(248,113,113,0.15)";
  const border = score >= 80 ? "rgba(74,222,128,0.35)" : score >= 50 ? "rgba(245,158,11,0.35)" : "rgba(248,113,113,0.35)";
  return (
    <View style={[s.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={s.badgeIcon}>🛡️</Text>
      <Text style={[s.badgeLabel, { color }]}>{score}</Text>
      <Text style={[s.badgeSub, { color }]}>/100</Text>
    </View>
  );
};

// ─── Verified pill ────────────────────────────────────────────────────────
const VerifiedPill = () => (
  <View style={[s.badge, { backgroundColor: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.3)" }]}>
    <Text style={s.badgeIcon}>✅</Text>
    <Text style={[s.badgeLabel, { color: "#4ade80" }]}>Verified</Text>
  </View>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
const TrustBadges = ({ user, showScore = true, showVerification = true }) => {
  const trustBadges        = user?.trustBadges        || [];
  const trustScore         = user?.trustScore         ?? 50;
  const verificationStatus = user?.verificationStatus || {};

  const isVerified = verificationStatus.email || verificationStatus.phone;

  return (
    <View style={s.container}>
      {showScore && trustScore > 0 && <TrustScorePill score={trustScore} />}
      {showVerification && isVerified && <VerifiedPill />}
      {trustBadges.map((badge, idx) => <BadgePill key={idx} badge={badge} index={idx} />)}
      {trustBadges.length === 0 && !showScore && (
        <Text style={s.emptyText}>No badges yet</Text>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 },
  badge:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeIcon: { fontSize: 14 },
  badgeLabel:{ fontSize: 13, fontWeight: "700" },
  badgeSub:  { fontSize: 10, fontWeight: "600", opacity: 0.8 },
  emptyText: { fontSize: 13, color: "#64748b" },
});

export default TrustBadges;