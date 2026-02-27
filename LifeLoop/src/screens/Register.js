// src/screens/Register.js - React Native
import React, { useState, useEffect, useRef } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";

// ─── User Type Selector ───
const UserTypeSelector = ({ value, onChange }) => {
  const options = [
    { value: "donor", label: "🎁 Donor", subtitle: "I want to give" },
    { value: "recipient", label: "📦 Recipient", subtitle: "I need help" },
    { value: "both", label: "🤝 Both", subtitle: "Give & Receive" },
  ];

  return (
    <View style={styles.userTypeRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.userTypeOption,
            value === option.value && styles.userTypeOptionActive,
          ]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.8}
        >
          <Text style={styles.userTypeLabel}>{option.label}</Text>
          <Text
            style={[
              styles.userTypeSubtitle,
              value === option.value && styles.userTypeSubtitleActive,
            ]}
          >
            {option.subtitle}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Form Field ───
const FormField = ({ label, error, children }) => (
  <View style={styles.formGroup}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {error ? (
      <View style={styles.fieldError}>
        <Text style={styles.fieldErrorText}>⚠️ {error}</Text>
      </View>
    ) : null}
  </View>
);

// ─── Main Component ───
const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    userType: "donor",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { register, error, clearError } = useAuth();
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (clearError) clearError();
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

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error && clearError) clearError();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid";
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 6) errors.password = "Min 6 characters";
    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phone,
        userType: formData.userType,
        address: {
          street: formData.address,
          city: "",
          state: "",
          zipCode: "",
          country: "India",
        },
      };

      const result = await register(payload);

      if (result?.success) {
        Toast.show({ type: "success", text1: "Account created successfully! 🎉" });
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } else {
        if (result?.details) {
          const mappedErrors = {};
          for (const key in result.details) {
            mappedErrors[key] = result.details[key].message;
          }
          setValidationErrors(mappedErrors);
        }
        Toast.show({ type: "error", text1: result?.error || "Registration failed" });
      }
    } catch (err) {
      Toast.show({ type: "error", text1: "Something went wrong" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.logo}>🌱 LifeLoop</Text>
            <Text style={styles.tagline}>Join the movement</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[styles.card, { opacity: fadeAnim }]}
          >
            <Text style={styles.title}>Join Our Community 🌟</Text>
            <Text style={styles.subtitle}>
              Create your account to start sharing and receiving resources
            </Text>

            {/* Global Error */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Name Row */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <FormField label="First Name" error={validationErrors.firstName}>
                  <TextInput
                    style={[styles.input, validationErrors.firstName && styles.inputError]}
                    value={formData.firstName}
                    onChangeText={(val) => handleChange("firstName", val)}
                    placeholder="First name"
                    placeholderTextColor="#64748b"
                    autoComplete="given-name"
                  />
                </FormField>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <FormField label="Last Name" error={validationErrors.lastName}>
                  <TextInput
                    style={[styles.input, validationErrors.lastName && styles.inputError]}
                    value={formData.lastName}
                    onChangeText={(val) => handleChange("lastName", val)}
                    placeholder="Last name"
                    placeholderTextColor="#64748b"
                    autoComplete="family-name"
                  />
                </FormField>
              </View>
            </View>

            {/* Email */}
            <FormField label="Email Address" error={validationErrors.email}>
              <TextInput
                style={[styles.input, validationErrors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(val) => handleChange("email", val)}
                placeholder="Enter your email"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </FormField>

            {/* Password Row */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <FormField label="Password" error={validationErrors.password}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, validationErrors.password && styles.inputError]}
                      value={formData.password}
                      onChangeText={(val) => handleChange("password", val)}
                      placeholder="Min 6 chars"
                      placeholderTextColor="#64748b"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((p) => !p)}
                    >
                      <Text>{showPassword ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </FormField>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <FormField label="Confirm" error={validationErrors.confirmPassword}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, validationErrors.confirmPassword && styles.inputError]}
                      value={formData.confirmPassword}
                      onChangeText={(val) => handleChange("confirmPassword", val)}
                      placeholder="Repeat"
                      placeholderTextColor="#64748b"
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword((p) => !p)}
                    >
                      <Text>{showConfirmPassword ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>
                </FormField>
              </View>
            </View>

            {/* Phone */}
            <FormField label="Phone Number" error={validationErrors.phone}>
              <TextInput
                style={[styles.input, validationErrors.phone && styles.inputError]}
                value={formData.phone}
                onChangeText={(val) => handleChange("phone", val)}
                placeholder="Enter phone number"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </FormField>

            {/* Account Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Account Type</Text>
              <UserTypeSelector
                value={formData.userType}
                onChange={(val) => handleChange("userType", val)}
              />
            </View>

            {/* Address */}
            <FormField label="Street Address" error={validationErrors.address}>
              <TextInput
                style={[styles.input, validationErrors.address && styles.inputError]}
                value={formData.address}
                onChangeText={(val) => handleChange("address", val)}
                placeholder="Enter your street address"
                placeholderTextColor="#64748b"
                autoComplete="street-address"
              />
            </FormField>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account 🚀</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerLink}>Sign in here</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4ade80",
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: "#94a3b8",
  },

  // Card
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 19,
  },

  // Error
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorBannerText: {
    color: "#ef4444",
    fontSize: 13,
    textAlign: "center",
  },

  // Form
  rowFields: {
    flexDirection: "row",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#f1f5f9",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 13,
  },
  fieldError: {
    marginTop: 5,
  },
  fieldErrorText: {
    color: "#ef4444",
    fontSize: 11,
  },

  // User Type
  userTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  userTypeOption: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  userTypeOptionActive: {
    borderColor: "#4ade80",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
  },
  userTypeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 3,
  },
  userTypeSubtitle: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
  },
  userTypeSubtitleActive: {
    color: "#4ade80",
  },

  // Submit
  submitButton: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#334155",
  },
  dividerText: {
    color: "#64748b",
    paddingHorizontal: 12,
    fontSize: 12,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  footerLink: {
    color: "#4ade80",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default Register;