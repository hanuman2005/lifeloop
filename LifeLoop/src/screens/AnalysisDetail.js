// src/screens/AnalysisDetail.js - Full Analysis Details View
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import api from "../services/api";
import MaterialCompositionDisplay from "../components/MaterialComposition";

const AnalysisDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { analysisId, analysis: initialAnalysis } = route.params || {}; // ✅ Guard against undefined route.params

  const [loading, setLoading] = useState(!initialAnalysis);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!initialAnalysis && !analysisId) {
      setError("Invalid analysis ID");
      return; // ✅ Don't fetch if no ID provided
    }
    if (!initialAnalysis) {
      fetchDetail();
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [analysisId, initialAnalysis]);

  const fetchDetail = async () => {
    try {
      const { wasteAPI } = await import("../services/api");
      const response = await wasteAPI.getById(analysisId);
      setAnalysis(response.data);
    } catch (err) {
      console.error("Fetch error:", err);
      Toast.show({ type: "error", text1: "Failed to load analysis" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Analysis",
      "Are you sure you want to permanently delete this analysis?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const { wasteAPI } = await import("../services/api");
              await wasteAPI.delete(analysisId);
              Toast.show({
                type: "success",
                text1: "Analysis deleted successfully",
              });
              navigation.goBack();
            } catch (err) {
              console.error("Delete error:", err);
              Toast.show({ type: "error", text1: "Failed to delete" });
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorWrap}>
          <Text style={s.errorText}>Analysis not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const netBenefit =
    (analysis.impact?.carbonPenalty || 0) - (analysis.impact?.carbonSaved || 0);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header with back button */}
          <View style={s.header}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={s.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Analysis Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Main info card */}
          <View style={s.mainCard}>
            <Text style={s.itemName}>{analysis.tfLabel || analysis.label}</Text>
            <View style={s.badgesRow}>
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {analysis.material || analysis.category}
                </Text>
              </View>
              <View style={[s.badge, { backgroundColor: "#4ade80" }]}>
                <Text style={[s.badgeText, { color: "#0a0f1e" }]}>
                  {analysis.confidence}% confident
                </Text>
              </View>
            </View>
          </View>

          {/* Image Preview */}
          {analysis.imageUrl && (
            <View style={s.imageContainer}>
              <Image
                source={{ uri: analysis.imageUrl }}
                style={s.detailImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Stats Grid */}
          <View style={s.statsGrid}>
            <View style={s.statBox}>
              <Text style={s.statIcon}>🏆</Text>
              <Text style={s.statValue}>{analysis.impact?.ecoScore || 0}</Text>
              <Text style={s.statLabel}>Eco Points</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statIcon}>🌍</Text>
              <Text style={s.statValue}>
                {analysis.impact?.carbonSaved || 0}
              </Text>
              <Text style={s.statLabel}>kg CO₂ Saved</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statIcon}>📅</Text>
              <Text style={s.statValue}>
                {new Date(analysis.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <Text style={s.statLabel}>Date</Text>
            </View>
          </View>

          {/* Recommendation */}
          {analysis.bestAction && (
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>🎯 Recommendation</Text>
              <View style={s.recommendationBox}>
                <Text style={s.recEmoji}>{analysis.bestAction.icon}</Text>
                <View style={s.recContent}>
                  <Text style={s.recLabel}>{analysis.bestAction.label}</Text>
                  <Text style={s.recDesc}>
                    {analysis.bestAction.value}% match for this item
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Material Composition Analysis */}
          {analysis.materialComposition &&
            analysis.materialComposition.length > 0 && (
              <MaterialCompositionDisplay analysis={analysis} />
            )}

          {/* CO2 Impact Comparison */}
          {analysis.impact && (
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>🌍 Climate Impact</Text>
              <View style={s.co2Comparison}>
                <View style={s.co2Item}>
                  <View style={s.co2Icon}>
                    <Text>✅</Text>
                  </View>
                  <View>
                    <Text style={s.co2Label}>Proper Disposal</Text>
                    <Text style={s.co2Value}>
                      Save {analysis.impact.carbonSaved} kg CO₂
                    </Text>
                  </View>
                </View>
                <Text style={s.co2Vs}>VS</Text>
                <View style={s.co2Item}>
                  <View style={[s.co2Icon, { backgroundColor: "#fee2e2" }]}>
                    <Text>❌</Text>
                  </View>
                  <View>
                    <Text style={s.co2Label}>If Thrown as Trash</Text>
                    <Text style={s.co2Value}>
                      Emit {analysis.impact.carbonPenalty} kg CO₂
                    </Text>
                  </View>
                </View>
              </View>
              <View style={s.netBenefit}>
                <Text style={s.netBenefitLabel}>🌟 Total Impact:</Text>
                <Text style={s.netBenefitValue}>Avoid {netBenefit} kg CO₂</Text>
              </View>
            </View>
          )}

          {/* Hazard Warning */}
          {analysis.hazardIfThrown && (
            <View style={s.hazardCard}>
              <View style={s.hazardHeader}>
                <Text style={s.hazardIcon}>⚠️</Text>
                <Text style={s.hazardTitle}>Hazards of Improper Disposal</Text>
              </View>
              <Text style={s.hazardText}>{analysis.hazardIfThrown}</Text>
              <View style={s.hazardFooter}>
                <Text style={s.hazardFooterIcon}>🌍</Text>
                <Text style={s.hazardFooterText}>
                  Proper disposal protects our environment
                </Text>
              </View>
            </View>
          )}

          {/* Recycling Guidance */}
          {analysis.recyclingGuidance && (
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>♻️ Recycling Guidance</Text>
              <Text style={s.guidanceText}>{analysis.recyclingGuidance}</Text>
            </View>
          )}

          {/* Reuse Ideas */}
          {analysis.reuseIdeas && analysis.reuseIdeas.length > 0 && (
            <View style={s.sectionCard}>
              <Text style={s.sectionTitle}>🔄 Reuse Ideas</Text>
              {analysis.reuseIdeas.map((idea, idx) => (
                <View key={idx} style={s.ideaItem}>
                  <Text style={s.ideaBullet}>•</Text>
                  <Text style={s.ideaText}>{idea}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={s.buttonsContainer}>
            <TouchableOpacity
              style={s.reAnalyzeBtn}
              onPress={() => {
                navigation.navigate("WasteAnalyzer");
              }}
            >
              <Text style={s.reAnalyzeBtnText}>🤖 Analyze Another Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>🗑️ Delete This Analysis</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 24, color: "#4ade80", fontWeight: "700" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
  },

  // Main Card
  mainCard: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  itemName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#f1f5f9",
    marginBottom: 12,
  },
  badgesRow: { flexDirection: "row", gap: 10 },
  badge: {
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  badgeText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },

  // Image Container
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  detailImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#0a0f1e",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4ade80",
    marginBottom: 4,
  },
  statLabel: { fontSize: 10, color: "#64748b", fontWeight: "600" },

  // Section Card
  sectionCard: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 12,
  },

  // Recommendation
  recommendationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0f1e",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  recEmoji: { fontSize: 28 },
  recContent: { flex: 1 },
  recLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4ade80",
    marginBottom: 4,
  },
  recDesc: { fontSize: 12, color: "#94a3b8" },

  // CO2 Comparison
  co2Comparison: {
    backgroundColor: "#0a0f1e",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  co2Item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  co2Icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  co2Label: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  co2Value: { fontSize: 13, fontWeight: "700", color: "#22c55e", marginTop: 2 },
  co2Vs: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginVertical: 4,
  },
  netBenefit: {
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  netBenefitLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  netBenefitValue: { fontSize: 16, fontWeight: "900", color: "#3b82f6" },

  // Hazard Warning
  hazardCard: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    borderLeftWidth: 4,
  },
  hazardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  hazardIcon: { fontSize: 24 },
  hazardTitle: { fontSize: 14, fontWeight: "800", color: "#ef4444", flex: 1 },
  hazardText: {
    fontSize: 12,
    color: "#fca5a5",
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: "600",
  },
  hazardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  hazardFooterIcon: { fontSize: 14 },
  hazardFooterText: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "700",
    flex: 1,
  },

  // Guidance & Ideas
  guidanceText: { fontSize: 13, color: "#94a3b8", lineHeight: 20 },
  ideaItem: { flexDirection: "row", gap: 10, marginBottom: 10 },
  ideaBullet: { color: "#4ade80", fontSize: 14, fontWeight: "700" },
  ideaText: { flex: 1, fontSize: 12, color: "#94a3b8", lineHeight: 18 },

  // Buttons
  buttonsContainer: { paddingHorizontal: 16, gap: 10 },
  reAnalyzeBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reAnalyzeBtnText: { color: "#0a0f1e", fontWeight: "800", fontSize: 14 },
  deleteBtn: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  deleteBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 13 },
});

export default AnalysisDetail;
