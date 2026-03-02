// src/screens/DonorDashboard.js - Dashboard for Users Donating Items
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

const DonorDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchDonorData();
    }, []),
  );

  const fetchDonorData = async () => {
    try {
      setLoading(true);

      // Fetch all user listings
      const response = await listingsAPI.getUserListings({ limit: 100 });
      const listings = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      // Calculate stats from listings
      const completed = listings.filter(
        (l) => l.status === "completed" || l.status === "assigned",
      );
      const itemsDonated = completed.length;
      const co2Saved = itemsDonated * 2.5; // Average CO2 per donation

      // Handle rating - could be a number or object with average property
      let rating = 4.8;
      if (user?.rating) {
        rating =
          typeof user.rating === "number"
            ? user.rating
            : user.rating?.average || 4.8;
      }
      rating = Math.round(rating * 10) / 10; // Ensure it's a clean number

      setStats({
        itemsDonated,
        co2Saved: Math.round(co2Saved * 10) / 10,
        rating,
      });

      // Fetch recent listings created by donor
      setRecentListings(
        listings.filter((l) => l.status !== "completed").slice(0, 5),
      );

      // Fetch donation history (completed donations)
      setDonationHistory(completed.slice(0, 5));
    } catch (error) {
      console.error("Error fetching donor data:", error);
      // Set default values if API fails
      setStats({ itemsDonated: 0, co2Saved: 0, rating: 4.8 });
      setDonationHistory([]);
      setRecentListings([]);
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
              Welcome back,{" "}
              {user?.firstName || user?.name?.split(" ")[0] || "Donor"}! 👋
            </Text>
            <Text style={styles.subGreeting}>Your donation impact</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: "#E0F7F6" }]}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statNumber}>{stats?.itemsDonated || 0}</Text>
            <Text style={styles.statLabel}>Items Donated</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E0F7F6" }]}>
            <Text style={styles.statIcon}>🌍</Text>
            <Text style={styles.statNumber}>{stats?.co2Saved || 0}kg</Text>
            <Text style={styles.statLabel}>CO₂ Saved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E0F7F6" }]}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statNumber}>{stats?.rating || 0}</Text>
            <Text style={styles.statLabel}>Star Rating</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("CreateListing")}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Create New Listing</Text>
              <Text style={styles.actionDesc}>
                Donate an item you no longer need
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Schedules")}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Manage Pickups</Text>
              <Text style={styles.actionDesc}>View scheduled pickups</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Chat")}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Messages</Text>
              <Text style={styles.actionDesc}>Chat with recipients</Text>
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

        {/* Recent Listings */}
        {recentListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Active Listings</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Listings")}>
                <Text style={styles.viewAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            {recentListings.map((listing) => (
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
                  <Text style={styles.listingStatus}>{listing.status}</Text>
                </View>
                <Text style={styles.listingArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Donation History */}
        {donationHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Donation History</Text>
            {donationHistory.map((donation) => (
              <View key={donation._id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyIcon}>
                    <Text style={styles.historyEmoji}>📦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyItemName}>
                      {donation.itemLabel}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(donation.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyStatus}>{donation.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Eco Impact Widget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Your Impact</Text>
          <View style={styles.impactWidget}>
            <View style={styles.impactCard}>
              <Text style={styles.impactEmoji}>♻️</Text>
              <Text style={styles.impactValue}>{recentListings.length}</Text>
              <Text style={styles.impactLabel}>Items Recycled</Text>
            </View>
            <View style={styles.impactCard}>
              <Text style={styles.impactEmoji}>🌱</Text>
              <Text style={styles.impactValue}>
                {(recentListings.length * 2.5).toFixed(1)}
              </Text>
              <Text style={styles.impactLabel}>kg CO₂ Saved</Text>
            </View>
            <View style={styles.impactCard}>
              <Text style={styles.impactEmoji}>❤️</Text>
              <Text style={styles.impactValue}>
                {Math.floor(recentListings.length * 1.8)}
              </Text>
              <Text style={styles.impactLabel}>People Helped</Text>
            </View>
          </View>
        </View>

        {/* Tips & Guides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Donation Tips</Text>
          <TouchableOpacity
            style={styles.tipCard}
            onPress={() =>
              Alert.alert(
                "Tip",
                "Use clear lighting and multiple angles to showcase your items. Better photos = faster donations!",
              )
            }
          >
            <View style={styles.tipIconBox}>
              <Text style={styles.tipIcon}>📸</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Clear Photos Help</Text>
              <Text style={styles.tipDesc}>
                Good photos get more interest faster
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tipCard}
            onPress={() =>
              Alert.alert(
                "Tip",
                "Include condition, size, and notable details. Transparent descriptions build trust with recipients!",
              )
            }
          >
            <View style={styles.tipIconBox}>
              <Text style={styles.tipIcon}>📝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Detailed Descriptions</Text>
              <Text style={styles.tipDesc}>Include condition and details</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Connect Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Connect & Learn</Text>
          <TouchableOpacity
            style={styles.connectCard}
            onPress={() =>
              Alert.alert(
                "Sustainability Tips",
                "Practice sustainable living: reduce consumption, repair items before replacing, and inspire others to donate!",
              )
            }
          >
            <Text style={styles.connectEmoji}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.connectTitle}>Sustainability Tips</Text>
              <Text style={styles.connectDesc}>Live more eco-friendly</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.connectCard}
            onPress={() =>
              Alert.alert(
                "Leaderboard",
                "Coming soon! Track top donors in your community.",
              )
            }
          >
            <Text style={styles.connectEmoji}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.connectTitle}>Leaderboard</Text>
              <Text style={styles.connectDesc}>
                See top donors in your area
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
  listingStatus: {
    fontSize: 12,
    color: "#2A9D8F",
    marginTop: 2,
    fontWeight: "600",
  },
  listingArrow: {
    fontSize: 20,
    color: "#2A9D8F",
  },
  featureCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2A9D8F",
  },
  featureEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B1B1B",
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  featureButton: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: "#2A9D8F",
    borderRadius: 8,
  },
  featureButtonText: {
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
    backgroundColor: "#E0F7F6",
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
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369a1",
    textTransform: "capitalize",
  },
  impactWidget: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  impactCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  impactEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2A9D8F",
  },
  impactLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
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
    backgroundColor: "#E0F7F6",
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
  connectCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  connectEmoji: {
    fontSize: 28,
  },
  connectTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1B1B1B",
  },
  connectDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
});

export default DonorDashboard;
