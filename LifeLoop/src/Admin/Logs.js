// src/screens/Admin/components/Logs.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { adminAPI } from "../services/api";

const ACTION_ICONS = {
  suspend_user: "🚫",
  unsuspend_user: "✅",
  warn_user: "⚠️",
  update_role: "👤",
  approve_verification: "✓",
  reject_verification: "✗",
  remove_content: "🗑️",
  restore_content: "↩️",
  resolve_report: "📋",
  bulk_suspend: "🚫",
  bulk_unsuspend: "✅",
  bulk_warn: "⚠️",
};

const getActionColor = (action) => {
  if (
    (action.includes("suspend") && !action.includes("unsuspend")) ||
    action.includes("remove") ||
    action.includes("reject")
  )
    return { bg: "rgba(239,68,68,0.1)", text: "#ef4444" };
  if (
    action.includes("approve") ||
    action.includes("restore") ||
    action.includes("unsuspend")
  )
    return { bg: "rgba(74,222,128,0.1)", text: "#4ade80" };
  if (action.includes("warn"))
    return { bg: "rgba(255,193,7,0.1)", text: "#fbbf24" };
  return { bg: "rgba(74,222,128,0.15)", text: "#4ade80" };
};

const formatAction = (action) =>
  action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (date) =>
  new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "suspend", label: "Suspensions" },
  { value: "unsuspend", label: "Unsuspensions" },
  { value: "warn", label: "Warnings" },
  { value: "verification", label: "Verifications" },
  { value: "content", label: "Content Moderation" },
  { value: "role", label: "Role Changes" },
];

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(
    async (page = 1) => {
      try {
        setError(null);
        const params = { page, limit: 30 };
        if (actionFilter) params.action = actionFilter;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await adminAPI.getLogs(params);
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch logs");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [actionFilter, startDate, endDate],
  );

  useEffect(() => {
    setLoading(true);
    fetchLogs(1);
  }, [actionFilter, startDate, endDate]);

  // Quick stats from current page
  const suspensions = logs.filter(
    (l) => l.action.includes("suspend") && !l.action.includes("unsuspend"),
  ).length;
  const warnings = logs.filter((l) => l.action.includes("warn")).length;
  const approvals = logs.filter((l) => l.action.includes("approve")).length;

  const renderLog = ({ item: log, index }) => {
    const color = getActionColor(log.action);
    return (
      <View style={s.logEntry}>
        <View style={[s.logDot, { backgroundColor: color.text }]} />
        <View style={s.logBody}>
          <View style={s.logHeader}>
            <View style={s.logActionRow}>
              <Text style={s.logIcon}>{ACTION_ICONS[log.action] || "📝"}</Text>
              <View style={[s.logBadge, { backgroundColor: color.bg }]}>
                <Text style={[s.logBadgeText, { color: color.text }]}>
                  {formatAction(log.action)}
                </Text>
              </View>
            </View>
            <Text style={s.logTime}>{formatDate(log.createdAt)}</Text>
          </View>

          {log.details && (
            <View style={s.logDetails}>
              {log.details.reason && (
                <Text style={s.logDetailText}>
                  Reason: {log.details.reason}
                </Text>
              )}
              {log.details.days && (
                <Text style={s.logDetailText}>
                  Duration: {log.details.days} days
                </Text>
              )}
              {log.details.oldRole && log.details.newRole && (
                <Text style={s.logDetailText}>
                  Role: {log.details.oldRole} → {log.details.newRole}
                </Text>
              )}
              {log.details.userIds && (
                <Text style={s.logDetailText}>
                  Affected: {log.details.userIds.length} users
                </Text>
              )}
            </View>
          )}

          {log.targetType && (
            <View style={s.targetInfo}>
              <Text style={s.targetText}>
                Target: {log.targetType} ({log.targetId?.toString().slice(-8)})
              </Text>
            </View>
          )}

          <View style={s.adminRow}>
            <View style={s.adminAvatar}>
              <Text style={s.adminAvatarText}>
                {log.admin?.firstName?.[0]?.toUpperCase() || "A"}
              </Text>
            </View>
            <Text style={s.adminName}>
              {log.admin?.firstName} {log.admin?.lastName} ({log.admin?.email})
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Filters */}
      <View style={s.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.actionFilterRow}
        >
          {ACTION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.filterBtn,
                actionFilter === opt.value && s.filterBtnActive,
              ]}
              onPress={() => setActionFilter(opt.value)}
            >
              <Text
                style={[
                  s.filterBtnText,
                  actionFilter === opt.value && s.filterBtnTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.dateRow}>
          <TextInput
            style={s.dateInput}
            placeholder="Start date (YYYY-MM-DD)"
            placeholderTextColor="#94a3b8"
            value={startDate}
            onChangeText={setStartDate}
          />
          <TextInput
            style={s.dateInput}
            placeholder="End date (YYYY-MM-DD)"
            placeholderTextColor="#94a3b8"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </View>

      {/* Quick Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.statsRow}
      >
        <View style={s.statCard}>
          <Text style={s.statValue}>{pagination.total}</Text>
          <Text style={s.statLabel}>Total Actions</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: "#ef4444" }]}>{suspensions}</Text>
          <Text style={s.statLabel}>Suspensions</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: "#f59e0b" }]}>{warnings}</Text>
          <Text style={s.statLabel}>Warnings</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: "#22c55e" }]}>{approvals}</Text>
          <Text style={s.statLabel}>Approvals</Text>
        </View>
      </ScrollView>

      {error && <Text style={s.error}>{error}</Text>}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          renderItem={renderLog}
          contentContainerStyle={s.timeline}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLogs(1);
              }}
            />
          }
          ListEmptyComponent={<Text style={s.noData}>No logs found</Text>}
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[
                    s.pageBtn,
                    pagination.page === 1 && s.pageBtnDisabled,
                  ]}
                  onPress={() => fetchLogs(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <Text style={s.pageBtnText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={s.pageInfo}>
                  {pagination.page} / {pagination.pages}
                </Text>
                <TouchableOpacity
                  style={[
                    s.pageBtn,
                    pagination.page === pagination.pages && s.pageBtnDisabled,
                  ]}
                  onPress={() => fetchLogs(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  <Text style={s.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
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
  error: {
    backgroundColor: "rgba(239,68,68,0.1)",
    color: "#fca5a5",
    padding: 12,
    margin: 12,
    borderRadius: 8,
    fontSize: 13,
  },
  noData: { textAlign: "center", padding: 40, color: "#9ca3af" },

  filtersWrap: {
    backgroundColor: "#131c2e",
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
    paddingBottom: 8,
  },
  actionFilterRow: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#0a0f1e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    marginRight: 8,
  },
  filterBtnActive: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  filterBtnText: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  filterBtnTextActive: { color: "#000", fontWeight: "700" },
  dateRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12 },
  dateInput: {
    flex: 1,
    backgroundColor: "#0a0f1e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: "#f1f5f9",
  },

  statsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  statCard: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 14,
    minWidth: 110,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2d45",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 3 },

  timeline: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingLeft: 30,
    paddingBottom: 20,
  },
  logEntry: { flexDirection: "row", marginBottom: 14, position: "relative" },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    left: -18,
    top: 14,
    borderWidth: 2,
    borderColor: "#0a0f1e",
  },
  logBody: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  logActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  logIcon: { fontSize: 18 },
  logBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 1,
  },
  logBadgeText: { fontSize: 11, fontWeight: "700" },
  logTime: { fontSize: 10, color: "#6b7280" },
  logDetails: { marginBottom: 6 },
  logDetailText: { fontSize: 12, color: "#9ca3af", marginBottom: 2 },
  targetInfo: {
    backgroundColor: "#0a0f1e",
    borderRadius: 6,
    padding: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  targetText: { fontSize: 11, color: "#9ca3af" },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
  },
  adminAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(74,222,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatarText: { fontSize: 10, fontWeight: "700", color: "#4ade80" },
  adminName: { fontSize: 11, color: "#6b7280", flex: 1 },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 16,
  },
  pageBtn: {
    backgroundColor: "#131c2e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: "#f1f5f9", fontWeight: "600", fontSize: 13 },
  pageInfo: { color: "#9ca3af", fontSize: 13 },
});

export default Logs;
