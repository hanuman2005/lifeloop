// src/screens/Admin/AdminDashboard.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import Analytics from "./Analytics";
import Users from "./Users";
import Reports from "./Reports";
import Verifications from "./Verifications";
import FlaggedContent from "./FlaggedContent";
import Logs from "./Logs";

const TABS = [
  { label: "📊 Analytics", key: "analytics", component: Analytics },
  { label: "👥 Users", key: "users", component: Users },
  { label: "⚠️ Reports", key: "reports", component: Reports },
  { label: "✓ Verify", key: "verifications", component: Verifications },
  { label: "🚩 Flagged", key: "flagged", component: FlaggedContent },
  { label: "📜 Logs", key: "logs", component: Logs },
];

const AdminDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (user && user.userType !== "admin") {
      navigation.replace("Dashboard");
    }
  }, [user, navigation]);

  if (!user) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  const ActiveComponent = TABS[activeTab].component;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>🛡️ Admin Dashboard</Text>
          <Text style={s.headerSub}>Manage users, reports & platform</Text>
        </View>
        <View style={s.adminBadge}>
          <Text style={s.adminBadgeText}>
            👤 {user.firstName} {user.lastName}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={s.navWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.navContent}
        >
          {TABS.map((tab, idx) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(idx)}
              style={[s.tab, idx === activeTab && s.tabActive]}
            >
              <Text style={[s.tabText, idx === activeTab && s.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={s.content}>
        <ActiveComponent />
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#64748b", fontSize: 16 },

  header: {
    backgroundColor: "#131c2e",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "flex-start",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  adminBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  adminBadgeText: { color: "#4ade80", fontSize: 12, fontWeight: "600" },

  navWrap: {
    backgroundColor: "#131c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  navContent: { paddingHorizontal: 8, paddingVertical: 0 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#4ade80" },
  tabText: { fontSize: 13, fontWeight: "500", color: "#64748b" },
  tabTextActive: { color: "#4ade80", fontWeight: "700" },

  content: { flex: 1 },
});

export default AdminDashboardScreen;
