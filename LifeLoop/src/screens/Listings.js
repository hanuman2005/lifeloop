// src/screens/Listings.js - React Native
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { listingsAPI } from "../services/api";
import configAPI from "../services/configAPI";
import Toast from "react-native-toast-message";
import ListingCard from "../components/ListingCard";
import Map from "../components/Map";
import FilterPanel from "../components/FilterPanel";
import * as Location from "expo-location";

// ─── Category Filter Pills ───
// Now loaded from configAPI (no hardcoded data)

const CategoryPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.pill, active && styles.pillActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Empty State ───
const EmptyState = ({ filtered, isUser, onCreateListing }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>📦</Text>
    <Text style={styles.emptyTitle}>No listings found</Text>
    <Text style={styles.emptySubtitle}>
      {filtered
        ? "Try adjusting your filters or search"
        : "No listings available right now. Check back later!"}
    </Text>
    {isUser && (
      <TouchableOpacity style={styles.createButton} onPress={onCreateListing}>
        <Text style={styles.createButtonText}>➕ Create First Listing</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Component ───
const Listings = () => {
  const [allListings, setAllListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"
  const [userLocation, setUserLocation] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const itemsPerPage = 10;

  const { user } = useAuth();
  const navigation = useNavigation();

  // Header animation
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    fetchAllListings();
    getUserLocation();
  }, [user?.userType, user?._id]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    } catch (err) {
      console.log("Could not get location:", err);
    }
  };

  // Apply filters whenever search/category changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, allListings]);

  const fetchAllListings = async () => {
    try {
      // ✅ If user is a donor, fetch ONLY their listings
      if (user?.userType === "donor") {
        const response = await listingsAPI.getUserListings({ limit: 100 });
        const listings = Array.isArray(response.data)
          ? response.data
          : response.data?.listings || response.data?.data || [];
        setAllListings(listings);
        setFilteredListings(listings);
      } else if (user?.userType === "admin") {
        // Fetch ALL listings for admins
        const response = await listingsAPI.getAll({});
        const listings = response.data?.listings || response.data?.data || [];
        setAllListings(listings);
        setFilteredListings(listings);
      } else {
        // Fetch all available listings for recipients/browsers
        const response = await listingsAPI.getAll({ status: "available" });
        const listings = response.data?.listings || response.data?.data || [];
        // Exclude current user's listings for other donors browsing
        const filtered = user
          ? listings.filter((l) => {
              const donorId =
                typeof l.donor === "object" ? l.donor._id : l.donor;
              return donorId?.toString() !== user._id?.toString();
            })
          : listings;
        setAllListings(filtered);
        setFilteredListings(filtered);
      }
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to load listings" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...allListings];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      result = result.filter(
        (l) => l.category?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    setFilteredListings(result);
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, allListings]);

  const handleDelete = async (listing) => {
    try {
      await listingsAPI.delete(listing._id);
      Toast.show({ type: "success", text1: "Listing deleted" });
      setAllListings((prev) => prev.filter((l) => l._id !== listing._id));
    } catch (err) {
      Toast.show({ type: "error", text1: "Failed to delete listing" });
    }
  };

  const isOwner = (listing) => {
    if (!user || !listing.donor) return false;
    const donorId =
      typeof listing.donor === "object" ? listing.donor._id : listing.donor;
    return donorId?.toString() === user._id?.toString();
  };

  // Role-based flags for button display
  const isRecipient = user?.userType === "recipient";
  const isDonor = user?.userType === "donor";
  const isAdmin = user?.role === "admin";

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllListings();
  };

  // Pagination
  const paginatedListings = filteredListings.slice(
    0,
    currentPage * itemsPerPage,
  );
  const hasMore = paginatedListings.length < filteredListings.length;

  const loadMore = () => {
    if (hasMore) setCurrentPage((p) => p + 1);
  };

  // ─── Render ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2A9D8F" />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>
              {user?.userType === "donor"
                ? "📋 My Listings"
                : "🔍 Browse Listings"}
            </Text>
            <Text style={styles.subtitle}>
              {filteredListings.length} item
              {filteredListings.length !== 1 ? "s" : ""} available
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Filter Button */}
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setShowFilterPanel(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterBtnIcon}>📊</Text>
            </TouchableOpacity>
            {/* View Mode Toggle */}
            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                viewMode === "map" && styles.viewToggleBtnActive,
              ]}
              onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
              activeOpacity={0.8}
            >
              <Text style={styles.viewToggleIcon}>
                {viewMode === "list" ? "🗺️" : "📋"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Bar - Create Listing */}
        {user && user.userType !== "recipient" && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("CreateListing")}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>➕ Create Listing</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* ── Listings / Map View ── */}
      {filteredListings.length === 0 ? (
        <EmptyState
          filtered={searchQuery || selectedCategory !== "All"}
          isUser={!!user && user.userType !== "recipient"}
          onCreateListing={() => navigation.navigate("CreateListing")}
        />
      ) : viewMode === "map" ? (
        <Map
          listings={filteredListings}
          userLocation={userLocation}
          height={400}
          showRadius={true}
          radiusKm={5}
          onMarkerClick={(listing) =>
            navigation.navigate("ListingDetails", { id: listing._id })
          }
        />
      ) : (
        <FlatList
          data={paginatedListings}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              isOwner={isOwner(item)}
              showQuickClaim={isRecipient && !isOwner(item)}
              showDistance={false}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2A9D8F"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator color="#2A9D8F" />
                <Text style={styles.loadMoreText}>Loading more...</Text>
              </View>
            ) : filteredListings.length > itemsPerPage ? (
              <Text style={styles.endText}>✓ All listings loaded</Text>
            ) : null
          }
          numColumns={1}
        />
      )}

      {/* Filter Panel Modal */}
      <Modal
        visible={showFilterPanel}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFilterPanel(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <FilterPanel
            onResults={(results) => {
              setFilteredListings(results);
              setShowFilterPanel(false);
              Toast.show({
                type: "success",
                text1: `Found ${results.length} listing${results.length !== 1 ? "s" : ""}`,
              });
            }}
            userLocation={userLocation}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA", // Light background
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "#999",
    fontSize: 14,
  },

  // Header
  header: {
    backgroundColor: "#2A9D8F", // Teal header
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAE7",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF", // White text on teal
  },
  subtitle: {
    fontSize: 13,
    color: "#E8F5F3", // Light teal text
    marginTop: 2,
  },
  viewToggleBtn: {
    backgroundColor: "#F5F5F5", // Light gray
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  viewToggleBtnActive: {
    backgroundColor: "#2A9D8F", // Teal when active
    borderColor: "#2A9D8F",
  },
  viewToggleIcon: {
    fontSize: 18,
    color: "#333",
  },
  filterBtn: {
    backgroundColor: "#F5F5F5", // Light gray
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  filterBtnIcon: {
    fontSize: 18,
    color: "#333",
  },
  addButton: {
    backgroundColor: "#2A9D8F", // Teal button
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#FFFFFF", // White text
    fontWeight: "700",
    fontSize: 14,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF", // White background
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDD", // Light Border
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
    color: "#2A9D8F", // Teal icon
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333", // Dark text
    padding: 0,
  },
  clearSearch: {
    color: "#999",
    fontSize: 16,
    fontWeight: "600",
  },

  // Pills
  pillsRow: {
    marginBottom: 8,
  },
  pill: {
    backgroundColor: "#F5F5F5", // Light gray
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  pillActive: {
    backgroundColor: "#C8E6E0", // Light teal
    borderColor: "#2A9D8F",
  },
  pillText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#2A9D8F", // Teal text when active
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: "#DDD",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: "#2A9D8F", // Teal button
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: "#FFFFFF", // White text
    fontWeight: "700",
    fontSize: 15,
  },

  // Load More
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  loadMoreText: {
    color: "#999",
    fontSize: 13,
  },
  endText: {
    textAlign: "center",
    color: "#CCC",
    fontSize: 13,
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA", // Light background
  },
});

export default Listings;
