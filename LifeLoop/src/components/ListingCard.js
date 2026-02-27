// src/components/ListingCard/index.js - React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { chatAPI, listingsAPI } from "../services/api";
import Toast from "react-native-toast-message";
import { calculateDistance, formatDistance } from "../utils/helpers";
import TrustBadges from "./TrustBadges";
import RatingModal from "./RatingModal";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const CATEGORY_EMOJIS = {
  produce: "🥕",
  "canned-goods": "🥫",
  dairy: "🥛",
  bakery: "🍞",
  "household-items": "🏠",
  clothing: "👕",
  electronics: "📱",
  furniture: "🛋️",
  books: "📚",
  toys: "🧸",
  other: "📦",
};

const STATUS_COLORS = {
  available: "#4ade80",
  pending: "#fbbf24",
  completed: "#60a5fa",
  cancelled: "#f87171",
  expired: "#f87171",
};

const getCategoryEmoji = (cat) => CATEGORY_EMOJIS[cat] || "📦";
const getStatusColor = (s) => STATUS_COLORS[s] || STATUS_COLORS.available;

const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const ListingCard = ({
  listing,
  isOwner = false,
  showDistance = false,
  showQuickClaim = false,
  userLocation = null,
  onEdit = null,
  onDelete = null,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();

  // Entry animation
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Derived values ────────────────────
  const hasImage = listing.images?.length > 0 && !imageError;
  const expiryDate = formatDate(listing.expiryDate);
  const donorObj = typeof listing.donor === "object" ? listing.donor : null;

  const distance =
    showDistance && userLocation && listing.location?.coordinates
      ? formatDistance(
          calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            listing.location.coordinates[1],
            listing.location.coordinates[0],
          ),
        )
      : null;

  // ── Handlers ─────────────────────────
  const handleViewDetails = () =>
    navigation.navigate("ListingDetails", { id: listing._id });

  const handleContact = async () => {
    if (!user?._id) {
      Toast.show({ type: "info", text1: "Please login to contact the donor" });
      navigation.navigate("Login");
      return;
    }

    const donorId =
      donorObj?._id ||
      (typeof listing.donor === "string" ? listing.donor : null);
    if (!donorId) {
      Toast.show({ type: "error", text1: "Unable to contact donor" });
      return;
    }
    if (donorId.toString() === user._id.toString()) {
      Toast.show({ type: "info", text1: "This is your own listing" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await chatAPI.createOrGet({
        participantId: donorId,
        listingId: listing._id,
      });
      const chatId =
        res.data?.chat?._id || res.data?.data?.chat?._id || res.data?._id;
      if (chatId) {
        Toast.show({ type: "success", text1: "Opening chat..." });
        navigation.navigate("Chat", { chatId });
      } else {
        Toast.show({ type: "error", text1: "Failed to create chat" });
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: err.response?.data?.message || "Failed to contact donor",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickClaim = async () => {
    if (!user?._id) {
      Toast.show({ type: "info", text1: "Please login first" });
      navigation.navigate("Login");
      return;
    }
    if (listing.status !== "available") {
      Toast.show({ type: "info", text1: "This item is no longer available" });
      return;
    }

    setIsClaiming(true);
    try {
      const res = await listingsAPI.expressInterest(listing._id, {
        message: "I want this item!",
      });
      if (res.data.success) {
        Toast.show({
          type: "success",
          text1: "Interest expressed! Donor will be notified.",
        });
      } else {
        throw new Error(res.data.message || "Failed");
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

  const handleEdit = () =>
    onEdit
      ? onEdit(listing)
      : navigation.navigate("CreateListing", { id: listing._id });

  const handleDelete = () => {
    if (onDelete) {
      onDelete(listing);
    } else {
      Alert.alert(
        "Delete Listing",
        "Are you sure you want to delete this listing?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => onDelete?.(listing),
          },
        ],
      );
    }
  };

  // ── Render ────────────────────────────
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleViewDetails}
      style={styles.cardTouchable}
    >
      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
      {/* Image Area */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={{ uri: listing.images[0] }}
            style={styles.image}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderEmoji}>
              {getCategoryEmoji(listing.category)}
            </Text>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(listing.status) },
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {listing.status || "available"}
          </Text>
        </View>

        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText} numberOfLines={1}>
            {getCategoryEmoji(listing.category)} {listing.category}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {listing.description?.length > 100
            ? `${listing.description.substring(0, 100)}...`
            : listing.description || "No description provided"}
        </Text>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📦</Text>
            <Text style={styles.metaText}>
              {listing.quantity} {listing.unit || "items"}
            </Text>
          </View>
          {distance && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText}>{distance}</Text>
            </View>
          )}
          {expiryDate && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>Best before {expiryDate}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>👤</Text>
            <Text style={styles.metaText}>
              {donorObj
                ? `${donorObj.firstName} ${donorObj.lastName}`
                : "Anonymous"}
            </Text>
          </View>
        </View>

        {donorObj && (
          <View style={{ marginTop: 8 }}>
            <TrustBadges
              user={donorObj}
              showScore={false}
              showVerification={true}
            />
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.btn, styles.editBtn]}
              onPress={handleEdit}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.deleteBtn]}
              onPress={handleDelete}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.viewBtn]}
              onPress={handleViewDetails}
              activeOpacity={0.85}
            >
              <Text style={styles.viewBtnText}>👁️ View Details</Text>
            </TouchableOpacity>

            {showQuickClaim && listing.status === "available" && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.claimBtn,
                  (isClaiming || !user) && styles.btnDisabled,
                ]}
                onPress={handleQuickClaim}
                disabled={isClaiming || !user}
                activeOpacity={0.85}
              >
                {isClaiming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>🎯 I Want This!</Text>
                )}
              </TouchableOpacity>
            )}

            {authLoading ? (
              <View style={[styles.btn, styles.contactBtn, styles.btnDisabled]}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : !user ? (
              <TouchableOpacity
                style={[styles.btn, styles.contactBtn]}
                onPress={() => {
                  Toast.show({ type: "info", text1: "Please login first" });
                  navigation.navigate("Login");
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>🔒 Login to Contact</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.contactBtn,
                  isLoading && styles.btnDisabled,
                ]}
                onPress={handleContact}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>💬 Contact Donor</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {/* QR Scan — shown when pickup pending for this user */}
        {listing.status === "pending" &&
          (listing.assignedTo?._id === user?._id ||
            listing.assignedTo === user?._id) && (
            <TouchableOpacity
              style={[styles.btn, styles.qrBtn]}
              onPress={() =>
                navigation.navigate("QRScanner", { listingId: listing._id })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>📷 Scan Pickup QR</Text>
            </TouchableOpacity>
          )}

        {/* Rate button - Only show after transaction is completed */}
        {!isOwner &&
          donorObj &&
          user &&
          user._id !== donorObj._id &&
          listing.status === "completed" && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.rateBtn]}
                onPress={() => setShowRating(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.rateBtnText}>⭐ Rate User</Text>
              </TouchableOpacity>
              <RatingModal
                isOpen={showRating}
                onClose={() => setShowRating(false)}
                user={donorObj}
                listingId={listing._id}
                onSuccess={() => setShowRating(false)}
              />
            </>
          )}
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  cardTouchable: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e2d45",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  // Image
  imageContainer: {
    position: "relative",
    height: 200,
    backgroundColor: "#1e2d45",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e2d45",
  },
  imagePlaceholderEmoji: { fontSize: 48, marginBottom: 8 },
  imagePlaceholderText: { color: "#64748b", fontSize: 13, fontWeight: "600" },

  // Badges
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: "#0a0f1e",
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#131c2e",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  categoryBadgeText: {
    color: "#4ade80",
    fontWeight: "700",
    fontSize: 11,
    textTransform: "capitalize",
  },

  // Content
  content: { padding: 16 },
  title: {
    color: "#f1f5f9",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  // Meta
  meta: {
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
    paddingTop: 10,
    gap: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaIcon: { fontSize: 14, width: 20 },
  metaText: { color: "#94a3b8", fontSize: 13, fontWeight: "500" },

  // Footer
  footer: { padding: 14, paddingTop: 0, gap: 8 },
  ownerActions: { flexDirection: "row", gap: 10 },

  // Buttons
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  viewBtnText: { color: "#f1f5f9", fontWeight: "700", fontSize: 13 },
  rateBtnText: { color: "#fbbf24", fontWeight: "700", fontSize: 13 },

  editBtn: { backgroundColor: "#4ade80" },
  deleteBtn: { backgroundColor: "#ef4444" },
  viewBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#334155",
  },
  claimBtn: { backgroundColor: "#48bb78" },
  contactBtn: { backgroundColor: "#667eea" },
  qrBtn: { backgroundColor: "#667eea" },
  rateBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
});

export default ListingCard;
