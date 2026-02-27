// src/screens/PickupScheduleScreen.js
// Priority 3 — Waste Pickup Request
// User picks items, address, date, slot → Request sent → 30 points awarded

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const { width: SW } = Dimensions.get("window");
const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

const WASTE_TYPES = [
  { id: "Plastic", icon: "🧴", label: "Plastic" },
  { id: "Glass", icon: "🍶", label: "Glass" },
  { id: "Metal", icon: "🥫", label: "Metal" },
  { id: "Paper", icon: "📦", label: "Paper" },
  { id: "Electronic", icon: "📱", label: "E-Waste" },
  { id: "Textile", icon: "👕", label: "Textile" },
  { id: "Organic", icon: "🥦", label: "Organic" },
  { id: "Wood", icon: "🪵", label: "Wood" },
];

const TIME_SLOTS = [
  { id: "morning", label: "Morning", time: "8AM – 12PM", icon: "🌅" },
  { id: "afternoon", label: "Afternoon", time: "12PM – 4PM", icon: "☀️" },
  { id: "evening", label: "Evening", time: "4PM – 7PM", icon: "🌆" },
];

// Get next 7 days
const getNextDays = () => {
  const days = [];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split("T")[0],
      day: weekDays[d.getDay()],
      num: d.getDate(),
      month: months[d.getMonth()],
    });
  }
  return days;
};

const STEPS = ["Items", "Address", "Schedule", "Confirm"];

export default function PickupScheduleScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const preselectedCenter = route.params?.center;
  const preselectedItem = route.params?.item; // from WasteAnalyzer

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Form state
  const [selectedItems, setSelectedItems] = useState(
    preselectedItem
      ? [
          {
            label: preselectedItem.label,
            category: preselectedItem.category,
            quantity: "1 item",
          },
        ]
      : [],
  );
  const [customItem, setCustomItem] = useState("");
  const [address, setAddress] = useState({
    street: "",
    city: "Narasapur",
    pincode: "",
    landmark: "",
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");

  const days = getNextDays();

  const toggleItem = (type) => {
    const exists = selectedItems.find((i) => i.category === type.id);
    if (exists) {
      setSelectedItems((prev) => prev.filter((i) => i.category !== type.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        { label: type.label, category: type.id, quantity: "1 item" },
      ]);
    }
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    setSelectedItems((prev) => [
      ...prev,
      { label: customItem.trim(), category: "Plastic", quantity: "1 item" },
    ]);
    setCustomItem("");
  };

  const removeItem = (i) =>
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== i));

  const canProceed = () => {
    if (step === 0) return selectedItems.length > 0;
    if (step === 1) return address.street && address.city && address.pincode;
    if (step === 2) return selectedDate && selectedSlot;
    return true;
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API}/api/pickup/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: selectedItems,
          address,
          scheduledDate: selectedDate,
          scheduledSlot: selectedSlot,
          centerId: preselectedCenter?.id,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessData(json);
        setSuccess(true);
      } else {
        Alert.alert("Error", json.error || "Failed to schedule pickup");
      }
    } catch (err) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (success && successData) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.successContainer}>
          <Text style={s.successEmoji}>🎉</Text>
          <Text style={s.successTitle}>Pickup Scheduled!</Text>
          <Text style={s.successSub}>We'll be there to collect your waste</Text>

          <View style={s.successCard}>
            <View style={s.successRow}>
              <Text style={s.successLabel}>Date</Text>
              <Text style={s.successValue}>
                {new Date(selectedDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            <View style={s.successRow}>
              <Text style={s.successLabel}>Time Slot</Text>
              <Text style={s.successValue}>
                {TIME_SLOTS.find((t) => t.id === selectedSlot)?.time}
              </Text>
            </View>
            <View style={s.successRow}>
              <Text style={s.successLabel}>Items</Text>
              <Text style={s.successValue}>{selectedItems.length} item(s)</Text>
            </View>
            {successData.estimatedAmount > 0 && (
              <View style={s.successRow}>
                <Text style={s.successLabel}>Est. Payment</Text>
                <Text style={[s.successValue, { color: "#f59e0b" }]}>
                  ₹{successData.estimatedAmount}+
                </Text>
              </View>
            )}
          </View>

          <View style={s.pointsEarned}>
            <Text style={s.pointsEarnedIcon}>⭐</Text>
            <Text style={s.pointsEarnedText}>+30 Eco Points Earned!</Text>
          </View>

          <Text style={s.successNote}>
            You'll receive a notification when your pickup is confirmed. Keep
            items ready at the door.
          </Text>

          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => nav.navigate("Home")}
          >
            <Text style={s.doneBtnText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => nav.navigate("MyPickups")}
          >
            <Text style={s.viewBtnText}>View My Pickups</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep(step - 1) : nav.goBack())}
          style={s.backBtn}
        >
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Schedule Pickup</Text>
        <View style={s.pointsHint}>
          <Text style={s.pointsHintText}>+30 pts</Text>
        </View>
      </View>

      {/* Step indicator */}
      <View style={s.stepRow}>
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <View style={s.stepItem}>
              <View
                style={[
                  s.stepDot,
                  i <= step && s.stepDotActive,
                  i < step && s.stepDotDone,
                ]}
              >
                <Text style={[s.stepDotText, i <= step && s.stepDotTextActive]}>
                  {i < step ? "✓" : i + 1}
                </Text>
              </View>
              <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>
                {label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[s.stepLine, i < step && s.stepLineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── STEP 0: Select Items ─────────────────────────────────── */}
        {step === 0 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>What do you want to recycle?</Text>
            <Text style={s.stepSub}>Select all categories that apply</Text>

            <View style={s.itemsGrid}>
              {WASTE_TYPES.map((type) => {
                const isSelected = selectedItems.some(
                  (i) => i.category === type.id,
                );
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[s.itemTile, isSelected && s.itemTileSelected]}
                    onPress={() => toggleItem(type)}
                  >
                    <Text style={s.itemTileIcon}>{type.icon}</Text>
                    <Text
                      style={[
                        s.itemTileLabel,
                        isSelected && s.itemTileLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                    {isSelected && (
                      <View style={s.itemTileCheck}>
                        <Text style={s.itemTileCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom item input */}
            <View style={s.customRow}>
              <TextInput
                style={s.customInput}
                placeholder="Add custom item (e.g. Old sofa)..."
                placeholderTextColor="#7f8c8d"
                value={customItem}
                onChangeText={setCustomItem}
                onSubmitEditing={addCustomItem}
              />
              <TouchableOpacity style={s.customAddBtn} onPress={addCustomItem}>
                <Text style={s.customAddText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Selected items list */}
            {selectedItems.length > 0 && (
              <View style={s.selectedList}>
                <Text style={s.selectedTitle}>
                  Selected Items ({selectedItems.length})
                </Text>
                {selectedItems.map((item, i) => (
                  <View key={i} style={s.selectedItem}>
                    <Text style={s.selectedItemText}>
                      {WASTE_TYPES.find((t) => t.id === item.category)?.icon ||
                        "📦"}{" "}
                      {item.label}
                    </Text>
                    <TouchableOpacity onPress={() => removeItem(i)}>
                      <Text style={s.removeItem}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── STEP 1: Address ──────────────────────────────────────── */}
        {step === 1 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Pickup Address</Text>
            <Text style={s.stepSub}>Where should we collect from?</Text>

            {[
              {
                key: "street",
                label: "Street / House No. *",
                placeholder: "e.g. 12-3, Main Road, Near Temple",
              },
              { key: "city", label: "City *", placeholder: "e.g. Narasapur" },
              {
                key: "pincode",
                label: "Pincode *",
                placeholder: "e.g. 534275",
                keyboardType: "numeric",
              },
              {
                key: "landmark",
                label: "Landmark (optional)",
                placeholder: "e.g. Near SBI Bank",
              },
            ].map((field) => (
              <View key={field.key} style={s.fieldBox}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder={field.placeholder}
                  placeholderTextColor="#7f8c8d"
                  value={address[field.key]}
                  onChangeText={(val) =>
                    setAddress((prev) => ({ ...prev, [field.key]: val }))
                  }
                  keyboardType={field.keyboardType || "default"}
                />
              </View>
            ))}
          </View>
        )}

        {/* ── STEP 2: Date & Time ───────────────────────────────────── */}
        {step === 2 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Choose Date & Time</Text>
            <Text style={s.stepSub}>Select when we should collect</Text>

            <Text style={s.fieldLabel}>Select Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.daysScroll}
              contentContainerStyle={{ gap: 8 }}
            >
              {days.map((d) => (
                <TouchableOpacity
                  key={d.date}
                  style={[
                    s.dayCard,
                    selectedDate === d.date && s.dayCardSelected,
                  ]}
                  onPress={() => setSelectedDate(d.date)}
                >
                  <Text
                    style={[
                      s.dayName,
                      selectedDate === d.date && s.dayTextSelected,
                    ]}
                  >
                    {d.day}
                  </Text>
                  <Text
                    style={[
                      s.dayNum,
                      selectedDate === d.date && s.dayTextSelected,
                    ]}
                  >
                    {d.num}
                  </Text>
                  <Text
                    style={[
                      s.dayMonth,
                      selectedDate === d.date && s.dayTextSelected,
                    ]}
                  >
                    {d.month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.fieldLabel, { marginTop: 20 }]}>
              Select Time Slot
            </Text>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  s.slotCard,
                  selectedSlot === slot.id && s.slotCardSelected,
                ]}
                onPress={() => setSelectedSlot(slot.id)}
              >
                <Text style={s.slotIcon}>{slot.icon}</Text>
                <View style={s.slotInfo}>
                  <Text
                    style={[
                      s.slotLabel,
                      selectedSlot === slot.id && s.slotLabelSelected,
                    ]}
                  >
                    {slot.label}
                  </Text>
                  <Text style={s.slotTime}>{slot.time}</Text>
                </View>
                {selectedSlot === slot.id && <Text style={s.slotCheck}>✓</Text>}
              </TouchableOpacity>
            ))}

            <View style={s.fieldBox}>
              <Text style={s.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]}
                placeholder="Any special instructions..."
                placeholderTextColor="#7f8c8d"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </View>
        )}

        {/* ── STEP 3: Confirm ───────────────────────────────────────── */}
        {step === 3 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Confirm Pickup</Text>
            <Text style={s.stepSub}>Review details before submitting</Text>

            {[
              {
                label: "Items",
                value: selectedItems.map((i) => i.label).join(", "),
              },
              {
                label: "Address",
                value: `${address.street}, ${address.city} - ${address.pincode}${address.landmark ? ` (${address.landmark})` : ""}`,
              },
              {
                label: "Date",
                value: new Date(selectedDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              },
              {
                label: "Time",
                value: TIME_SLOTS.find((t) => t.id === selectedSlot)?.time,
              },
              preselectedCenter && {
                label: "Collector",
                value: preselectedCenter.name,
              },
            ]
              .filter(Boolean)
              .map((row, i) => (
                <View key={i} style={s.confirmRow}>
                  <Text style={s.confirmLabel}>{row.label}</Text>
                  <Text style={s.confirmValue}>{row.value}</Text>
                </View>
              ))}

            <View style={s.rewardBox}>
              <Text style={s.rewardIcon}>⭐</Text>
              <View>
                <Text style={s.rewardTitle}>You'll earn +30 Eco Points</Text>
                <Text style={s.rewardSub}>
                  Awarded immediately on submission
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>🚛 Confirm Pickup Request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom next button */}
      {step < 3 && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
            onPress={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            <Text style={s.nextBtnText}>
              {step === 2 ? "Review →" : "Next →"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0f1e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a2744",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: "#fff", fontSize: 18 },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },
  pointsHint: {
    backgroundColor: "#f59e0b22",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  pointsHintText: { color: "#f59e0b", fontWeight: "700", fontSize: 12 },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stepItem: { alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1a2744",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#2a3a5c",
  },
  stepDotActive: { borderColor: "#27ae60", backgroundColor: "#1e3a2f" },
  stepDotDone: { backgroundColor: "#27ae60", borderColor: "#27ae60" },
  stepDotText: { color: "#7f8c8d", fontSize: 12, fontWeight: "700" },
  stepDotTextActive: { color: "#27ae60" },
  stepLabel: { color: "#7f8c8d", fontSize: 10, marginTop: 4 },
  stepLabelActive: { color: "#27ae60" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#1a2744",
    marginBottom: 16,
  },
  stepLineDone: { backgroundColor: "#27ae60" },

  scroll: { flex: 1 },
  stepContent: { paddingHorizontal: 16 },
  stepTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  stepSub: { color: "#7f8c8d", fontSize: 14, marginBottom: 20 },

  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  itemTile: {
    width: (SW - 52) / 4,
    aspectRatio: 1,
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#1a2744",
  },
  itemTileSelected: { borderColor: "#27ae60", backgroundColor: "#1e3a2f" },
  itemTileIcon: { fontSize: 26, marginBottom: 4 },
  itemTileLabel: { color: "#7f8c8d", fontSize: 10, fontWeight: "600" },
  itemTileLabelSelected: { color: "#27ae60" },
  itemTileCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#27ae60",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTileCheckText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  customRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  customInput: {
    flex: 1,
    backgroundColor: "#0d1b2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#1a2744",
  },
  customAddBtn: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customAddText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  selectedList: {
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  selectedTitle: {
    color: "#27ae60",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  selectedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  selectedItemText: { color: "#cdd9e5", fontSize: 14 },
  removeItem: { color: "#ef4444", fontSize: 16 },

  fieldBox: { marginBottom: 14 },
  fieldLabel: {
    color: "#cdd9e5",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: "#0d1b2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#1a2744",
  },

  daysScroll: { marginBottom: 4 },
  dayCard: {
    width: 60,
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1a2744",
  },
  dayCardSelected: { borderColor: "#27ae60", backgroundColor: "#1e3a2f" },
  dayName: { color: "#7f8c8d", fontSize: 11, fontWeight: "600" },
  dayNum: { color: "#fff", fontSize: 20, fontWeight: "700", marginVertical: 2 },
  dayMonth: { color: "#7f8c8d", fontSize: 11 },
  dayTextSelected: { color: "#27ae60" },

  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1b2e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#1a2744",
    gap: 12,
  },
  slotCardSelected: { borderColor: "#27ae60", backgroundColor: "#1e3a2f" },
  slotIcon: { fontSize: 24 },
  slotInfo: { flex: 1 },
  slotLabel: { color: "#cdd9e5", fontSize: 15, fontWeight: "600" },
  slotLabelSelected: { color: "#27ae60" },
  slotTime: { color: "#7f8c8d", fontSize: 12, marginTop: 2 },
  slotCheck: { color: "#27ae60", fontSize: 18, fontWeight: "700" },

  confirmRow: {
    backgroundColor: "#0d1b2e",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    gap: 12,
  },
  confirmLabel: { color: "#7f8c8d", fontSize: 13, width: 70 },
  confirmValue: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "600" },
  rewardBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b22",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f59e0b44",
    gap: 12,
  },
  rewardIcon: { fontSize: 28 },
  rewardTitle: { color: "#f59e0b", fontSize: 15, fontWeight: "700" },
  rewardSub: { color: "#7f8c8d", fontSize: 12, marginTop: 2 },

  submitBtn: {
    backgroundColor: "#27ae60",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#1a2744" },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "#0a0f1e",
  },
  nextBtn: {
    backgroundColor: "#27ae60",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  nextBtnDisabled: { backgroundColor: "#1a2744" },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0a0f1e",
  },
  successEmoji: { fontSize: 72, marginBottom: 16 },
  successTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  successSub: { color: "#7f8c8d", fontSize: 15, marginBottom: 24 },
  successCard: {
    width: "100%",
    backgroundColor: "#0d1b2e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  successRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2744",
  },
  successLabel: { color: "#7f8c8d", fontSize: 14 },
  successValue: { color: "#fff", fontSize: 14, fontWeight: "600" },
  pointsEarned: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b22",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f59e0b",
    gap: 10,
  },
  pointsEarnedIcon: { fontSize: 24 },
  pointsEarnedText: { color: "#f59e0b", fontSize: 16, fontWeight: "700" },
  successNote: {
    color: "#7f8c8d",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: "#27ae60",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 10,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  viewBtn: { paddingVertical: 10 },
  viewBtnText: { color: "#27ae60", fontSize: 14, fontWeight: "600" },
});
