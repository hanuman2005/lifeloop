// src/components/Schedule/TimeSlotPicker.js - React Native
// Replaces: styled-components overflow-y scroll grid
// With:     ScrollView + TouchableOpacity grid
import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

const PERIODS = [
  { id: "morning",   label: "Morning",   icon: "🌅", start: 6,  end: 12 },
  { id: "afternoon", label: "Afternoon", icon: "☀️", start: 12, end: 17 },
  { id: "evening",   label: "Evening",   icon: "🌆", start: 17, end: 21 },
];

const pad = (n) => String(n).padStart(2, "0");

const generateSlots = (startHour, endHour, interval = 30) => {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      const time24 = `${pad(h)}:${pad(m)}`;
      const h12    = h % 12 || 12;
      const period = h < 12 ? "AM" : "PM";
      slots.push({ time24, time12: `${h12}:${pad(m)} ${period}` });
    }
  }
  return slots;
};

const TimeSlotPicker = ({
  selectedTime,
  onTimeSelect,
  unavailableSlots = [],
  date,
  interval         = 30,
}) => {
  const [activePeriod, setActivePeriod] = useState("morning");

  const slots = useMemo(() => {
    const p = PERIODS.find(p => p.id === activePeriod);
    return p ? generateSlots(p.start, p.end, interval) : [];
  }, [activePeriod, interval]);

  const isUnavailable = (t) => unavailableSlots.includes(t);
  const isPast = (t) => {
    if (!date) return false;
    const now = new Date();
    const [h, m] = t.split(":").map(Number);
    const slot = new Date(date);
    slot.setHours(h, m, 0, 0);
    return slot < now;
  };

  const formatSelected = () => {
    if (!selectedTime) return null;
    const [h, m] = selectedTime.split(":").map(Number);
    const h12    = h % 12 || 12;
    const period = h < 12 ? "AM" : "PM";
    return { time: `${h12}:${pad(m)}`, period };
  };
  const sf = formatSelected();

  return (
    <View style={styles.container}>
      {/* Header + period tabs */}
      <View style={styles.header}>
        <Text style={styles.title}>🕐 Select Time</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodTabsScroll}>
        <View style={styles.periodTabs}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodTab, activePeriod === p.id && styles.periodTabActive]}
              onPress={() => setActivePeriod(p.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodTabText, activePeriod === p.id && styles.periodTabTextActive]}>
                {p.icon} {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Time slots */}
      <ScrollView style={styles.slotsScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <View style={styles.slotsGrid}>
          {slots.map((slot) => {
            const unavail  = isUnavailable(slot.time24) || isPast(slot.time24);
            const selected = selectedTime === slot.time24;
            return (
              <TouchableOpacity
                key={slot.time24}
                style={[
                  styles.slot,
                  selected  && styles.slotSelected,
                  unavail   && styles.slotUnavailable,
                ]}
                onPress={() => !unavail && onTimeSelect(slot.time24)}
                disabled={unavail}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.slotText,
                  selected && styles.slotTextSelected,
                  unavail  && styles.slotTextUnavailable,
                ]}>
                  {slot.time12}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Selected display */}
      {sf && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedIcon}>⏰</Text>
          <Text style={styles.selectedTime}>{sf.time}</Text>
          <Text style={styles.selectedPeriod}>{sf.period}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:           { backgroundColor: "#131c2e", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e2d45" },
  header:              { marginBottom: 12 },
  title:               { color: "#f1f5f9", fontWeight: "700", fontSize: 15 },
  periodTabsScroll:    { marginBottom: 12 },
  periodTabs:          { flexDirection: "row", gap: 8 },
  periodTab:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1e2d45" },
  periodTabActive:     { backgroundColor: "#667eea" },
  periodTabText:       { color: "#94a3b8", fontWeight: "600", fontSize: 13 },
  periodTabTextActive: { color: "#fff" },
  slotsScroll:         { maxHeight: 220 },
  slotsGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot:                { width: "30%", paddingVertical: 10, borderRadius: 12, backgroundColor: "#1e2d45", borderWidth: 1.5, borderColor: "#334155", alignItems: "center" },
  slotSelected:        { backgroundColor: "#667eea", borderColor: "#667eea" },
  slotUnavailable:     { opacity: 0.35 },
  slotText:            { color: "#f1f5f9", fontWeight: "600", fontSize: 12 },
  slotTextSelected:    { color: "#fff" },
  slotTextUnavailable: { textDecorationLine: "line-through", color: "#64748b" },
  selectedInfo:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: 10, backgroundColor: "#1e2d45", borderRadius: 12 },
  selectedIcon:        { fontSize: 18 },
  selectedTime:        { color: "#667eea", fontWeight: "700", fontSize: 22 },
  selectedPeriod:      { color: "#94a3b8", fontSize: 14 },
});

export default TimeSlotPicker;