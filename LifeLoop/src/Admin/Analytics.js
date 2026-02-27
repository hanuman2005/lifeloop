// src/screens/Admin/components/Analytics.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { adminAPI } from "../services/api";

const MetricCard = ({ value, label, color = "#667eea" }) => (
  <View style={[s.metricCard, { borderLeftColor: color }]}>
    <Text style={[s.metricValue, { color }]}>{value}</Text>
    <Text style={s.metricLabel}>{label}</Text>
  </View>
);

const StatCard = ({ icon, value, label, change, changeLabel }) => (
  <View style={s.statCard}>
    <View style={s.statIcon}>
      <Text style={s.statIconText}>{icon}</Text>
    </View>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {change !== undefined && (
      <Text style={s.statChange}>
        ↑ {change} {changeLabel}
      </Text>
    )}
  </View>
);

const getStatusColor = (status) => {
  const colors = {
    available: { bg: "#dcfce7", text: "#166534" },
    pending: { bg: "#fef9c3", text: "#854d0e" },
    completed: { bg: "#dbeafe", text: "#1e40af" },
    critical: { bg: "#fee2e2", text: "#991b1b" },
    high: { bg: "#fef9c3", text: "#854d0e" },
    medium: { bg: "#f1f5f9", text: "#475569" },
  };
  const darkColors = {
    available: { bg: "rgba(74,222,128,0.1)", text: "#4ade80" },
    pending: { bg: "rgba(255,193,7,0.1)", text: "#fbbf24" },
    completed: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
    critical: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
    high: { bg: "rgba(255,193,7,0.1)", text: "#fbbf24" },
    medium: { bg: "rgba(107,114,128,0.1)", text: "#9ca3af" },
  };
  return darkColors[status] || { bg: "rgba(107,114,128,0.1)", text: "#9ca3af" };
};

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.stats);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={s.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.errorWrap}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchStats}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Title */}
      <View style={s.header}>
        <Text style={s.title}>Platform Analytics</Text>
        <Text style={s.subtitle}>Overview of platform performance</Text>
      </View>

      {/* Key Metrics Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.metricsRow}
      >
        <MetricCard
          value={stats?.users?.total || 0}
          label="Total Users"
          color="#4ade80"
        />
        <MetricCard
          value={stats?.listings?.total || 0}
          label="Total Listings"
          color="#4ade80"
        />
        <MetricCard
          value={stats?.listings?.completed || 0}
          label="Donations"
          color="#f59e0b"
        />
        <MetricCard
          value={stats?.reports?.pending || 0}
          label="Pending Reports"
          color="#ef4444"
        />
      </ScrollView>

      {/* Stats Grid */}
      <Text style={s.sectionTitle}>Detailed Stats</Text>
      <View style={s.statsGrid}>
        <StatCard
          icon="👥"
          value={stats?.users?.active || 0}
          label="Active Users"
          change={stats?.users?.newThisWeek || 0}
          changeLabel="this week"
        />
        <StatCard
          icon="🚫"
          value={stats?.users?.suspended || 0}
          label="Suspended"
        />
        <StatCard
          icon="📦"
          value={stats?.listings?.active || 0}
          label="Active Listings"
        />
        <StatCard
          icon="⚠️"
          value={stats?.listings?.flagged || 0}
          label="Flagged"
        />
        <StatCard
          icon="✓"
          value={stats?.verifications?.pending || 0}
          label="Verifications"
        />
        <StatCard
          icon="📈"
          value={`${stats?.users?.growth || 0}%`}
          label="Growth (30d)"
        />
      </View>

      {/* Recent Listings */}
      <Text style={s.sectionTitle}>📦 Recent Listings</Text>
      <View style={s.recentCard}>
        {stats?.recentActivity?.listings?.length > 0 ? (
          stats.recentActivity.listings.map((listing, idx) => (
            <View
              key={listing._id}
              style={[
                s.recentItem,
                idx === stats.recentActivity.listings.length - 1 &&
                  s.recentItemLast,
              ]}
            >
              <View style={s.recentItemInfo}>
                <Text style={s.recentItemTitle}>{listing.title}</Text>
                <Text style={s.recentItemSub}>
                  by {listing.donor?.firstName} {listing.donor?.lastName}
                </Text>
              </View>
              <View
                style={[
                  s.badge,
                  { backgroundColor: getStatusColor(listing.status).bg },
                ]}
              >
                <Text
                  style={[
                    s.badgeText,
                    { color: getStatusColor(listing.status).text },
                  ]}
                >
                  {listing.status}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.noData}>No recent listings</Text>
        )}
      </View>

      {/* Recent Reports */}
      <Text style={s.sectionTitle}>⚠️ Recent Reports</Text>
      <View style={[s.recentCard, { marginBottom: 30 }]}>
        {stats?.recentActivity?.reports?.length > 0 ? (
          stats.recentActivity.reports.map((report, idx) => (
            <View
              key={report._id}
              style={[
                s.recentItem,
                idx === stats.recentActivity.reports.length - 1 &&
                  s.recentItemLast,
              ]}
            >
              <View style={s.recentItemInfo}>
                <Text style={s.recentItemTitle}>{report.reason}</Text>
                <Text style={s.recentItemSub}>
                  {report.reportType} • by {report.reportedBy?.firstName}
                </Text>
              </View>
              <View
                style={[
                  s.badge,
                  { backgroundColor: getStatusColor(report.priority).bg },
                ]}
              >
                <Text
                  style={[
                    s.badgeText,
                    { color: getStatusColor(report.priority).text },
                  ]}
                >
                  {report.priority}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.noData}>No recent reports</Text>
        )}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: { color: "#9ca3af", marginTop: 12, fontSize: 14 },
  errorWrap: { padding: 20 },
  errorText: {
    color: "#fca5a5",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  retryBtnText: { color: "#000", fontWeight: "700" },

  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#f1f5f9" },
  subtitle: { fontSize: 13, color: "#9ca3af", marginTop: 2 },

  metricsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  metricCard: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 16,
    minWidth: 130,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderColor: "#1e2d45",
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
    color: "#f1f5f9",
  },
  metricLabel: { fontSize: 12, color: "#9ca3af", marginTop: 4 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
  },
  statCard: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 14,
    width: "30%",
    minWidth: 100,
    flex: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1e2d45",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIconText: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  statChange: { fontSize: 11, color: "#4ade80", marginTop: 4 },

  recentCard: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  recentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  recentItemLast: { borderBottomWidth: 0 },
  recentItemInfo: { flex: 1, marginRight: 10 },
  recentItemTitle: { fontSize: 14, fontWeight: "600", color: "#f1f5f9" },
  recentItemSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  noData: { padding: 20, textAlign: "center", color: "#9ca3af" },
});

export default Analytics;
