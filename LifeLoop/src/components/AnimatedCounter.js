// src/components/ImpactDashboard/AnimatedCounter.js - React Native
import React, { useState, useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";

const AnimatedCounter = ({
  end,
  duration = 2000,
  decimals = 0,
  suffix = "",
  prefix = "",
  style,
}) => {
  const [count, setCount]     = useState(0);
  const startTimeRef          = useRef(null);
  const intervalRef           = useRef(null);
  const scaleAnim             = useRef(new Animated.Value(0.5)).current;
  const fadeAnim              = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 200,
        damping: 15,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Count-up (RN has no requestAnimationFrame, use setInterval at ~60fps)
  useEffect(() => {
    if (!end) return;
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed    = Date.now() - startTimeRef.current;
      const percentage = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const easeOut    = 1 - Math.pow(1 - percentage, 3);
      const current    = easeOut * end;
      setCount(current);

      if (percentage >= 1) {
        setCount(end);
        clearInterval(intervalRef.current);
      }
    }, 16); // ~60fps

    return () => clearInterval(intervalRef.current);
  }, [end, duration]);

  const formatted =
    decimals > 0
      ? count.toFixed(decimals)
      : Math.floor(count).toLocaleString("en-IN");

  return (
    <Animated.Text
      style={[
        styles.counter,
        style,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {prefix}{formatted}{suffix}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  counter: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
});

export default AnimatedCounter;