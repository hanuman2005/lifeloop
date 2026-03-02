// src/screens/Profile.js - React Native (Instagram-style, Dark Theme)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { usersAPI, impactAPI } from "../services/api";
import api from "../services/api";
import Toast from "react-native-toast-message";
import ContactModal from "../components/ContactModal";
import ThemeToggle from "../components/ThemeToggle";

// ─── Constants ───
const getTabs = (userType) => {
  const baseTabs = [
    { id: "exchanges", icon: "🤝", label: "Exchanges" },
    { id: "badges", icon: "🏆", label: "Badges" },
  ];

  if (userType === "donor") {
    return [
      { id: "donations", icon: "📦", label: "My Donations" },
      { id: "ratings", icon: "⭐", label: "Ratings" },
      ...baseTabs,
    ];
  } else {
    // recipient
    return [
      { id: "received", icon: "📥", label: "Items Received" },
      { id: "ratings", icon: "⭐", label: "Ratings" },
      ...baseTabs,
    ];
  }
};

const BADGES = (user) => [
  {
    icon: "🌱",
    name: "First Step",
    desc: "Made first donation",
    unlocked: (user?.listingsCount || 0) > 0,
  },
  {
    icon: "🏆",
    name: "Super Donor",
    desc: "10+ donations",
    unlocked: (user?.listingsCount || 0) >= 10,
  },
  {
    icon: "💎",
    name: "Diamond",
    desc: "50+ donations",
    unlocked: (user?.listingsCount || 0) >= 50,
  },
  {
    icon: "⭐",
    name: "Top Rated",
    desc: "4.5+ rating",
    unlocked: (user?.rating || 0) >= 4.5,
  },
  {
    icon: "🌍",
    name: "Eco Hero",
    desc: "Saved 10kg CO₂",
    unlocked: (user?.co2Saved || 0) >= 10,
  },
  {
    icon: "🤝",
    name: "Community",
    desc: "5+ chats",
    unlocked: (user?.chatsCount || 0) >= 5,
  },
];

// ─── Avatar Component ───
const Avatar = ({ user, avatarPreview, size = 90 }) => {
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`;
  const src = avatarPreview || user?.avatar;

  return (
    <View
      style={[
        avatarStyles.wrapper,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={[avatarStyles.image, { borderRadius: size / 2 }]}
        />
      ) : (
        <Text style={[avatarStyles.initials, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#E0F7F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#2A9D8F",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    color: "#2A9D8F",
    fontWeight: "800",
  },
});

// ─── Stat Cell (Instagram-style) ───
const StatCell = ({ value, label }) => (
  <View style={styles.statCell}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── History Card (grid item) ───
const HistoryCard = ({ item, onReceipt }) => (
  <TouchableOpacity
    style={styles.historyCard}
    onPress={() => onReceipt(item)}
    activeOpacity={0.85}
  >
    <View style={styles.historyCardImage}>
      <Text style={styles.historyCardEmoji}>📦</Text>
    </View>
    <View style={styles.historyCardBody}>
      <Text style={styles.historyCardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View
        style={[
          styles.historyStatus,
          item.status === "completed" && styles.historyStatusCompleted,
          item.status === "pending" && styles.historyStatusPending,
        ]}
      >
        <Text style={styles.historyStatusText}>
          {item.status?.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.historyCardDate}>
        {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Badge Card ───
const BadgeCard = ({ badge }) => (
  <View style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}>
    <Text style={styles.badgeIcon}>{badge.icon}</Text>
    <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>
      {badge.name}
    </Text>
    <Text style={styles.badgeDesc}>{badge.desc}</Text>
    {!badge.unlocked && (
      <View style={styles.badgeLockOverlay}>
        <Text style={styles.badgeLockIcon}>🔒</Text>
      </View>
    )}
  </View>
);

// ─── Rating Card ───
const RatingCard = ({ rating }) => (
  <View style={styles.ratingCard}>
    <View style={styles.ratingHeader}>
      <View style={styles.ratingAvatar}>
        <Text style={styles.ratingAvatarText}>
          {rating.raterName?.[0] || "?"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ratingName}>{rating.raterName || "Anonymous"}</Text>
        <Text style={styles.ratingDate}>
          {new Date(rating.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.ratingStars}>
        {"⭐".repeat(Math.floor(rating.rating))}
      </Text>
    </View>
    {rating.comment ? (
      <Text style={styles.ratingComment}>"{rating.comment}"</Text>
    ) : null}
  </View>
);

// ─── Edit Modal ───
const EditModal = ({
  visible,
  formData,
  onChange,
  onSave,
  onClose,
  saving,
}) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.modalCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={onSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#2A9D8F" />
          ) : (
            <Text style={styles.modalSave}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.modalScroll}
        showsVerticalScrollIndicator={false}
      >
        {[
          { key: "firstName", label: "First Name", type: "default" },
          { key: "lastName", label: "Last Name", type: "default" },
          { key: "phone", label: "Phone", type: "phone-pad" },
          { key: "address", label: "Address", type: "default" },
          { key: "bio", label: "Bio", type: "default", multiline: true },
        ].map((field) => (
          <View key={field.key} style={styles.modalField}>
            <Text style={styles.modalLabel}>{field.label}</Text>
            <TextInput
              style={[
                styles.modalInput,
                field.multiline && styles.modalInputMulti,
              ]}
              value={formData[field.key]}
              onChangeText={(val) => onChange(field.key, val)}
              keyboardType={field.type}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 4 : 1}
              placeholderTextColor="#64748b"
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </View>
        ))}

        <View style={styles.modalField}>
          <Text style={styles.modalLabel}>Account Type</Text>
          <View style={styles.typeRow}>
            {["donor", "recipient", "both"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  formData.userType === type && styles.typeChipActive,
                ]}
                onPress={() => onChange("userType", type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    formData.userType === type && styles.typeChipTextActive,
                  ]}
                >
                  {type === "donor"
                    ? "🎁 Donor"
                    : type === "recipient"
                      ? "📦 Recipient"
                      : "🤝 Both"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

// ─── Receipt Modal ───
const ReceiptModal = ({ item, onClose, onDownload }) => {
  if (!item) return null;
  return (
    <Modal visible={!!item} animationType="fade" transparent>
      <View style={styles.receiptBackdrop}>
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>🎁 DONATION RECEIPT</Text>
          <Text style={styles.receiptItem}>{item.title}</Text>
          <View style={styles.receiptDivider} />
          {[
            ["Quantity", `${item.quantity} ${item.unit || ""}`],
            ["Category", item.category],
            ["Status", item.status?.toUpperCase()],
            ["Date", new Date(item.createdAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <View key={label} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{label}</Text>
              <Text style={styles.receiptValue}>{value}</Text>
            </View>
          ))}
          <View style={styles.receiptActions}>
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() => onDownload(item)}
            >
              <Text style={styles.receiptBtnText}>💾 Download</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.receiptBtn, styles.receiptBtnOutline]}
              onPress={onClose}
            >
              <Text style={styles.receiptBtnOutlineText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Component ───
const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("donations");
  const [editVisible, setEditVisible] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [history, setHistory] = useState([]);
  const [userListings, setUserListings] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [impactLoading, setImpactLoading] = useState(true);
  const [personalImpact, setPersonalImpact] = useState(null);
  const [communityImpact, setCommunityImpact] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
    userType: user?.userType || "donor",
  });

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Fetch impact data
  useEffect(() => {
    const fetchImpact = async () => {
      try {
        setImpactLoading(true);
        const personalRes = await impactAPI.getPersonalImpact();
        const communityRes = await impactAPI.getCommunityImpact();
        setPersonalImpact(personalRes.data);
        setCommunityImpact(communityRes.data);
      } catch (err) {
        console.log("Impact fetch error:", err.message);
      } finally {
        setImpactLoading(false);
      }
    };
    if (user) fetchImpact();
  }, [user]);

  // Fetch user listings
  useEffect(() => {
    const fetchUserListings = async () => {
      try {
        const res = await api.get(`/api/listings/user`);
        setUserListings(res.data || []);
      } catch (err) {
        console.log("Listings fetch error:", err.message);
      }
    };
    if (user?._id) fetchUserListings();
  }, [user?._id]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const initialTab = user?.userType === "donor" ? "donations" : "received";
    loadTab(initialTab);
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        bio: user.bio || "",
        userType: user.userType || "donor",
      });
    }
  }, [user]);

  const loadTab = async (tab) => {
    setTabLoading(true);
    try {
      if (tab === "ratings") {
        const res = await usersAPI.getRatings(user._id);
        setRatings(res.data.ratings || []);
      } else if (tab === "donations") {
        // Filter user listings to show only donations (created by user)
        const donations = userListings.filter(
          (listing) => listing.createdBy === user._id,
        );
        setHistory(donations);
      } else if (tab === "received") {
        // Filter listings that were received by this user
        const received = userListings.filter(
          (listing) => listing.recipient === user._id,
        );
        setHistory(received);
      } else if (tab === "exchanges") {
        // Fetch completed transactions (exchanges)
        const res = await api.get("/qr/my-transactions", {
          params: { status: "completed" },
        });
        setTransactionHistory(res.data.transactions || []);
      }
    } catch (e) {
      console.log("Tab load error:", e.message);
    } finally {
      setTabLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadTab(tab);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission needed to access photos",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarPreview(result.assets[0].uri);
      setAvatarFile(result.assets[0]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = user.avatar;
      if (avatarFile) {
        const uploadData = new FormData();
        uploadData.append("image", {
          uri: avatarFile.uri,
          type: "image/jpeg",
          name: "avatar.jpg",
        });
        const uploadRes = await usersAPI.updateProfileImage(uploadData);
        avatarUrl = uploadRes.data.imageUrl || uploadRes.data.url;
      }
      const updated = { ...formData, avatar: avatarUrl };
      const res = await usersAPI.updateProfile(user._id, updated);
      updateUser(res.data.user || res.data);
      Toast.show({ type: "success", text1: "Profile updated! ✅" });
      setEditVisible(false);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: err.response?.data?.message || "Update failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReceipt = (item) => {
    Toast.show({ type: "info", text1: "Receipt saved to your device 💾" });
    setSelectedReceipt(null);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            Toast.show({
              type: "success",
              text1: "Logged out successfully ✅",
            });
          } catch (err) {
            Toast.show({ type: "error", text1: "Logout failed" });
          }
        },
      },
    ]);
  };

  const badges = BADGES(user);
  const unlockedBadges = badges.filter((b) => b.unlocked).length;
  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : "—";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Top Bar ── */}
        <Animated.View style={[styles.topBar, { opacity: headerAnim }]}>
          <Text style={styles.topBarName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <View style={styles.topBarActions}>
            <ThemeToggle showLabel={false} />
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => setEditVisible(true)}
            >
              <Text style={styles.editProfileBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Profile Header (Instagram layout) ── */}
        <Animated.View style={[styles.profileHeader, { opacity: headerAnim }]}>
          {/* Avatar + Stats Row */}
          <View style={styles.profileHeaderRow}>
            {/* Avatar */}
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
              <Avatar user={user} avatarPreview={avatarPreview} size={90} />
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditBadgeText}>+</Text>
              </View>
            </TouchableOpacity>

            {/* Stats Grid (Instagram 3-column) */}
            <View style={styles.statsRow}>
              <StatCell value={user?.listingsCount || 0} label="Donations" />
              <View style={styles.statDivider} />
              <StatCell value={averageRating} label="Rating" />
              <View style={styles.statDivider} />
              <StatCell value={unlockedBadges} label="Badges" />
            </View>
          </View>

          {/* Name + Bio */}
          <Text style={styles.profileName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {user?.bio ? <Text style={styles.profileBio}>{user.bio}</Text> : null}

          {/* User Type Badge */}
          <View style={styles.userTypeBadge}>
            <Text style={styles.userTypeBadgeText}>
              {user?.userType === "donor"
                ? "🎁 Donor"
                : user?.userType === "recipient"
                  ? "📦 Recipient"
                  : "🤝 Donor & Recipient"}
            </Text>
          </View>

          {/* Impact Buttons */}
          <View style={styles.impactButtonsRow}>
            <TouchableOpacity
              style={styles.impactButton}
              onPress={() => navigation.navigate("PersonalImpact")}
              activeOpacity={0.8}
            >
              <Text style={styles.impactButtonText}>📊 My Impact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.impactButton}
              onPress={() => navigation.navigate("CommunityStats")}
              activeOpacity={0.8}
            >
              <Text style={styles.impactButtonText}>🌍 Community</Text>
            </TouchableOpacity>
          </View>

          {/* Impact Mini Stats */}
          <View style={styles.impactRow}>
            <View style={styles.impactItem}>
              <Text style={styles.impactValue}>🌍</Text>
              <Text style={styles.impactLabel}>Eco Hero</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactValue}>{ratings.length}</Text>
              <Text style={styles.impactLabel}>Reviews</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactValue}>✅</Text>
              <Text style={styles.impactLabel}>Verified</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {getTabs(user?.userType).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => handleTabChange(tab.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabIcon,
                  activeTab === tab.id && styles.tabIconActive,
                ]}
              >
                {tab.icon}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ── */}
        <View style={styles.tabContent}>
          {tabLoading ? (
            <ActivityIndicator color="#2A9D8F" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* History Grid */}
              {activeTab === "posts" &&
                (history.length === 0 ? (
                  <View style={styles.emptyTab}>
                    <Text style={styles.emptyTabIcon}>📦</Text>
                    <Text style={styles.emptyTabText}>No donations yet</Text>
                    <Text style={styles.emptyTabSub}>
                      Start donating to see your history here
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyGrid}>
                    {history.map((item) => (
                      <HistoryCard
                        key={item._id}
                        item={item}
                        onReceipt={setSelectedReceipt}
                      />
                    ))}
                  </View>
                ))}

              {/* Badges Grid */}
              {activeTab === "badges" && (
                <View style={styles.badgesGrid}>
                  {badges.map((badge, i) => (
                    <BadgeCard key={i} badge={badge} />
                  ))}
                </View>
              )}

              {/* Exchanges / Transaction History */}
              {activeTab === "exchanges" &&
                (transactionHistory.length === 0 ? (
                  <View style={styles.emptyTab}>
                    <Text style={styles.emptyTabIcon}>🤝</Text>
                    <Text style={styles.emptyTabText}>No exchanges yet</Text>
                    <Text style={styles.emptyTabSub}>
                      Complete donations and pickups to see your exchange
                      history
                    </Text>
                  </View>
                ) : (
                  <View style={styles.transactionList}>
                    {transactionHistory.map((tx, i) => (
                      <View key={i} style={styles.transactionCard}>
                        <View style={styles.transactionHeader}>
                          <Text style={styles.transactionTitle}>
                            {tx.listing?.title || "Item"}
                          </Text>
                          <Text style={styles.transactionStatus}>
                            ✓ Completed
                          </Text>
                        </View>
                        <View style={styles.transactionMeta}>
                          <Text style={styles.transactionMeta_Text}>
                            {tx.donor._id === user._id ? "with " : "from "}
                            {tx.donor._id === user._id
                              ? tx.recipient?.firstName
                              : tx.donor?.firstName}
                          </Text>
                          <Text style={styles.transactionDate}>
                            {new Date(tx.completedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}

              {/* Ratings List */}
              {activeTab === "ratings" &&
                (ratings.length === 0 ? (
                  <View style={styles.emptyTab}>
                    <Text style={styles.emptyTabIcon}>⭐</Text>
                    <Text style={styles.emptyTabText}>No reviews yet</Text>
                    <Text style={styles.emptyTabSub}>
                      Complete donations to receive reviews
                    </Text>
                  </View>
                ) : (
                  <View style={styles.ratingsList}>
                    {ratings.map((r, i) => (
                      <RatingCard key={i} rating={r} />
                    ))}
                  </View>
                ))}
            </>
          )}
        </View>

        {/* ── Quick Menu Links ── */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Schedules")}
            activeOpacity={0.8}
          >
            <Text style={styles.menuIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Upcoming Pickups</Text>
              <Text style={styles.menuDesc}>View your scheduled pickups</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("CommunityStats")}
            activeOpacity={0.8}
          >
            <Text style={styles.menuIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Community Stats</Text>
              <Text style={styles.menuDesc}>Leaderboards & rankings</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setActiveTab("badges")}
            activeOpacity={0.8}
          >
            <Text style={styles.menuIcon}>🎖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Achievements</Text>
              <Text style={styles.menuDesc}>Your badges & progress</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Contact & Logout ── */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => setShowContactModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.contactBtnIcon}>📧</Text>
            <Text style={styles.contactBtnText}>Contact Us</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutBtnIcon}>🚪</Text>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Edit Modal ── */}
      <EditModal
        visible={editVisible}
        formData={formData}
        onChange={(key, val) => setFormData((p) => ({ ...p, [key]: val }))}
        onSave={handleSave}
        onClose={() => setEditVisible(false)}
        saving={saving}
      />

      {/* ── Receipt Modal ── */}
      <ReceiptModal
        item={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onDownload={handleDownloadReceipt}
      />

      {/* ── Contact Modal ── */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  topBarName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B1B1B",
  },
  editProfileBtn: {
    borderWidth: 1,
    borderColor: "#2A9D8F",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FFF",
  },
  editProfileBtnText: {
    color: "#2A9D8F",
    fontWeight: "600",
    fontSize: 13,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Profile Header
  profileHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 24,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2A9D8F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  avatarEditBadgeText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 16,
  },

  // Stats (Instagram style)
  statsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statCell: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1B1B1B",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#DDD",
  },

  // Profile Info
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  profileBio: {
    fontSize: 13,
    color: "#999",
    lineHeight: 19,
    marginBottom: 10,
  },
  userTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F7F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#2A9D8F",
    marginBottom: 14,
  },
  userTypeBadgeText: {
    color: "#2A9D8F",
    fontSize: 12,
    fontWeight: "600",
  },

  // Impact Mini Row
  impactRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  impactItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1B1B",
  },
  impactLabel: {
    fontSize: 11,
    color: "#999",
  },

  // Impact Buttons
  impactButtonsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  impactButton: {
    flex: 1,
    backgroundColor: "#2A9D8F",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A9D8F",
  },
  impactButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#2A9D8F",
  },
  tabIcon: {
    fontSize: 20,
    color: "#999",
  },
  tabIconActive: {
    color: "#2A9D8F",
  },

  // Tab Content
  tabContent: {
    minHeight: 300,
    padding: 2,
    backgroundColor: "#FAFAFA",
  },

  // History Grid (3-column like Instagram)
  historyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  historyCard: {
    width: "33.33%",
    aspectRatio: 1,
    padding: 1,
  },
  historyCardImage: {
    flex: 1,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  historyCardEmoji: {
    fontSize: 32,
  },
  historyCardBody: {
    position: "absolute",
    bottom: 1,
    left: 1,
    right: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 5,
  },
  historyCardTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1B1B1B",
    marginBottom: 2,
  },
  historyStatus: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: "#F0F0F0",
    marginBottom: 2,
  },
  historyStatusCompleted: {
    backgroundColor: "#E0F7F6",
  },
  historyStatusPending: {
    backgroundColor: "#FFF3E0",
  },
  historyStatusText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
  },
  historyCardDate: {
    fontSize: 9,
    color: "#999",
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  badgeCard: {
    width: "30%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2A9D8F",
    position: "relative",
    overflow: "hidden",
  },
  badgeCardLocked: {
    borderColor: "#DDD",
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B1B1B",
    textAlign: "center",
    marginBottom: 2,
  },
  badgeNameLocked: {
    color: "#999",
  },
  badgeDesc: {
    fontSize: 9,
    color: "#999",
    textAlign: "center",
  },
  badgeLockOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  badgeLockIcon: {
    fontSize: 12,
  },

  // Ratings
  ratingsList: {
    padding: 12,
    gap: 12,
  },
  ratingCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#2A9D8F",
    marginBottom: 12,
    borderWidth: 1,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
    borderRightColor: "#DDD",
    borderBottomColor: "#DDD",
  },

  // Exchanges / Transactions
  transactionList: {
    padding: 12,
    gap: 12,
  },
  transactionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#2A9D8F",
    marginBottom: 12,
    borderWidth: 1,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
    borderRightColor: "#DDD",
    borderBottomColor: "#DDD",
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B1B1B",
    flex: 1,
  },
  transactionStatus: {
    fontSize: 12,
    color: "#2A9D8F",
    fontWeight: "600",
    backgroundColor: "#E0F7F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transactionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionMeta_Text: {
    fontSize: 14,
    color: "#666",
  },
  transactionDate: {
    fontSize: 12,
    color: "#999",
  },

  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  ratingAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2A9D8F",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingAvatarText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  ratingName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B1B1B",
  },
  ratingDate: {
    fontSize: 11,
    color: "#999",
  },
  ratingStars: {
    fontSize: 13,
  },
  ratingComment: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 19,
  },

  // Empty States
  emptyTab: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTabIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyTabText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B1B1B",
    marginBottom: 6,
  },
  emptyTabSub: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    lineHeight: 19,
  },

  // Edit Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  modalCancel: {
    color: "#999",
    fontSize: 15,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B1B1B",
  },
  modalSave: {
    color: "#2A9D8F",
    fontSize: 15,
    fontWeight: "700",
  },
  modalScroll: {
    padding: 16,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1B1B1B",
  },
  modalInputMulti: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeChipActive: {
    borderColor: "#2A9D8F",
    backgroundColor: "#E0F7F6",
  },
  typeChipText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  typeChipTextActive: {
    color: "#2A9D8F",
  },

  // Receipt Modal
  receiptBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  receiptCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2A9D8F",
    textAlign: "center",
    marginBottom: 6,
  },
  receiptItem: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1B1B",
    textAlign: "center",
    marginBottom: 16,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#DDD",
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  receiptLabel: {
    color: "#999",
    fontSize: 14,
  },
  receiptValue: {
    color: "#1B1B1B",
    fontSize: 14,
    fontWeight: "600",
  },
  receiptActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  receiptBtn: {
    flex: 1,
    backgroundColor: "#2A9D8F",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  receiptBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  receiptBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  receiptBtnOutlineText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },

  // Menu Section
  menuSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  menuItem: {
    flexDirection: "row",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  menuIcon: {
    fontSize: 24,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B1B1B",
  },
  menuDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    color: "#2A9D8F",
    fontWeight: "bold",
  },

  // Logout
  logoutSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutBtnIcon: {
    fontSize: 18,
  },
  logoutBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default Profile;
