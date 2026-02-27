// src/components/LiveNotificationBanner/index.js - React Native
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSocket } from "../context/SocketContext";

const LiveNotificationBanner = () => {
  const [alert, setAlert]   = useState(null);
  const { socket }          = useSocket();
  const navigation          = useNavigation();

  // Slide-down animation
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const timerRef  = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleAlert = (data) => {
      setAlert(data);
      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 10s
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => dismiss(), 10000);
    };

    socket.on("newListingAlert", handleAlert);
    return () => {
      socket.off("newListingAlert", handleAlert);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [socket]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -120, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 300, useNativeDriver: true }),
    ]).start(() => setAlert(null));
  };

  if (!alert) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={() => {
          navigation.navigate("ListingDetails", { id: alert.listing._id });
          dismiss();
        }}
        activeOpacity={0.9}
      >
        <Text style={styles.icon}>🎁</Text>

        <View style={styles.content}>
          <Text style={styles.title}>New Donation Available!</Text>
          <Text style={styles.message} numberOfLines={1}>
            {alert.donor?.name} donated {alert.listing?.title}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={(e) => { e.stopPropagation?.(); dismiss(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position:  "absolute",
    top:       60,       // below status bar / header
    left:      16,
    right:     16,
    zIndex:    9999,
    borderRadius: 14,
    overflow:  "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    // Gradient fallback — use expo-linear-gradient for real gradient
    backgroundColor: "#667eea",
  },
  inner: {
    flexDirection: "row",
    alignItems:    "center",
    padding:       14,
    gap:           12,
  },
  icon:    { fontSize: 28 },
  content: { flex: 1 },
  title: {
    color:      "#fff",
    fontWeight: "700",
    fontSize:   14,
    marginBottom: 2,
  },
  message: {
    color:   "rgba(255,255,255,0.9)",
    fontSize: 12,
  },
  closeBtn: {
    width:  28,
    height: 28,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  closeBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default LiveNotificationBanner;