// src/screens/Admin/components/Users.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { adminAPI } from "../services/api";

const Avatar = ({ user, size = 44 }) => (
  <View
    style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}
  >
    <Text style={[s.avatarText, { fontSize: size * 0.35 }]}>
      {user.firstName?.[0]?.toUpperCase() || "?"}
    </Text>
  </View>
);

const TrustBar = ({ score }) => {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <View style={s.trustWrap}>
      <View style={s.trustBarBg}>
        <View
          style={[
            s.trustBarFill,
            { width: `${score}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[s.trustScore, { color }]}>{score}</Text>
    </View>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, type: null });
  const [actionReason, setActionReason] = useState("");
  const [actionDays, setActionDays] = useState("30");
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);

  const searchTimer = useRef(null);

  const fetchUsers = useCallback(
    async (page = 1, searchVal = search) => {
      try {
        setError(null);
        const response = await adminAPI.getAllUsers({
          page,
          limit: 20,
          search: searchVal,
          status: statusFilter,
        });
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch users");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, search],
  );

  useEffect(() => {
    setLoading(true);
    fetchUsers(1);
  }, [statusFilter]);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchUsers(1, val);
    }, 400);
  };

  const handleAction = async () => {
    if (!selectedUser || !actionModal.type) return;
    setActionLoading(true);
    try {
      if (actionModal.type === "suspend") {
        await adminAPI.suspendUser(selectedUser._id, {
          reason: actionReason,
          days: parseInt(actionDays),
        });
        Alert.alert("Success", "User suspended successfully");
      } else if (actionModal.type === "warn") {
        await adminAPI.warnUser(selectedUser._id, {
          reason: actionReason,
          type: "policy_violation",
        });
        Alert.alert("Success", "User warned successfully");
      } else if (actionModal.type === "unsuspend") {
        await adminAPI.unsuspendUser(selectedUser._id);
        Alert.alert("Success", "User unsuspended successfully");
      }
      closeModal();
      fetchUsers(pagination.page);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || "Action failed";
      setError(errMsg);
      Alert.alert("Error", errMsg);
      console.error("Action error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = (action) => {
    if (selectedUsers.length === 0) return;
    Alert.alert(
      "Confirm Bulk Action",
      `${action} ${selectedUsers.length} users?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            try {
              await adminAPI.bulkUserAction({
                userIds: selectedUsers,
                action,
                reason: "Bulk action by admin",
              });
              setSelectedUsers([]);
              fetchUsers(pagination.page);
            } catch (err) {
              setError(err.response?.data?.message || "Bulk action failed");
            }
          },
        },
      ],
    );
  };

  const closeModal = () => {
    setActionModal({ open: false, type: null });
    setActionReason("");
    setSelectedUser(null);
    setActionDays("30");
  };

  const toggleUserSelection = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const STATUS_FILTERS = ["all", "active", "suspended"];

  const renderUser = ({ item: user }) => (
    <View style={s.userCard}>
      <TouchableOpacity
        style={s.userCheckbox}
        onPress={() =>
          user.userType !== "admin" && toggleUserSelection(user._id)
        }
      >
        <View
          style={[
            s.checkbox,
            selectedUsers.includes(user._id) && s.checkboxChecked,
          ]}
        >
          {selectedUsers.includes(user._id) && (
            <Text style={s.checkmark}>✓</Text>
          )}
        </View>
      </TouchableOpacity>

      <Avatar user={user} />

      <View style={s.userInfo}>
        <Text style={s.userName}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={s.userEmail}>{user.email}</Text>
        <View style={s.userMeta}>
          <View
            style={[s.badge, user.isSuspended ? s.badgeDanger : s.badgeSuccess]}
          >
            <Text
              style={[
                s.badgeText,
                user.isSuspended ? s.badgeDangerText : s.badgeSuccessText,
              ]}
            >
              {user.isSuspended ? "Suspended" : "Active"}
            </Text>
          </View>
          <View style={s.badgeType}>
            <Text style={s.badgeTypeText}>{user.userType}</Text>
          </View>
        </View>
        <TrustBar score={user.trustScore || 50} />
      </View>

      {user.userType !== "admin" && (
        <View style={s.userActions}>
          <TouchableOpacity
            style={s.warnBtn}
            onPress={() => {
              setSelectedUser(user);
              setActionModal({ open: true, type: "warn" });
            }}
          >
            <Text style={s.warnBtnText}>⚠️</Text>
          </TouchableOpacity>
          {user.isSuspended ? (
            <TouchableOpacity
              style={s.unsuspendBtn}
              onPress={() => {
                setSelectedUser(user);
                setActionModal({ open: true, type: "unsuspend" });
              }}
            >
              <Text style={s.unsuspendBtnText}>✅</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.suspendBtn}
              onPress={() => {
                setSelectedUser(user);
                setActionModal({ open: true, type: "suspend" });
              }}
            >
              <Text style={s.suspendBtnText}>🚫</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, statusFilter === f && s.filterBtnActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text
              style={[
                s.filterBtnText,
                statusFilter === f && s.filterBtnTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <View style={s.bulkBar}>
          <Text style={s.bulkText}>{selectedUsers.length} selected</Text>
          <TouchableOpacity
            style={s.bulkWarnBtn}
            onPress={() => handleBulkAction("warn")}
          >
            <Text style={s.bulkWarnBtnText}>Warn All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.bulkSuspendBtn}
            onPress={() => handleBulkAction("suspend")}
          >
            <Text style={s.bulkSuspendBtnText}>Suspend All</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={s.error}>{error}</Text>}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUsers(1);
              }}
            />
          }
          ListEmptyComponent={<Text style={s.noData}>No users found</Text>}
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[
                    s.pageBtn,
                    pagination.page === 1 && s.pageBtnDisabled,
                  ]}
                  onPress={() => fetchUsers(pagination.page - 1)}
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
                  onPress={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  <Text style={s.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Action Modal */}
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
              {actionModal.type === "warn" && "⚠️ Send Warning"}
              {actionModal.type === "suspend" && "🚫 Suspend User"}
              {actionModal.type === "unsuspend" && "✅ Unsuspend User"}
            </Text>

            {selectedUser && (
              <View style={s.userPreview}>
                <Text style={s.userPreviewName}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </Text>
                <Text style={s.userPreviewEmail}>{selectedUser.email}</Text>
              </View>
            )}

            {actionModal.type !== "unsuspend" && (
              <>
                <Text style={s.formLabel}>Reason</Text>
                <TextInput
                  style={s.textarea}
                  placeholder="Enter reason..."
                  placeholderTextColor="#94a3b8"
                  value={actionReason}
                  onChangeText={setActionReason}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}

            {actionModal.type === "suspend" && (
              <>
                <Text style={s.formLabel}>Duration (days)</Text>
                <TextInput
                  style={s.input}
                  value={actionDays}
                  onChangeText={setActionDays}
                  keyboardType="number-pad"
                  placeholder="30"
                />
              </>
            )}

            {actionModal.type === "unsuspend" && (
              <Text style={s.unsuspendMsg}>Restore this user's access?</Text>
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
                      actionModal.type === "suspend"
                        ? "#ef4444"
                        : actionModal.type === "warn"
                          ? "#f59e0b"
                          : "#22c55e",
                  },
                ]}
                onPress={handleAction}
                disabled={
                  actionLoading ||
                  (actionModal.type !== "unsuspend" && !actionReason)
                }
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

  searchWrap: { padding: 12, paddingBottom: 6 },
  searchInput: {
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },

  filterRow: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#131c2e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    marginRight: 8,
  },
  filterBtnActive: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  filterBtnText: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  filterBtnTextActive: { color: "#000", fontWeight: "700" },

  bulkBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.1)",
    padding: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  bulkText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#3b82f6" },
  bulkWarnBtn: {
    backgroundColor: "rgba(255,193,7,0.1)",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  bulkWarnBtnText: { color: "#fbbf24", fontSize: 12, fontWeight: "700" },
  bulkSuspendBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  bulkSuspendBtnText: { color: "#ef4444", fontSize: 12, fontWeight: "700" },

  userCard: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  userCheckbox: { justifyContent: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#4b5563",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#4ade80", borderColor: "#4ade80" },
  checkmark: { color: "#000", fontSize: 12, fontWeight: "800" },

  avatar: {
    backgroundColor: "rgba(74,222,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#4ade80", fontWeight: "700" },

  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: "#f1f5f9" },
  userEmail: { fontSize: 12, color: "#9ca3af" },
  userMeta: { flexDirection: "row", gap: 6, marginTop: 5, flexWrap: "wrap" },

  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeSuccess: { backgroundColor: "rgba(74,222,128,0.1)" },
  badgeDanger: { backgroundColor: "rgba(239,68,68,0.1)" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeSuccessText: { color: "#4ade80" },
  badgeDangerText: { color: "#ef4444" },
  badgeType: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTypeText: { fontSize: 11, color: "#4ade80", fontWeight: "600" },

  trustWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  trustBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#1e2d45",
    borderRadius: 3,
    overflow: "hidden",
  },
  trustBarFill: { height: 5, borderRadius: 3 },
  trustScore: { fontSize: 11, fontWeight: "700", width: 24 },

  userActions: { gap: 6 },
  warnBtn: {
    backgroundColor: "rgba(255,193,7,0.1)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  warnBtnText: { fontSize: 16 },
  suspendBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  suspendBtnText: { fontSize: 16 },
  unsuspendBtn: {
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  unsuspendBtnText: { fontSize: 16 },

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
  input: {
    backgroundColor: "#0a0f1e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#f1f5f9",
    marginBottom: 12,
  },
  unsuspendMsg: { color: "#9ca3af", fontSize: 14, marginBottom: 12 },
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

export default Users;
