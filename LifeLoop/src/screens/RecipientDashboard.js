// src/screens/RecipientDashboard.js - Dashboard for Users Receiving Items
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { listingsAPI } from "../services/api";
import Toast from "react-native-toast-message";

const RecipientDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [savedListings, setSavedListings] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [receivedItems, setReceivedItems] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]); // ✅ New state
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchRecipientData();
    }, []),
  );

  const fetchRecipientData = async () => {
    try {
      setLoading(true);

      // Fetch assignments assigned to this user
      const assignedResponse = await listingsAPI.getAssignedToMe();
      const assignedListings = Array.isArray(assignedResponse.data?.listings)
        ? assignedResponse.data.listings
        : [];

      // ✅ Get pending assignments (assigned to user but not yet completed/picked up)
      const pending = assignedListings.filter(
        (l) => l.status === "assigned" && !l.completedAt,
      );
      setPendingAssignments(pending.slice(0, 5));

      // Get received items (completed assignments where user is recipient)
      const received = assignedListings.filter(
        (l) => l.status === "assigned" || l.status === "completed",
      );

      const itemsReceived = received.length;
      const moneySaved = itemsReceived * 15; // Average value per item
      const co2Saved = itemsReceived * 1.8; // Carbon saved from reusing

      setStats({
        itemsReceived,
        moneysSaved: moneySaved,
        ecoScore: Math.round(co2Saved * 100) / 100,
      });

      // Fetch user's own listings for active requests, saved, etc
      const userResponse = await listingsAPI.getUserListings({
        limit: 100,
        type: "donated",
      });
      const userListings = Array.isArray(userResponse.data?.listings)
        ? userResponse.data.listings
        : [];

      // Fetch active requests
      setActiveRequests(
        userListings.filter((l) => l.status === "pending").slice(0, 5),
      );

      // Set received items history
      setReceivedItems(received.slice(0, 5));

      // Set saved listings (items saved for later)
      setSavedListings(
        userListings
          .filter((l) => l.status !== "completed" && l.status !== "assigned")
          .slice(0, 5),
      );
    } catch (error) {
      console.error("Error fetching recipient data:", error);
      // Set default values if API fails
      setStats({ itemsReceived: 0, moneysSaved: 0, ecoScore: 0 });
      setReceivedItems([]);
      setActiveRequests([]);
      setSavedListings([]);
      setPendingAssignments([]); // ✅ Reset pending assignments
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2A9D8F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hey {user?.firstName || user?.name?.split(" ")[0] || "Friend"}! 👋
            </Text>
            <Text style={styles.subGreeting}>Find items you need</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: "#E0F7F6" }]}>
            <Text style={styles.statIcon}>💚</Text>
            <Text style={styles.statNumber}>{stats?.itemsReceived || 0}</Text>
            <Text style={styles.statLabel}>Items Received</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E0F7F6" }]}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statNumber}>₹{stats?.moneysSaved || 0}</Text>
            <Text style={styles.statLabel}>Money Saved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E0F7F6" }]}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statNumber}>{activeRequests.length}</Text>
            <Text style={styles.statLabel}>Active Requests</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Listings")}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Browse Listings</Text>
              <Text style={styles.actionDesc}>Find items in your area</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("MyPickups")}
          >
            <Text style={styles.actionIcon}>�</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>My Wants List</Text>
              <Text style={styles.actionDesc}>Items you're looking for</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("MyPickups")}
          >
            <Text style={styles.actionIcon}>📤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>My Requests</Text>
              <Text style={styles.actionDesc}>Track your requests</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("PickupSchedule")}
          >
            <Text style={styles.actionIcon}>🚛</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Schedule Pickup</Text>
              <Text style={styles.actionDesc}>Request waste collection</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("NearbyMap")}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Nearby Centers</Text>
              <Text style={styles.actionDesc}>Find recycling centers</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📄 Pending Assignments</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("MyPickups")}
              >
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {pendingAssignments.map((assignment) => (
              <TouchableOpacity
                key={assignment._id}
                style={styles.assignmentCard}
                onPress={() =>
                  navigation.navigate("AcceptAssignment", {
                    listingId: assignment._id,
                    listingTitle: assignment.itemLabel,
                    listingImage: assignment.images?.[0],
                    donorId: assignment.donor?._id || assignment.donor,
                    donorName: assignment.donor?.firstName || "Donor",
                  })
                }
              >
                <View style={styles.assignmentStatusBadge}>
                  <Text style={styles.assignmentStatusText}>
                    🔹 Action Needed
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignmentTitle}>
                    {assignment.itemLabel}
                  </Text>
                  <Text style={styles.assignmentDonor}>
                    From: {assignment.donor?.firstName || "Anonymous"}
                  </Text>
                </View>
                <Text style={styles.assignmentArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Requests</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("MyRequests")}
              >
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {activeRequests.map((request) => (
              <TouchableOpacity
                key={request._id}
                style={styles.requestCard}
                onPress={() =>
                  navigation.navigate("ListingDetails", { id: request._id })
                }
              >
                <View style={styles.statusDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestTitle}>{request.itemLabel}</Text>
                  <Text style={styles.requestStatus}>{request.status}</Text>
                </View>
                <Text style={styles.requestArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Saved Listings */}
        {savedListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved for Later</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Listings")}>
                <Text style={styles.viewAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            {savedListings.map((listing) => (
              <TouchableOpacity
                key={listing._id}
                style={styles.listingCard}
                onPress={() =>
                  navigation.navigate("ListingDetails", { id: listing._id })
                }
              >
                <View style={styles.listingImagePlaceholder}>
                  <Text style={styles.listingImageText}>
                    {listing.itemType[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listingTitle}>{listing.itemLabel}</Text>
                  <Text style={styles.listingDonor}>
                    By {listing.createdBy || "Anonymous"}
                  </Text>
                </View>
                <Text style={styles.listingArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Received Items History */}
        {receivedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📥 Items Received</Text>
            {receivedItems.map((item) => (
              <View key={item._id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyIcon}>
                    <Text style={styles.historyEmoji}>✅</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyItemName}>{item.itemLabel}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyStatus}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Eco Impact Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌱 Your Eco Impact</Text>
          <View style={styles.impactCard}>
            <View style={styles.impactRow}>
              <View style={styles.impactItem}>
                <Text style={styles.impactEmoji}>☘️</Text>
                <Text style={styles.impactValue}>{stats?.ecoScore || 0}kg</Text>
                <Text style={styles.impactLabel}>CO₂ Prevented</Text>
              </View>
              <View style={styles.impactDivider} />
              <View style={styles.impactItem}>
                <Text style={styles.impactEmoji}>♻️</Text>
                <Text style={styles.impactValue}>
                  {stats?.itemsReceived || 0}
                </Text>
                <Text style={styles.impactLabel}>Items Reused</Text>
              </View>
              <View style={styles.impactDivider} />
              <View style={styles.impactItem}>
                <Text style={styles.impactEmoji}>💚</Text>
                <Text style={styles.impactValue}>
                  ₹{stats?.moneysSaved || 0}
                </Text>
                <Text style={styles.impactLabel}>Saved</Text>
              </View>
            </View>
            <View style={styles.impactMessage}>
              <Text style={styles.impactMessageText}>
                You're helping the planet, one reused item at a time! 🌍
              </Text>
            </View>
          </View>
        </View>

        {/* Nearby Available Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Nearby Available Items</Text>
          <View style={styles.nearbyCard}>
            <Text style={styles.nearbyEmoji}>📍</Text>
            <Text style={styles.nearbyTitle}>Fresh Listings Near You</Text>
            <Text style={styles.nearbyDesc}>
              Discover items available in your area right now
            </Text>
            <TouchableOpacity
              style={styles.nearbyButton}
              onPress={() => navigation.navigate("Listings")}
            >
              <Text style={styles.nearbyButtonText}>Browse Nearby →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reuse Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Reuse Tips</Text>
          <TouchableOpacity
            style={styles.tipCard}
            onPress={() =>
              Alert.alert(
                "Quality Tip",
                "Focus on items with good build quality. They'll serve you longer and reduce waste!",
              )
            }
          >
            <View style={styles.tipIconBox}>
              <Text style={styles.tipIcon}>🧒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Quality Over Quantity</Text>
              <Text style={styles.tipDesc}>Choose items that last longer</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tipCard}
            onPress={() =>
              Alert.alert(
                "Repair Tip",
                "Before replacing, try fixing! Many items can be restored with simple repairs.",
              )
            }
          >
            <View style={styles.tipIconBox}>
              <Text style={styles.tipIcon}>🔧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Repair First</Text>
              <Text style={styles.tipDesc}>Fix before replacing items</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Community Engagement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌟 Join the Community</Text>
          <TouchableOpacity
            style={styles.communityCard}
            onPress={() =>
              Alert.alert(
                "Local Groups",
                "Coming soon! Connect with fellow eco-conscious people in your area.",
              )
            }
          >
            <Text style={styles.communityEmoji}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.communityTitle}>Local Groups</Text>
              <Text style={styles.communityDesc}>
                Connect with eco warriors
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.communityCard}
            onPress={() => navigation.navigate("PersonalImpact")}
          >
            <Text style={styles.communityEmoji}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.communityTitle}>Impact Tracker</Text>
              <Text style={styles.communityDesc}>
                Track your environmental impact
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#2A9D8F",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
  },
  subGreeting: {
    fontSize: 14,
    color: "#E0F7F6",
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  viewAll: {
    fontSize: 14,
    color: "#2A9D8F",
    fontWeight: "600",
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  actionDesc: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: "#2A9D8F",
  },
  requestCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A9D8F",
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  requestStatus: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  requestArrow: {
    fontSize: 20,
    color: "#2A9D8F",
  },
  assignmentCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B6B",
  },
  assignmentStatusBadge: {
    backgroundColor: "#E0F7F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assignmentStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF6B6B",
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  assignmentDonor: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  assignmentArrow: {
    fontSize: 20,
    color: "#2A9D8F",
  },
  listingCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  listingImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#2A9D8F",
    justifyContent: "center",
    alignItems: "center",
  },
  listingImageText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  listingDonor: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  listingArrow: {
    fontSize: 20,
    color: "#2A9D8F",
  },
  recommendCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2A9D8F",
  },
  recommendEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  recommendTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
    marginBottom: 8,
  },
  recommendDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  recommendButton: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: "#2A9D8F",
    borderRadius: 8,
  },
  recommendButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  historyCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderLeftColor: "#2A9D8F",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  historyIcon: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  historyEmoji: {
    fontSize: 22,
  },
  historyItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B1B1B",
  },
  historyDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  historyBadge: {
    backgroundColor: "#E0F7F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2A9D8F",
    textTransform: "capitalize",
  },
  impactCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2A9D8F",
  },
  impactRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  impactItem: {
    flex: 1,
    alignItems: "center",
  },
  impactEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  impactLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  impactDivider: {
    width: 1,
    height: 60,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  impactMessage: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  impactMessageText: {
    fontSize: 13,
    color: "#2A9D8F",
    fontWeight: "600",
    textAlign: "center",
  },
  nearbyCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2A9D8F",
  },
  nearbyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  nearbyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
    marginBottom: 8,
  },
  nearbyDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  nearbyButton: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: "#2A9D8F",
    borderRadius: 8,
  },
  nearbyButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2A9D8F",
  },
  tipIconBox: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#FFF9E6",
    justifyContent: "center",
    alignItems: "center",
  },
  tipIcon: {
    fontSize: 24,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  tipDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: "#2A9D8F",
  },
  communityCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  communityEmoji: {
    fontSize: 28,
  },
  communityTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  communityDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
});

export default RecipientDashboard;
