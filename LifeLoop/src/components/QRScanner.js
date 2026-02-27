// src/components/QRCode/QRScanner.js - React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import api from "../services/api";
import Toast from "react-native-toast-message";

const QRScanner = () => {
  const [scanning,       setScanning]       = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [success,        setSuccess]        = useState(null);
  const [checkInHistory, setCheckInHistory] = useState([]);
  const [permission,     requestPermission] = useCameraPermissions();

  const navigation  = useNavigation();
  const scannedRef  = useRef(false); // prevent double scan
  const successAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Animate success message in
  useEffect(() => {
    if (success) {
      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      const t = setTimeout(() => {
        setSuccess(null);
        navigation.navigate("Dashboard");
      }, 3000);
      return () => clearTimeout(t);
    } else {
      successAnim.setValue(0);
    }
  }, [success]);

  const handleStartCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Toast.show({ type: "error", text1: "Camera permission is required to scan QR codes" });
        return;
      }
    }
    scannedRef.current = false;
    setScanning(true);
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scannedRef.current || loading) return;
    scannedRef.current = true;
    setScanning(false);
    setLoading(true);

    try {
      const response = await api.post("/qr/verify", { qrCode: data });

      const txn = response.data.transaction;
      const item = {
        id:    txn?._id,
        title: txn?.listing?.title || "Pickup",
        time:  new Date(),
      };

      setSuccess(item);
      setCheckInHistory((prev) => [item, ...prev.slice(0, 4)]);
      Toast.show({ type: "success", text1: "✅ Pickup verified successfully! 🎉" });
    } catch (err) {
      Toast.show({ type: "error", text1: err.response?.data?.message || "Verification failed" });
      scannedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <Text style={styles.title}>📷 QR Code Check-In</Text>

        {/* Idle state */}
        {!scanning && !success && (
          <>
            <View style={styles.prompt}>
              <Text style={styles.promptEmoji}>📱</Text>
              <Text style={styles.promptTitle}>Ready to Verify Pickup?</Text>
              <Text style={styles.promptSubtitle}>
                Ask the donor to show their QR code, then tap the button below to scan.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartCamera}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>📷 Start Camera</Text>
            </TouchableOpacity>

            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 <Text style={{ fontWeight: "700" }}>Tip:</Text> The donor generates a QR
                code from their listing. Just scan it to complete the pickup instantly!
              </Text>
            </View>
          </>
        )}

        {/* Camera / Scanning state */}
        {scanning && !success && (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.scanFrame} />
            </View>
            <Text style={styles.scanHint}>
              {loading ? "⏳ Verifying..." : "📸 Point camera at QR code"}
            </Text>
            {!loading && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setScanning(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>❌ Cancel</Text>
              </TouchableOpacity>
            )}
            {loading && <ActivityIndicator size="large" color="#4ade80" style={{ marginTop: 16 }} />}
          </View>
        )}

        {/* Success state */}
        {success && (
          <Animated.View
            style={[
              styles.successCard,
              { transform: [{ scale: successAnim }], opacity: successAnim },
            ]}
          >
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Pickup Verified!</Text>
            <Text style={styles.successItem}>{success.title}</Text>
            <Text style={styles.successSub}>Transaction completed successfully!</Text>

            <TouchableOpacity
              style={styles.dashboardBtn}
              onPress={() => { setSuccess(null); navigation.navigate("Dashboard"); }}
              activeOpacity={0.85}
            >
              <Text style={styles.dashboardBtnText}>📊 Go to Dashboard</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Recent check-ins */}
      {checkInHistory.length > 0 && !success && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>✅ Recent Check-ins</Text>
          {checkInHistory.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.historyItem}>
              <View>
                <Text style={styles.historyItemTitle}>{item.title}</Text>
                <Text style={styles.historyItemId}>ID: {item.id?.slice(-8)}</Text>
              </View>
              <Text style={styles.historyVerified}>✓ Verified</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e", padding: 16 },

  card: {
    backgroundColor: "#131c2e",
    borderRadius:    20,
    padding:         20,
    borderWidth:     1,
    borderColor:     "#1e2d45",
    marginBottom:    16,
  },
  title: { color: "#f1f5f9", fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20 },

  // Prompt
  prompt: { backgroundColor: "#1e2d45", borderRadius: 14, padding: 20, alignItems: "center", marginBottom: 16 },
  promptEmoji:    { fontSize: 48, marginBottom: 12 },
  promptTitle:    { color: "#f1f5f9", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  promptSubtitle: { color: "#94a3b8", fontSize: 13, textAlign: "center", lineHeight: 20 },

  // Start button
  startBtn: {
    backgroundColor: "#667eea",
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      "center",
    marginBottom:    14,
  },
  startBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Tip
  tipBox: { backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#fbbf24" },
  tipText: { color: "#fbbf24", fontSize: 13, lineHeight: 20 },

  // Camera
  cameraContainer: { borderRadius: 14, overflow: "hidden" },
  camera:          { height: 380, borderRadius: 14 },
  cameraOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  scanFrame: {
    width: 200, height: 200,
    borderWidth: 3, borderColor: "#4ade80",
    borderRadius: 16,
  },
  scanHint:  { color: "#94a3b8", fontSize: 13, textAlign: "center", marginTop: 12 },
  cancelBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Success
  successCard: { alignItems: "center", padding: 20 },
  successEmoji: { fontSize: 56, marginBottom: 12 },
  successTitle: { color: "#f1f5f9", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  successItem:  { color: "#94a3b8", fontSize: 15, marginBottom: 8 },
  successSub:   { color: "#64748b", fontSize: 13, marginBottom: 20 },
  dashboardBtn: {
    backgroundColor: "#4ade80",
    borderRadius:    12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dashboardBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 14 },

  // History
  historyContainer: { backgroundColor: "#131c2e", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#1e2d45" },
  historyTitle:     { color: "#f1f5f9", fontSize: 16, fontWeight: "700", marginBottom: 14 },
  historyItem: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "center",
    backgroundColor: "#1e2d45",
    borderRadius:    10,
    padding:         12,
    marginBottom:    8,
  },
  historyItemTitle: { color: "#f1f5f9", fontWeight: "600", fontSize: 13 },
  historyItemId:    { color: "#64748b", fontSize: 11, marginTop: 2 },
  historyVerified:  { color: "#4ade80", fontWeight: "700", fontSize: 13 },
});

export default QRScanner;