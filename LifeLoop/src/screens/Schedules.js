// src/screens/Schedules.js - React Native | Dark Theme
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  SectionList,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { scheduleAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────
const STATUS_COLORS = {
  proposed: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "PENDING" },
  confirmed: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    label: "CONFIRMED",
  },
  completed: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    label: "COMPLETED",
  },
  cancelled: {
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    label: "CANCELLED",
  },
};
const getStatus = (s) => STATUS_COLORS[s] || STATUS_COLORS.proposed;

const TABS = [
  { id: "all", label: "All" },
  { id: "donor", label: "Donating" },
  { id: "recipient", label: "Receiving" },
];

const STATUS_FILTERS = [
  { id: "all", label: "All", icon: "📋" },
  { id: "proposed", label: "Pending", icon: "⏳" },
  { id: "confirmed", label: "Confirmed", icon: "✅" },
  { id: "completed", label: "Done", icon: "🎉" },
];

const SORT_OPTIONS = [
  { id: "date-desc", label: "Newest first" },
  { id: "date-asc", label: "Oldest first" },
  { id: "status", label: "By status" },
];

const formatDateTime = (schedule) => {
  const raw = schedule.proposedDate || schedule.confirmedDate;
  if (!raw) return "Date TBD";
  const d = new Date(raw);
  const time = schedule.proposedTime || schedule.confirmedTime || "";
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${time ? ` · ${time}` : ""}`;
};

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────
const StatTile = ({ icon, value, label, color, delay }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      tension: 70,
      friction: 8,
    }).start();
  }, []);
  return (
    <Animated.View style={[s.statTile, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[s.statTileBar, { backgroundColor: color }]} />
      <Text style={s.statTileIcon}>{icon}</Text>
      <Text style={[s.statTileValue, { color }]}>{value}</Text>
      <Text style={s.statTileLabel}>{label}</Text>
    </Animated.View>
  );
};

const StatusChip = ({ status }) => {
  const meta = getStatus(status);
  return (
    <View
      style={[
        s.statusChip,
        { backgroundColor: meta.bg, borderColor: meta.color },
      ]}
    >
      <Text style={[s.statusChipText, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
};

const ScheduleCard = ({
  schedule,
  userRole,
  onConfirm,
  onComplete,
  onCancel,
  onTrack,
  onPress,
  isConfirming,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  const canConfirm = schedule.status === "proposed" && userRole === "recipient";
  const canComplete = schedule.status === "confirmed" && userRole === "donor";
  const canCancel = ["proposed", "confirmed"].includes(schedule.status);
  const canTrack = schedule.status === "confirmed";

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={s.scheduleCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Card header */}
        <View style={s.scheduleCardHeader}>
          <View style={s.scheduleCardImageBox}>
            {schedule.listing?.images?.[0] ? (
              <Image
                source={{ uri: schedule.listing.images[0] }}
                style={s.scheduleCardImage}
              />
            ) : (
              <Text style={s.scheduleCardImageEmoji}>📦</Text>
            )}
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.scheduleCardTitle} numberOfLines={1}>
              {schedule.listing?.title || "Donation Pickup"}
            </Text>
            <Text style={s.scheduleCardDateTime}>
              {formatDateTime(schedule)}
            </Text>
          </View>
          <StatusChip status={schedule.status} />
        </View>

        {/* Details */}
        <View style={s.scheduleCardDetails}>
          <View style={s.scheduleCardDetailRow}>
            <Text style={s.scheduleCardDetailIcon}>📍</Text>
            <Text style={s.scheduleCardDetailText} numberOfLines={1}>
              {schedule.pickupAddress ||
                schedule.pickupLocation ||
                "Location TBD"}
            </Text>
          </View>
          <View style={s.scheduleCardDetailRow}>
            <Text style={s.scheduleCardDetailIcon}>
              {userRole === "donor" ? "👤" : "🎁"}
            </Text>
            <Text style={s.scheduleCardDetailText}>
              {userRole === "donor"
                ? `Recipient: ${schedule.recipient?.firstName || "—"}`
                : `Donor: ${schedule.donor?.firstName || "—"}`}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {(canConfirm || canComplete || canCancel || canTrack) && (
          <View style={s.scheduleCardActions}>
            {canTrack && (
              <TouchableOpacity style={s.actionBtnTrack} onPress={onTrack}>
                <Text style={s.actionBtnText}>🚗 Track</Text>
              </TouchableOpacity>
            )}
            {canConfirm && (
              <TouchableOpacity
                style={[s.actionBtnConfirm, isConfirming && { opacity: 0.6 }]}
                onPress={onConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.actionBtnText}>✓ Confirm Pickup</Text>
                )}
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity
                style={s.actionBtnComplete}
                onPress={onComplete}
              >
                <Text style={s.actionBtnText}>✓ Complete</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity style={s.actionBtnCancel} onPress={onCancel}>
                <Text style={s.actionBtnCancelText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
const Schedules = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [confirmingId, setConfirmingId] = useState(null);
  const [showSort, setShowSort] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (!loading) fetchSchedules();
  }, [activeTab, statusFilter]);

  const fetchSchedules = async () => {
    try {
      const params = {};
      if (activeTab !== "all") params.role = activeTab;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await scheduleAPI.getMySchedules(params);
      setSchedules(res.data?.schedules || res.schedules || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load schedules" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConfirm = (id) => {
    Alert.alert("Confirm Pickup", "Confirm this pickup schedule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            setConfirmingId(id);
            await scheduleAPI.confirmSchedule(id, {});
            Toast.show({
              type: "success",
              text1: "Schedule confirmed! ✅",
              text2: "The donor has been notified.",
            });
            fetchSchedules();
          } catch {
            Toast.show({ type: "error", text1: "Failed to confirm" });
          } finally {
            setConfirmingId(null);
          }
        },
      },
    ]);
  };

  const handleComplete = (id) => {
    Alert.alert("Mark Complete", "Mark this pickup as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete 🎉",
        onPress: async () => {
          try {
            await scheduleAPI.completeSchedule(id);
            Toast.show({ type: "success", text1: "Pickup completed! 🎉" });
            fetchSchedules();
          } catch {
            Toast.show({ type: "error", text1: "Failed to complete" });
          }
        },
      },
    ]);
  };

  const handleCancel = (id) => {
    Alert.alert("Cancel Schedule", "Are you sure you want to cancel?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Schedule",
        style: "destructive",
        onPress: async () => {
          try {
            await scheduleAPI.cancelSchedule(id);
            Toast.show({ type: "success", text1: "Schedule cancelled" });
            fetchSchedules();
          } catch {
            Toast.show({ type: "error", text1: "Failed to cancel" });
          }
        },
      },
    ]);
  };

  const getUserRole = (schedule) =>
    schedule.donor?._id === user?._id ? "donor" : "recipient";

  // Stats
  const stats = useMemo(
    () => ({
      total: schedules.length,
      pending: schedules.filter((s) => s.status === "proposed").length,
      confirmed: schedules.filter((s) => s.status === "confirmed").length,
      completed: schedules.filter((s) => s.status === "completed").length,
    }),
    [schedules],
  );

  // Tabs counts
  const tabCounts = useMemo(
    () => ({
      all: schedules.length,
      donor: schedules.filter((s) => s.donor?._id === user?._id).length,
      recipient: schedules.filter((s) => s.recipient?._id === user?._id).length,
    }),
    [schedules, user],
  );

  // Sorted list
  const sorted = useMemo(() => {
    const arr = [...schedules];
    const ORDER = { proposed: 0, confirmed: 1, completed: 2, cancelled: 3 };
    switch (sortBy) {
      case "date-asc":
        return arr.sort(
          (a, b) => new Date(a.proposedDate) - new Date(b.proposedDate),
        );
      case "date-desc":
        return arr.sort(
          (a, b) => new Date(b.proposedDate) - new Date(a.proposedDate),
        );
      case "status":
        return arr.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
      default:
        return arr;
    }
  }, [schedules, sortBy]);

  // Pending approvals: schedules where I'm the recipient and status is proposed
  const pendingApprovals = useMemo(
    () =>
      schedules.filter(
        (s) => s.recipient?._id === user?._id && s.status === "proposed",
      ),
    [schedules, user],
  );
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.loadingText}>Loading schedules…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSchedules();
            }}
            tintColor="#4ade80"
          />
        }
        ListHeaderComponent={() => (
          <Animated.View style={{ opacity: headerAnim }}>
            {/* ── Page header ── */}
            <View style={s.pageHeader}>
              <View>
                <Text style={s.pageTitle}>📅 Schedules</Text>
                <Text style={s.pageSub}>Manage your pickup appointments</Text>
              </View>
              {/* Sort button */}
              <TouchableOpacity
                style={s.sortBtn}
                onPress={() => setShowSort((p) => !p)}
              >
                <Text style={s.sortBtnText}>⇅ Sort</Text>
              </TouchableOpacity>
            </View>

            {/* ── Pending Approvals Banner ── */}
            {pendingApprovals.length > 0 && (
              <View style={s.pendingBanner}>
                <View style={s.pendingBannerLeft}>
                  <Text style={s.pendingBannerIcon}>🔔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pendingBannerTitle}>
                      {pendingApprovals.length} Pickup
                      {pendingApprovals.length > 1 ? "s" : ""} Awaiting Your
                      Approval
                    </Text>
                    <Text style={s.pendingBannerSub}>
                      Donors are waiting for you to confirm
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.pendingBannerBtn}
                  onPress={() => {
                    setActiveTab("recipient");
                    setStatusFilter("proposed");
                  }}
                >
                  <Text style={s.pendingBannerBtnText}>Review</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Sort dropdown */}
            {showSort && (
              <View style={s.sortDropdown}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      s.sortOption,
                      sortBy === opt.id && s.sortOptionActive,
                    ]}
                    onPress={() => {
                      setSortBy(opt.id);
                      setShowSort(false);
                    }}
                  >
                    <Text
                      style={[
                        s.sortOptionText,
                        sortBy === opt.id && s.sortOptionTextActive,
                      ]}
                    >
                      {sortBy === opt.id ? "● " : "○ "}
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Stats row ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.statsRow}
            >
              <StatTile
                icon="📋"
                value={stats.total}
                label="Total"
                color="#94a3b8"
                delay={0}
              />
              <StatTile
                icon="⏳"
                value={stats.pending}
                label="Pending"
                color="#fbbf24"
                delay={60}
              />
              <StatTile
                icon="✅"
                value={stats.confirmed}
                label="Confirmed"
                color="#4ade80"
                delay={120}
              />
              <StatTile
                icon="🎉"
                value={stats.completed}
                label="Done"
                color="#60a5fa"
                delay={180}
              />
            </ScrollView>

            {/* ── Tabs ── */}
            <View style={s.tabRow}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[s.tab, activeTab === tab.id && s.tabActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text
                    style={[s.tabText, activeTab === tab.id && s.tabTextActive]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      s.tabCount,
                      activeTab === tab.id && s.tabCountActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.tabCountText,
                        activeTab === tab.id && s.tabCountTextActive,
                      ]}
                    >
                      {tabCounts[tab.id]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Status filters ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.filtersRow}
            >
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    s.filterChip,
                    statusFilter === f.id && s.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(f.id)}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      statusFilter === f.id && s.filterChipTextActive,
                    ]}
                  >
                    {f.icon} {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {sorted.length === 0 && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyIcon}>📅</Text>
                <Text style={s.emptyTitle}>No schedules found</Text>
                <Text style={s.emptySub}>
                  {statusFilter === "all"
                    ? "You don't have any pickup schedules yet"
                    : `No ${statusFilter} schedules`}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
        renderItem={({ item }) => (
          <View style={s.cardWrap}>
            <ScheduleCard
              schedule={item}
              userRole={getUserRole(item)}
              onConfirm={() => handleConfirm(item._id)}
              onComplete={() => handleComplete(item._id)}
              onCancel={() => handleCancel(item._id)}
              onTrack={() =>
                navigation.navigate("Tracking", { scheduleId: item._id })
              }
              onPress={() =>
                navigation.navigate("ScheduleDetails", { id: item._id })
              }
              isConfirming={confirmingId === item._id}
            />
          </View>
        )}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#94a3b8", fontSize: 14 },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  pageSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  sortBtn: {
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  sortBtnText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },

  // Sort dropdown
  sortDropdown: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
    overflow: "hidden",
  },
  sortOption: { paddingVertical: 13, paddingHorizontal: 16 },
  sortOptionActive: { backgroundColor: "rgba(74,222,128,0.08)" },
  sortOptionText: { color: "#94a3b8", fontSize: 14 },
  sortOptionTextActive: { color: "#4ade80", fontWeight: "700" },

  // Stats
  statsRow: { paddingLeft: 16, marginVertical: 12 },
  statTile: {
    width: 100,
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
    position: "relative",
    overflow: "hidden",
  },
  statTileBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  statTileIcon: { fontSize: 20, marginBottom: 6 },
  statTileValue: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statTileLabel: { fontSize: 10, color: "#64748b", fontWeight: "600" },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#131c2e",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  tabActive: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  tabText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  tabTextActive: { color: "#0a0f1e" },
  tabCount: {
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  tabCountActive: { backgroundColor: "rgba(0,0,0,0.2)" },
  tabCountText: { fontSize: 10, color: "#64748b", fontWeight: "700" },
  tabCountTextActive: { color: "#0a0f1e" },

  // Status filters
  filtersRow: { paddingLeft: 16, marginBottom: 14 },
  filterChip: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  filterChipActive: {
    backgroundColor: "rgba(74,222,128,0.12)",
    borderColor: "#4ade80",
  },
  filterChipText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  filterChipTextActive: { color: "#4ade80" },

  // Schedule card
  cardWrap: { paddingHorizontal: 16, marginBottom: 10 },
  scheduleCard: {
    backgroundColor: "#131c2e",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  scheduleCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  scheduleCardImageBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
    overflow: "hidden",
  },
  scheduleCardImage: { width: 52, height: 52 },
  scheduleCardImageEmoji: { fontSize: 24 },
  scheduleCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 3,
  },
  scheduleCardDateTime: { fontSize: 11, color: "#64748b" },

  scheduleCardDetails: { gap: 6, marginBottom: 12 },
  scheduleCardDetailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  scheduleCardDetailIcon: { fontSize: 13 },
  scheduleCardDetailText: { fontSize: 12, color: "#94a3b8", flex: 1 },

  scheduleCardActions: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
    paddingTop: 12,
  },
  actionBtnTrack: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    alignItems: "center",
  },
  actionBtnConfirm: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#4ade80",
    alignItems: "center",
  },
  actionBtnComplete: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#4ade80",
    alignItems: "center",
  },
  actionBtnCancel: {
    width: 38,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#1e2d45",
    alignItems: "center",
  },
  actionBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 13 },
  actionBtnCancelText: { color: "#f87171", fontWeight: "700", fontSize: 13 },

  // Status chip
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 9, fontWeight: "800" },

  // Empty
  emptyWrap: { alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  emptySub: { fontSize: 13, color: "#64748b", textAlign: "center" },

  // Pending approvals banner
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginHorizontal: 0,
    gap: 10,
  },
  pendingBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pendingBannerIcon: { fontSize: 22 },
  pendingBannerTitle: { fontSize: 13, fontWeight: "700", color: "#fbbf24" },
  pendingBannerSub: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  pendingBannerBtn: {
    backgroundColor: "#fbbf24",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingBannerBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 12 },
});

export default Schedules;
