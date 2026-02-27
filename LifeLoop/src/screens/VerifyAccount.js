// src/screens/VerifyAccount.js - User Account Verification
// ============================================
// Email & Phone verification via OTP
// Identity & Address manual admin review
// ============================================

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

const VerifyAccount = ({ navigation }) => {
  const { user } = useAuth();

  // Email verification
  const [emailStep, setEmailStep] = useState("input"); // input, otp, done
  const [email, setEmail] = useState(user?.email || "");
  const [emailOTP, setEmailOTP] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Phone verification
  const [phoneStep, setPhoneStep] = useState("input"); // input, otp, done
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Overall status
  const [verificationStatus, setVerificationStatus] = useState({
    emailVerified: user?.emailVerified || false,
    phoneVerified: user?.phoneVerified || false,
    identityVerified: false, // Manual - admin review
    addressVerified: false, // Manual - admin review
  });

  // Fetch verification status on mount
  useFocusEffect(
    useCallback(() => {
      fetchVerificationStatus();
    }, []),
  );

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch(
        `http://192.168.0.140:5000/api/verify/status/${user._id}`,
      );
      const data = await response.json();
      if (data.success) {
        setVerificationStatus({
          emailVerified: data.verifications.email.verified,
          phoneVerified: data.verifications.phone.verified,
          identityVerified: data.verifications.identity.verified,
          addressVerified: data.verifications.address.verified,
        });
        setEmailStep(data.verifications.email.verified ? "done" : "input");
        setPhoneStep(data.verifications.phone.verified ? "done" : "input");
      }
    } catch (error) {
      console.error("Error fetching verification status:", error);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // EMAIL VERIFICATION
  // ═════════════════════════════════════════════════════════════════════════════

  const handleSendEmailOTP = async () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid", "Please enter a valid email");
      return;
    }

    setEmailLoading(true);
    try {
      const response = await fetch(
        "http://192.168.0.140:5000/api/verify/email-send-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();
      if (data.success) {
        Toast.show({
          type: "success",
          text1: "OTP Sent",
          text2: `Code sent to ${email}`,
        });
        setEmailStep("otp");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (emailOTP.length !== 6) {
      Alert.alert("Invalid", "OTP must be 6 digits");
      return;
    }

    setEmailLoading(true);
    try {
      const response = await fetch(
        "http://192.168.0.140:5000/api/verify/email-verify-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: emailOTP }),
        },
      );

      const data = await response.json();
      if (data.success) {
        Toast.show({
          type: "success",
          text1: "Email Verified",
          text2: "Your email is now verified ✅",
        });
        setVerificationStatus((prev) => ({ ...prev, emailVerified: true }));
        setEmailStep("done");
        setEmailOTP("");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PHONE VERIFICATION
  // ═════════════════════════════════════════════════════════════════════════════

  const handleSendPhoneOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Invalid", "Please enter a valid phone number");
      return;
    }

    setPhoneLoading(true);
    try {
      const response = await fetch(
        "http://192.168.0.140:5000/api/verify/phone-send-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, userId: user._id }),
        },
      );

      const data = await response.json();
      if (data.success) {
        Toast.show({
          type: "success",
          text1: "OTP Sent",
          text2: `Code sent to ${phone}`,
        });
        setPhoneStep("otp");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (phoneOTP.length !== 6) {
      Alert.alert("Invalid", "OTP must be 6 digits");
      return;
    }

    setPhoneLoading(true);
    try {
      const response = await fetch(
        "http://192.168.0.140:5000/api/verify/phone-verify-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id, otp: phoneOTP }),
        },
      );

      const data = await response.json();
      if (data.success) {
        Toast.show({
          type: "success",
          text1: "Phone Verified",
          text2: "Your phone is now verified ✅",
        });
        setVerificationStatus((prev) => ({ ...prev, phoneVerified: true }));
        setPhoneStep("done");
        setPhoneOTP("");
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // STATUS BADGE
  // ═════════════════════════════════════════════════════════════════════════════

  const StatusBadge = ({ verified, label }) => (
    <View style={s.statusItem}>
      <Text style={s.statusIcon}>{verified ? "✅" : "⏳"}</Text>
      <View style={s.statusInfo}>
        <Text style={s.statusLabel}>{label}</Text>
        <Text
          style={[s.statusValue, { color: verified ? "#4ade80" : "#fbbf24" }]}
        >
          {verified ? "Verified" : "Pending"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {/* HEADER */}
        <View style={s.header}>
          <Text style={s.title}>🛡️ Verify Your Account</Text>
          <Text style={s.subtitle}>Build trust in the LifeLoop community</Text>
        </View>

        {/* VERIFICATION STATUS OVERVIEW */}
        <View style={s.statusOverview}>
          <StatusBadge
            verified={verificationStatus.emailVerified}
            label="📧 Email"
          />
          <StatusBadge
            verified={verificationStatus.phoneVerified}
            label="📱 Phone"
          />
          <StatusBadge
            verified={verificationStatus.identityVerified}
            label="🪪 Identity"
          />
          <StatusBadge
            verified={verificationStatus.addressVerified}
            label="📍 Address"
          />
        </View>

        {/* EMAIL VERIFICATION SECTION */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>📧 Email Verification</Text>
            {verificationStatus.emailVerified && (
              <Text style={s.verifiedBadge}>✅ Done</Text>
            )}
          </View>

          {emailStep === "done" ? (
            <View style={[s.card, s.cardSuccess]}>
              <Text style={s.cardSuccessText}>
                Email verified successfully!
              </Text>
            </View>
          ) : emailStep === "input" ? (
            <View style={s.card}>
              <Text style={s.fieldLabel}>Email Address</Text>
              <TextInput
                style={s.input}
                placeholder="Enter your email"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={!emailLoading}
              />
              <TouchableOpacity
                style={[
                  s.button,
                  s.buttonPrimary,
                  emailLoading && s.buttonDisabled,
                ]}
                onPress={handleSendEmailOTP}
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <ActivityIndicator color="#0a0f1e" />
                ) : (
                  <Text style={s.buttonText}>Send OTP →</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.fieldLabel}>Enter 6-Digit Code</Text>
              <TextInput
                style={[
                  s.input,
                  { textAlign: "center", fontSize: 24, letterSpacing: 8 },
                ]}
                placeholder="000000"
                placeholderTextColor="#64748b"
                value={emailOTP}
                onChangeText={setEmailOTP}
                keyboardType="numeric"
                maxLength={6}
                editable={!emailLoading}
              />
              <Text style={s.helpText}>Code expires in 10 minutes</Text>
              <TouchableOpacity
                style={[
                  s.button,
                  s.buttonPrimary,
                  emailLoading && s.buttonDisabled,
                ]}
                onPress={handleVerifyEmailOTP}
                disabled={emailLoading || emailOTP.length !== 6}
              >
                {emailLoading ? (
                  <ActivityIndicator color="#0a0f1e" />
                ) : (
                  <Text style={s.buttonText}>Verify Email ✓</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEmailStep("input")}>
                <Text style={s.linkText}>Back to enter email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* PHONE VERIFICATION SECTION */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>📱 Phone Verification</Text>
            {verificationStatus.phoneVerified && (
              <Text style={s.verifiedBadge}>✅ Done</Text>
            )}
          </View>

          {phoneStep === "done" ? (
            <View style={[s.card, s.cardSuccess]}>
              <Text style={s.cardSuccessText}>
                Phone verified successfully!
              </Text>
            </View>
          ) : phoneStep === "input" ? (
            <View style={s.card}>
              <Text style={s.fieldLabel}>Phone Number</Text>
              <TextInput
                style={s.input}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!phoneLoading}
              />
              <TouchableOpacity
                style={[
                  s.button,
                  s.buttonPrimary,
                  phoneLoading && s.buttonDisabled,
                ]}
                onPress={handleSendPhoneOTP}
                disabled={phoneLoading}
              >
                {phoneLoading ? (
                  <ActivityIndicator color="#0a0f1e" />
                ) : (
                  <Text style={s.buttonText}>Send OTP →</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.fieldLabel}>Enter 6-Digit Code</Text>
              <TextInput
                style={[
                  s.input,
                  { textAlign: "center", fontSize: 24, letterSpacing: 8 },
                ]}
                placeholder="000000"
                placeholderTextColor="#64748b"
                value={phoneOTP}
                onChangeText={setPhoneOTP}
                keyboardType="numeric"
                maxLength={6}
                editable={!phoneLoading}
              />
              <Text style={s.helpText}>Code expires in 10 minutes</Text>
              <TouchableOpacity
                style={[
                  s.button,
                  s.buttonPrimary,
                  phoneLoading && s.buttonDisabled,
                ]}
                onPress={handleVerifyPhoneOTP}
                disabled={phoneLoading || phoneOTP.length !== 6}
              >
                {phoneLoading ? (
                  <ActivityIndicator color="#0a0f1e" />
                ) : (
                  <Text style={s.buttonText}>Verify Phone ✓</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhoneStep("input")}>
                <Text style={s.linkText}>Back to enter phone</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* IDENTITY & ADDRESS (MANUAL ADMIN REVIEW) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🪪 Identity & Address</Text>
          <View style={s.card}>
            <View style={s.manualItem}>
              <Text style={s.manualIcon}>🪪</Text>
              <View style={s.manualInfo}>
                <Text style={s.manualLabel}>Identity Verification</Text>
                <Text style={s.manualDesc}>
                  Upload ID/Passport for admin review
                </Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.manualItem}>
              <Text style={s.manualIcon}>📍</Text>
              <View style={s.manualInfo}>
                <Text style={s.manualLabel}>Address Verification</Text>
                <Text style={s.manualDesc}>
                  Submit address proof for admin review
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.button, s.buttonSecondary]}
              onPress={() => navigation.navigate("AdminDashboard")}
            >
              <Text style={s.buttonSecondaryText}>Go to Admin Dashboard →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* INFO BOX */}
        <View style={s.infoBox}>
          <Text style={s.infoIcon}>ℹ️</Text>
          <Text style={s.infoText}>
            Verified accounts get higher visibility and trust badges. Email &
            Phone verification is instant, while Identity & Address require
            manual admin review.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  content: { paddingHorizontal: 16, paddingVertical: 20 },

  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#f1f5f9", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b" },

  statusOverview: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  statusIcon: { fontSize: 20 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 13, color: "#9ca3af", marginBottom: 2 },
  statusValue: { fontSize: 14, fontWeight: "700" },

  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#f1f5f9" },
  verifiedBadge: { fontSize: 13, fontWeight: "700", color: "#4ade80" },

  card: {
    backgroundColor: "#131c2e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  cardSuccess: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderColor: "#4ade80",
  },
  cardSuccessText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4ade80",
    textAlign: "center",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e2e8f0",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0a0f1e",
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#f1f5f9",
    marginBottom: 12,
  },

  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonPrimary: {
    backgroundColor: "#4ade80",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#4ade80",
    marginTop: 8,
  },
  buttonText: { fontSize: 14, fontWeight: "800", color: "#0a0f1e" },
  buttonSecondaryText: { fontSize: 14, fontWeight: "700", color: "#4ade80" },
  buttonDisabled: { opacity: 0.5 },

  helpText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  linkText: {
    fontSize: 13,
    color: "#4ade80",
    fontWeight: "600",
    textAlign: "center",
  },

  manualItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  manualIcon: { fontSize: 28 },
  manualInfo: { flex: 1 },
  manualLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 2,
  },
  manualDesc: { fontSize: 12, color: "#9ca3af" },
  divider: { height: 1, backgroundColor: "#1e2d45", marginVertical: 12 },

  infoBox: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#4ade80",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 20,
    marginBottom: 40,
  },
  infoIcon: { fontSize: 18, marginTop: 2 },
  infoText: { fontSize: 13, color: "#a7f3d0", flex: 1, lineHeight: 18 },
});

export default VerifyAccount;
