// src/components/ReportModal/index.js - React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import axios from "axios";
import Toast from "react-native-toast-message";

const REASONS = {
  listing: [
    { value: "spam",                   label: "🚫 Spam or Duplicate" },
    { value: "fraud",                  label: "⚠️ Fraudulent Activity" },
    { value: "inappropriate_content",  label: "🔞 Inappropriate Content" },
    { value: "misleading_information", label: "❌ Misleading Information" },
    { value: "unsafe_item",            label: "☣️ Unsafe Item" },
    { value: "fake_listing",           label: "🎭 Fake Listing" },
    { value: "other",                  label: "📝 Other" },
  ],
  user: [
    { value: "harassment",            label: "😡 Harassment" },
    { value: "fraud",                 label: "⚠️ Fraudulent Behavior" },
    { value: "spam",                  label: "🚫 Spam" },
    { value: "inappropriate_content", label: "🔞 Inappropriate Content" },
    { value: "other",                 label: "📝 Other" },
  ],
};

const ReportModal = ({ isOpen, onClose, type = "listing", targetId, targetTitle, onSuccess }) => {
  const [reason,         setReason]         = useState("");
  const [message,        setMessage]        = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading,        setLoading]        = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!reason || !message) {
      Toast.show({ type: "error", text1: "Please fill in all required fields" });
      return;
    }
    if (message.length < 10) {
      Toast.show({ type: "error", text1: "Message must be at least 10 characters" });
      return;
    }

    setLoading(true);
    try {
      const endpoint = type === "listing"
        ? `/api/reports/listing/${targetId}`
        : `/api/reports/user/${targetId}`;

      await axios.post(endpoint, { reason, message, additionalInfo });

      Toast.show({ type: "success", text1: "✅ Report submitted. Our team will review it." });
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.show({ type: "error", text1: err.response?.data?.message || "Failed to submit report" });
    } finally {
      setLoading(false);
    }
  };

  const reasons = REASONS[type] || REASONS.listing;
  const canSubmit = !!reason && message.length >= 10 && !loading;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "center", padding: 20 }}
        >
          <Animated.View
            style={[styles.modal, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  🚨 Report {type === "listing" ? "Listing" : "User"}
                </Text>
                {targetTitle ? <Text style={styles.headerSub} numberOfLines={1}>{targetTitle}</Text> : null}
              </View>

              <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Warning */}
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ False reports may result in account penalties. Please only report genuine concerns.
                  </Text>
                </View>

                {/* Reason selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>📋 Reason for Report *</Text>
                  <View style={styles.reasonGrid}>
                    {reasons.map((r) => (
                      <TouchableOpacity
                        key={r.value}
                        style={[styles.reasonChip, reason === r.value && styles.reasonChipSelected]}
                        onPress={() => setReason(r.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.reasonChipText, reason === r.value && styles.reasonChipTextSelected]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Message */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>📝 Detailed Explanation * (10-500)</Text>
                    <Text style={styles.charCount}>{message.length}/500</Text>
                  </View>
                  <TextInput
                    style={styles.textarea}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Please provide details about why you're reporting this..."
                    placeholderTextColor="#64748b"
                    multiline numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>

                {/* Additional info */}
                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>ℹ️ Additional Info (Optional)</Text>
                    <Text style={styles.charCount}>{additionalInfo.length}/1000</Text>
                  </View>
                  <TextInput
                    style={[styles.textarea, { minHeight: 70 }]}
                    value={additionalInfo}
                    onChangeText={setAdditionalInfo}
                    placeholder="Any other relevant details..."
                    placeholderTextColor="#64748b"
                    multiline numberOfLines={3}
                    maxLength={1000}
                    textAlignVertical="top"
                  />
                </View>

                {/* Buttons */}
                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={onClose}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.reportBtn, !canSubmit && styles.btnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.reportBtnText}>🚨 Submit Report</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>

            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center" },
  modal: {
    backgroundColor: "#131c2e",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e2d45",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
    maxHeight: "92%",
  },

  // Header
  header: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub:   { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },

  body: { padding: 20, gap: 16 },

  // Warning
  warningBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#ef4444",
  },
  warningText: { color: "#ef4444", fontWeight: "600", fontSize: 13, lineHeight: 19 },

  // Form
  formGroup: { gap: 8 },
  labelRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:     { color: "#f1f5f9", fontWeight: "700", fontSize: 13 },
  charCount: { color: "#64748b", fontSize: 12 },

  // Reason chips
  reasonGrid:             { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip:             { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#334155" },
  reasonChipSelected:     { backgroundColor: "rgba(239,68,68,0.2)", borderColor: "#ef4444" },
  reasonChipText:         { color: "#94a3b8", fontWeight: "600", fontSize: 12 },
  reasonChipTextSelected: { color: "#ef4444" },

  textarea: {
    backgroundColor: "#1e2d45", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: "#f1f5f9", fontSize: 14, minHeight: 100,
    borderWidth: 1, borderColor: "#334155",
  },

  // Buttons
  btnGroup:      { flexDirection: "row", gap: 12, marginTop: 4 },
  btn:           { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  btnDisabled:   { opacity: 0.5 },
  cancelBtn:     { backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#334155" },
  cancelBtnText: { color: "#94a3b8", fontWeight: "700", fontSize: 14 },
  reportBtn:     { backgroundColor: "#ef4444" },
  reportBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default ReportModal;