// src/components/QRCode/QRGenerator.js - React Native
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Share,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { qrAPI } from "../services/api";
import Toast from "react-native-toast-message";

// ─────────────────────────────────────────
// STATUS BADGE COLORS
// ─────────────────────────────────────────

const STATUS_STYLES = {
  pending:   { bg: "#fef3c7", text: "#92400e" },
  completed: { bg: "#d1fae5", text: "#065f46" },
  expired:   { bg: "#fee2e2", text: "#991b1b" },
  error:     { bg: "#fee2e2", text: "#991b1b" },
  default:   { bg: "#dbeafe", text: "#1e40af" },
};

const StatusBadge = ({ status, label }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>
        {(label || status || "").toUpperCase()}
      </Text>
    </View>
  );
};

const ExpiryTimer = ({ timeLeft }) => (
  <Text style={[styles.expiryTimer, timeLeft === "Expired" && styles.expiryExpired]}>
    {timeLeft || "Calculating..."}
  </Text>
);

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const QRGenerator = ({ listingId, recipientId, recipientName, listingTitle }) => {
  const [loading,  setLoading]  = useState(false);
  const [qrData,   setQrData]   = useState(null);
  const [error,    setError]    = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (listingId && recipientId) generateQR();
  }, [listingId, recipientId]);

  // Countdown timer
  useEffect(() => {
    if (!qrData?.transaction?.expiresAt) return;

    const interval = setInterval(() => {
      const diff = new Date(qrData.transaction.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const hours   = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData]);

  // Fade in on QR load
  useEffect(() => {
    if (qrData) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [qrData]);

  const generateQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await qrAPI.generateQR(listingId, recipientId);
      if (response.data.success) {
        setQrData(response.data);
        Toast.show({ type: "success", text1: "QR Code generated!" });
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to generate QR code";
      setError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setLoading(false);
    }
  };

  // Save QR image to device gallery
  const handleDownload = async () => {
    if (!qrData?.qrCodeImage) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Toast.show({ type: "error", text1: "Gallery permission required" });
        return;
      }
      // qrCodeImage is base64 data URL — save to temp file first
      const fileUri = `${FileSystem.cacheDirectory}qr-${qrData.transaction.id}.png`;
      const base64  = qrData.qrCodeImage.replace(/^data:image\/png;base64,/, "");
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Toast.show({ type: "success", text1: "QR Code saved to gallery! 📸" });
    } catch {
      Toast.show({ type: "error", text1: "Failed to download QR code" });
    }
  };

  // Native share sheet
  const handleShare = async () => {
    if (!qrData?.qrCodeImage) return;
    try {
      const fileUri = `${FileSystem.cacheDirectory}qr-share-${qrData.transaction.id}.png`;
      const base64  = qrData.qrCodeImage.replace(/^data:image\/png;base64,/, "");
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Share.share({
        title:   "Pickup QR Code",
        message: `QR Code for: ${listingTitle}`,
        url:     fileUri,
      });
    } catch {
      Toast.show({ type: "error", text1: "Failed to share QR code" });
    }
  };

  // ── Loading state ─────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.description}>Generating your secure QR code...</Text>
      </View>
    );
  }

  // ── Error state ───────────────────────
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBadge status="error" label="❌ Error" />
        <Text style={styles.description}>{error}</Text>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={generateQR} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty state ───────────────────────
  if (!qrData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.description}>Ready to generate QR code</Text>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={generateQR} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Generate QR Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main QR view ──────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>✅ QR Code Generated!</Text>

      {/* QR Image */}
      <View style={styles.qrWrapper}>
        {qrData.qrCodeImage ? (
          <Image
            source={{ uri: qrData.qrCodeImage }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.qrFallback}>
            <Text style={styles.description}>QR image not available</Text>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={generateQR}>
              <Text style={styles.btnPrimaryText}>🔄 Regenerate QR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📦 Item:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{listingTitle}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>👤 Recipient:</Text>
          <Text style={styles.infoValue}>{recipientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>⏰ Expires in:</Text>
          <ExpiryTimer timeLeft={timeLeft} />
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>📍 Status:</Text>
          <StatusBadge status={qrData.transaction.status} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📱 Instructions:</Text>
        <Text style={styles.instructionsText}>1. Show this QR code to the recipient</Text>
        <Text style={styles.instructionsText}>2. They scan it with their camera</Text>
        <Text style={styles.instructionsText}>3. Transaction completes automatically!</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleDownload} activeOpacity={0.85}>
          <Text style={styles.btnSecondaryText}>💾 Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.btnSecondaryText}>📤 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={generateQR} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>🔄 New QR</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#131c2e",
    borderRadius:    20,
    padding:         20,
    borderWidth:     1,
    borderColor:     "#1e2d45",
  },
  centered: { alignItems: "center" },

  title: { color: "#f1f5f9", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 16 },

  // QR image
  qrWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius:    16,
    padding:         16,
    alignItems:      "center",
    marginBottom:    16,
  },
  qrImage:   { width: 250, height: 250, borderRadius: 8 },
  qrFallback:{ alignItems: "center", padding: 20 },

  // Info card
  infoCard: {
    backgroundColor: "#1e2d45",
    borderRadius:    12,
    padding:         14,
    marginBottom:    16,
  },
  infoRow: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  infoLabel: { color: "#94a3b8", fontWeight: "600", fontSize: 13 },
  infoValue: { color: "#f1f5f9", fontWeight: "500", fontSize: 13, flex: 1, textAlign: "right", marginLeft: 10 },

  // Status badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontWeight: "700", fontSize: 11 },

  // Expiry
  expiryTimer:   { color: "#4ade80", fontWeight: "700", fontSize: 14 },
  expiryExpired: { color: "#ef4444" },

  // Instructions
  instructions:     { backgroundColor: "#1e2d45", borderRadius: 12, padding: 14, marginBottom: 16 },
  instructionsTitle:{ color: "#f1f5f9", fontWeight: "700", fontSize: 13, marginBottom: 8 },
  instructionsText: { color: "#94a3b8", fontSize: 13, lineHeight: 22 },

  // Actions
  actions: { flexDirection: "row", gap: 10 },
  btn:     { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  btnPrimary:     { backgroundColor: "#667eea" },
  btnSecondary:   { backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#334155" },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnSecondaryText:{ color: "#94a3b8", fontWeight: "600", fontSize: 13 },

  // Description
  description: { color: "#94a3b8", fontSize: 13, textAlign: "center", marginVertical: 12, lineHeight: 20 },
});

export default QRGenerator;