// src/components/Schedule/ScheduleCard.js - React Native
//
// Replaces:
//   - window.confirm / prompt  → Alert.alert (with text input for cancel reason)
//   - useNavigate              → useNavigation
//   - Calendar dropdown (web)  → Share API / expo-calendar integration note
//   - styled-components        → StyleSheet.create
//
// NOTE: Calendar integration (Google Calendar, .ics) requires expo-calendar.
//       For simplicity this card provides an "Add to Calendar" button that uses
//       expo-calendar to create a native calendar event.
//
// Install: expo install expo-calendar

import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, Alert, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { scheduleAPI } from "../services/api";
import Toast from "react-native-toast-message";
import * as Calendar from "expo-calendar";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const formatLocation = (loc) => {
  if (!loc) return "Not specified";
  if (typeof loc === "string") return loc;
  if (loc.address) return loc.address;
  if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
    const [lng, lat] = loc.coordinates;
    return `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  }
  return "Unknown location";
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

const STATUS_STYLES = {
  proposed:  { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b",  border: "#f59e0b",  label: "⏳ Pending"   },
  confirmed: { bg: "rgba(16,185,129,0.1)",  text: "#10b981",  border: "#10b981",  label: "✅ Confirmed" },
  completed: { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6",  border: "#3b82f6",  label: "🎉 Completed" },
  cancelled: { bg: "rgba(239,68,68,0.1)",   text: "#ef4444",  border: "#ef4444",  label: "❌ Cancelled" },
  expired:   { bg: "rgba(156,163,175,0.1)", text: "#9ca3af",  border: "#9ca3af",  label: "⏰ Expired"   },
};

const getStatusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES.expired;

const getLeftBorderColor = (s) =>
  ({ proposed: "#f59e0b", confirmed: "#10b981", completed: "#3b82f6", cancelled: "#ef4444", expired: "#9ca3af" }[s] || "#4299e1");

// Add schedule to device calendar
const addToCalendar = async (schedule) => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    Toast.show({ type: "error", text1: "Calendar permission required" });
    return;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCal = calendars.find(c => c.allowsModifications) || calendars[0];
  if (!defaultCal) { Toast.show({ type: "error", text1: "No writable calendar found" }); return; }

  const [h, m]   = (schedule.proposedTime || "09:00").split(":").map(Number);
  const startDate = new Date(schedule.proposedDate);
  startDate.setHours(h, m, 0, 0);
  const endDate   = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);

  try {
    await Calendar.createEventAsync(defaultCal.id, {
      title:    `Pickup: ${schedule.listing?.title || "Item"}`,
      startDate,
      endDate,
      location: formatLocation(schedule.pickupLocation),
      notes:    schedule.donorNotes || "",
    });
    Toast.show({ type: "success", text1: "✅ Added to your calendar!" });
  } catch (err) {
    Toast.show({ type: "error", text1: "Failed to add to calendar" });
  }
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const ScheduleCard = ({ schedule, userRole, onUpdate, onTrack }) => {
  const navigation     = useNavigation();
  const [loading,      setLoading]      = useState(false);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [showInput,    setShowInput]    = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const status      = getStatusStyle(schedule.status);
  const borderColor = getLeftBorderColor(schedule.status);
  const otherParty  = userRole === "donor" ? schedule.recipient : schedule.donor;
  const avatarUri   = otherParty?.avatar ||
    `https://ui-avatars.com/api/?name=${otherParty?.firstName || "User"}&background=667eea&color=fff&size=80`;

  // ── Actions ──────────────────────────────

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await scheduleAPI.confirmSchedule(schedule._id, { confirmationNotes: confirmNotes });
      Toast.show({ type: "success", text1: "✅ Schedule confirmed!" });
      onUpdate?.();
    } catch (err) {
      Toast.show({ type: "error", text1: err.response?.data?.message || "Failed to confirm" });
    } finally { setLoading(false); setShowInput(false); }
  };

  const handleCancel = () => {
    Alert.alert("Cancel Pickup", "Are you sure you want to cancel this pickup?", [
      { text: "No",  style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive",
        onPress: () => {
          Alert.prompt(
            "Reason (optional)", "Provide a reason for cancellation",
            async (reason) => {
              setLoading(true);
              try {
                await scheduleAPI.cancelSchedule(schedule._id, { cancellationReason: reason || "" });
                Toast.show({ type: "success", text1: "Schedule cancelled" });
                onUpdate?.();
              } catch (err) {
                Toast.show({ type: "error", text1: err.response?.data?.message || "Failed to cancel" });
              } finally { setLoading(false); }
            },
            "plain-text", "", "default"
          );
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert("Mark as Completed", "Mark this pickup as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete", style: "default",
        onPress: async () => {
          setLoading(true);
          try {
            await scheduleAPI.completeSchedule(schedule._id);
            Toast.show({ type: "success", text1: "🎉 Pickup completed!" });
            onUpdate?.();
          } catch (err) {
            Toast.show({ type: "error", text1: err.response?.data?.message || "Failed" });
          } finally { setLoading(false); }
        },
      },
    ]);
  };

  return (
    <Animated.View style={[styles.card, { borderLeftColor: borderColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={1}>{schedule.listing?.title || "Item"}</Text>
          <Text style={styles.listingCategory}>{schedule.listing?.category || ""}</Text>
        </View>
        <View style={styles.headerRight}>
          {(schedule.status === "confirmed" || schedule.status === "proposed") && (
            <TouchableOpacity style={styles.calBtn} onPress={() => addToCalendar(schedule)} activeOpacity={0.85}>
              <Text style={styles.calBtnText}>📅 Calendar</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
      </View>

      {/* Date + Time */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeItem}>
          <Text style={styles.dtIcon}>📅</Text>
          <View>
            <Text style={styles.dtValue}>{formatDate(schedule.proposedDate)}</Text>
            <Text style={styles.dtLabel}>Date</Text>
          </View>
        </View>
        <View style={styles.dateTimeItem}>
          <Text style={styles.dtIcon}>⏰</Text>
          <View>
            <Text style={styles.dtValue}>{schedule.proposedTime}</Text>
            <Text style={styles.dtLabel}>Time</Text>
          </View>
        </View>
      </View>

      {/* Other party */}
      <View style={styles.partyRow}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.partyName}>{otherParty?.firstName || "Unknown"} {otherParty?.lastName || ""}</Text>
          <Text style={styles.partyRole}>{userRole === "donor" ? "Recipient" : "Donor"}</Text>
        </View>
      </View>

      {/* Location */}
      {schedule.pickupLocation && (
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={2}>{formatLocation(schedule.pickupLocation)}</Text>
        </View>
      )}

      {/* Notes */}
      {schedule.donorNotes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}><Text style={styles.notesBold}>📝 Note: </Text>{schedule.donorNotes}</Text>
        </View>
      )}
      {schedule.confirmationNotes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}><Text style={styles.notesBold}>✅ Confirmation: </Text>{schedule.confirmationNotes}</Text>
        </View>
      )}

      {/* Action buttons */}
      {schedule.status === "proposed" && userRole === "recipient" && (
        showInput ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <TextInput style={styles.noteInput} value={confirmNotes} onChangeText={setConfirmNotes}
              placeholder="Confirmation notes (optional)" placeholderTextColor="#64748b" />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setShowInput(false)} activeOpacity={0.85}>
                <Text style={styles.btnGhostText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGreen, loading && styles.btnDisabled]}
                onPress={handleConfirm} disabled={loading} activeOpacity={0.85}>
                <Text style={styles.btnWhiteText}>{loading ? "Confirming..." : "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.btnRow, { marginTop: 12 }]}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>❌ Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={() => setShowInput(true)} activeOpacity={0.85}>
              <Text style={styles.btnWhiteText}>✅ Confirm Pickup</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {schedule.status === "confirmed" && userRole === "donor" && (
        <View style={[styles.btnRow, { marginTop: 12 }]}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Cancel</Text>
          </TouchableOpacity>
          {onTrack && (
            <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={onTrack} activeOpacity={0.85}>
              <Text style={styles.btnWhiteText}>🚗 Track</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnGreen, loading && styles.btnDisabled]}
            onPress={handleComplete} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnWhiteText}>🎉 Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {schedule.status === "confirmed" && userRole === "recipient" && (
        <View style={[styles.btnRow, { marginTop: 12 }]}>
          {onTrack && (
            <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={onTrack} activeOpacity={0.85}>
              <Text style={styles.btnWhiteText}>🚗 Track</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleCancel} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Cancel Pickup</Text>
          </TouchableOpacity>
        </View>
      )}

      {schedule.status === "proposed" && userRole === "donor" && (
        <TouchableOpacity style={[styles.btn, styles.btnGhost, { marginTop: 12 }]} onPress={handleCancel} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>Cancel Proposal</Text>
        </TouchableOpacity>
      )}

      {schedule.status === "completed" && (
        <TouchableOpacity style={[styles.btn, styles.btnGhost, { marginTop: 12 }]}
          onPress={() => navigation.navigate("ListingDetails", { id: schedule.listing?._id })} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>View Listing</Text>
        </TouchableOpacity>
      )}

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#131c2e", borderRadius: 16, padding: 16,
    borderLeftWidth: 4, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  listingInfo:   { flex: 1 },
  listingTitle:  { color: "#f1f5f9", fontWeight: "700", fontSize: 15, marginBottom: 2 },
  listingCategory:{ color: "#64748b", fontSize: 12 },
  headerRight:   { gap: 8, alignItems: "flex-end" },
  calBtn:        { backgroundColor: "#1e2d45", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#334155" },
  calBtnText:    { color: "#667eea", fontWeight: "700", fontSize: 11 },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText:    { fontSize: 12, fontWeight: "700" },
  dateTimeRow:   { flexDirection: "row", gap: 12, backgroundColor: "#1e2d45", borderRadius: 12, padding: 12, marginBottom: 10 },
  dateTimeItem:  { flex: 1, flexDirection: "row", gap: 8, alignItems: "center" },
  dtIcon:        { fontSize: 22 },
  dtValue:       { color: "#f1f5f9", fontWeight: "700", fontSize: 13 },
  dtLabel:       { color: "#64748b", fontSize: 11 },
  partyRow:      { flexDirection: "row", gap: 10, backgroundColor: "#1e2d45", borderRadius: 10, padding: 10, marginBottom: 8, alignItems: "center" },
  avatar:        { width: 40, height: 40, borderRadius: 20 },
  partyName:     { color: "#f1f5f9", fontWeight: "700", fontSize: 14 },
  partyRole:     { color: "#64748b", fontSize: 12 },
  locationRow:   { flexDirection: "row", gap: 8, backgroundColor: "#1e2d45", borderRadius: 8, padding: 10, marginBottom: 8, alignItems: "flex-start" },
  locationIcon:  { fontSize: 16, marginTop: 1 },
  locationText:  { flex: 1, color: "#94a3b8", fontSize: 13 },
  notesBox:      { backgroundColor: "rgba(245,158,11,0.08)", borderLeftWidth: 3, borderLeftColor: "#f59e0b", borderRadius: 8, padding: 10, marginBottom: 6 },
  notesText:     { color: "#f59e0b", fontSize: 13, lineHeight: 18 },
  notesBold:     { fontWeight: "700" },
  noteInput:     { backgroundColor: "#1e2d45", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#f1f5f9", fontSize: 13, borderWidth: 1, borderColor: "#334155" },
  btnRow:        { flexDirection: "row", gap: 10 },
  btn:           { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  btnDisabled:   { opacity: 0.5 },
  btnGhost:      { backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#334155" },
  btnGhostText:  { color: "#94a3b8", fontWeight: "600", fontSize: 13 },
  btnGreen:      { backgroundColor: "#10b981" },
  btnBlue:       { backgroundColor: "#667eea" },
  btnWhiteText:  { color: "#fff", fontWeight: "700", fontSize: 13 },
});

export default ScheduleCard;