// src/screens/Admin/components/Verifications.js
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

const Verifications = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, type: null });
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVerifications = useCallback(
    async (page = 1) => {
      try {
        setError(null);
        const response = await adminAPI.getVerifications({
          page,
          limit: 20,
          status: statusFilter,
        });
        setVerifications(response.data.verifications);
        setPagination(response.data.pagination);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch verifications",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchVerifications(1);
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await adminAPI.approveVerification(selectedUser._id, { notes });
      closeModal();
      fetchVerifications(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectReason) return;
    setActionLoading(true);
    try {
      await adminAPI.rejectVerification(selectedUser._id, {
        reason: rejectReason,
      });
      closeModal();
      fetchVerifications(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setActionModal({ open: false, type: null });
    setNotes("");
    setRejectReason("");
    setSelectedUser(null);
  };

  const STATUS_TABS = ["pending", "approved", "rejected", "all"];

  const VerificationIcon = ({ verified }) => (
    <Text style={{ fontSize: 16 }}>{verified ? "✅" : "⏳"}</Text>
  );

  const renderCard = ({ item: v }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {v.user?.firstName?.[0]?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName}>
            {v.user?.firstName} {v.user?.lastName}
          </Text>
          <Text style={s.userEmail}>{v.user?.email}</Text>
          <Text style={s.joinDate}>
            Requested: {new Date(v.requestedAt).toLocaleDateString()}
          </Text>
        </View>
        <View
          style={[
            s.trustBadge,
            {
              backgroundColor:
                (v.trustScore || 50) >= 70
                  ? "rgba(74,222,128,0.1)"
                  : "rgba(255,193,7,0.1)",
            },
          ]}
        >
          <Text
            style={[
              s.trustBadgeText,
              { color: (v.trustScore || 50) >= 70 ? "#4ade80" : "#fbbf24" },
            ]}
          >
            {v.trustScore || 50}
          </Text>
        </View>
      </View>

      <View style={s.verifyGrid}>
        <View style={s.verifyItem}>
          <VerificationIcon verified={v.verificationStatus?.identity} />
          <Text style={s.verifyLabel}> Identity</Text>
        </View>
        <View style={s.verifyItem}>
          <VerificationIcon verified={v.verificationStatus?.address} />
          <Text style={s.verifyLabel}> Address</Text>
        </View>
      </View>

      {v.status === "pending" && (
        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.approveBtn}
            onPress={() => {
              setSelectedUser(v);
              setActionModal({ open: true, type: "approve" });
            }}
          >
            <Text style={s.approveBtnText}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.rejectBtn}
            onPress={() => {
              setSelectedUser(v);
              setActionModal({ open: true, type: "reject" });
            }}
          >
            <Text style={s.rejectBtnText}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
      {v.status === "approved" && (
        <Text style={s.verifiedLabel}>✅ Verified</Text>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header Info */}
      <View style={s.headerInfo}>
        <Text style={s.headerInfoText}>
          📧 Email & 📱 Phone are auto-verified via OTP. Below are manual
          reviews for Identity & Address.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsRow}
      >
        {STATUS_TABS.map((st) => (
          <TouchableOpacity
            key={st}
            style={[s.tab, statusFilter === st && s.tabActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[s.tabText, statusFilter === st && s.tabTextActive]}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
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
          data={verifications}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchVerifications(1);
              }}
            />
          }
          ListEmptyComponent={
            <Text style={s.noData}>No verification requests found</Text>
          }
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[
                    s.pageBtn,
                    pagination.page === 1 && s.pageBtnDisabled,
                  ]}
                  onPress={() => fetchVerifications(pagination.page - 1)}
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
                  onPress={() => fetchVerifications(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  <Text style={s.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={actionModal.open}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <TouchableOpacity style={s.modalContent} activeOpacity={1}>
            <Text style={s.modalTitle}>
              {actionModal.type === "approve"
                ? "✅ Approve Identity & Address"
                : "❌ Reject Verification"}
            </Text>
            {selectedUser && (
              <View style={s.userPreview}>
                <Text style={s.userPreviewName}>
                  {selectedUser.user?.firstName} {selectedUser.user?.lastName}
                </Text>
                <Text style={s.userPreviewEmail}>
                  {selectedUser.user?.email}
                </Text>
              </View>
            )}
            {actionModal.type === "approve" ? (
              <>
                <Text style={s.formLabel}>Notes (optional)</Text>
                <TextInput
                  style={s.textarea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : (
              <>
                <Text style={s.formLabel}>Rejection Reason *</Text>
                <TextInput
                  style={s.textarea}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Explain why..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  {
                    backgroundColor:
                      actionModal.type === "approve" ? "#22c55e" : "#ef4444",
                  },
                ]}
                onPress={
                  actionModal.type === "approve" ? handleApprove : handleReject
                }
                disabled={
                  actionLoading ||
                  (actionModal.type === "reject" && !rejectReason)
                }
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>
                    {actionModal.type === "approve" ? "Approve" : "Reject"}
                  </Text>
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
  headerInfo: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: "#4ade80",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerInfoText: {
    fontSize: 12,
    color: "#a7f3d0",
    fontWeight: "500",
    lineHeight: 16,
  },
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
  tabsRow: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
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
  card: {
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(74,222,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#4ade80" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#f1f5f9" },
  userEmail: { fontSize: 12, color: "#9ca3af" },
  joinDate: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  trustBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  trustBadgeText: { fontSize: 16, fontWeight: "800" },
  verifyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#0a0f1e",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  verifyItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "44%",
    gap: 4,
  },
  verifyLabel: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  cardActions: { flexDirection: "row", gap: 10 },
  approveBtn: {
    flex: 1,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4ade80",
  },
  approveBtnText: { color: "#4ade80", fontWeight: "700" },
  rejectBtn: {
    flex: 1,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ef4444",
  },
  rejectBtnText: { color: "#ef4444", fontWeight: "700" },
  verifiedLabel: {
    textAlign: "center",
    color: "#4ade80",
    fontWeight: "700",
    fontSize: 15,
    paddingTop: 8,
  },
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
    width: "88%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 14,
  },
  userPreview: {
    backgroundColor: "#0a0f1e",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  userPreviewName: { fontWeight: "700", fontSize: 15, color: "#f1f5f9" },
  userPreviewEmail: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: 6,
  },
  textarea: {
    backgroundColor: "#0a0f1e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#f1f5f9",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 6,
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

export default Verifications;
