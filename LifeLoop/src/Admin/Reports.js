// src/screens/Admin/components/Reports.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { adminAPI } from "../services/api";

const PRIORITY_COLORS = {
  critical: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
  high: { bg: "rgba(255,193,7,0.1)", text: "#fbbf24" },
  medium: { bg: "rgba(107,114,128,0.1)", text: "#9ca3af" },
  low: { bg: "rgba(74,222,128,0.1)", text: "#4ade80" },
};

const STATUS_COLORS = {
  pending: { bg: "rgba(255,193,7,0.1)", text: "#fbbf24" },
  reviewing: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
  resolved: { bg: "rgba(74,222,128,0.1)", text: "#4ade80" },
  dismissed: { bg: "rgba(107,114,128,0.1)", text: "#9ca3af" },
};

const REASON_LABELS = {
  spam: "🗑️ Spam",
  fraud: "⚠️ Fraud",
  inappropriate_content: "🚫 Inappropriate",
  misleading_information: "📝 Misleading",
  unsafe_item: "☢️ Unsafe Item",
  harassment: "😡 Harassment",
  fake_listing: "❌ Fake Listing",
  other: "📋 Other",
};

const RESOLUTION_OPTIONS = [
  {
    value: "no_action",
    label: "No Action Required",
    desc: "No violation found",
  },
  { value: "warning_sent", label: "Warning Sent", desc: "Owner was warned" },
  {
    value: "content_removed",
    label: "Content Removed",
    desc: "Listing/review removed",
  },
  {
    value: "account_suspended",
    label: "Account Suspended",
    desc: "User account suspended",
  },
  { value: "other", label: "Other", desc: "Custom resolution" },
];

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusCounts, setStatusCounts] = useState({});

  const [statusFilter, setStatusFilter] = useState("pending");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedReport, setSelectedReport] = useState(null);
  const [resolveModal, setResolveModal] = useState(false);
  const [resolution, setResolution] = useState("no_action");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(
    async (page = 1) => {
      try {
        setError(null);
        const response = await adminAPI.getAllReports({
          page,
          limit: 20,
          status: statusFilter,
          priority: priorityFilter,
        });
        setReports(response.data.reports);
        setPagination(response.data.pagination);
        setStatusCounts(response.data.statusCounts || {});
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch reports");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, priorityFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchReports(1);
  }, [statusFilter, priorityFilter]);

  const handleResolve = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await adminAPI.resolveReport(selectedReport._id, {
        resolution,
        adminNotes,
      });
      setResolveModal(false);
      setSelectedReport(null);
      setResolution("no_action");
      setAdminNotes("");
      fetchReports(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resolve report");
    } finally {
      setActionLoading(false);
    }
  };

  const STATUS_TABS = ["pending", "reviewing", "resolved", "dismissed", "all"];
  const PRIORITY_FILTERS = ["all", "critical", "high", "medium", "low"];

  const renderReport = ({ item: report }) => (
    <View style={s.reportCard}>
      <View style={s.reportHeader}>
        <View style={s.reportLeft}>
          <Text style={s.reportReason}>
            {REASON_LABELS[report.reason] || report.reason}
          </Text>
          <Text style={s.reportMessage} numberOfLines={2}>
            {report.message}
          </Text>
          <View style={s.reportMeta}>
            <View
              style={[
                s.badge,
                {
                  backgroundColor:
                    PRIORITY_COLORS[report.priority]?.bg || "#f1f5f9",
                },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  {
                    color: PRIORITY_COLORS[report.priority]?.text || "#475569",
                  },
                ]}
              >
                {report.priority}
              </Text>
            </View>
            <View
              style={[
                s.badge,
                {
                  backgroundColor:
                    STATUS_COLORS[report.status]?.bg || "#f1f5f9",
                },
              ]}
            >
              <Text
                style={[
                  s.badgeText,
                  { color: STATUS_COLORS[report.status]?.text || "#475569" },
                ]}
              >
                {report.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.reportTarget}>
        <Text style={s.reportTargetLabel}>Target: </Text>
        <Text style={s.reportTargetVal}>
          {report.reportType === "listing" && report.listing
            ? report.listing.title
            : report.reportType === "user" && report.user
              ? `${report.user.firstName} ${report.user.lastName}`
              : "N/A"}
        </Text>
        <Text style={s.reportTargetType}> ({report.reportType})</Text>
      </View>

      {report.reportedBy && (
        <Text style={s.reportBy}>
          Reported by: {report.reportedBy.firstName}{" "}
          {report.reportedBy.lastName}
        </Text>
      )}

      <Text style={s.reportDate}>
        {new Date(report.createdAt).toLocaleDateString()}
      </Text>

      {(report.status === "pending" || report.status === "reviewing") && (
        <TouchableOpacity
          style={s.resolveBtn}
          onPress={() => {
            setSelectedReport(report);
            setResolveModal(true);
          }}
        >
          <Text style={s.resolveBtnText}>✓ Resolve Report</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsRow}
      >
        {STATUS_TABS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[s.tab, statusFilter === status && s.tabActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[s.tabText, statusFilter === status && s.tabTextActive]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {statusCounts[status] !== undefined
                ? ` (${statusCounts[status]})`
                : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Priority Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
      >
        {PRIORITY_FILTERS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.filterBtn, priorityFilter === p && s.filterBtnActive]}
            onPress={() => setPriorityFilter(p)}
          >
            <Text
              style={[
                s.filterBtnText,
                priorityFilter === p && s.filterBtnTextActive,
              ]}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && <Text style={s.error}>{error}</Text>}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          renderItem={renderReport}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReports(1);
              }}
            />
          }
          ListEmptyComponent={<Text style={s.noData}>No reports found</Text>}
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[
                    s.pageBtn,
                    pagination.page === 1 && s.pageBtnDisabled,
                  ]}
                  onPress={() => fetchReports(pagination.page - 1)}
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
                  onPress={() => fetchReports(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  <Text style={s.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Resolve Modal */}
      <Modal
        visible={resolveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModal(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setResolveModal(false)}
        >
          <TouchableOpacity style={s.modalContent} activeOpacity={1}>
            <Text style={s.modalTitle}>📋 Resolve Report</Text>

            {selectedReport && (
              <View style={s.detailCard}>
                <Text style={s.detailRow}>
                  <Text style={s.detailLabel}>Reason: </Text>
                  <Text style={s.detailVal}>
                    {REASON_LABELS[selectedReport.reason]}
                  </Text>
                </Text>
                <Text style={s.detailRow}>
                  <Text style={s.detailLabel}>Priority: </Text>
                  <Text style={s.detailVal}>{selectedReport.priority}</Text>
                </Text>
                {selectedReport.message && (
                  <Text style={s.detailMessage} numberOfLines={3}>
                    {selectedReport.message}
                  </Text>
                )}
              </View>
            )}

            <Text style={s.formLabel}>Resolution</Text>
            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
            >
              {RESOLUTION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.radioOption,
                    resolution === opt.value && s.radioOptionSelected,
                  ]}
                  onPress={() => setResolution(opt.value)}
                >
                  <View
                    style={[
                      s.radioCircle,
                      resolution === opt.value && s.radioCircleSelected,
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.radioLabel}>{opt.label}</Text>
                    <Text style={s.radioDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.formLabel, { marginTop: 12 }]}>
              Admin Notes (optional)
            </Text>
            <TextInput
              style={s.textarea}
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="Add notes..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setResolveModal(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  {
                    backgroundColor:
                      resolution === "account_suspended"
                        ? "#ef4444"
                        : resolution === "content_removed"
                          ? "#f59e0b"
                          : "#22c55e",
                  },
                ]}
                onPress={handleResolve}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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

  tabsRow: { paddingHorizontal: 12, paddingTop: 10, flexGrow: 0 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#131c2e",
    borderWidth: 1.5,
    borderColor: "#1e2d45",
    marginRight: 8,
  },
  tabActive: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#000", fontWeight: "700" },

  filterRow: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#131c2e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    marginRight: 8,
  },
  filterBtnActive: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  filterBtnText: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  filterBtnTextActive: { color: "#000", fontWeight: "700" },

  reportCard: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  reportHeader: { flexDirection: "row", marginBottom: 8 },
  reportLeft: { flex: 1 },
  reportReason: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  reportMessage: { fontSize: 13, color: "#9ca3af", lineHeight: 18 },
  reportMeta: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  reportTarget: { flexDirection: "row", marginTop: 8 },
  reportTargetLabel: { fontSize: 12, color: "#6b7280" },
  reportTargetVal: { fontSize: 12, fontWeight: "600", color: "#f1f5f9" },
  reportTargetType: { fontSize: 12, color: "#6b7280" },
  reportBy: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  reportDate: { fontSize: 11, color: "#4b5563", marginTop: 4 },
  resolveBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  resolveBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },

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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 440,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 14,
  },
  detailCard: {
    backgroundColor: "#0a0f1e",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  detailRow: { fontSize: 13, marginBottom: 4 },
  detailLabel: { color: "#6b7280" },
  detailVal: { fontWeight: "600", color: "#f1f5f9" },
  detailMessage: { fontSize: 13, color: "#9ca3af", marginTop: 6 },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e2d45",
    marginBottom: 8,
    backgroundColor: "#0a0f1e",
  },
  radioOptionSelected: {
    borderColor: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.1)",
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4b5563",
  },
  radioCircleSelected: { borderColor: "#4ade80", backgroundColor: "#4ade80" },
  radioLabel: { fontSize: 13, fontWeight: "600", color: "#f1f5f9" },
  radioDesc: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  textarea: {
    backgroundColor: "#0a0f1e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#f1f5f9",
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#1e2d45",
  },
  cancelBtnText: { color: "#9ca3af", fontWeight: "600", fontSize: 14 },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  confirmBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
});

export default Reports;
