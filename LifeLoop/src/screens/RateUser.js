// src/screens/RateUser.js - Post-exchange mutual rating screen
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
} from "react-native";
import Toast from "react-native-toast-message";
import { ratingsAPI } from "../services/api";

const QUALITY_TAGS = [
  { id: "friendly", emoji: "😊", label: "Friendly" },
  { id: "on-time", emoji: "⏰", label: "On time" },
  { id: "as-described", emoji: "✅", label: "As described" },
  { id: "easy-pickup", emoji: "📍", label: "Easy pickup" },
  { id: "great-condition", emoji: "🌟", label: "Great condition" },
];

const RateUserScreen = ({ route, navigation }) => {
  const { userId, userName, userAvatar, listingTitle, exchangeType } =
    route.params || {};

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Star animations
  const [starAnims] = useState(() =>
    [1, 2, 3, 4, 5].map(() => new Animated.Value(1)),
  );

  const handleStarPress = (star) => {
    setRating(star);
    // Animate the star
    Animated.sequence([
      Animated.timing(starAnims[star - 1], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(starAnims[star - 1], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating required", "Please select a star rating");
      return;
    }

    setLoading(true);
    try {
      // Call ratings API to submit rating
      const response = await ratingsAPI.rateUser(userId, {
        rating,
        tags: selectedTags,
        review: review.trim(),
        listingTitle,
      });

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Rating submitted! 🎉",
          text2: `You rated ${userName} ${rating} star${rating !== 1 ? "s" : ""}`,
        });

        // Navigate back to Dashboard or impact screen
        setTimeout(() => {
          navigation.navigate("Main");
        }, 800);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to submit rating";
      Toast.show({
        type: "error",
        text1: msg,
      });
      console.error("Error submitting rating:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip rating?",
      "You can always rate them later from your history.",
      [
        { text: "Go back", onPress: () => {}, style: "cancel" },
        {
          text: "Yes, skip",
          onPress: () => navigation.goBack(),
          style: "destructive",
        },
      ],
    );
  };

  const ratingLabel = {
    0: "Select rating",
    1: "😞 Poor",
    2: "😐 Fair",
    3: "👍 Good",
    4: "😊 Great",
    5: "🌟 Excellent",
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Rate Your Experience</Text>
            <Text style={styles.subtitle}>How was your exchange with</Text>
          </View>

          {/* User card */}
          <View style={styles.userCard}>
            {userAvatar && (
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
            )}
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.exchangeInfo}>
              <Text style={styles.exchangeType}>
                {exchangeType === "donor"
                  ? `📦 Donated: ${listingTitle}`
                  : `📥 Received: ${listingTitle}`}
              </Text>
            </View>
          </View>

          {/* Star rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>{ratingLabel[rating]}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  activeOpacity={0.7}
                >
                  <Animated.Text
                    style={[
                      styles.star,
                      {
                        transform: [{ scale: starAnims[star - 1] }],
                        opacity: star <= rating ? 1 : 0.3,
                      },
                    ]}
                  >
                    ★
                  </Animated.Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quality tags */}
          {rating > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsLabel}>What was great? (select all)</Text>
              <View style={styles.tagsGrid}>
                {QUALITY_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tag,
                      selectedTags.includes(tag.id) && styles.tagSelected,
                    ]}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                    <Text style={styles.tagLabel}>{tag.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Review text */}
          {rating > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Write a review (optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Tell others about this experience..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                maxLength={500}
                value={review}
                onChangeText={setReview}
              />
              <Text style={styles.charCount}>{review.length}/500</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSubmit]}
              onPress={handleSubmit}
              disabled={loading || rating === 0}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnSubmitText}>Submit Review</Text>
                  <Text style={styles.btnSubtext}>⭐ {rating}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Skip link */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.skipText}>Skip for now →</Text>
          </TouchableOpacity>

          {/* Impact preview */}
          <View style={styles.impactPreview}>
            <Text style={styles.impactTitle}>🌍 Impact of this exchange</Text>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>CO₂ prevented:</Text>
              <Text style={styles.impactValue}>5 kg</Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Waste saved:</Text>
              <Text style={styles.impactValue}>8 kg</Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Trees equivalent:</Text>
              <Text style={styles.impactValue}>0.4 🌲</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
  },

  // Title
  titleSection: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    color: "#f1f5f9",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
  },

  // User card
  userCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: "#334155",
  },
  userName: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  exchangeInfo: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exchangeType: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
  },

  // Star rating
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingLabel: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    minHeight: 24,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  star: {
    fontSize: 48,
    color: "#fbbf24",
  },

  // Quality tags
  tagsSection: {
    marginBottom: 24,
  },
  tagsLabel: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  tagSelected: {
    backgroundColor: "#4ade80",
    borderColor: "#22c55e",
  },
  tagEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  tagLabel: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },

  // Review
  reviewSection: {
    marginBottom: 24,
  },
  reviewLabel: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  reviewInput: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f1f5f9",
    fontSize: 13,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },

  // Actions
  actions: {
    marginBottom: 16,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSubmit: {
    backgroundColor: "#4ade80",
  },
  btnSubmitText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  btnSubtext: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },

  // Skip
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 24,
  },
  skipText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },

  // Impact preview
  impactPreview: {
    backgroundColor: "#1e3a1f",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
  },
  impactTitle: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  impactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  impactLabel: {
    color: "#a7f3d0",
    fontSize: 12,
  },
  impactValue: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default RateUserScreen;
