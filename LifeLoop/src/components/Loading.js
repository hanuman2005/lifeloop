// src/components/Loading/index.js - React Native
// Combines LoadingSpinner + LoadingSkeleton into one file

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  ActivityIndicator,
} from "react-native";

// ─────────────────────────────────────────
// LOADING SPINNER
// ─────────────────────────────────────────

export const LoadingSpinner = ({
  size = "medium",
  text = "Loading...",
  fullPage = false,
  color = "#4ade80",
}) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const nativeSizes = { small: "small", medium: "large", large: "large", xlarge: "large" };
  const indicatorSize = nativeSizes[size] ?? "large";

  const content = (
    <Animated.View
      style={[
        styles.spinnerContainer,
        fullPage && styles.spinnerContainerFullPage,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ActivityIndicator size={indicatorSize} color={color} />
      {text ? (
        <Text style={[styles.spinnerText, { color }]}>{text}</Text>
      ) : null}
    </Animated.View>
  );

  if (fullPage) {
    return (
      <Modal transparent animationType="fade" visible>
        {content}
      </Modal>
    );
  }

  return content;
};

// ─────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────

export const LoadingSkeleton = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      accessibilityLabel="Loading..."
      accessibilityRole="progressbar"
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// ─────────────────────────────────────────
// CONVENIENCE: SKELETON ROW PRESETS
// Useful for building skeleton screens quickly
// ─────────────────────────────────────────

export const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <LoadingSkeleton width="60%" height={18} borderRadius={6} />
    <LoadingSkeleton width="100%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
    <LoadingSkeleton width="80%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
    <View style={styles.skeletonCardRow}>
      <LoadingSkeleton width={80} height={28} borderRadius={8} />
      <LoadingSkeleton width={80} height={28} borderRadius={8} />
    </View>
  </View>
);

export const SkeletonListItem = () => (
  <View style={styles.skeletonListItem}>
    <LoadingSkeleton width={44} height={44} borderRadius={22} />
    <View style={{ flex: 1, gap: 8 }}>
      <LoadingSkeleton width="55%" height={14} borderRadius={6} />
      <LoadingSkeleton width="80%" height={11} borderRadius={6} />
    </View>
  </View>
);

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  // Spinner
  spinnerContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  spinnerContainerFullPage: {
    flex: 1,
    backgroundColor: "rgba(10,15,30,0.75)",
  },
  spinnerText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // Skeleton
  skeleton: {
    backgroundColor: "#1e2d45",
  },

  // Skeleton presets
  skeletonCard: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
    gap: 8,
  },
  skeletonCardRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  skeletonListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2d45",
  },
});

// Default export = spinner (most common use)
export default LoadingSpinner;