// src/components/ImpactDashboard/ImpactCard.js - React Native
import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import AnimatedCounter from "./AnimatedCounter";

// Gradient map — maps CSS gradient strings to solid fallback colors
// (React Native needs react-native-linear-gradient for real gradients)
// Install: expo install expo-linear-gradient
let LinearGradient;
try {
  LinearGradient = require("expo-linear-gradient").LinearGradient;
} catch {
  LinearGradient = null;
}

const GRADIENT_COLORS = {
  green:  ["#48bb78", "#38a169"],
  blue:   ["#4299e1", "#3182ce"],
  orange: ["#ed8936", "#dd6b20"],
  purple: ["#9f7aea", "#805ad5"],
  teal:   ["#4fd1c5", "#38b2ac"],
  default:["#667eea", "#764ba2"],
};

// Parse gradient prop → color pair for LinearGradient
const parseGradient = (gradient) => {
  if (!gradient) return GRADIENT_COLORS.default;
  if (gradient.includes("48bb78") || gradient.includes("success")) return GRADIENT_COLORS.green;
  if (gradient.includes("4299e1") || gradient.includes("primary"))  return GRADIENT_COLORS.blue;
  if (gradient.includes("ed8936") || gradient.includes("warning"))  return GRADIENT_COLORS.orange;
  if (gradient.includes("9f7aea") || gradient.includes("secondary"))return GRADIENT_COLORS.purple;
  if (gradient.includes("4fd1c5")) return GRADIENT_COLORS.teal;
  return GRADIENT_COLORS.default;
};

const ImpactCard = ({
  icon,
  value,
  label,
  subtitle,
  gradient,
  decimals = 0,
  suffix = "",
  prefix = "",
}) => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const iconAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Icon wobble loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconAnim, { toValue: 1,  duration: 1500, useNativeDriver: true }),
        Animated.timing(iconAnim, { toValue: -1, duration: 1500, useNativeDriver: true }),
        Animated.timing(iconAnim, { toValue: 0,  duration: 1000, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();
  }, []);

  const iconRotate = iconAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-5deg", "0deg", "5deg"],
  });

  const colors = parseGradient(gradient);

  const CardWrapper = ({ children }) =>
    LinearGradient ? (
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {children}
      </LinearGradient>
    ) : (
      <View style={[styles.card, { backgroundColor: colors[0] }]}>
        {children}
      </View>
    );

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] },
      ]}
    >
      <CardWrapper>
        {/* Decorative circle (mimics ::before pseudo) */}
        <View style={styles.decorCircle} />

        <Animated.Text
          style={[styles.icon, { transform: [{ rotate: iconRotate }] }]}
        >
          {icon}
        </Animated.Text>

        <AnimatedCounter
          end={value}
          decimals={decimals}
          suffix={suffix}
          prefix={prefix}
          style={styles.value}
        />

        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </CardWrapper>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  decorCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  icon:     { fontSize: 36, marginBottom: 10 },
  value:    { fontSize: 32, fontWeight: "800", color: "#fff", marginBottom: 6 },
  label:    { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
});

export default ImpactCard;