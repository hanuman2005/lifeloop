// src/components/ThemeToggle/index.js — React Native
import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ showLabel = false }) => {
  const { toggleTheme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue:   isDark ? 1 : 0,
      tension:   60,
      friction:  8,
      useNativeDriver: true,
    }).start();
  }, [isDark]);

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 32] });
  const trackBg    = isDark ? "#334155" : "#e2e8f0";

  return (
    <View style={s.wrapper}>
      {showLabel && (
        <Text style={[s.label, { color: isDark ? "#94a3b8" : "#475569" }]}>
          {isDark ? "Dark" : "Light"} Mode
        </Text>
      )}
      <TouchableOpacity
        onPress={toggleTheme}
        activeOpacity={0.85}
        accessibilityLabel={`Switch to ${isDark ? "light" : "dark"} mode`}
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
      >
        {/* Track */}
        <View style={[s.track, { backgroundColor: trackBg }]}>
          {/* Thumb */}
          <Animated.View style={[s.thumb, { transform: [{ translateX }] }]}>
            <Text style={s.thumbIcon}>{isDark ? "🌙" : "☀️"}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "center", gap: 8 },
  label:   { fontSize: 14, fontWeight: "500" },
  track:   { width: 62, height: 32, borderRadius: 16, justifyContent: "center" },
  thumb:   {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 3,
  },
  thumbIcon: { fontSize: 14 },
});

export default ThemeToggle;