// src/screens/ScheduleDetails.js - React Native | Dark Theme
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { scheduleAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";

const STATUS_META = {
  proposed:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "PENDING",   icon: "⏳" },
  confirmed: { color: "#4ade80", bg: "rgba(74,222,128,0.12)",  label: "CONFIRMED", icon: "✅" },
  completed: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  label: "COMPLETED", icon: "🎉" },
  cancelled: { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "CANCELLED", icon: "✕" },
};
const getMeta = (s) => STATUS_META[s] || STATUS_META.proposed;

const InfoRow = ({ icon, label, value, last }) => (
  <View style={[s.infoRow, !last && s.infoRowBorder]}>
    <Text style={s.infoRowIcon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={s.infoRowLabel}>{label}</Text>
      <Text style={s.infoRowValue}>{value || "—"}</Text>
    </View>
  </View>
);

const ScheduleDetails = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const { user }   = useAuth();
  const { id }     = route.params;

  const [schedule, setSchedule] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => { fetchSchedule(); }, []);

  const fetchSchedule = async () => {
    try {
      const res   = await scheduleAPI.getMySchedules({ scheduleId: id });
      const found = (res.data?.schedules || res.schedules || []).find(s => s._id === id);
      if (!found) throw new Error("Not found");
      setSchedule(found);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    } catch {
      Toast.show({ type: "error", text1: "Failed to load schedule" });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = () => schedule?.donor?._id === user?._id ? "donor" : "recipient";

  const handleConfirm = () => {
    Alert.alert("Confirm Pickup", "Confirm this pickup schedule?", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        try {
          await scheduleAPI.confirmSchedule(id, {});
          Toast.show({ type: "success", text1: "Confirmed! ✅" });
          fetchSchedule();
        } catch { Toast.show({ type: "error", text1: "Failed" }); }
      }},
    ]);
  };

  const handleComplete = () => {
    Alert.alert("Mark Complete", "Mark this pickup as completed?", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete 🎉", onPress: async () => {
        try {
          await scheduleAPI.completeSchedule(id);
          Toast.show({ type: "success", text1: "Pickup completed! 🎉" });
          fetchSchedule();
        } catch { Toast.show({ type: "error", text1: "Failed" }); }
      }},
    ]);
  };

  const handleCancel = () => {
    Alert.alert("Cancel Schedule", "This cannot be undone. Continue?", [
      { text: "Keep", style: "cancel" },
      { text: "Cancel Schedule", style: "destructive", onPress: async () => {
        try {
          await scheduleAPI.cancelSchedule(id);
          Toast.show({ type: "success", text1: "Cancelled" });
          navigation.goBack();
        } catch { Toast.show({ type: "error", text1: "Failed" }); }
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.loadingText}>Loading schedule…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) return null;

  const meta     = getMeta(schedule.status);
  const role     = getUserRole();
  const canConf  = schedule.status === "proposed"  && role === "recipient";
  const canComp  = schedule.status === "confirmed" && role === "donor";
  const canCanc  = ["proposed","confirmed"].includes(schedule.status);
  const canTrack = schedule.status === "confirmed";

  const dateStr = schedule.proposedDate
    ? new Date(schedule.proposedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <SafeAreaView style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Schedule Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Status banner ── */}
          <View style={[s.statusBanner, { backgroundColor: meta.bg, borderColor: meta.color }]}>
            <Text style={s.statusBannerIcon}>{meta.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.statusBannerLabel, { color: meta.color }]}>{meta.label}</Text>
              <Text style={s.statusBannerSub}>
                {role === "donor" ? "You are the donor" : "You are the recipient"}
              </Text>
            </View>
          </View>

          {/* ── Listing preview ── */}
          {schedule.listing && (
            <TouchableOpacity
              style={s.listingCard}
              onPress={() => navigation.navigate("ListingDetails", { id: schedule.listing._id })}
              activeOpacity={0.9}
            >
              <View style={s.listingCardImage}>
                {schedule.listing.images?.[0]
                  ? <Image source={{ uri: schedule.listing.images[0] }} style={s.listingCardImg} />
                  : <Text style={s.listingCardEmoji}>📦</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listingCardTitle} numberOfLines={1}>{schedule.listing.title}</Text>
                <Text style={s.listingCardSub}>Tap to view listing →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Schedule info ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📅 Pickup Details</Text>
            <InfoRow icon="📅" label="Date"     value={dateStr} />
            <InfoRow icon="🕐" label="Time"     value={schedule.proposedTime || schedule.confirmedTime} />
            <InfoRow icon="📍" label="Location" value={schedule.pickupAddress || (typeof schedule.pickupLocation === "string" ? schedule.pickupLocation : schedule.pickupLocation?.address)} />
            <InfoRow icon="🎁" label="Donor"    value={`${schedule.donor?.firstName || ""} ${schedule.donor?.lastName || ""}`.trim()} />
            <InfoRow icon="👤" label="Recipient" value={`${schedule.recipient?.firstName || ""} ${schedule.recipient?.lastName || ""}`.trim()} last />
          </View>

          {/* ── Notes ── */}
          {(schedule.donorNotes || schedule.confirmationNotes) && (
            <View style={s.card}>
              <Text style={s.cardTitle}>📝 Notes</Text>
              {schedule.donorNotes && (
                <View style={s.noteBox}>
                  <Text style={s.noteLabel}>Donor notes</Text>
                  <Text style={s.noteText}>{schedule.donorNotes}</Text>
                </View>
              )}
              {schedule.confirmationNotes && (
                <View style={[s.noteBox, { marginTop: 8 }]}>
                  <Text style={s.noteLabel}>Confirmation notes</Text>
                  <Text style={s.noteText}>{schedule.confirmationNotes}</Text>
                </View>
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── Fixed action bar ── */}
      <View style={s.actionBar}>
        {canTrack && (
          <TouchableOpacity
            style={s.actionBtnTrack}
            onPress={() => navigation.navigate("Tracking", { scheduleId: id })}
          >
            <Text style={s.actionBtnText}>🚗 Track Pickup</Text>
          </TouchableOpacity>
        )}
        <View style={s.actionRow}>
          {canConf && (
            <TouchableOpacity style={s.actionBtnPrimary} onPress={handleConfirm}>
              <Text style={s.actionBtnText}>✓ Confirm Pickup</Text>
            </TouchableOpacity>
          )}
          {canComp && (
            <TouchableOpacity style={s.actionBtnPrimary} onPress={handleComplete}>
              <Text style={s.actionBtnText}>✓ Mark Complete</Text>
            </TouchableOpacity>
          )}
          {canCanc && (
            <TouchableOpacity style={s.actionBtnDanger} onPress={handleCancel}>
              <Text style={s.actionBtnDangerText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#0a0f1e" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: "#94a3b8", fontSize: 14 },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#1e2d45",
  },
  backBtn:      { width: 60 },
  backBtnText:  { color: "#4ade80", fontWeight: "700", fontSize: 15 },
  topBarTitle:  { fontSize: 16, fontWeight: "700", color: "#f1f5f9" },

  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 16, marginBottom: 12,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  statusBannerIcon:  { fontSize: 28 },
  statusBannerLabel: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  statusBannerSub:   { fontSize: 12, color: "#94a3b8" },

  listingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#131c2e", borderRadius: 16, padding: 14,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#1e2d45",
  },
  listingCardImage: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: "#0a0f1e", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1e2d45", overflow: "hidden",
  },
  listingCardImg:   { width: 52, height: 52 },
  listingCardEmoji: { fontSize: 24 },
  listingCardTitle: { fontSize: 14, fontWeight: "700", color: "#f1f5f9", marginBottom: 3 },
  listingCardSub:   { fontSize: 11, color: "#4ade80" },

  card: {
    backgroundColor: "#131c2e", borderRadius: 18,
    padding: 18, marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#1e2d45",
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#4ade80", marginBottom: 14, letterSpacing: 0.3 },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#1e2d45" },
  infoRowIcon:   { fontSize: 16, marginTop: 1 },
  infoRowLabel:  { fontSize: 10, color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  infoRowValue:  { fontSize: 14, color: "#e2e8f0" },

  noteBox:   { backgroundColor: "#0a0f1e", borderRadius: 10, padding: 12 },
  noteLabel: { fontSize: 10, color: "#64748b", fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  noteText:  { fontSize: 13, color: "#94a3b8", lineHeight: 19 },

  actionBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#131c2e", padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: "#1e2d45", gap: 10,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtnTrack: {
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  actionBtnPrimary: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: "#4ade80",
  },
  actionBtnDanger: {
    flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#f87171",
  },
  actionBtnText:       { color: "#0a0f1e", fontWeight: "700", fontSize: 15 },
  actionBtnDangerText: { color: "#f87171", fontWeight: "700", fontSize: 15 },
});

export default ScheduleDetails;