// src/screens/Home.js - Role-Based Home Screen (Dual-State)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { listingsAPI } from "../services/api";
import Toast from "react-native-toast-message";

const { width: SW } = Dimensions.get("window");

// ═══════════════════════════════════════════════════════════════════════════
// GUEST VIEW COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const BenefitCard = ({ icon, title, description }) => (
  <View style={styles.benefitCard}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={styles.benefitDesc}>{description}</Text>
  </View>
);

const StepCard = ({ num, title, desc }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{num}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  </View>
);

const TestimonialCard = ({ text, author, role, initial }) => (
  <View style={styles.testimonialCard}>
    <Text style={styles.testimonialStars}>⭐⭐⭐⭐⭐</Text>
    <Text style={styles.testimonialText}>"{text}"</Text>
    <View style={styles.testimonialAuthorContainer}>
      <View style={styles.testimonialAvatar}>
        <Text style={styles.testimonialAvatarText}>{initial}</Text>
      </View>
      <View>
        <Text style={styles.testimonialAuthor}>{author}</Text>
        <Text style={styles.testimonialRole}>{role}</Text>
      </View>
    </View>
  </View>
);

const GuestView = ({ navigation, stats, recentListings = [] }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const benefits = [
    {
      icon: "🤖",
      title: "AI-Powered Analysis",
      description:
        "Snap a photo and our AI instantly identifies items and suggests the best options.",
    },
    {
      icon: "🌍",
      title: "Track Your Impact",
      description:
        "See exactly how much CO₂ you've saved and your contribution to a cleaner planet.",
    },
    {
      icon: "🤝",
      title: "Community Connection",
      description:
        "Connect with neighbors who need what you have. Real-time chat and verified pickups.",
    },
    {
      icon: "📍",
      title: "Local First",
      description:
        "Find recycling centers and donation points within your area.",
    },
    {
      icon: "🔒",
      title: "Secure & Verified",
      description: "QR code verification, user ratings, and secure messaging.",
    },
    {
      icon: "📊",
      title: "Smart Scheduling",
      description: "Flexible pickup times and route optimization.",
    },
  ];

  const steps = [
    {
      num: "1",
      title: "Snap & Upload",
      desc: "Take a photo of your item. Our AI instantly analyzes it and suggests the best options.",
    },
    {
      num: "2",
      title: "Choose Your Path",
      desc: "Donate, find recycling centers, or get creative upcycling ideas.",
    },
    {
      num: "3",
      title: "Make Impact",
      desc: "Schedule a pickup, track your environmental impact, and earn recognition.",
    },
  ];

  const testimonials = [
    {
      text: "I've donated over 50 items that would have gone to landfill. The AI suggestions helped me upcycle old furniture!",
      author: "Sarah M.",
      role: "Eco-conscious Mom",
      initial: "S",
    },
    {
      text: "As a small nonprofit, this platform has been a game-changer. We've received donations that directly help families.",
      author: "David K.",
      role: "Community Center Director",
      initial: "D",
    },
    {
      text: "The impact tracking feature is incredible. Seeing the real CO₂ savings motivates me every day.",
      author: "Priya R.",
      role: "Environmental Advocate",
      initial: "P",
    },
  ];

  return (
    <Animated.ScrollView
      style={[styles.guestContainer, { opacity: fadeAnim }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.guestContent}
    >
      {/* ════════════════════════════════════════ HERO ════════════════════════════════════════ */}
      <Animated.View
        style={[styles.heroSection, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            ♻️ Join {(stats.users / 1000).toFixed(0)}K+ eco-warriors
          </Text>
        </View>

        <Text style={styles.heroTitle}>
          Turn Unused Items Into{" "}
          <Text style={styles.heroTitleAccent}>Environmental Impact</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          The AI-powered platform that helps you donate, recycle, and upcycle
          items — connecting you with people who need what you have.
        </Text>

        <View style={styles.ctaGroup}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>🚀 Start Free Today →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Text style={styles.ghostBtnText}>Log In</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>
              {(stats.itemsRescued / 1000).toFixed(1)}K+
            </Text>
            <Text style={styles.statLabel}>Items Rescued</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>
              {(stats.co2Saved / 1000).toFixed(0)}K kg
            </Text>
            <Text style={styles.statLabel}>CO₂ Prevented</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>
              {(stats.users / 1000).toFixed(1)}K+
            </Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
        </View>
      </Animated.View>

      {/* ════════════════════════════════════════ WHY US ════════════════════════════════════════ */}
      <View style={styles.whySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>Why Choose Us</Text>
          </View>
          <Text style={styles.sectionTitle}>
            Everything you need to reduce waste
          </Text>
          <Text style={styles.sectionSubtitle}>
            More than a donation platform. A complete ecosystem for sustainable
            living.
          </Text>
        </View>

        <View style={styles.benefitsGrid}>
          {benefits.map((b, i) => (
            <BenefitCard key={i} {...b} />
          ))}
        </View>
      </View>

      {/* ════════════════════════════════════════ HOW IT WORKS ════════════════════════════════════════ */}
      <View style={[styles.howItWorksSection, styles.sectionAlt]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>How It Works</Text>
          </View>
          <Text style={styles.sectionTitle}>Get started in 3 simple steps</Text>
          <Text style={styles.sectionSubtitle}>
            From upload to impact in minutes.
          </Text>
        </View>

        <View style={styles.stepsGrid}>
          {steps.map((s, i) => (
            <StepCard key={i} {...s} />
          ))}
        </View>
      </View>

      {/* ════════════════════════════════════════ TESTIMONIALS ════════════════════════════════════════ */}
      <View style={styles.testimonialSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>Testimonials</Text>
          </View>
          <Text style={styles.sectionTitle}>Loved by our community</Text>
        </View>

        {testimonials.map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </View>

      {/* ════════════════════════════════════════ RECENT LISTINGS ════════════════════════════════════════ */}
      <View style={[styles.listingsSection, styles.sectionAlt]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>Available Now</Text>
          </View>
          <Text style={styles.sectionTitle}>Items ready for a new home</Text>
        </View>

        {recentListings.length > 0 ? (
          <>
            {recentListings.slice(0, 4).map((listing) => (
              <TouchableOpacity
                key={listing._id}
                style={styles.listingCardGuest}
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.85}
              >
                <View style={styles.listingCardContent}>
                  <Text style={styles.listingCardTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={styles.listingCardCategory}>
                    {listing.category}
                  </Text>
                </View>
                <Text style={styles.listingCardArrow}>→</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.85}
            >
              <Text style={styles.viewAllBtnText}>View All Items →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyListings}>
            <Text style={styles.emptyListingsIcon}>🌱</Text>
            <Text style={styles.emptyListingsTitle}>
              Be the first contributor!
            </Text>
            <Text style={styles.emptyListingsText}>
              No items available yet. Start the circular economy in your area.
            </Text>
          </View>
        )}
      </View>

      {/* ════════════════════════════════════════ TRUST SIGNALS ════════════════════════════════════════ */}
      <View style={styles.trustSection}>
        {[
          "🔒 Secure Transactions",
          "✓ Verified Users",
          "📱 QR Verification",
          "🌍 Eco-Certified",
        ].map((item, i) => (
          <View key={i} style={styles.trustItem}>
            <Text style={styles.trustItemText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* ════════════════════════════════════════ FINAL CTA ════════════════════════════════════════ */}
      <View style={styles.finalCTA}>
        <Text style={styles.finalCTATitle}>Ready to make a difference?</Text>
        <Text style={styles.finalCTASubtitle}>
          Join thousands of eco-conscious individuals building a waste-free
          future.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("Register")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>🚀 Get Started Free →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ghostBtn, { borderColor: "#fff", marginTop: 12 }]}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.85}
        >
          <Text style={[styles.ghostBtnText, { color: "#fff" }]}>
            Learn More
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGED-IN VIEW COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const QuickActionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.actionBtn}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.actionIcon}>{icon}</Text>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ImpactCard = ({ icon, title, value, color, onPress }) => (
  <TouchableOpacity
    style={[styles.impactCard, { backgroundColor: color }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.impactIcon}>{icon}</Text>
    <Text style={styles.impactTitle}>{title}</Text>
    <Text style={styles.impactValue}>{value}</Text>
    <Text style={styles.impactCTA}>View Full Impact →</Text>
  </TouchableOpacity>
);

const RequestCard = ({ name, item, time, image }) => (
  <View style={styles.requestCard}>
    <View style={styles.requestLeft}>
      <View style={styles.requestAvatar}>
        <Text style={styles.requestAvatarText}>{name[0]}</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName} numberOfLines={1}>
          👤 {name} wants your {item}
        </Text>
        <Text style={styles.requestTime}>{time}</Text>
      </View>
    </View>
    <Text style={styles.requestArrow}>→</Text>
  </View>
);

const ListingCard = ({ title, status, info }) => (
  <View style={styles.listingCard}>
    <View style={styles.listingImagePlaceholder}>
      <Text style={styles.listingImageEmoji}>📦</Text>
    </View>
    <View style={styles.listingDetails}>
      <Text style={styles.listingTitle} numberOfLines={1}>
        {title}
      </Text>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: status === "Pending" ? "#fbbf24" : "#4ade80" },
        ]}
      >
        <Text style={styles.statusText}>●{status}</Text>
      </View>
      <Text style={styles.listingInfo}>{info}</Text>
    </View>
  </View>
);

const ItemCard = ({ title, category, distance, status }) => (
  <View style={styles.itemCard}>
    <View style={styles.itemImagePlaceholder}>
      <Text style={styles.itemImageEmoji}>📦</Text>
    </View>
    <Text style={styles.itemTitle} numberOfLines={1}>
      {title}
    </Text>
    <Text style={styles.itemMeta}>
      {category} · {distance}
    </Text>
    <View style={styles.itemBadge}>
      <Text style={styles.itemStatus}>●{status}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════

const Home = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    users: 2500,
    itemsRescued: 8400,
    co2Saved: 12500,
  });
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bothMode, setBothMode] = useState("donating"); // for "both" role

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, []),
  );

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await listingsAPI.getAll({ limit: 4, status: "available" });
      const listings = res.data?.listings || res.data?.data || [];
      setRecentListings(listings.slice(0, 4));
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  // GUEST VIEW
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <GuestView
          navigation={navigation}
          stats={stats}
          recentListings={recentListings}
        />
      </SafeAreaView>
    );
  }

  // ADMIN VIEW - Route to AdminDashboard
  if (user.userType === "admin") {
    const AdminDashboard = require("../Admin/AdminDashboard").default;
    return <AdminDashboard />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGED-IN DONOR VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (user.userType === "donor") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.loggedInContent}
        >
          {/* Header with Greeting */}
          <View style={styles.donorHeader}>
            <View>
              <Text style={styles.greeting}>
                Good morning, {user.firstName || "Donor"} 👋
              </Text>
              <Text style={styles.statusBadgeText}>🏆 Gold Donor</Text>
            </View>
          </View>

          {/* Primary CTA - Post New Item */}
          <TouchableOpacity
            style={styles.primaryCTAButton}
            onPress={() => navigation.navigate("CreateListing")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryCTAIcon}>📸</Text>
            <Text style={styles.primaryCTAText}>POST NEW ITEM</Text>
            <Text style={styles.primaryCTAArrow}>→</Text>
          </TouchableOpacity>

          {/* Impact Dashboard */}
          <View style={styles.impactDashboard}>
            <Text style={styles.dashboardTitle}>📊 YOUR IMPACT</Text>
            <View style={styles.impactStatsGrid}>
              <View style={styles.impactStatCard}>
                <Text style={styles.impactStatIcon}>🎁</Text>
                <Text style={styles.impactStatValue}>0</Text>
                <Text style={styles.impactStatLabel}>Items Donated</Text>
              </View>
              <View style={styles.impactStatCard}>
                <Text style={styles.impactStatIcon}>♻️</Text>
                <Text style={styles.impactStatValue}>0 kg</Text>
                <Text style={styles.impactStatLabel}>CO₂ Saved</Text>
              </View>
              <View style={styles.impactStatCard}>
                <Text style={styles.impactStatIcon}>🤝</Text>
                <Text style={styles.impactStatValue}>0</Text>
                <Text style={styles.impactStatLabel}>People Helped</Text>
              </View>
            </View>
          </View>

          {/* Interested Requests Section */}
          <View style={styles.interestedSection}>
            <View style={styles.interestedHeader}>
              <Text style={styles.interestedTitle}>🔔 INTERESTED REQUESTS</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Notifications")}
              >
                <Text style={styles.seeAllBtn}>See all</Text>
              </TouchableOpacity>
            </View>

            {recentListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📭</Text>
                <Text style={styles.emptyStateTitle}>No requests yet</Text>
                <Text style={styles.emptyStateText}>
                  Post an item to get interested buyers
                </Text>
              </View>
            ) : (
              <View style={styles.requestsList}>
                {recentListings.slice(0, 3).map((listing, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.interestedRequestCard}
                    onPress={() => navigation.navigate("Notifications")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.requestHeaderRow}>
                      <View style={styles.requesterInfo}>
                        <View style={styles.requesterAvatar}>
                          <Text style={styles.requesterAvatarText}>U</Text>
                        </View>
                        <View style={styles.requesterDetails}>
                          <Text style={styles.requesterName} numberOfLines={1}>
                            User wants your {listing.title}
                          </Text>
                          <Text style={styles.requestTimeAgo}>2h ago</Text>
                        </View>
                      </View>
                      <Text style={styles.requestArrowIcon}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* My Active Listings */}
          <View style={styles.myListingsSection}>
            <View style={styles.myListingsHeader}>
              <Text style={styles.myListingsTitle}>📋 MY LISTINGS</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation
                    .getParent()
                    ?.navigate("Main", { screen: "Listings" })
                }
              >
                <Text style={styles.seeAllBtn}>See all</Text>
              </TouchableOpacity>
            </View>

            {recentListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📝</Text>
                <Text style={styles.emptyStateTitle}>No listings</Text>
                <Text style={styles.emptyStateText}>
                  Start by posting your first item above
                </Text>
              </View>
            ) : (
              <View style={styles.listingsGrid}>
                {recentListings.slice(0, 2).map((listing, idx) => (
                  <View key={idx} style={styles.donorListingCard}>
                    <View style={styles.listingCardThumbnail}>
                      <Text style={styles.listingCardEmoji}>📦</Text>
                    </View>
                    <View style={styles.listingCardInfo}>
                      <Text style={styles.donorListingTitle} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <View style={styles.listingStatusRow}>
                        <View style={styles.activeStatusBadge}>
                          <Text style={styles.activeStatusDot}>●</Text>
                          <Text style={styles.statusLabel}>Active</Text>
                        </View>
                        <Text style={styles.interestedCount}>3 interested</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Quick Links */}
          <View style={styles.quickLinksSection}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => navigation.navigate("Schedules")}
            >
              <Text style={styles.quickLinkIcon}>📅</Text>
              <Text style={styles.quickLinkText}>Schedules</Text>
              <Text style={styles.quickLinkArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() =>
                Toast.show({
                  type: "info",
                  text1: "Select an item to show QR",
                })
              }
            >
              <Text style={styles.quickLinkIcon}>📱</Text>
              <Text style={styles.quickLinkText}>Show QR Code</Text>
              <Text style={styles.quickLinkArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGED-IN RECIPIENT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (user.userType === "recipient") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.loggedInContent}
        >
          {/* Header with Greeting */}
          <View style={styles.recipientHeader}>
            <View>
              <Text style={styles.greeting}>
                Good morning, {user.firstName || "Recipient"} 👋
              </Text>
              <Text style={styles.recipientStatusBadge}>🎯 Smart Receiver</Text>
            </View>
          </View>

          {/* Primary CTA - Find Items */}
          <TouchableOpacity
            style={styles.recipientCTAButton}
            onPress={() =>
              navigation.getParent()?.navigate("Main", { screen: "Listings" })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.recipientCTAIcon}>🔍</Text>
            <Text style={styles.recipientCTAText}>FIND ITEMS NEAR YOU</Text>
            <Text style={styles.recipientCTAArrow}>→</Text>
          </TouchableOpacity>

          {/* Impact Dashboard */}
          <View style={styles.recipientImpactDashboard}>
            <Text style={styles.recipientDashboardTitle}>📈 YOUR SAVINGS</Text>
            <View style={styles.recipientImpactStatsGrid}>
              <View style={styles.recipientImpactStatCard}>
                <Text style={styles.recipientImpactStatIcon}>📦</Text>
                <Text style={styles.recipientImpactStatValue}>0</Text>
                <Text style={styles.recipientImpactStatLabel}>Items Saved</Text>
              </View>
              <View style={styles.recipientImpactStatCard}>
                <Text style={styles.recipientImpactStatIcon}>💰</Text>
                <Text style={styles.recipientImpactStatValue}>$0</Text>
                <Text style={styles.recipientImpactStatLabel}>Money Saved</Text>
              </View>
              <View style={styles.recipientImpactStatCard}>
                <Text style={styles.recipientImpactStatIcon}>🌍</Text>
                <Text style={styles.recipientImpactStatValue}>0 kg</Text>
                <Text style={styles.recipientImpactStatLabel}>
                  Waste Diverted
                </Text>
              </View>
            </View>
          </View>

          {/* Active Pickups Section */}
          <View style={styles.recipientActiveSection}>
            <View style={styles.activePickupHeader}>
              <Text style={styles.activePickupTitle}>📅 UPCOMING PICKUPS</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Schedules")}
              >
                <Text style={styles.seeAllBtn}>See all</Text>
              </TouchableOpacity>
            </View>

            {recentListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📭</Text>
                <Text style={styles.emptyStateTitle}>No pickups scheduled</Text>
                <Text style={styles.emptyStateText}>
                  Find items and schedule a pickup to get started
                </Text>
              </View>
            ) : (
              <View style={styles.pickupsList}>
                {recentListings.slice(0, 3).map((listing, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recipientPickupCard}
                    onPress={() => navigation.navigate("Schedules")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickupHeaderRow}>
                      <View style={styles.pickupInfo}>
                        <View style={styles.pickupIconWrap}>
                          <Text style={styles.pickupCardIcon}>📦</Text>
                        </View>
                        <View style={styles.pickupDetails}>
                          <Text style={styles.pickupItemName} numberOfLines={1}>
                            {listing.title}
                          </Text>
                          <Text style={styles.pickupScheduleTime}>
                            Sat, 10:00 AM
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.pickupArrowIcon}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Recently Available Section */}
          <View style={styles.recipientListingsSection}>
            <View style={styles.recentListingsHeader}>
              <Text style={styles.recentListingsTitle}>🔥 RECENTLY ADDED</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation
                    .getParent()
                    ?.navigate("Main", { screen: "Listings" })
                }
              >
                <Text style={styles.seeAllBtn}>See all</Text>
              </TouchableOpacity>
            </View>

            {recentListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🌱</Text>
                <Text style={styles.emptyStateTitle}>Browsing</Text>
                <Text style={styles.emptyStateText}>
                  New items posted by donors in your area
                </Text>
              </View>
            ) : (
              <View style={styles.recipientListingsGrid}>
                {recentListings.slice(0, 2).map((listing, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recipientListingCard}
                    onPress={() =>
                      navigation.navigate("ListingDetails", {
                        id: listing._id,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.recipientListingCardThumbnail}>
                      <Text style={styles.recipientListingCardEmoji}>📦</Text>
                    </View>
                    <View style={styles.recipientListingCardInfo}>
                      <Text
                        style={styles.recipientListingTitle}
                        numberOfLines={1}
                      >
                        {listing.title}
                      </Text>
                      <Text style={styles.recipientListingCategory}>
                        {listing.category}
                      </Text>
                      <View style={styles.recipientListingFooter}>
                        <View style={styles.recipientReadyBadge}>
                          <Text style={styles.readyDot}>●</Text>
                          <Text style={styles.recipientReadyLabel}>
                            Ready Now
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Quick Links */}
          <View style={styles.recipientQuickLinksSection}>
            <TouchableOpacity
              style={styles.recipientQuickLink}
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate("Main", { screen: "WasteAnalyzer" })
              }
            >
              <Text style={styles.recipientQuickLinkIcon}>🤖</Text>
              <Text style={styles.recipientQuickLinkText}>AI Waste Guide</Text>
              <Text style={styles.recipientQuickLinkArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recipientQuickLink}
              onPress={() => navigation.navigate("Schedules")}
            >
              <Text style={styles.recipientQuickLinkIcon}>📅</Text>
              <Text style={styles.recipientQuickLinkText}>My Schedules</Text>
              <Text style={styles.recipientQuickLinkArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGED-IN BOTH VIEW (with toggle)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.loggedInContent}
      >
        {/* Header with Mode Toggle */}
        <View style={styles.loggedInHeader}>
          <View>
            <Text style={styles.greeting}>
              Good morning, {user.firstName || "User"} 👋
            </Text>
            <Text style={styles.roleTag}>🤝 Donor & Recipient</Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              bothMode === "donating" && styles.modeBtnActive,
            ]}
            onPress={() => setBothMode("donating")}
          >
            <Text
              style={[
                styles.modeBtnText,
                bothMode === "donating" && styles.modeBtnTextActive,
              ]}
            >
              🎁 Donating
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              bothMode === "receiving" && styles.modeBtnActive,
            ]}
            onPress={() => setBothMode("receiving")}
          >
            <Text
              style={[
                styles.modeBtnText,
                bothMode === "receiving" && styles.modeBtnTextActive,
              ]}
            >
              📦 Receiving
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Content Based on Mode */}
        {bothMode === "donating" ? (
          <>
            <ImpactCard
              icon="🌍"
              title="Your Donations"
              value={loading ? "Loading..." : "No donations yet"}
              color="#d1fae5"
              onPress={() => navigation.navigate("Dashboard")}
            />

            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <QuickActionButton
                  icon="📸"
                  label="Post"
                  onPress={() => navigation.navigate("CreateListing")}
                />
                <QuickActionButton
                  icon="📋"
                  label="Items"
                  onPress={() =>
                    navigation
                      .getParent()
                      ?.navigate("Main", { screen: "Listings" })
                  }
                />
                <QuickActionButton
                  icon="📱"
                  label="QR"
                  onPress={() =>
                    Toast.show({ type: "info", text1: "Select an item" })
                  }
                />
                <QuickActionButton
                  icon="📅"
                  label="Schedules"
                  onPress={() => navigation.navigate("Schedules")}
                />
                <QuickActionButton
                  icon="🏆"
                  label="Eco Points"
                  onPress={() => navigation.navigate("EcoPoints")}
                />
                <QuickActionButton
                  icon="🗺️"
                  label="Centers"
                  onPress={() => navigation.navigate("NearbyMap")}
                />
                <QuickActionButton
                  icon="🚛"
                  label="Pickup"
                  onPress={() => navigation.navigate("PickupSchedule")}
                />
              </View>
            </View>

            <View style={styles.requestsSection}>
              <View style={styles.loggedInSectionHeader}>
                <Text style={styles.sectionTitle}>📬 Requests</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Notifications")}
                >
                  <Text style={styles.seeAllBtn}>See all</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <ImpactCard
              icon="🔍"
              title="Find Items Near You"
              value={loading ? "Loading..." : "Explore nearby"}
              color="#dbeafe"
              onPress={() =>
                navigation.getParent()?.navigate("Main", { screen: "Listings" })
              }
            />

            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <QuickActionButton
                  icon="🔍"
                  label="Find"
                  onPress={() =>
                    navigation
                      .getParent()
                      ?.navigate("Main", { screen: "Listings" })
                  }
                />
                <QuickActionButton
                  icon="📱"
                  label="Scan"
                  onPress={() => navigation.navigate("QRScanner")}
                />
                <QuickActionButton
                  icon="📅"
                  label="Schedules"
                  onPress={() => navigation.navigate("Schedules")}
                />
                <QuickActionButton
                  icon="🤖"
                  label="AI"
                  onPress={() =>
                    navigation
                      .getParent()
                      ?.navigate("Main", { screen: "WasteAnalyzer" })
                  }
                />
                <QuickActionButton
                  icon="🏆"
                  label="Eco Points"
                  onPress={() => navigation.navigate("EcoPoints")}
                />
                <QuickActionButton
                  icon="🗺️"
                  label="Centers"
                  onPress={() => navigation.navigate("NearbyMap")}
                />
                <QuickActionButton
                  icon="🚛"
                  label="Pickup"
                  onPress={() => navigation.navigate("PickupSchedule")}
                />
              </View>
            </View>

            <View style={styles.nearYouSection}>
              <View style={styles.loggedInSectionHeader}>
                <Text style={styles.sectionTitle}>📍 Near You</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation
                      .getParent()
                      ?.navigate("Main", { screen: "Listings" })
                  }
                >
                  <Text style={styles.seeAllBtn}>See all</Text>
                </TouchableOpacity>
              </View>
              {recentListings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    📦 No items available yet
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.itemsScroll}
                >
                  {recentListings.map((item) => (
                    <ItemCard
                      key={item._id}
                      title={item.title}
                      category={item.category}
                      distance="-"
                      status="Available"
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },

  // Guest View
  guestContainer: { flex: 1, backgroundColor: "#0a0f1e" },
  guestContent: { paddingHorizontal: 0, paddingVertical: 20 },
  guestHero: { alignItems: "center", marginBottom: 40, marginTop: 20 },
  logoEmoji: { fontSize: 64, marginBottom: 12 },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#f1f5f9",
    letterSpacing: 1,
  },
  tagline: { fontSize: 14, color: "#64748b", marginTop: 8 },

  // New Guest View Sections
  whySection: {
    marginBottom: 32,
    paddingHorizontal: 0,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  howItWorksSection: {
    marginBottom: 32,
    paddingHorizontal: 0,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  sectionAlt: { backgroundColor: "#131c2e", paddingVertical: 24 },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    width: "100%",
  },
  sectionLabel: {
    backgroundColor: "#4ade80",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "center",
    marginBottom: 8,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0a0f1e",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 8,
    marginTop: 0,
    lineHeight: 28,
    textAlign: "center",
    width: "100%",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 0,
    lineHeight: 18,
    textAlign: "center",
    width: "100%",
  },
  whyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  whyIcon: { fontSize: 24 },
  whyContent: { flex: 1 },
  whyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 2,
  },
  whyDesc: { fontSize: 12, color: "#64748b" },

  communitySection: { marginBottom: 40 },
  communitySectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 12,
  },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: "#94a3b8" },

  guestCTA: { gap: 12 },
  primaryBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "800", color: "#0a0f1e" },
  ghostBtn: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4ade80",
  },
  ghostBtnText: { fontSize: 16, fontWeight: "700", color: "#4ade80" },

  // Logged-In View
  loggedInContent: { paddingHorizontal: 16, paddingVertical: 12 },
  loggedInHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  // Donor View Specific
  donorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  statusBadgeText: {
    fontSize: 12,
    color: "#fbbf24",
    fontWeight: "700",
    marginTop: 4,
  },
  primaryCTAButton: {
    backgroundColor: "#4ade80",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryCTAIcon: {
    fontSize: 24,
  },
  primaryCTAText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#0a0f1e",
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  primaryCTAArrow: {
    fontSize: 18,
    color: "#0a0f1e",
    fontWeight: "700",
  },
  impactDashboard: {
    marginBottom: 28,
  },
  dashboardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  impactStatsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  impactStatCard: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4ade80",
    borderOpacity: 0.3,
  },
  impactStatIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  impactStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 6,
  },
  impactStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  interestedSection: {
    marginBottom: 28,
  },
  interestedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  interestedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: 0.5,
  },
  requestsList: {
    gap: 10,
  },
  interestedRequestCard: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  requestHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requesterInfo: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  requesterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  requesterAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0a0f1e",
  },
  requesterDetails: {
    flex: 1,
  },
  requesterName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 2,
  },
  requestTimeAgo: {
    fontSize: 11,
    color: "#64748b",
  },
  requestArrowIcon: {
    fontSize: 16,
    color: "#4ade80",
    fontWeight: "700",
    marginLeft: 8,
  },
  myListingsSection: {
    marginBottom: 28,
  },
  myListingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  myListingsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f1f5f9",
    letterSpacing: 0.5,
  },
  listingsGrid: {
    gap: 12,
  },
  donorListingCard: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  listingCardThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listingCardEmoji: {
    fontSize: 28,
  },
  listingCardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  donorListingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 8,
  },
  listingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeStatusDot: {
    fontSize: 10,
    color: "#10b981",
    fontWeight: "800",
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10b981",
  },
  interestedCount: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  quickLinksSection: {
    gap: 10,
    marginBottom: 20,
  },
  quickLink: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  quickLinkIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  quickLinkArrow: {
    fontSize: 14,
    color: "#4ade80",
    fontWeight: "700",
  },
  greeting: { fontSize: 18, fontWeight: "800", color: "#f1f5f9" },
  roleTag: { fontSize: 12, color: "#4ade80", fontWeight: "600", marginTop: 4 },
  notificationBell: { position: "relative" },
  notificationIcon: { fontSize: 24 },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  impactCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  impactIcon: { fontSize: 32, marginBottom: 8 },
  impactTitle: {
    fontSize: 13,
    color: "#0a0f1e",
    fontWeight: "600",
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0a0f1e",
    marginBottom: 8,
  },
  impactCTA: {
    fontSize: 12,
    color: "#0a0f1e",
    fontWeight: "600",
    opacity: 0.7,
  },

  quickActionsSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 12,
  },
  quickActionsGrid: { flexDirection: "row", justifyContent: "space-between" },
  actionBtn: {
    width: "23%",
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
  },

  requestsSection: { marginBottom: 24 },
  loggedInSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllBtn: { fontSize: 12, color: "#4ade80", fontWeight: "600" },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  requestLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
  },
  requestAvatarText: { fontWeight: "800", color: "#0a0f1e", fontSize: 14 },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 14, fontWeight: "600", color: "#f1f5f9" },
  requestTime: { fontSize: 11, color: "#64748b", marginTop: 2 },
  requestArrow: { fontSize: 16, color: "#4ade80", fontWeight: "700" },

  listingsSection: {
    marginBottom: 24,
    paddingHorizontal: 0,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  listingCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  listingImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
  },
  listingImageEmoji: { fontSize: 28 },
  listingDetails: { flex: 1, justifyContent: "center" },
  listingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600", color: "#0a0f1e" },
  listingInfo: { fontSize: 11, color: "#64748b" },

  nearYouSection: { marginBottom: 24 },
  itemsScroll: { paddingRight: 16, gap: 12 },
  itemCard: {
    width: 100,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  itemImagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  itemImageEmoji: { fontSize: 28 },
  itemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  itemMeta: { fontSize: 10, color: "#64748b", marginBottom: 6 },
  itemBadge: {
    backgroundColor: "#4ade80",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemStatus: { fontSize: 10, fontWeight: "600", color: "#0a0f1e" },

  myRequestsSection: { marginBottom: 24 },
  trendingSection: { marginBottom: 24 },
  categoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    backgroundColor: "#131c2e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },

  modeToggle: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnActive: { backgroundColor: "#4ade80" },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  modeBtnTextActive: { color: "#0a0f1e", fontWeight: "800" },

  emptyState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "center",
  },

  // Guest View Styles
  heroSection: {
    backgroundColor: "#2ea66f",
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 36,
  },
  heroTitleAccent: {
    color: "#fbbf24",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 0,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 0,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  statLbl: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },

  benefitsSection: {
    marginBottom: 32,
    paddingHorizontal: 0,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  benefitsSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 16,
    marginLeft: 16,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  benefitCard: {
    width: "48%",
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
    alignItems: "center",
  },
  benefitIcon: {
    fontSize: 28,
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 6,
  },
  benefitDesc: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },

  stepsSection: {
    marginBottom: 32,
    paddingHorizontal: 0,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  stepsSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 16,
  },
  stepsGrid: {
    gap: 16,
    paddingHorizontal: 16,
  },
  stepCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
    alignItems: "flex-start",
  },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0a0f1e",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: "#64748b",
  },

  testimonialSection: {
    marginBottom: 32,
    paddingHorizontal: 0,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  testimonialSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 16,
  },
  testimonialsGrid: {
    gap: 16,
    paddingHorizontal: 16,
  },
  testimonialCard: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
    marginBottom: 8,
  },
  testimonialStars: {
    fontSize: 12,
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 13,
    color: "#e2e8f0",
    fontStyle: "italic",
    marginBottom: 12,
    lineHeight: 18,
  },
  testimonialAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 2,
  },
  testimonialRole: {
    fontSize: 11,
    color: "#64748b",
  },

  listingsCardSection: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  listingsSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewAllBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  listingCardGuest: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listingCardContent: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  listingImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listingImageEmoji: {
    fontSize: 28,
  },
  listingCardInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  listingCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  listingCardCategory: {
    fontSize: 11,
    color: "#64748b",
  },
  emptyListings: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  emptyListingsText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },

  trustSection: {
    marginBottom: 32,
    paddingHorizontal: 16,
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
  },
  trustBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  trustBadge: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  trustBadgeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
  },

  finalCTASection: {
    marginBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: "#0a0f1e",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  finalCTA: {
    marginBottom: 40,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  finalCTATitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 8,
  },
  finalCTASubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  ctaGroup: {
    width: "100%",
    gap: 10,
  },
  ctaPrimaryBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0a0f1e",
  },
  ctaSecondaryBtn: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4ade80",
  },
  ctaSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4ade80",
  },

  // Missing Styles for Guest View
  listingCardArrow: {
    fontSize: 16,
    color: "#4ade80",
    fontWeight: "700",
    marginLeft: 8,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4ade80",
    textAlign: "center",
  },
  emptyListingsIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyListingsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  trustItem: {
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  trustItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },

  // Testimonial Card Helper Styles
  testimonialAuthorContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 12,
  },
  testimonialAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0a0f1e",
  },
  testimonialName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f1f5f9",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RECIPIENT VIEW STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  recipientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  recipientStatusBadge: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3b82f6",
    marginTop: 4,
  },
  recipientCTAButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  recipientCTAIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  recipientCTAText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  recipientCTAArrow: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    marginLeft: 12,
  },

  // Impact Dashboard
  recipientImpactDashboard: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  recipientDashboardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  recipientImpactStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  recipientImpactStatCard: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  recipientImpactStatIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  recipientImpactStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  recipientImpactStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },

  // Active Pickups Section
  recipientActiveSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  activePickupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  activePickupTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  pickupsList: {
    gap: 10,
  },
  recipientPickupCard: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftColor: "#3b82f6",
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  pickupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  pickupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupCardIcon: {
    fontSize: 20,
  },
  pickupDetails: {
    flex: 1,
  },
  pickupItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 2,
  },
  pickupScheduleTime: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  pickupArrowIcon: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "700",
  },

  // Recently Added Section
  recipientListingsSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  recentListingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  recentListingsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  recipientListingsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  recipientListingCard: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 11,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  recipientListingCardThumbnail: {
    backgroundColor: "rgba(59,130,246,0.1)",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientListingCardEmoji: {
    fontSize: 28,
  },
  recipientListingCardInfo: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  recipientListingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 3,
  },
  recipientListingCategory: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 8,
  },
  recipientListingFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  recipientReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readyDot: {
    fontSize: 10,
    color: "#10b981",
    fontWeight: "800",
  },
  recipientReadyLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10b981",
  },

  // Quick Links
  recipientQuickLinksSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  recipientQuickLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131c2e",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  recipientQuickLinkIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  recipientQuickLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  recipientQuickLinkArrow: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "700",
  },
});

export default Home;
