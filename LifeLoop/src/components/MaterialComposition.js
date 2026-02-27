// src/components/MaterialCompositionDisplay/index.js - React Native
import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

const HAZARD_COLORS = {
  high:   { border: "#ef4444", badge: "#ef4444" },
  medium: { border: "#f59e0b", badge: "#f59e0b" },
  low:    { border: "#4ade80", badge: "transparent" },
};
const getPriorityColor = (p) =>
  ({ CRITICAL: "#ef4444", HIGH: "#f59e0b" }[p] || "#667eea");

const MaterialCard = ({ material, index }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: 900 + index * 100, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: 900 + index * 100, useNativeDriver: true }),
    ]).start();
  }, []);
  const hazard    = material.hazard || "low";
  const borderCol = HAZARD_COLORS[hazard]?.border || "#4ade80";
  const badgeCol  = HAZARD_COLORS[hazard]?.badge  || "transparent";
  return (
    <Animated.View style={[styles.materialCard, { borderLeftColor: borderCol, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.materialInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.materialName}>{material.name}</Text>
          {hazard !== "low" && (
            <View style={[styles.hazardBadge, { backgroundColor: badgeCol }]}>
              <Text style={styles.hazardText}>{hazard} hazard</Text>
            </View>
          )}
        </View>
        <Text style={styles.recyclable}>{material.recyclable ? "♻️ Recyclable" : "⚠️ Not Recyclable"}</Text>
      </View>
      <View style={styles.percentBadge}>
        <Text style={styles.percentText}>{material.percentage}%</Text>
      </View>
    </Animated.View>
  );
};

const StatCard = ({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const RecItem = ({ priority, material, action, reason }) => {
  const color = getPriorityColor(priority);
  return (
    <View style={[styles.recItem, { borderLeftColor: color }]}>
      <Text style={[styles.recPriority, { color }]}>{priority}: {material}</Text>
      <Text style={styles.recAction}>{action}</Text>
      <Text style={styles.recReason}>{reason}</Text>
    </View>
  );
};

const MaterialCompositionDisplay = ({ analysis }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, delay: 800, useNativeDriver: true, friction: 6 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: 800, useNativeDriver: true }),
    ]).start();
  }, []);
  if (!analysis?.materialComposition) return null;
  const { materialComposition, recyclingComplexity, environmentalImpact, recyclingRecommendations, hazards } = analysis;
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.title}>🔬 Material Composition Analysis</Text>
      <View style={styles.materialGrid}>
        {materialComposition.map((m, i) => <MaterialCard key={i} material={m} index={i} />)}
      </View>
      {environmentalImpact && (
        <View style={styles.statsRow}>
          <StatCard value={`${environmentalImpact.recyclablePercentage}%`} label="Recyclable Content" />
          <StatCard value={`${environmentalImpact.co2SavedByRecycling}kg`} label="CO₂ Saved" />
          <StatCard value={environmentalImpact.landfillDiversionPotential}  label="Diversion Potential" />
        </View>
      )}
      {hazards?.hasHazardousMaterials && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Hazardous Materials Detected</Text>
          {hazards.criticalHazards.map((h, i) => (
            <RecItem key={i} priority="CRITICAL" material={h.material} action={h.warning} reason={`Risk: ${h.risk}`} />
          ))}
        </View>
      )}
      {recyclingRecommendations?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recycling Recommendations</Text>
          {recyclingRecommendations.slice(0, 3).map((r, i) => (
            <RecItem key={i} priority={r.priority} material={r.material} action={r.action} reason={r.reason} />
          ))}
        </View>
      )}
      <View style={styles.complexityBadge}>
        <Text style={styles.complexityText}><Text style={styles.complexityKey}>Recycling Complexity: </Text>{recyclingComplexity}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container:     { backgroundColor: "#667eea", borderRadius: 24, padding: 20, marginVertical: 16, borderWidth: 2, borderColor: "#4f68d9" },
  title:         { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  materialGrid:  { gap: 10, marginBottom: 16 },
  materialCard:  { backgroundColor: "#131c2e", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", borderLeftWidth: 4 },
  materialInfo:  { flex: 1 },
  nameRow:       { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  materialName:  { color: "#f1f5f9", fontWeight: "700", fontSize: 14 },
  hazardBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  hazardText:    { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  recyclable:    { color: "#94a3b8", fontSize: 12 },
  percentBadge:  { backgroundColor: "#1e2d45", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60, alignItems: "center" },
  percentText:   { color: "#667eea", fontSize: 20, fontWeight: "900" },
  statsRow:      { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard:      { flex: 1, backgroundColor: "#131c2e", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#1e2d45" },
  statValue:     { color: "#667eea", fontSize: 20, fontWeight: "900", marginBottom: 4 },
  statLabel:     { color: "#94a3b8", fontSize: 11, textAlign: "center" },
  section:       { marginBottom: 16 },
  sectionTitle:  { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 10 },
  recItem:       { backgroundColor: "#131c2e", borderRadius: 14, padding: 12, marginBottom: 8, borderLeftWidth: 4 },
  recPriority:   { fontWeight: "700", fontSize: 12, marginBottom: 4 },
  recAction:     { color: "#f1f5f9", fontWeight: "600", fontSize: 13, marginBottom: 3 },
  recReason:     { color: "#94a3b8", fontSize: 12, lineHeight: 17 },
  complexityBadge: { backgroundColor: "#131c2e", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#1e2d45" },
  complexityText:  { color: "#94a3b8", fontSize: 13 },
  complexityKey:   { color: "#667eea", fontWeight: "700" },
});

export default MaterialCompositionDisplay;