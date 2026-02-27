// src/screens/InterestedUsers.js - Donor views interested recipients
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { listingsAPI } from "../services/api";
import AIMatchSuggestions from "../components/AIMtachSuggestions";

const InterestedUsersScreen = ({ route, navigation }) => {
  const { listingId, listingTitle } = route.params || {};

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInterestedUsers();
    }, [listingId]),
  );

  // Fade in animation
  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadInterestedUsers = async () => {
    setLoading(true);
    try {
      // Get queue status (interested users) from backend
      const response = await listingsAPI.getQueueStatus(listingId);
      const queueUsers = response.data.queue || [];

      // Enrich user data with profiles if available
      const enrichedUsers = queueUsers.map((user) => ({
        id: user.userId,
        name: user.userName || "Unknown User",
        rating: user.userRating || 0,
        reviews: user.userReviews || 0,
        trustScore: Math.floor((user.userRating || 0) / 5) * 15 + 50, // Calculate trust score
        distance: user.distance || 0,
        avatar:
          user.userAvatar || `https://i.pravatar.cc/150?seed=${user.userId}`,
        status: getTrustStatus(user.userRating || 0),
        message: user.message || "",
      }));

      setUsers(enrichedUsers);
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to load interested users";
      Toast.show({
        type: "error",
        text1: msg,
      });
      console.error("Error loading interested users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (user) => {
    Alert.alert(
      "Confirm Assignment",
      `Assign "${listingTitle}" to ${user.name}?\n\nThis will:\n• Mark item as Pending\n• Generate a QR code\n• Notify ${user.name}\n• Start scheduling`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Yes, Assign ✅",
          onPress: () => confirmAssign(user),
          style: "default",
        },
      ],
    );
  };

  const confirmAssign = async (user) => {
    setAssigning(user.id);
    try {
      // Call assign API
      const response = await listingsAPI.assign(listingId, {
        recipientId: user.id,
      });

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: `Assigned to ${user.name}! 🎉`,
        });

        // Navigate to QR display or schedule with transaction ID
        setTimeout(() => {
          navigation.navigate("QRDisplay", {
            listingId,
            recipientId: user.id,
            recipientName: user.name,
            listingTitle,
            transactionId: response.data.transactionId,
          });
        }, 800);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to assign listing";
      Toast.show({
        type: "error",
        text1: msg,
      });
      console.error("Error assigning listing:", error);
    } finally {
      setAssigning(null);
    }
  };

  const handleChat = (user) => {
    navigation.navigate("Chat", { userId: user.id, userName: user.name });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Interested Users</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.description}>Loading interested users...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interested</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Listing info */}
        <View style={styles.listingCard}>
          <Text style={styles.listingTitle}>{listingTitle}</Text>
          <Text style={styles.listingMeta}>
            {users.length} {users.length === 1 ? "person" : "people"} interested
          </Text>
        </View>

        {/* AI Suggestion */}
        <AIMatchSuggestions
          listingId={listingId}
          onAssign={loadInterestedUsers}
        />

        {/* User cards */}
        <Animated.View style={[styles.usersList, { opacity: fadeAnim }]}>
          {users.map((user, idx) => (
            <View key={user.id} style={styles.userCard}>
              {/* Avatar + Basic Info */}
              <View style={styles.userHeader}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={styles.userMeta}>
                    <Text style={styles.rating}>
                      ⭐ {user.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.reviews}>({user.reviews})</Text>
                  </View>
                </View>
              </View>

              {/* Trust badge */}
              <View style={[styles.trustBadge, getTrustStyle(user.trustScore)]}>
                <Text style={styles.trustText}>{user.status}</Text>
              </View>

              {/* Distance */}
              <Text style={styles.distance}>
                📍 {user.distance.toFixed(1)} km away
              </Text>

              {/* Message */}
              {user.message && (
                <Text style={styles.message}>"{user.message}"</Text>
              )}

              {/* Trust score bar */}
              <View style={styles.trustBar}>
                <View
                  style={[styles.trustFill, { width: `${user.trustScore}%` }]}
                />
              </View>
              <Text style={styles.trustScore}>{user.trustScore}/100</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnChat]}
                  onPress={() => handleChat(user)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.btnChatText}>💬 Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAssign]}
                  onPress={() => handleAssign(user)}
                  disabled={assigning === user.id}
                  activeOpacity={0.75}
                >
                  {assigning === user.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnAssignText}>✅ Assign</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Animated.View>

        {users.length === 0 && (
          <View style={[styles.container, styles.centered]}>
            <Text style={styles.emptyText}>No one is interested yet</Text>
            <Text style={styles.description}>
              Check back soon or share this listing
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Helpers
const getTrustStatus = (rating) => {
  if (rating >= 4.5) return "trusted";
  if (rating >= 3.5) return "exchanges";
  return "new";
};

const getTrustStyle = (score) => {
  if (score >= 80) return { backgroundColor: "#d1fae5" };
  if (score >= 60) return { backgroundColor: "#fef3c7" };
  return { backgroundColor: "#fee2e2" };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backButton: {
    color: "#4ade80",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Listing card
  listingCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
  },
  listingTitle: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  listingMeta: {
    color: "#94a3b8",
    fontSize: 13,
  },

  // User list
  usersList: {
    gap: 12,
  },

  // User card
  userCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },

  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#334155",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    color: "#fbbf24",
    fontWeight: "700",
    fontSize: 13,
  },
  reviews: {
    color: "#94a3b8",
    fontSize: 13,
  },

  // Trust badge
  trustBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  trustText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
    color: "#0f172a",
  },

  // Distance
  distance: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 8,
  },

  // Message
  message: {
    color: "#cbd5e1",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#475569",
  },

  // Trust bar
  trustBar: {
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 3,
    marginBottom: 4,
    overflow: "hidden",
  },
  trustFill: {
    height: "100%",
    backgroundColor: "#4ade80",
    borderRadius: 3,
  },
  trustScore: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 12,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnChat: {
    backgroundColor: "#475569",
    borderWidth: 1,
    borderColor: "#64748b",
  },
  btnChatText: {
    color: "#cbd5e1",
    fontWeight: "600",
    fontSize: 13,
  },
  btnAssign: {
    backgroundColor: "#4ade80",
  },
  btnAssignText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 13,
  },

  // Empty state
  emptyText: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    color: "#94a3b8",
    fontSize: 13,
  },
});

export default InterestedUsersScreen;
