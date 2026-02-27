// src/components/ContactModal/index.js - React Native
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
import Toast from "react-native-toast-message";

const ContactModal = ({ isOpen, onClose }) => {
  const [formData,     setFormData]     = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);

  const scaleAnim   = useRef(new Animated.Value(0.9)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (isSuccess) {
      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    } else {
      successAnim.setValue(0);
    }
  }, [isSuccess]);

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      Toast.show({ type: "error", text1: "Please fill in all fields" });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    }, 1000);
  };

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

              {/* Close button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>

              <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.title}>💬 Get in Touch</Text>
                <Text style={styles.subtitle}>We'd love to hear from you!</Text>

                {/* Success message */}
                {isSuccess && (
                  <Animated.View
                    style={[styles.successBox, { transform: [{ scale: successAnim }] }]}
                  >
                    <Text style={styles.successText}>
                      ✅ Message sent successfully! We'll get back to you soon.
                    </Text>
                  </Animated.View>
                )}

                {/* Form */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Name *</Text>
                  <TextInput style={styles.input} value={formData.name}
                    onChangeText={(v) => handleChange("name", v)}
                    placeholder="Your name" placeholderTextColor="#64748b" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput style={styles.input} value={formData.email}
                    onChangeText={(v) => handleChange("email", v)}
                    placeholder="your.email@example.com" placeholderTextColor="#64748b"
                    keyboardType="email-address" autoCapitalize="none" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Subject *</Text>
                  <TextInput style={styles.input} value={formData.subject}
                    onChangeText={(v) => handleChange("subject", v)}
                    placeholder="How can we help?" placeholderTextColor="#64748b" />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Message *</Text>
                  <TextInput style={styles.textarea} value={formData.message}
                    onChangeText={(v) => handleChange("message", v)}
                    placeholder="Tell us more..." placeholderTextColor="#64748b"
                    multiline numberOfLines={4} textAlignVertical="top" />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.submitBtnText}>📨 Send Message</Text>
                  }
                </TouchableOpacity>

                {/* Contact Info */}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactRow}>
                    <Text style={styles.contactKey}>📧 Email: </Text>
                    support@lifeloop.com
                  </Text>
                  <Text style={styles.contactRow}>
                    <Text style={styles.contactKey}>📞 Phone: </Text>
                    +91 98765 43210
                  </Text>
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
    maxHeight: "90%",
  },
  closeBtn: {
    position: "absolute", top: 14, right: 14, zIndex: 10,
    width: 34, height: 34, backgroundColor: "#1e2d45",
    borderRadius: 17, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#334155",
  },
  closeBtnText: { color: "#94a3b8", fontSize: 16, fontWeight: "700" },

  body:     { padding: 24, paddingTop: 20, gap: 16 },
  title:    { color: "#f1f5f9", fontSize: 22, fontWeight: "800", marginTop: 10 },
  subtitle: { color: "#94a3b8", fontSize: 14 },

  // Success
  successBox: {
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#4ade80",
  },
  successText: { color: "#4ade80", fontWeight: "600", fontSize: 13, textAlign: "center" },

  // Form
  formGroup: { gap: 6 },
  label:     { color: "#f1f5f9", fontWeight: "700", fontSize: 13 },
  input: {
    backgroundColor: "#1e2d45", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: "#f1f5f9", fontSize: 14,
    borderWidth: 1, borderColor: "#334155",
  },
  textarea: {
    backgroundColor: "#1e2d45", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: "#f1f5f9", fontSize: 14, minHeight: 100,
    borderWidth: 1, borderColor: "#334155",
  },

  // Submit
  submitBtn: {
    backgroundColor: "#667eea", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  btnDisabled:   { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Contact info
  contactInfo: {
    borderTopWidth: 1, borderTopColor: "#1e2d45",
    paddingTop: 16, gap: 8,
  },
  contactRow: { color: "#94a3b8", fontSize: 13 },
  contactKey: { color: "#4ade80", fontWeight: "700" },
});

export default ContactModal;