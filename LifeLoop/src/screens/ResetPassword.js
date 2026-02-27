// src/screens/ResetPassword.js - React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../services/api";
import Toast from "react-native-toast-message";

const StrengthBar = ({ password }) => {
  const score = !password
    ? 0
    : password.length >= 12 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^a-zA-Z0-9]/.test(password)
      ? 4
      : password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
        ? 3
        : password.length >= 6
          ? 2
          : 1;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#334155", "#ef4444", "#fbbf24", "#60a5fa", "#4ade80"];

  return (
    <View style={strengthStyles.wrap}>
      <View style={strengthStyles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              strengthStyles.bar,
              { backgroundColor: i <= score ? colors[score] : "#1e293b" },
            ]}
          />
        ))}
      </View>
      {password.length > 0 && (
        <Text style={[strengthStyles.label, { color: colors[score] }]}>
          {labels[score]}
        </Text>
      )}
    </View>
  );
};

const strengthStyles = StyleSheet.create({
  wrap: { marginTop: 8 },
  bars: { flexDirection: "row", gap: 4, marginBottom: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: "600" },
});

const ResetPassword = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = route.params || {};

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-navigate to login 3s after success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigation.navigate("Login"), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const validate = () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. The link may have expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    password.length >= 6 && confirmPassword.length >= 6 && !loading;

  // ── Success State ──
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Password Reset!</Text>
            <Text style={styles.successText}>
              Your password has been updated successfully.{"\n"}Redirecting to
              login…
            </Text>
            {/* Countdown indicator */}
            <View style={styles.redirectRow}>
              <ActivityIndicator color="#4ade80" size="small" />
              <Text style={styles.redirectText}>Redirecting in 3s…</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.goLoginBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.goLoginBtnText}>Go to Login Now →</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Main Form ──
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Animated.View style={[styles.logoRow, { opacity: fadeAnim }]}>
            <Text style={styles.logo}>🌱 LifeLoop</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Icon */}
            <View style={styles.iconBox}>
              <Text style={styles.iconBoxText}>🔑</Text>
            </View>

            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your new password below</Text>

            {/* Error */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* New Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setError("");
                  }}
                  placeholder="Enter new password"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((p) => !p)}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "👁️" : "🙈"}
                  </Text>
                </TouchableOpacity>
              </View>
              <StrengthBar password={password} />
              <Text style={styles.hint}>Minimum 6 characters</Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    confirmPassword.length > 0 &&
                      confirmPassword !== password &&
                      styles.inputError,
                    confirmPassword.length > 0 &&
                      confirmPassword === password &&
                      styles.inputSuccess,
                  ]}
                  value={confirmPassword}
                  onChangeText={(v) => {
                    setConfirmPassword(v);
                    setError("");
                  }}
                  placeholder="Confirm new password"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                {confirmPassword.length > 0 && (
                  <View style={styles.matchIndicator}>
                    <Text>{confirmPassword === password ? "✅" : "❌"}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#0a0f1e" />
              ) : (
                <Text style={styles.submitBtnText}>Reset Password 🔐</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember it? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerLink}>← Back to Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },

  logoRow: { alignItems: "center", marginBottom: 28 },
  logo: { fontSize: 28, fontWeight: "800", color: "#4ade80" },

  card: {
    backgroundColor: "#131c2e",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#1e2d45",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    alignItems: "center",
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#166534",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconBoxText: { fontSize: 28 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f1f5f9",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },

  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorBannerText: { color: "#ef4444", fontSize: 13, textAlign: "center" },

  formGroup: { width: "100%", marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#0a0f1e",
    borderWidth: 2,
    borderColor: "#253550",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#f1f5f9",
  },
  inputError: { borderColor: "#ef4444" },
  inputSuccess: { borderColor: "#4ade80" },
  eyeBtn: { position: "absolute", right: 14 },
  eyeIcon: { fontSize: 20 },
  matchIndicator: { position: "absolute", right: 14 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 8 },

  submitBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  submitBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  submitBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 16 },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { color: "#94a3b8", fontSize: 14 },
  footerLink: { color: "#4ade80", fontWeight: "700", fontSize: 14 },

  // Success
  successBox: {
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#4ade80",
    marginBottom: 24,
  },
  successIcon: { fontSize: 52, marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 10,
    textAlign: "center",
  },
  successText: {
    fontSize: 14,
    color: "#86efac",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  redirectRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  redirectText: { color: "#4ade80", fontSize: 12, fontWeight: "600" },
  goLoginBtn: {
    borderWidth: 2,
    borderColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
  },
  goLoginBtnText: { color: "#4ade80", fontWeight: "700", fontSize: 15 },
});

export default ResetPassword;
