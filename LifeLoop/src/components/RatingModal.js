// src/components/RatingModal/index.js - React Native
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { ratingsAPI } from "../services/api";
import Toast from "react-native-toast-message";

const RATING_LABELS = {
  5: "🌟 Excellent!",
  4: "😊 Great!",
  3: "👍 Good",
  2: "😐 Fair",
  1: "😞 Poor",
};

const RatingModal = ({ isOpen, onClose, user, listingId, onSuccess }) => {
  const [rating,   setRating]   = useState(0);
  const [review,   setReview]   = useState("");
  const [loading,  setLoading]  = useState(false);

  // Entry animation
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // Star animations
  const starAnims = useRef([1,2,3,4,5].map(() => new Animated.Value(1))).current;

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

  if (!user) return null;

  const handleStarPress = (star) => {
    setRating(star);
    // Bounce the tapped star
    Animated.sequence([
      Animated.spring(starAnims[star - 1], { toValue: 1.3, useNativeDriver: true, friction: 4 }),
      Animated.spring(starAnims[star - 1], { toValue: 1.0, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const handleClose = () => {
    setRating(0);
    setReview("");
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({ type: "error", text1: "Please select a rating" });
      return;
    }
    if (review.trim().length < 10) {
      Toast.show({ type: "error", text1: "Review must be at least 10 characters" });
      return;
    }

    setLoading(true);
    try {
      await ratingsAPI.rateUser(user._id, {
        rating,
        review: review.trim(),
        listingId,
      });
      Toast.show({ type: "success", text1: "✅ Rating submitted successfully!" });
      onSuccess?.();
      handleClose();
    } catch (err) {
      Toast.show({ type: "error", text1: err.response?.data?.message || "Failed to submit rating" });
    } finally {
      setLoading(false);
    }
  };

  const avatarUri = user.avatar || user.profileImage ||
    `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=667eea&color=fff&size=128`;

  const canSubmit = rating > 0 && review.trim().length >= 10 && !loading;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "center", padding: 20 }}
        >
          <Animated.View
            style={[
              styles.modal,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>⭐ Rate Your Experience</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* User Info */}
                <View style={styles.userInfo}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                </View>

                {/* Stars */}
                <View style={styles.ratingSection}>
                  <Text style={styles.ratingLabel}>How was your experience?</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => handleStarPress(star)}
                        activeOpacity={0.8}
                      >
                        <Animated.Text
                          style={[
                            styles.star,
                            { transform: [{ scale: starAnims[star - 1] }] },
                            star > rating && styles.starEmpty,
                          ]}
                        >
                          ⭐
                        </Animated.Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {rating > 0 && (
                    <Text style={styles.ratingFeedback}>{RATING_LABELS[rating]}</Text>
                  )}
                </View>

                {/* Review */}
                <View>
                  <View style={styles.reviewLabelRow}>
                    <Text style={styles.inputLabel}>Share your feedback</Text>
                    <Text style={styles.charCount}>{review.length}/500</Text>
                  </View>
                  <TextInput
                    style={styles.textarea}
                    value={review}
                    onChangeText={setReview}
                    placeholder="Tell others about your experience... (minimum 10 characters)"
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                </View>

                {/* Buttons */}
                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={handleClose}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.submitBtn, !canSubmit && styles.btnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.submitBtnText}>✅ Submit Rating</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
  },
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
  },

  // Header
  header: {
    backgroundColor: "#667eea",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeBtn: {
    width: 34, height: 34,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Body
  body: { padding: 20, gap: 18 },

  // User info
  userInfo: {
    backgroundColor: "#1e2d45",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatar:   { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#667eea" },
  userName: { color: "#f1f5f9", fontSize: 16, fontWeight: "700" },

  // Stars
  ratingSection: {
    backgroundColor: "#1e2d45",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  ratingLabel:   { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  starsRow:      { flexDirection: "row", gap: 10 },
  star:          { fontSize: 40 },
  starEmpty:     { opacity: 0.25 },
  ratingFeedback:{ color: "#4ade80", fontWeight: "700", fontSize: 15 },

  // Review
  reviewLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  inputLabel:     { color: "#f1f5f9", fontWeight: "700", fontSize: 14 },
  charCount:      { color: "#64748b", fontSize: 12 },
  textarea: {
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    padding: 14,
    color: "#f1f5f9",
    fontSize: 14,
    lineHeight: 21,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#334155",
  },

  // Buttons
  btnGroup:   { flexDirection: "row", gap: 12 },
  btn:        { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  btnDisabled:{ opacity: 0.5 },
  cancelBtn:  { backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#334155" },
  cancelBtnText:{ color: "#94a3b8", fontWeight: "700", fontSize: 14 },
  submitBtn:  { backgroundColor: "#667eea" },
  submitBtnText:{ color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default RatingModal;