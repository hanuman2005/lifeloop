// src/screens/MyPickups.js - React Native | Dark Theme
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";

// QR placeholder — replace with expo-barcode-scanner or react-native-qrcode-svg
const QRDisplay = ({ listingId, recipientId, title, recipientName }) => {
  const qrData = JSON.stringify({
    listingId,
    recipientId,
    type: "pickup",
    ts: Date.now(),
  });
  return (
    <View style={q.wrap}>
      <Text style={q.title}>📱 Pickup QR Code</Text>
      {/* ── Replace this View with <QRCode value={qrData} size={160} /> ── */}
      <View style={q.qrBox}>
        <Text style={q.qrIcon}>▩</Text>
        <Text style={q.qrSub}>QR Code</Text>
        <Text style={q.qrId} numberOfLines={1} selectable>
          {listingId.slice(-8)}
        </Text>
      </View>
      {/* ─────────────────────────────────────── */}
      <Text style={q.hint}>Show this to {recipientName} at pickup</Text>
    </View>
  );
};

const q = StyleSheet.create({
  wrap: {
    marginTop: 14,
    backgroundColor: "#0a0f1e",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 12,
  },
  qrBox: {
    width: 140,
    height: 140,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  qrIcon: { fontSize: 72, color: "#0a0f1e" },
  qrSub: { fontSize: 11, color: "#64748b", marginTop: 4 },
  qrId: { fontSize: 10, color: "#94a3b8", marginTop: 2 },
  hint: { fontSize: 12, color: "#64748b", textAlign: "center" },
});

// ── Status chip ──
const StatusChip = ({ status }) => {
  const map = {
    pending: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    completed: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    available: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
    expired: { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  };
  const c = map[status] || map.pending;
  return (
    <View
      style={[s.statusChip, { backgroundColor: c.bg, borderColor: c.color }]}
    >
      <Text style={[s.statusChipText, { color: c.color }]}>
        {status?.toUpperCase()}
      </Text>
    </View>
  );
};

// ── Pickup Card ──
const PickupCard = ({ listing, showQR, onToggleQR, onViewDetails }) => {
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

  const recipientName = listing.assignedTo
    ? `${listing.assignedTo.firstName || ""} ${listing.assignedTo.lastName || ""}`.trim()
    : "You";

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
    >
      <View style={s.card}>
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={s.cardImageBox}>
            {listing.images?.[0] ? (
              <Image source={{ uri: listing.images[0] }} style={s.cardImage} />
            ) : (
              <Text style={s.cardImageEmoji}>📦</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={2}>
              {listing.title}
            </Text>
            <StatusChip status={listing.status} />
          </View>
        </View>

        {/* Details */}
        <View style={s.cardDetails}>
          {[
            {
              icon: "📦",
              label: "Quantity",
              value: `${listing.quantity} ${listing.unit || "items"}`,
            },
            {
              icon: "🎁",
              label: "Donor",
              value:
                `${listing.donor?.firstName || ""} ${listing.donor?.lastName || ""}`.trim(),
            },
            { icon: "📍", label: "Location", value: listing.pickupLocation },
            ...(listing.scheduledPickup
              ? [
                  {
                    icon: "📅",
                    label: "Pickup",
                    value: `${new Date(listing.scheduledPickup.date).toLocaleDateString()} ${listing.scheduledPickup.timeSlot || ""}`,
                  },
                ]
              : []),
          ].map((row, i, arr) => (
            <View
              key={i}
              style={[s.detailRow, i < arr.length - 1 && s.detailRowBorder]}
            >
              <Text style={s.detailIcon}>{row.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.detailLabel}>{row.label}</Text>
                <Text style={s.detailValue} numberOfLines={1}>
                  {row.value || "—"}
                </Text>
              </View>
            </View>
          ))}

          {listing.scheduledPickup?.recipientNotes && (
            <View style={s.noteBubble}>
              <Text style={s.noteBubbleLabel}>💬 Notes</Text>
              <Text style={s.noteBubbleText}>
                {listing.scheduledPickup.recipientNotes}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.qrBtn}
            onPress={onToggleQR}
            activeOpacity={0.85}
          >
            <Text style={s.qrBtnText}>
              {showQR ? "🔒 Hide QR" : "📱 Show QR"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.detailsBtn}
            onPress={onViewDetails}
            activeOpacity={0.85}
          >
            <Text style={s.detailsBtnText}>📋 Details</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        {showQR && (
          <QRDisplay
            listingId={listing._id}
            recipientId={listing.assignedTo?._id || ""}
            title={listing.title}
            recipientName={recipientName}
          />
        )}
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
const MyPickups = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shownQR, setShownQR] = useState({});

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    fetchPickups();
  }, []);

  const fetchPickups = async () => {
    try {
      const res = await api.get("/listings/user/assigned-to-me");
      setListings(res.data?.listings || res.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load pickups" });
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleQR = (id) => setShownQR((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.loadingText}>Loading pickups…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <View>
          <Text style={s.headerTitle}>📦 My Pickups</Text>
          <Text style={s.headerSub}>
            {listings.length > 0
              ? `${listings.length} item${listings.length > 1 ? "s" : ""} waiting for pickup`
              : "Items assigned to you appear here"}
          </Text>
        </View>
      </Animated.View>

      {listings.length === 0 ? (
        // Empty state
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>📭</Text>
          <Text style={s.emptyTitle}>No pending pickups</Text>
          <Text style={s.emptySub}>
            When a donor assigns an item to you, it'll appear here with a QR
            code for pickup.
          </Text>
          <TouchableOpacity
            style={s.browseBtn}
            onPress={() => navigation.navigate("Main", { screen: "Listings" })}
          >
            <Text style={s.browseBtnText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPickups();
              }}
              tintColor="#4ade80"
            />
          }
          renderItem={({ item }) => (
            <PickupCard
              listing={item}
              showQR={!!shownQR[item._id]}
              onToggleQR={() => toggleQR(item._id)}
              onViewDetails={() =>
                navigation.navigate("ListingDetails", { id: item._id })
              }
            />
          )}
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

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 3 },

  listContent: { paddingHorizontal: 16, paddingTop: 14 },

  card: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardImageBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
    overflow: "hidden",
  },
  cardImage: { width: 60, height: 60 },
  cardImageEmoji: { fontSize: 28 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 6,
    lineHeight: 20,
  },

  statusChip: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 9, fontWeight: "800" },

  cardDetails: { gap: 0 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 9,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: "#1e2d45" },
  detailIcon: { fontSize: 14, marginTop: 2 },
  detailLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: { fontSize: 13, color: "#e2e8f0" },

  noteBubble: {
    backgroundColor: "#0a0f1e",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  noteBubbleLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  noteBubbleText: { fontSize: 12, color: "#94a3b8", lineHeight: 17 },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  qrBtn: {
    flex: 1,
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  qrBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 13 },
  detailsBtn: {
    flex: 1,
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  detailsBtnText: { color: "#94a3b8", fontWeight: "600", fontSize: 13 },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
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
    marginBottom: 28,
  },
  browseBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  browseBtnText: { color: "#0a0f1e", fontWeight: "800", fontSize: 15 },
});

export default MyPickups;
