// src/screens/Admin/components/FlaggedContent.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { adminAPI } from "../services/api";

const FlaggedContent = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedContent, setSelectedContent] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, type: null });
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContent = useCallback(
    async (page = 1) => {
      try {
        setError(null);
        const response = await adminAPI.getFlaggedContent({
          page,
          limit: 20,
          type: typeFilter,
          status: statusFilter,
        });
        setContent(response.data.content);
        setPagination(response.data.pagination);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch flagged content",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [typeFilter, statusFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchContent(1);
  }, [typeFilter, statusFilter]);

  const handleRemove = async () => {
    if (!selectedContent || !actionReason) return;
    setActionLoading(true);
    try {
      await adminAPI.removeContent(selectedContent._id, {
        reason: actionReason,
        contentType: selectedContent.contentType,
      });
      closeModal();
      fetchContent(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedContent) return;
    setActionLoading(true);
    try {
      await adminAPI.restoreContent(selectedContent._id, {
        notes: actionReason,
        contentType: selectedContent.contentType,
      });
      closeModal();
      fetchContent(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setActionModal({ open: false, type: null });
    setActionReason("");
    setSelectedContent(null);
  };

  const TYPE_FILTERS = ["all", "listing", "review"];
  const STATUS_FILTERS = ["pending", "removed", "restored", "all"];

  const renderItem = ({ item }) => (
    <View style={s.card}>
      {item.images?.[0] ? (
        <Image
          source={{ uri: item.images[0] }}
          style={s.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[s.cardImage, s.noImage]}>
          <Text style={s.noImageText}>📷 No image</Text>
        </View>
      )}

      <View style={s.cardBody}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title || "Untitled"}
            </Text>
            <Text style={s.cardType}>{item.contentType}</Text>
          </View>
          <View
            style={[
              s.badge,
              item.status === "removed" ? s.badgeDanger : s.badgeWarning,
            ]}
          >
            <Text
              style={[
                s.badgeText,
                item.status === "removed"
                  ? s.badgeDangerText
                  : s.badgeWarningText,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={s.flagInfo}>
          <Text style={s.flagLabel}>⚠️ Flag Reason</Text>
          <Text style={s.flagReason}>
            {item.flagReason || "Multiple reports received"}
          </Text>
          <Text style={s.reportCount}>📊 {item.reportCount || 0} reports</Text>
        </View>

        {item.owner && (
          <View style={s.ownerRow}>
            <View style={s.ownerAvatar}>
              <Text style={s.ownerAvatarText}>
                {item.owner.firstName?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View>
              <Text style={s.ownerName}>
                {item.owner.firstName} {item.owner.lastName}
              </Text>
              <Text style={s.ownerEmail}>{item.owner.email}</Text>
            </View>
          </View>
        )}

        <View style={s.cardActions}>
          {item.status !== "removed" ? (
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => {
                setSelectedContent(item);
                setActionModal({ open: true, type: "remove" });
              }}
            >
              <Text style={s.removeBtnText}>🗑️ Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.restoreBtn}
              onPress={() => {
                setSelectedContent(item);
                setActionModal({ open: true, type: "restore" });
              }}
            >
              <Text style={s.restoreBtnText}>↩️ Restore</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => setSelectedContent(item)}
          >
            <Text style={s.viewBtnText}>👁️ Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterRow}
      >
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, typeFilter === f && s.filterBtnActive]}
            onPress={() => setTypeFilter(f)}
          >
            <Text
              style={[
                s.filterBtnText,
                typeFilter === f && s.filterBtnTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

      {error && <Text style={s.error}>{error}</Text>}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : (
        <FlatList
          data={content}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchContent(1);
              }}
            />
          }
          ListEmptyComponent={
            <Text style={s.noData}>No flagged content found</Text>
          }
          ListFooterComponent={
            pagination.pages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[
                    s.pageBtn,
                    pagination.page === 1 && s.pageBtnDisabled,
                  ]}
                  onPress={() => fetchContent(pagination.page - 1)}
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
                  onPress={() => fetchContent(pagination.page + 1)}
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
              {actionModal.type === "remove"
                ? "🗑️ Remove Content"
                : "↩️ Restore Content"}
            </Text>

            {selectedContent && (
              <View style={s.previewBox}>
                <Text style={s.previewTitle}>{selectedContent.title}</Text>
                <Text style={s.previewDesc} numberOfLines={2}>
                  {selectedContent.description}
                </Text>
              </View>
            )}

            <Text style={s.formLabel}>
              {actionModal.type === "remove"
                ? "Reason for removal *"
                : "Notes (optional)"}
            </Text>
            <TextInput
              style={s.textarea}
              value={actionReason}
              onChangeText={setActionReason}
              placeholder={
                actionModal.type === "remove"
                  ? "Explain why this content is being removed..."
                  : "Add notes..."
              }
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  {
                    backgroundColor:
                      actionModal.type === "remove" ? "#ef4444" : "#22c55e",
                  },
                ]}
                onPress={
                  actionModal.type === "remove" ? handleRemove : handleRestore
                }
                disabled={
                  actionLoading ||
                  (actionModal.type === "remove" && !actionReason)
                }
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>
                    {actionModal.type === "remove" ? "Remove" : "Restore"}
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
  card: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  cardImage: { width: "100%", height: 160 },
  noImage: {
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
  noImageText: { color: "#6b7280", fontSize: 14 },
  cardBody: { padding: 14 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 2,
  },
  cardType: { fontSize: 12, color: "#9ca3af" },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeDanger: { backgroundColor: "rgba(239,68,68,0.1)" },
  badgeWarning: { backgroundColor: "rgba(255,193,7,0.1)" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeDangerText: { color: "#ef4444" },
  badgeWarningText: { color: "#fbbf24" },
  flagInfo: {
    backgroundColor: "rgba(255,193,7,0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  flagLabel: {
    fontSize: 11,
    color: "#fbbf24",
    fontWeight: "700",
    marginBottom: 3,
  },
  flagReason: { fontSize: 13, color: "#f59e0b" },
  reportCount: { fontSize: 11, color: "#ef4444", marginTop: 3 },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  ownerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74,222,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  ownerAvatarText: { fontSize: 13, fontWeight: "700", color: "#4ade80" },
  ownerName: { fontSize: 13, fontWeight: "600", color: "#f1f5f9" },
  ownerEmail: { fontSize: 11, color: "#9ca3af" },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
  },
  removeBtn: {
    flex: 1,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ef4444",
  },
  removeBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 13 },
  restoreBtn: {
    flex: 1,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4ade80",
  },
  restoreBtnText: { color: "#4ade80", fontWeight: "700", fontSize: 13 },
  viewBtn: {
    flex: 1,
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4ade80",
  },
  viewBtnText: { color: "#4ade80", fontWeight: "700", fontSize: 13 },
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
    width: "90%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 14,
  },
  previewBox: {
    backgroundColor: "#0a0f1e",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  previewTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#f1f5f9",
    marginBottom: 4,
  },
  previewDesc: { fontSize: 13, color: "#9ca3af" },
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
  modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
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

export default FlaggedContent;
