// src/screens/ListingDetailsScreen.js - React Native (Fixed & Complete)
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import api, { listingsAPI, chatAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";
import ReportModal from "../components/ReportModal";

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const colors = {
    available: {
      bg: "rgba(74,222,128,0.2)",
      border: "#4ade80",
      text: "#4ade80",
    },
    pending: { bg: "rgba(251,191,36,0.2)", border: "#fbbf24", text: "#fbbf24" },
    completed: {
      bg: "rgba(96,165,250,0.2)",
      border: "#60a5fa",
      text: "#60a5fa",
    },
    expired: { bg: "rgba(239,68,68,0.2)", border: "#ef4444", text: "#ef4444" },
  };
  const color = colors[status] || colors.expired;
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: color.bg, borderColor: color.border },
      ]}
    >
      <Text style={[styles.statusBadgeText, { color: color.text }]}>
        {status?.toUpperCase()}
      </Text>
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || "—"}</Text>
  </View>
);

const TrustBar = ({ score }) => (
  <View style={styles.trustRow}>
    <Text style={styles.trustLabel}>Trust Score</Text>
    <View style={styles.trustBarTrack}>
      {/* FIX: percentage width via flex ratio instead of string "%" which RN doesn't support in StyleSheet */}
      <View style={[styles.trustBarFill, { flex: score / 100 }]} />
      <View style={{ flex: 1 - score / 100 }} />
    </View>
    <Text style={styles.trustValue}>{score}/100</Text>
  </View>
);

const RecipientCard = ({ interest, onAssign }) => (
  <View style={styles.recipientCard}>
    <View style={styles.recipientAvatar}>
      <Text style={styles.recipientAvatarText}>
        {interest.user?.firstName?.[0]?.toUpperCase() || "?"}
      </Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.recipientName}>
        {interest.user?.firstName} {interest.user?.lastName}
      </Text>
      {interest.message ? (
        <Text style={styles.recipientMessage} numberOfLines={2}>
          💬 {interest.message}
        </Text>
      ) : null}
    </View>
    <TouchableOpacity
      style={styles.assignBtn}
      onPress={() => onAssign(interest.user._id)}
    >
      <Text style={styles.assignBtnText}>Assign</Text>
    </TouchableOpacity>
  </View>
);

const QueueSection = ({ queueStatus, onJoin, onLeave, loading }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>📋 Waiting List</Text>
    {queueStatus?.userPosition ? (
      <>
        <View style={styles.positionBadge}>
          <Text style={styles.positionBadgeText}>
            Your Position: #{queueStatus.userPosition}
          </Text>
        </View>
        <Text style={styles.queueSubtext}>
          {queueStatus.userPosition === 1
            ? "You're next in line! 🎉"
            : `${queueStatus.userPosition - 1} people ahead of you`}
        </Text>
        <TouchableOpacity
          style={[styles.leaveQueueBtn, loading && styles.btnDisabled]}
          onPress={onLeave}
          disabled={loading}
        >
          <Text style={styles.leaveQueueBtnText}>
            {loading ? "Leaving..." : "Leave Queue"}
          </Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <Text style={styles.queueSubtext}>
          {queueStatus?.queueLength || 0} people currently waiting
        </Text>
        <TouchableOpacity
          style={[styles.joinQueueBtn, loading && styles.btnDisabled]}
          onPress={onJoin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.joinQueueBtnText}>Join Waiting List</Text>
          )}
        </TouchableOpacity>
      </>
    )}
  </View>
);

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────

const ListingDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { id } = route.params || {}; // ✅ Guard against undefined route.params

  const [listing, setListing] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const donorId = listing?.donor?._id ?? listing?.donor;
  const assignedId = listing?.assignedTo?._id ?? listing?.assignedTo;
  const isDonor = !!user && donorId === user._id;
  const isRecipient = !!user && assignedId === user._id;

  useEffect(() => {
    if (!id) {
      setError("Invalid listing ID");
      return; // ✅ Don't fetch if no id
    }
    fetchListing();
    if (user) fetchQueueStatus();
  }, [id, user]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  //── API calls ──────────────────────────

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/listings/${id}`);
      const data = res.data?.listing ?? res.data;
      setListing(data);
      animateIn();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const res = await api.get(`/listings/${id}/queue/status`);
      setQueueStatus(res.data);
    } catch {
      /* silent */
    }
  };

  const handleJoinQueue = async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    setLoadingQueue(true);
    try {
      const res = await api.post(`/listings/${id}/queue/join`);
      Toast.show({
        type: "success",
        text1: res.data.message || "Joined queue!",
      });
      fetchQueueStatus();
      fetchListing();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: err.response?.data?.message || "Failed to join queue",
      });
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleLeaveQueue = async () => {
    setLoadingQueue(true);
    try {
      await api.delete(`/listings/${id}/queue/leave`);
      Toast.show({ type: "success", text1: "Left the queue" });
      fetchQueueStatus();
      fetchListing();
    } catch {
      Toast.show({ type: "error", text1: "Failed to leave queue" });
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleWantThis = async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    if (listing.status !== "available") {
      Toast.show({ type: "info", text1: "This item is no longer available" });
      return;
    }
    setIsClaiming(true);
    try {
      const res = await listingsAPI.expressInterest(id, {
        message: "I want this item!",
      });
      if (res.data.success) {
        Toast.show({ type: "success", text1: "Interest expressed! 🎯" });
        fetchListing();
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: err.response?.data?.message || "Failed to express interest",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleContact = async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    if (!donorId || donorId === user._id) return;
    setIsContacting(true);
    try {
      const res = await chatAPI.createOrGet({
        participantId: donorId,
        listingId: id,
      });
      const chatId = res.data?.chat?._id ?? res.data?.data?.chat?._id;
      if (chatId) navigation.navigate("Chat", { chatId });
    } catch {
      Toast.show({ type: "error", text1: "Could not open chat" });
    } finally {
      setIsContacting(false);
    }
  };

  const handleAssign = async (recipientId) => {
    Alert.alert(
      "Assign Recipient",
      "Assign this item to the selected recipient?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            try {
              await api.post(`/listings/${id}/assign`, { recipientId });
              Toast.show({ type: "success", text1: "Recipient assigned! 🎉" });
              fetchListing();
            } catch {
              Toast.show({ type: "error", text1: "Failed to assign" });
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert("Delete Listing", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await listingsAPI.delete(id);
            Toast.show({ type: "success", text1: "Listing deleted" });
            navigation.navigate("Main", { screen: "Listings" });
          } catch {
            Toast.show({ type: "error", text1: "Failed to delete" });
          }
        },
      },
    ]);
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleReportSuccess = () => {
    setShowReportModal(false);
    Toast.show({
      type: "success",
      text1: "✅ Report submitted. Our team will review it.",
    });
  };

  // ── States ──────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchListing}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) return null;

  const donorName =
    `${listing.donor?.firstName || ""} ${listing.donor?.lastName || ""}`.trim();
  const assignedName = listing.assignedTo
    ? `${listing.assignedTo?.firstName || ""} ${listing.assignedTo?.lastName || ""}`.trim()
    : null;
  const isQueueEligible =
    listing.status === "pending" && !isDonor && !isRecipient;

  // ── Render ──────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ── Header ─────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        {isDonor && (
          <TouchableOpacity style={styles.deleteTopBtn} onPress={handleDelete}>
            <Text style={styles.deleteTopBtnText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Scrollable Body ────────────── */}
      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Gallery */}
        {listing.images?.length > 0 ? (
          <View>
            <Image
              source={{ uri: listing.images[activeImage] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            {listing.images.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbsRow}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                {listing.images.map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setActiveImage(i)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: img }}
                      style={[
                        styles.thumbImage,
                        i === activeImage && styles.thumbImageActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderEmoji}>📦</Text>
          </View>
        )}

        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={3}>
              {listing.title}
            </Text>
            <StatusBadge status={listing.status} />
          </View>

          <View style={styles.detailsGrid}>
            {listing.description ? (
              <DetailRow label="📝 Description" value={listing.description} />
            ) : null}
            <DetailRow
              label="📦 Quantity"
              value={`${listing.quantity ?? "—"} ${listing.unit || ""}`.trim()}
            />
            <DetailRow label="🏷️ Category" value={listing.category} />
            <DetailRow
              label="📍 Pickup Location"
              value={listing.pickupLocation}
            />
            {listing.expiryDate ? (
              <DetailRow
                label="⏰ Expires"
                value={new Date(listing.expiryDate).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                )}
              />
            ) : null}
            {donorName ? (
              <DetailRow label="👤 Donor" value={donorName} />
            ) : null}
            {assignedName ? (
              <DetailRow label="🎯 Assigned To" value={assignedName} />
            ) : null}
          </View>

          {listing.donor?.trustScore != null && (
            <TrustBar score={listing.donor.trustScore} />
          )}
        </View>

        {/* Interested Recipients — Donor only */}
        {isDonor && listing.interestedUsers?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              👥 Interested Recipients ({listing.interestedUsers.length})
            </Text>
            {listing.interestedUsers.map((interest) => (
              <RecipientCard
                key={interest.user._id}
                interest={interest}
                onAssign={handleAssign}
              />
            ))}
          </View>
        )}

        {/* QR Code — Donor with assigned recipient */}
        {isDonor &&
          ["pending", "assigned"].includes(listing.status) &&
          listing.assignedTo && (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>📱 Pickup QR Code</Text>
              <Text style={styles.qrSubtitle}>
                Share this with{" "}
                <Text style={styles.qrNameHighlight}>{assignedName}</Text> to
                complete the handoff.
              </Text>
              {/* Replace with real QR when expo-qrcode or react-native-qrcode-svg is installed */}
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderSymbol}>▦</Text>
                <Text style={styles.qrPlaceholderLabel}>QR Code</Text>
              </View>
            </View>
          )}

        {/* Scan QR — Recipient */}
        {isRecipient && ["pending", "assigned"].includes(listing.status) && (
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>📷 Ready for Pickup!</Text>
            <Text style={styles.qrSubtitle}>
              Meet the donor and scan their QR code to confirm handoff.
            </Text>
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() =>
                navigation.navigate("QRScanner", { listingId: id })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.scanBtnText}>📱 Open QR Scanner</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Queue — available to others when pending */}
        {isQueueEligible && (
          <QueueSection
            queueStatus={queueStatus}
            onJoin={handleJoinQueue}
            onLeave={handleLeaveQueue}
            loading={loadingQueue}
          />
        )}

        {/* Report — non-donors */}
        {!isDonor && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={handleReport}
            activeOpacity={0.7}
          >
            <Text style={styles.reportBtnText}>🚨 Report this listing</Text>
          </TouchableOpacity>
        )}
      </Animated.ScrollView>

      {/* ── Fixed Action Bar ───────────── */}
      <View style={styles.actionBar}>
        {isDonor ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => navigation.navigate("CreateListing", { id })}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnSecondaryText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        ) : listing.status === "available" ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnPrimary,
                isClaiming && styles.btnDisabled,
              ]}
              onPress={handleWantThis}
              disabled={isClaiming}
              activeOpacity={0.85}
            >
              {isClaiming ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.actionBtnText}>🎯 I Want This</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnChat,
                isContacting && styles.btnDisabled,
              ]}
              onPress={handleContact}
              disabled={isContacting}
              activeOpacity={0.85}
            >
              {isContacting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionBtnChatText}>💬 Contact</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unavailableRow}>
            <Text style={styles.notAvailableText}>
              This item is no longer available
            </Text>
          </View>
        )}
      </View>

      {/* ── Report Modal ──────────────── */}
      <ReportModal
        visible={showReportModal}
        type="listing"
        itemId={id}
        itemTitle={listing.title}
        onClose={() => setShowReportModal(false)}
        onSuccess={handleReportSuccess}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  // Loading / Error
  loadingText: { color: "#94a3b8", fontSize: 14, marginTop: 12 },
  errorIcon: { fontSize: 48, marginBottom: 14 },
  errorText: {
    color: "#ef4444",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 14 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  backBtnText: { color: "#4ade80", fontWeight: "700", fontSize: 15 },
  deleteTopBtn: { padding: 8 },
  deleteTopBtnText: { fontSize: 20 },

  // Scroll
  scrollContent: { paddingBottom: 120 },

  // Images
  mainImage: { width: "100%", height: 260, backgroundColor: "#1e293b" },
  thumbsRow: { backgroundColor: "#131c2e" },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbImageActive: { borderColor: "#4ade80" },
  imagePlaceholder: {
    height: 200,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderEmoji: { fontSize: 72 },

  // Main Card
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f1f5f9",
    flex: 1,
    lineHeight: 30,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  // Details
  detailsGrid: { gap: 12 },
  detailRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: { fontSize: 15, color: "#e2e8f0", lineHeight: 21 },

  // Trust bar — uses flex ratio (no % string)
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },
  trustLabel: { color: "#64748b", fontSize: 12, fontWeight: "600", width: 72 },
  trustBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "row",
  },
  trustBarFill: { height: "100%", backgroundColor: "#4ade80" },
  trustValue: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "700",
    width: 48,
    textAlign: "right",
  },

  // Section container (queue, recipients)
  section: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 14,
  },

  // Recipient cards
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#166534",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientAvatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  recipientName: { color: "#f1f5f9", fontWeight: "600", fontSize: 14 },
  recipientMessage: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  assignBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  assignBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 12 },

  // QR section
  qrSection: {
    backgroundColor: "#166534",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  qrTitle: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 6 },
  qrSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 19,
  },
  qrNameHighlight: { fontWeight: "700" },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholderSymbol: { fontSize: 56, color: "#0f172a" },
  qrPlaceholderLabel: { fontSize: 11, color: "#64748b", marginTop: 4 },
  scanBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  scanBtnText: { color: "#166534", fontWeight: "700", fontSize: 15 },

  // Queue
  positionBadge: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  positionBadgeText: {
    color: "#4ade80",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  queueSubtext: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
  },
  joinQueueBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  joinQueueBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  leaveQueueBtn: {
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  leaveQueueBtnText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },

  // Report
  reportBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 8 },
  reportBtnText: { color: "#64748b", fontSize: 13 },

  // Fixed Action Bar
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1e293b",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  actionRow: { flexDirection: "row", gap: 12 },
  unavailableRow: { alignItems: "center", paddingVertical: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  actionBtnPrimary: { backgroundColor: "#4ade80" },
  actionBtnChat: { backgroundColor: "#3b82f6" },
  actionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#334155",
  },
  actionBtnDanger: { backgroundColor: "#ef4444" },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  actionBtnChatText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actionBtnSecondaryText: { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
  notAvailableText: { color: "#64748b", fontSize: 14, fontStyle: "italic" },
});

export default ListingDetailsScreen;
