// src/screens/AcceptAssignment.js - Receiver accepts/declines AI matched assignment
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
} from "react-native";
import Toast from "react-native-toast-message";
import { listingsAPI } from "../services/api";

const AcceptAssignmentScreen = ({ route, navigation }) => {
  const {
    listingId,
    listingTitle,
    listingImage,
    donorId,
    donorName,
    donorRating,
    donorReviews,
    distance,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(86400); // 24 hours in seconds

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

  // Countdown timer (24 hours until auto-decline)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeLeft = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleAccept = async () => {
    setResponding(true);
    try {
      // Accept the assignment
      const response = await listingsAPI.acceptAssignment(listingId);

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "You've accepted! 🎉",
          text2: "Let's chat about pickup time",
        });

        // Navigate to Chat screen with donor
        setTimeout(() => {
          navigation.navigate("Chat", {
            userId: donorId,
            userName: donorName,
            listingId,
          });
        }, 800);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to accept assignment";
      Toast.show({
        type: "error",
        text1: msg,
      });
      console.error("Error accepting assignment:", error);
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline this match?",
      `This will remove you from ${donorName}'s item.\n\nThey'll be matched with the next best recipient.`,
      [
        { text: "Keep it", onPress: () => {}, style: "cancel" },
        {
          text: "Decline",
          onPress: confirmDecline,
          style: "destructive",
        },
      ],
    );
  };

  const confirmDecline = async () => {
    setResponding(true);
    try {
      // Decline the assignment
      const response = await listingsAPI.declineAssignment(listingId);

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: "Declined ✖️",
          text2: "Thanks for letting us know",
        });

        // Navigate back
        setTimeout(() => {
          navigation.goBack();
        }, 800);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to decline";
      Toast.show({
        type: "error",
        text1: msg,
      });
      console.error("Error declining assignment:", error);
    } finally {
      setResponding(false);
    }
  };

  const handleAutoDecline = async () => {
    // After 24 hours, auto-decline if no response
    try {
      await listingsAPI.declineAssignment(listingId);
      Toast.show({
        type: "info",
        text1: "Assignment expired",
        text2: "The item has been offered to another recipient",
      });
      navigation.goBack();
    } catch (error) {
      console.error("Auto-decline error:", error);
    }
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
          {/* Header with timer */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>You've been matched! 🎉</Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>
                ⏰ {formatTimeLeft(timeLeft)}
              </Text>
              <Text style={styles.timerSubtext}>to respond</Text>
            </View>
          </View>

          {/* Listing image */}
          {listingImage && (
            <View style={styles.imageSection}>
              <Image
                source={{ uri: listingImage }}
                style={styles.listingImage}
                resizeMode="cover"
              />
              <Text style={styles.listingTitle}>{listingTitle}</Text>
            </View>
          )}

          {/* Donor info card */}
          <View style={styles.donorCard}>
            <View style={styles.donorHeader}>
              <Image
                source={{
                  uri: `https://i.pravatar.cc/150?seed=${donorId}`,
                }}
                style={styles.donorAvatar}
              />
              <View style={styles.donorInfo}>
                <Text style={styles.donorName}>{donorName}</Text>
                <View style={styles.donorMeta}>
                  <Text style={styles.donorRating}>⭐ {donorRating}</Text>
                  <Text style={styles.donorReviews}>({donorReviews})</Text>
                  {distance && (
                    <>
                      <Text style={styles.separator}>•</Text>
                      <Text style={styles.distance}>📍 {distance} km</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.donorStatement}>
              <Text style={styles.statementIcon}>💬</Text>
              <Text style={styles.statementText}>
                {donorName} is offering this item to you specifically based on
                your interests & location!
              </Text>
            </View>
          </View>

          {/* Why matched section */}
          <View style={styles.whyMatched}>
            <Text style={styles.whyTitle}>Why you were matched</Text>
            <View style={styles.whyItem}>
              <Text style={styles.whyIcon}>⭐</Text>
              <Text style={styles.whyText}>
                High trust score & positive reviews
              </Text>
            </View>
            <View style={styles.whyItem}>
              <Text style={styles.whyIcon}>📍</Text>
              <Text style={styles.whyText}>
                Closest recipient to {donorName}
              </Text>
            </View>
            <View style={styles.whyItem}>
              <Text style={styles.whyIcon}>💚</Text>
              <Text style={styles.whyText}>Your interests match this item</Text>
            </View>
          </View>

          {/* What happens next */}
          <View style={styles.nextSteps}>
            <Text style={styles.nextTitle}>Next steps if you accept</Text>
            <View style={styles.step}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Chat with {donorName} about pickup time
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Agree on a pickup time & location
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Scan QR code to verify & complete exchange
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>4</Text>
              </View>
              <Text style={styles.stepText}>
                Rate each other (builds trust!)
              </Text>
            </View>
          </View>

          {/* Important note */}
          <View style={styles.importantNote}>
            <Text style={styles.noteIcon}>ℹ️</Text>
            <Text style={styles.noteText}>
              If you don't respond in 24 hours, the item will be offered to
              another recipient.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDecline]}
              onPress={handleDecline}
              disabled={responding}
              activeOpacity={0.85}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.btnDeclineText}>❌ Not interested</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnAccept]}
              onPress={handleAccept}
              disabled={responding}
              activeOpacity={0.85}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnAcceptText}>✅ Yes, I want it!</Text>
                  <Text style={styles.btnAcceptSubtext}>
                    Let's chat about pickup
                  </Text>
                </>
              )}
            </TouchableOpacity>
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

  // Header
  header: {
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  timerBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  timerText: {
    color: "#92400e",
    fontWeight: "700",
    fontSize: 12,
  },
  timerSubtext: {
    color: "#b45309",
    fontSize: 10,
    marginTop: 2,
  },

  // Image section
  imageSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  listingImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#1e293b",
  },
  listingTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  // Donor card
  donorCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#4ade80",
  },
  donorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  donorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: "#334155",
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  donorMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  donorRating: {
    color: "#fbbf24",
    fontWeight: "700",
    fontSize: 12,
  },
  donorReviews: {
    color: "#94a3b8",
    fontSize: 12,
    marginLeft: 4,
  },
  separator: {
    color: "#64748b",
    marginHorizontal: 6,
  },
  distance: {
    color: "#cbd5e1",
    fontSize: 12,
  },

  // Statement
  donorStatement: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  statementIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  statementText: {
    color: "#cbd5e1",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },

  // Why matched
  whyMatched: {
    backgroundColor: "#1e3a1f",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
  },
  whyTitle: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  whyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  whyIcon: {
    fontSize: 16,
  },
  whyText: {
    color: "#a7f3d0",
    fontSize: 12,
    flex: 1,
  },

  // Next steps
  nextSteps: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  nextTitle: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumber: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 12,
  },
  stepText: {
    color: "#cbd5e1",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  // Important note
  importantNote: {
    backgroundColor: "#7c2d12",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
  },
  noteIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  noteText: {
    color: "#fed7aa",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  // Actions
  actions: {
    gap: 12,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDecline: {
    backgroundColor: "#1e293b",
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  btnDeclineText: {
    color: "#fca5a5",
    fontWeight: "700",
    fontSize: 15,
  },
  btnAccept: {
    backgroundColor: "#4ade80",
  },
  btnAcceptText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  btnAcceptSubtext: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
});

export default AcceptAssignmentScreen;
