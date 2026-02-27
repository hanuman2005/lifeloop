// src/components/Schedule/CalendarPicker.js - React Native
// Replaces: styled-components + framer-motion custom calendar grid
// With:     pure React Native (no external calendar lib needed)
import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"];

const today = new Date();
today.setHours(0, 0, 0, 0);

const CalendarPicker = ({
  selectedDate,
  onDateSelect,
  minDate        = new Date(),
  maxDate,
  availableSlots = {},
  disabledDates  = [],
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const result = [];
    // Pad from previous month
    for (let i = first.getDay() - 1; i >= 0; i--) {
      result.push({ date: new Date(year, month - 1, new Date(year, month, 0).getDate() - i), other: true });
    }
    // Current month
    for (let i = 1; i <= last.getDate(); i++) {
      result.push({ date: new Date(year, month, i), other: false });
    }
    // Fill to 42 cells
    const rem = 42 - result.length;
    for (let i = 1; i <= rem; i++) {
      result.push({ date: new Date(year, month + 1, i), other: true });
    }
    return result;
  }, [currentMonth]);

  const isDisabled = (date) => {
    const ds = date.toISOString().split("T")[0];
    if (disabledDates.includes(ds)) return true;
    const mn = new Date(minDate); mn.setHours(0, 0, 0, 0);
    if (date < mn) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };
  const isToday    = (d) => d.toDateString() === today.toDateString();
  const isSelected = (d) => selectedDate && d.toDateString() === new Date(selectedDate).toDateString();
  const hasSlots   = (d) => (availableSlots[d.toISOString().split("T")[0]]?.length > 0);

  const prevDisabled = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const mn   = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return prev < mn;
  };

  const formatSelected = () => {
    if (!selectedDate) return "";
    return new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.navBtn, prevDisabled() && styles.navBtnDisabled]}
          onPress={() => !prevDisabled() && setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          activeOpacity={0.8}>
          <Text style={styles.navBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthYear}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity style={styles.navBtn}
          onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          activeOpacity={0.8}>
          <Text style={styles.navBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
      </View>

      {/* Days grid */}
      <View style={styles.daysGrid}>
        {days.map((day, idx) => {
          const disabled = day.other || isDisabled(day.date);
          const selected = isSelected(day.date);
          const _today   = isToday(day.date);
          const slots    = hasSlots(day.date);
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => !disabled && onDateSelect(day.date)}
              activeOpacity={disabled ? 1 : 0.75}
              style={[
                styles.dayCell,
                selected && styles.dayCellSelected,
                _today && !selected && styles.dayCellToday,
                disabled && styles.dayCellDisabled,
              ]}
            >
              <Text style={[
                styles.dayText,
                selected && styles.dayTextSelected,
                day.other && styles.dayTextOther,
                disabled && styles.dayTextDisabled,
              ]}>
                {day.date.getDate()}
              </Text>
              {slots && !day.other && <View style={styles.slotDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected display */}
      {selectedDate && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>📅 {formatSelected()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:  { backgroundColor: "#131c2e", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1e2d45" },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  monthYear:  { color: "#f1f5f9", fontWeight: "700", fontSize: 16 },
  navBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1e2d45", alignItems: "center", justifyContent: "center" },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: "#f1f5f9", fontSize: 16 },
  weekRow:    { flexDirection: "row", marginBottom: 6 },
  weekDay:    { flex: 1, textAlign: "center", color: "#64748b", fontSize: 11, fontWeight: "600", textTransform: "uppercase", paddingVertical: 4 },
  daysGrid:   { flexDirection: "row", flexWrap: "wrap" },
  dayCell:    { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 10, position: "relative" },
  dayCellSelected: { backgroundColor: "#667eea" },
  dayCellToday:    { backgroundColor: "#1e2d45" },
  dayCellDisabled: { opacity: 0.3 },
  dayText:         { color: "#f1f5f9", fontSize: 13, fontWeight: "500" },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  dayTextOther:    { color: "#475569" },
  dayTextDisabled: { color: "#475569" },
  slotDot: { position: "absolute", bottom: 4, left: "50%", marginLeft: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  selectedInfo: { marginTop: 12, padding: 10, backgroundColor: "#1e2d45", borderRadius: 10, alignItems: "center" },
  selectedText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
});

export default CalendarPicker;