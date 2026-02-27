// src/screens/EcoPointsScreen.js
// Priority 1 — Eco Points + Waste Diary + Leaderboard
// Every action in the app earns points — this screen shows progress

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SW } = Dimensions.get("window");
const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// ─── Level config ─────────────────────────────────────────────────────────
const LEVELS = [
  { name: "Eco Beginner", emoji: "🌍", min: 0, color: "#6b7280" },
  { name: "Eco Learner", emoji: "📚", min: 100, color: "#3b82f6" },
  { name: "Eco Enthusiast", emoji: "🌱", min: 500, color: "#10b981" },
  { name: "Green Guardian", emoji: "🌿", min: 1000, color: "#059669" },
  { name: "Waste Warrior", emoji: "⚔️", min: 2000, color: "#f59e0b" },
  { name: "Eco Champion", emoji: "🏆", min: 5000, color: "#ef4444" },
];

const ACTION_CONFIG = {
  scan: { label: "Item Scanned", icon: "📸", color: "#3b82f6" },
  reuse_project: { label: "Reuse Project Done", icon: "♻️", color: "#10b981" },
  upcycle_project: {
    label: "Upcycle Project Done",
    icon: "🎨",
    color: "#8b5cf6",
  },
  pickup_request: { label: "Pickup Scheduled", icon: "🚛", color: "#f59e0b" },
  donate: { label: "Item Donated", icon: "🎁", color: "#ec4899" },
  share: { label: "Shared App", icon: "📤", color: "#06b6d4" },
  streak_bonus: { label: "Daily Streak", icon: "🔥", color: "#ef4444" },
};

const POINTS_GUIDE = [
  { action: "Scan any waste item", points: 5, icon: "📸" },
  { action: "Complete reuse project", points: 20, icon: "♻️" },
  { action: "Complete upcycle project", points: 25, icon: "🎨" },
  { action: "Schedule pickup", points: 30, icon: "🚛" },
  { action: "Donate an item", points: 25, icon: "🎁" },
  { action: "Daily login streak", points: 15, icon: "🔥" },
];

export default function EcoPointsScreen() {
  const nav = useNavigation();
  const [tab, setTab] = useState("points"); // points | diary | leaderboard
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [diary, setDiary] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const getToken = async () => AsyncStorage.getItem("token");

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [pointsRes, diaryRes] = await Promise.all([
        fetch(`${API}/api/eco/points`, { headers }),
        fetch(`${API}/api/eco/diary`, { headers }),
      ]);

      const pointsJson = await pointsRes.json();
      const diaryJson = await diaryRes.json();

      if (pointsJson.success) {
        setData(pointsJson.data);
        Animated.timing(progressAnim, {
          toValue: (pointsJson.data.progressToNext || 0) / 100,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
      if (diaryJson.success) setDiary(diaryJson.data);
    } catch (err) {
      console.error("EcoPoints load error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLeaderboard = async () => {
    if (leaderboard) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/eco/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setLeaderboard(json.data);
    } catch (err) {
      console.error("Leaderboard error:", err.message);
    }
  };

  const onTabChange = (t) => {
    setTab(t);
    if (t === "leaderboard") loadLeaderboard();
  };

  const currentLevel = data
    ? LEVELS.find((l) => l.name === data.level.replace(/ [^\w]/g, "").trim()) ||
      LEVELS.find((l) => data.level.includes(l.name)) ||
      LEVELS[0]
    : LEVELS[0];

  if (loading)
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={s.loadingText}>Loading your eco journey...</Text>
      </View>
    );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Eco Points</Text>
        <View style={s.pointsBadge}>
          <Text style={s.pointsBadgeText}>{data?.totalPoints || 0} pts</Text>
        </View>
      </Animated.View>

      {/* Level Card */}
      {data && (
        <View style={[s.levelCard, { borderColor: currentLevel.color }]}>
          <View style={s.levelLeft}>
            <Text style={s.levelEmoji}>{currentLevel.emoji}</Text>
            <View>
              <Text style={s.levelName}>{data.level}</Text>
              <Text style={s.levelPoints}>{data.totalPoints} total points</Text>
            </View>
          </View>
          <View style={s.levelRight}>
            <Text style={s.nextLevelText}>
              Next: {data.nextLevel?.name?.split(" ").slice(0, 2).join(" ")}
            </Text>
            <View style={s.progressBar}>
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: currentLevel.color,
                  },
                ]}
              />
            </View>
            <Text style={s.progressPct}>{data.progressToNext}%</Text>
          </View>
        </View>
      )}

      {/* Stats row */}
      {data && (
        <View style={s.statsRow}>
          {[
            { label: "Scans", value: data.stats.totalScans, icon: "📸" },
            { label: "Pickups", value: data.stats.totalPickups, icon: "🚛" },
            {
              label: "Donations",
              value: data.stats.totalDonations,
              icon: "🎁",
            },
            {
              label: "CO₂ Saved",
              value: `${data.stats.co2Saved?.toFixed(1)}kg`,
              icon: "🌿",
            },
          ].map((s2, i) => (
            <View key={i} style={s.statBox}>
              <Text style={s.statIcon}>{s2.icon}</Text>
              <Text style={s.statValue}>{s2.value}</Text>
              <Text style={s.statLabel}>{s2.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {["points", "diary", "leaderboard"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => onTabChange(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === "points"
                ? "📊 Points"
                : t === "diary"
                  ? "📔 Diary"
                  : "🏆 Board"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#27ae60"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── POINTS TAB ────────────────────────────────────────────── */}
        {tab === "points" && (
          <View style={s.tabContent}>
            {/* How to earn */}
            <Text style={s.sectionTitle}>How to Earn Points</Text>
            {POINTS_GUIDE.map((g, i) => (
              <View key={i} style={s.earnRow}>
                <Text style={s.earnIcon}>{g.icon}</Text>
                <Text style={s.earnAction}>{g.action}</Text>
                <View style={s.earnBadge}>
                  <Text style={s.earnPoints}>+{g.points}</Text>
                </View>
              </View>
            ))}

            {/* Recent transactions */}
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>
              Recent Activity
            </Text>
            {data?.recentTransactions?.length > 0 ? (
              data.recentTransactions.map((tx, i) => {
                const cfg = ACTION_CONFIG[tx.action] || {
                  label: tx.action,
                  icon: "✅",
                  color: "#27ae60",
                };
                return (
                  <View key={i} style={s.txRow}>
                    <View
                      style={[s.txIcon, { backgroundColor: cfg.color + "22" }]}
                    >
                      <Text style={s.txIconText}>{cfg.icon}</Text>
                    </View>
                    <View style={s.txInfo}>
                      <Text style={s.txLabel}>{tx.description}</Text>
                      <Text style={s.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                      </Text>
                    </View>
                    <Text style={[s.txPoints, { color: cfg.color }]}>
                      +{tx.points}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📸</Text>
                <Text style={s.emptyText}>No activity yet</Text>
                <Text style={s.emptySubtext}>
                  Scan your first waste item to earn 5 points!
                </Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => nav.navigate("WasteAnalyzer")}
                >
                  <Text style={s.emptyBtnText}>Scan Now →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── DIARY TAB ─────────────────────────────────────────────── */}
        {tab === "diary" && diary && (
          <View style={s.tabContent}>
            {/* Monthly summary */}
            <Text style={s.sectionTitle}>This Month — {diary.month}</Text>
            <View style={s.diaryGrid}>
              {[
                {
                  label: "Items",
                  value: diary.summary.totalItems,
                  icon: "📦",
                  color: "#3b82f6",
                },
                {
                  label: "Weight",
                  value: `${diary.summary.totalWeightKg}kg`,
                  icon: "⚖️",
                  color: "#8b5cf6",
                },
                {
                  label: "CO₂ Saved",
                  value: `${diary.summary.totalCo2Saved}kg`,
                  icon: "🌿",
                  color: "#10b981",
                },
                {
                  label: "Points",
                  value: diary.summary.totalPoints,
                  icon: "⭐",
                  color: "#f59e0b",
                },
              ].map((d, i) => (
                <View key={i} style={[s.diaryCard, { borderColor: d.color }]}>
                  <Text style={s.diaryCardIcon}>{d.icon}</Text>
                  <Text style={[s.diaryCardValue, { color: d.color }]}>
                    {d.value}
                  </Text>
                  <Text style={s.diaryCardLabel}>{d.label}</Text>
                </View>
              ))}
            </View>

            {/* Category breakdown */}
            {diary.summary.totalItems > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>
                  By Category
                </Text>
                {Object.entries(diary.summary.byCategory)
                  .filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count], i) => (
                    <View key={i} style={s.catRow}>
                      <Text style={s.catName}>{cat}</Text>
                      <View style={s.catBarBg}>
                        <View
                          style={[
                            s.catBar,
                            {
                              width: `${Math.min((count / diary.summary.totalItems) * 100, 100)}%`,
                              backgroundColor: "#27ae60",
                            },
                          ]}
                        />
                      </View>
                      <Text style={s.catCount}>{count}</Text>
                    </View>
                  ))}
              </>
            )}

            {/* Monthly trend */}
            {diary.trend?.length > 1 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>
                  6-Month Trend
                </Text>
                <View style={s.trendRow}>
                  {diary.trend.map((t, i) => (
                    <View key={i} style={s.trendItem}>
                      <View
                        style={[
                          s.trendBar,
                          {
                            height: Math.max(
                              (t.totalItems /
                                Math.max(
                                  ...diary.trend.map((x) => x.totalItems),
                                  1,
                                )) *
                                80,
                              4,
                            ),
                            backgroundColor:
                              i === diary.trend.length - 1
                                ? "#27ae60"
                                : "#1e3a2f",
                          },
                        ]}
                      />
                      <Text style={s.trendMonth}>{t.month.slice(5)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Recent entries */}
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>
              Recent Entries
            </Text>
            {diary.entries?.length > 0 ? (
              diary.entries.slice(0, 10).map((e, i) => (
                <View key={i} style={s.entryRow}>
                  <View style={s.entryLeft}>
                    <Text style={s.entryItem}>{e.itemLabel}</Text>
                    <Text style={s.entrySub}>
                      {e.category} · {e.action} ·{" "}
                      {new Date(e.date).toLocaleDateString("en-IN")}
                    </Text>
                  </View>
                  <View style={s.entryRight}>
                    <Text style={s.entryPoints}>+{e.pointsEarned}pts</Text>
                    <Text style={s.entryCo2}>
                      {e.co2Saved?.toFixed(2)}kg CO₂
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📔</Text>
                <Text style={s.emptyText}>No diary entries yet</Text>
                <Text style={s.emptySubtext}>
                  Every waste action gets recorded here automatically
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── LEADERBOARD TAB ───────────────────────────────────────── */}
        {tab === "leaderboard" && (
          <View style={s.tabContent}>
            {leaderboard ? (
              <>
                <View style={s.myRankBox}>
                  <Text style={s.myRankLabel}>Your Rank</Text>
                  <Text style={s.myRankValue}>#{leaderboard.myRank}</Text>
                  <Text style={s.myRankSub}>among all LifeLoop users</Text>
                </View>

                {leaderboard.leaderboard.map((user, i) => (
                  <View key={i} style={[s.rankRow, i < 3 && s.rankRowTop]}>
                    <Text
                      style={[
                        s.rankNum,
                        i === 0 && { color: "#f59e0b" },
                        i === 1 && { color: "#9ca3af" },
                        i === 2 && { color: "#b45309" },
                      ]}
                    >
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${user.rank}`}
                    </Text>
                    <View style={s.rankInfo}>
                      <Text style={s.rankName}>{user.name}</Text>
                      <Text style={s.rankLevel}>{user.level}</Text>
                    </View>
                    <View style={s.rankRight}>
                      <Text style={s.rankPoints}>{user.totalPoints}</Text>
                      <Text style={s.rankPtsLabel}>pts</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.centered}>
                <ActivityIndicator color="#27ae60" />
              </View>
            )}
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

  // Header
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
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },
  pointsBadge: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pointsBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Level card
  levelCard: {
    marginHorizontal: 16,
    backgroundColor: "#0d1b2e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  levelLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelEmoji: { fontSize: 36 },
  levelName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  levelPoints: { color: "#7f8c8d", fontSize: 12, marginTop: 2 },
  levelRight: { alignItems: "flex-end" },
  nextLevelText: { color: "#7f8c8d", fontSize: 11, marginBottom: 6 },
  progressBar: {
    width: 100,
    height: 6,
    backgroundColor: "#1a2744",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressPct: {
    color: "#27ae60",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { color: "#27ae60", fontSize: 14, fontWeight: "700" },
  statLabel: { color: "#7f8c8d", fontSize: 10, marginTop: 2 },

  // Tabs
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: "#27ae60" },
  tabText: { color: "#7f8c8d", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  scroll: { flex: 1 },
  tabContent: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  // Earn guide
  earnRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  earnIcon: { fontSize: 24, marginRight: 12 },
  earnAction: { flex: 1, color: "#cdd9e5", fontSize: 14 },
  earnBadge: {
    backgroundColor: "#27ae6022",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27ae60",
  },
  earnPoints: { color: "#27ae60", fontWeight: "700", fontSize: 13 },

  // Transactions
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txLabel: { color: "#cdd9e5", fontSize: 14 },
  txDate: { color: "#7f8c8d", fontSize: 12, marginTop: 2 },
  txPoints: { fontSize: 16, fontWeight: "700" },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtext: {
    color: "#7f8c8d",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700" },

  // Diary
  diaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  diaryCard: {
    width: (SW - 52) / 2,
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  diaryCardIcon: { fontSize: 24, marginBottom: 6 },
  diaryCardValue: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
  diaryCardLabel: { color: "#7f8c8d", fontSize: 12 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  catName: { color: "#cdd9e5", fontSize: 13, width: 80 },
  catBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#1a2744",
    borderRadius: 4,
    overflow: "hidden",
  },
  catBar: { height: "100%", borderRadius: 4 },
  catCount: {
    color: "#27ae60",
    fontWeight: "700",
    fontSize: 13,
    width: 24,
    textAlign: "right",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 16,
    height: 120,
    gap: 8,
  },
  trendItem: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  trendBar: { width: "80%", borderRadius: 4 },
  trendMonth: { color: "#7f8c8d", fontSize: 10, marginTop: 4 },
  entryRow: {
    flexDirection: "row",
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    justifyContent: "space-between",
  },
  entryLeft: { flex: 1 },
  entryItem: { color: "#fff", fontSize: 14, fontWeight: "600" },
  entrySub: { color: "#7f8c8d", fontSize: 11, marginTop: 2 },
  entryRight: { alignItems: "flex-end" },
  entryPoints: { color: "#27ae60", fontWeight: "700", fontSize: 13 },
  entryCo2: { color: "#7f8c8d", fontSize: 11, marginTop: 2 },

  // Leaderboard
  myRankBox: {
    backgroundColor: "#1e3a2f",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27ae60",
  },
  myRankLabel: { color: "#7f8c8d", fontSize: 13 },
  myRankValue: { color: "#27ae60", fontSize: 48, fontWeight: "800" },
  myRankSub: { color: "#7f8c8d", fontSize: 12 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  rankRowTop: { borderWidth: 1, borderColor: "#f59e0b33" },
  rankNum: {
    color: "#7f8c8d",
    fontSize: 18,
    width: 36,
    textAlign: "center",
    fontWeight: "700",
  },
  rankInfo: { flex: 1 },
  rankName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  rankLevel: { color: "#7f8c8d", fontSize: 12, marginTop: 2 },
  rankRight: { alignItems: "flex-end" },
  rankPoints: { color: "#27ae60", fontSize: 18, fontWeight: "700" },
  rankPtsLabel: { color: "#7f8c8d", fontSize: 11 },
});
