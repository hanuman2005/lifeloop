// src/screens/Notifications.js - React Native | Dark Theme | Feed Style
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useSocket } from "../context/SocketContext";
import { useNotifications } from "../context/NotificationContext";
import api, { listingsAPI } from "../services/api";
import Toast from "react-native-toast-message";

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const ICON_MAP = {
  new_listing: "🎁",
  message: "💬",
  interest: "👋",
  assignment: "🎉",
  rating: "⭐",
  completion: "✅",
  pickup_completed: "✅",
  system: "📢",
};
const getIcon = (type) => ICON_MAP[type] || "🔔";

const ICON_BG = {
  message: "#1e3a5f",
  interest: "#1a3a2a",
  assignment: "#2d1f5e",
  rating: "#3d2e00",
  completion: "#1a3a2a",
  pickup_completed: "#1a3a2a",
  system: "#1e293b",
};
const getIconBg = (type) => ICON_BG[type] || "#1e293b";

const formatTime = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const groupByDate = (notifs) => {
  const groups = { Today: [], Yesterday: [], "This Week": [], Older: [] };
  notifs.forEach((n) => {
    const diffDays = Math.floor(
      (Date.now() - new Date(n.createdAt)) / 86400000,
    );
    if (diffDays === 0) groups["Today"].push(n);
    else if (diffDays === 1) groups["Yesterday"].push(n);
    else if (diffDays < 7) groups["This Week"].push(n);
    else groups["Older"].push(n);
  });
  // Build SectionList-compatible array, skip empty groups
  return Object.entries(groups)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
};

// ─────────────────────────────────────────
// Notification Card
// ─────────────────────────────────────────
const NotifCard = ({
  notif,
  onRead,
  onDelete,
  onNavigate,
  onNavigateWithType,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    if (!notif.read) onRead(notif._id);
    if (notif.actionUrl) onNavigateWithType(notif);
  };

  const handleDelete = () => {
    Alert.alert("Delete Notification", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(notif._id),
      },
    ]);
  };

  return (
    <Animated.View
      style={[
        s.cardWrap,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[s.card, notif.read && s.cardRead]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Unread indicator */}
        {!notif.read && <View style={s.unreadBar} />}

        <View style={[s.iconBox, { backgroundColor: getIconBg(notif.type) }]}>
          <Text style={s.iconText}>{getIcon(notif.type)}</Text>
        </View>

        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text
              style={[s.cardTitle, notif.read && s.cardTitleRead]}
              numberOfLines={1}
            >
              {notif.title}
            </Text>
            <Text style={s.cardTime}>{formatTime(notif.createdAt)}</Text>
          </View>

          <Text style={s.cardMessage} numberOfLines={2}>
            {notif.message}
          </Text>

          {/* Action buttons */}
          <View style={s.cardActions}>
            {notif.actionUrl && (
              <TouchableOpacity
                style={s.viewBtn}
                onPress={() => {
                  if (!notif.read) onRead(notif._id);
                  onNavigateWithType(notif.actionUrl, notif.type, notif.data);
                }}
              >
                <Text style={s.viewBtnText}>View →</Text>
              </TouchableOpacity>
            )}
            {!notif.read && (
              <TouchableOpacity
                style={s.markReadBtn}
                onPress={(e) => {
                  onRead(notif._id);
                }}
              >
                <Text style={s.markReadText}>✓ Mark read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Section header
const SectionHeader = ({ title }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionDot} />
    <Text style={s.sectionTitle}>{title}</Text>
    <View style={s.sectionLine} />
  </View>
);

// Empty state
const EmptyState = ({ filter }) => {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={s.emptyWrap}>
      <Animated.Text
        style={[s.emptyIcon, { transform: [{ translateY: bounce }] }]}
      >
        🔔
      </Animated.Text>
      <Text style={s.emptyTitle}>
        {filter === "unread" ? "All caught up!" : "No notifications yet"}
      </Text>
      <Text style={s.emptySub}>
        {filter === "unread"
          ? "You have no unread notifications"
          : "We'll notify you when something important happens"}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────
// Filter pill
// ─────────────────────────────────────────
const FilterPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[s.filterPill, active && s.filterPillActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[s.filterPillText, active && s.filterPillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
const Notifications = () => {
  const navigation = useNavigation();
  const { socket } = useSocket();
  const { unreadCount, setUnreadCount, fetchUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    fetchNotifications();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      fetchUnreadCount();
    };
    socket.on("newNotification", handler);
    return () => socket.off("newNotification", handler);
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const params = filter === "unread" ? { unreadOnly: true } : {};
      const res = await api.get("/notifications", { params });
      setNotifications(res.data.notifications || []);
      fetchUnreadCount();
    } catch (err) {
      console.warn("Notifications fetch error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      fetchUnreadCount();
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotification = async (id) => {
    // Animate out then remove
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {}
  };

  const handleNavigate = async (notif) => {
    // Check if this is an assignment notification
    if (notif.type === "assignment" && notif.data?.listingId) {
      try {
        // Fetch full listing details for AcceptAssignment screen
        const response = await listingsAPI.getById(notif.data.listingId);
        const listing = response.data.listing || response.data;

        navigation.navigate("AcceptAssignment", {
          listingId: listing._id,
          listingTitle: listing.title,
          listingImage: listing.image || listing.images?.[0],
          donorId: listing.donor._id,
          donorName: `${listing.donor.firstName} ${listing.donor.lastName}`,
          donorRating: listing.donor.rating || 0,
          donorReviews: listing.donor.reviews || 0,
          distance: listing.distance || 0,
        });
      } catch (error) {
        console.error("Error fetching listing for assignment:", error);
        Toast.show({
          type: "error",
          text1: "Could not load assignment details",
        });
      }
      return;
    }

    // Default route handling for other notification types
    const actionUrl = notif.actionUrl;
    const route = actionUrl?.replace(/^\//, "").split("/");

    if (!route) return;
    if (route[0] === "listings" && route[1]) {
      navigation.navigate("ListingDetails", { id: route[1] });
    } else if (route[0] === "schedules" && route[1]) {
      navigation.navigate("Schedules");
    } else if (route[0] === "chat" && route[1]) {
      navigation.navigate("Chat", { chatId: route[1] });
    } else if (route[0] === "profile") {
      navigation.navigate("Main", { screen: "Profile" });
    } else {
      navigation.navigate("Main");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const sections = groupByDate(notifications);

  // ─── Loading ───
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.loadingText}>Loading notifications…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <View style={s.headerTop}>
          <View>
            <View style={s.titleRow}>
              <Text style={s.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.headerSub}>
              {notifications.length} total · {unreadCount} unread
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAllAsRead}>
              <Text style={s.markAllBtnText}>✓ All read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <View style={s.filterRow}>
          <FilterPill
            label="All"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterPill
            label={`Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
            active={filter === "unread"}
            onPress={() => setFilter("unread")}
          />
        </View>
      </Animated.View>
      {/* ── Content ── */}
      {notifications.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} />
          )}
          renderItem={({ item }) => (
            <NotifCard
              notif={item}
              onRead={markAsRead}
              onDelete={deleteNotification}
              onNavigate={handleNavigate}
              onNavigateWithType={handleNavigate}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4ade80"
            />
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
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

  // ── Header ──
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
    backgroundColor: "#0a0f1e",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 3 },
  unreadBadge: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  unreadBadgeText: { color: "#0a0f1e", fontSize: 12, fontWeight: "800" },

  markAllBtn: {
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  markAllBtnText: { color: "#4ade80", fontSize: 12, fontWeight: "700" },

  // ── Filters ──
  filterRow: { flexDirection: "row", gap: 8 },
  filterPill: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  filterPillActive: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  filterPillText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  filterPillTextActive: { color: "#0a0f1e" },

  // ── List ──
  listContent: { paddingTop: 8, paddingHorizontal: 16 },

  // ── Section header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingTop: 20,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4ade80",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1e2d45",
  },

  // ── Card ──
  cardWrap: { marginBottom: 8 },
  card: {
    flexDirection: "row",
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  cardRead: { opacity: 0.65 },

  // Unread left bar
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#4ade80",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // Icon box
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: { fontSize: 20 },

  // Card body
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    flex: 1,
    marginRight: 8,
  },
  cardTitleRead: { color: "#94a3b8", fontWeight: "600" },
  cardTime: { fontSize: 11, color: "#64748b", flexShrink: 0, marginTop: 1 },
  cardMessage: { fontSize: 13, color: "#94a3b8", lineHeight: 19 },

  // Action row
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  viewBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  viewBtnText: { color: "#0a0f1e", fontSize: 12, fontWeight: "700" },
  markReadBtn: {
    backgroundColor: "#1e2d45",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#334155",
  },
  markReadText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  deleteBtn: { marginLeft: "auto", padding: 4 },
  deleteBtnText: { fontSize: 16 },

  // ── Empty state ──
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
  },
});

export default Notifications;
