// src/components/Schedule/ScheduleModal.js - React Native (Enhanced with CalendarPicker + TimeSlotPicker)
//
// Replaces: react-leaflet + OpenStreetMapProvider + framer-motion
// With:     react-native-maps + expo-location + Animated + DateTimePicker (for map only)
//
// Install:  expo install react-native-maps expo-location

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { scheduleAPI } from "../services/api";
import Toast from "react-native-toast-message";
import CalendarPicker from "./CalendarPicker";
import TimeSlotPicker from "./TimeSlotPicker";

const STEPS = [
  { id: 1, label: "Date & Time" },
  { id: 2, label: "Location" },
  { id: 3, label: "Review" },
];

const reverseGeocode = async (lat, lng) => {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const d = await r.json();
    return d.display_name || "Selected location";
  } catch { return "Selected location"; }
};

const searchAddress = async (query) => {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
    const d = await r.json();
    return d.map(item => ({ label: item.display_name, lat: parseFloat(item.lat), lng: parseFloat(item.lon) }));
  } catch { return []; }
};

const pad = (n) => String(n).padStart(2, "0");
const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const ScheduleModal = ({ isOpen, onClose, listing, recipientId, onScheduleCreated }) => {
  const [step,          setStep]          = useState(1);
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [selectedTime,  setSelectedTime]  = useState(null);
  const [address,       setAddress]       = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [coordinates,   setCoordinates]   = useState(null); // { latitude, longitude }
  const [notes,         setNotes]         = useState("");
  const [isRecurring,   setIsRecurring]   = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("weekly");
  const [submitting,    setSubmitting]    = useState(false);

  const mapRef    = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const defaultCoords = listing?.location?.coordinates
    ? { latitude: listing.location.coordinates[1], longitude: listing.location.coordinates[0] }
    : { latitude: 20.5937, longitude: 78.9629 };

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setStep(1); setSelectedDate(null); setSelectedTime(null);
      setAddress(""); setCoordinates(null); setNotes(""); setIsRecurring(false);
    } else {
      scaleAnim.setValue(0.9); fadeAnim.setValue(0);
    }
  }, [isOpen]);

  const handleAddressSearch = useCallback(async (q) => {
    if (q.length < 3) { setSearchResults([]); return; }
    const results = await searchAddress(q);
    setSearchResults(results.slice(0, 5));
  }, []);

  const handleSelectResult = (result) => {
    const coords = { latitude: result.lat, longitude: result.lng };
    setAddress(result.label); setCoordinates(coords); setSearchResults([]);
    setSearchQuery(result.label.split(",")[0]);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoordinates({ latitude, longitude });
    const addr = await reverseGeocode(latitude, longitude);
    setAddress(addr);
  };

  const handleCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { Toast.show({ type: "error", text1: "Location permission required" }); return; }
    const loc    = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setCoordinates(coords);
    const addr = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    setAddress(addr);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    Toast.show({ type: "success", text1: "Current location set!" });
  };

  const canProceed = () => {
    if (step === 1) return !!selectedDate && !!selectedTime;
    if (step === 2) return !!address && !!coordinates;
    return true;
  };

  const formatDateTime = () => {
    if (!selectedDate || !selectedTime) return "";
    const d    = new Date(selectedDate);
    const [h, m] = selectedTime.split(":").map(Number);
    const h12  = h % 12 || 12;
    const period = h < 12 ? "AM" : "PM";
    return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${h12}:${pad(m)} ${period}`;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !coordinates) {
      Toast.show({ type: "error", text1: "Please fill in all required fields" }); return;
    }
    setSubmitting(true);
    try {
      const response = await scheduleAPI.proposeSchedule(listing._id, {
        recipientId,
        date:            formatDate(selectedDate),
        time:            selectedTime,
        pickupLocation:  { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] },
        pickupAddress:   address,
        donorNotes:      notes,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFreq : null,
      });
      Toast.show({ type: "success", text1: "Pickup scheduled successfully! 📅" });
      onScheduleCreated?.(response.schedule);
      onClose();
    } catch (err) {
      Toast.show({ type: "error", text1: err.response?.data?.message || "Failed to create schedule" });
    } finally { setSubmitting(false); }
  };

  const RECURRING_OPTIONS = ["daily", "weekly", "biweekly", "monthly"];

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "center", padding: 16 }}>
          <Animated.View style={[styles.modal, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>📅 Schedule Pickup</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Steps indicator */}
              <View style={styles.stepsRow}>
                {STEPS.map(s => (
                  <View key={s.id} style={[styles.step, step === s.id && styles.stepActive, step > s.id && styles.stepDone]}>
                    <Text style={[styles.stepNum, (step === s.id || step > s.id) && styles.stepNumActive]}>
                      {step > s.id ? "✓" : s.id}
                    </Text>
                    <Text style={[styles.stepLabel, step === s.id && styles.stepLabelActive]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                {/* STEP 1: Date + Time */}
                {step === 1 && (
                  <View style={styles.stepContent}>
                    <CalendarPicker selectedDate={selectedDate} onDateSelect={setSelectedDate} minDate={new Date()} />
                    <View style={{ height: 14 }} />
                    <TimeSlotPicker selectedTime={selectedTime} onTimeSelect={setSelectedTime} date={selectedDate} />
                  </View>
                )}

                {/* STEP 2: Location */}
                {step === 2 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.sectionTitle}>📍 Pickup Location</Text>

                    {/* Search */}
                    <View style={styles.searchRow}>
                      <TextInput style={styles.searchInput} placeholder="Search address..."
                        placeholderTextColor="#64748b" value={searchQuery}
                        onChangeText={q => { setSearchQuery(q); handleAddressSearch(q); }}
                        returnKeyType="search" />
                    </View>
                    {searchResults.length > 0 && (
                      <View style={styles.resultsBox}>
                        {searchResults.map((r, i) => (
                          <TouchableOpacity key={i} style={styles.resultItem} onPress={() => handleSelectResult(r)} activeOpacity={0.8}>
                            <Text style={styles.resultText} numberOfLines={2}>{r.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity style={styles.gpsBtn} onPress={handleCurrentLocation} activeOpacity={0.85}>
                      <Text style={styles.gpsBtnText}>📍 Use My Current Location</Text>
                    </TouchableOpacity>

                    {/* Map */}
                    <View style={styles.mapWrapper}>
                      <MapView ref={mapRef} style={StyleSheet.absoluteFillObject}
                        initialRegion={{ ...defaultCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                        onPress={handleMapPress}>
                        {coordinates && <Marker coordinate={coordinates} />}
                      </MapView>
                    </View>

                    {address ? (
                      <View style={styles.selectedAddr}>
                        <Text style={styles.selectedAddrText} numberOfLines={2}>{address}</Text>
                      </View>
                    ) : null}

                    {/* Notes */}
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>📝 Notes for Recipient</Text>
                    <TextInput style={styles.textarea} value={notes} onChangeText={setNotes}
                      placeholder="Any special instructions?" placeholderTextColor="#64748b"
                      multiline numberOfLines={3} maxLength={500} textAlignVertical="top" />

                    {/* Recurring */}
                    <View style={styles.recurringBox}>
                      <TouchableOpacity style={styles.checkRow} onPress={() => setIsRecurring(v => !v)} activeOpacity={0.8}>
                        <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
                          {isRecurring && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                        </View>
                        <Text style={styles.checkLabel}>🔄 Make this a recurring pickup</Text>
                      </TouchableOpacity>
                      {isRecurring && (
                        <View style={styles.freqRow}>
                          {RECURRING_OPTIONS.map(opt => (
                            <TouchableOpacity key={opt} style={[styles.freqChip, recurringFreq === opt && styles.freqChipActive]}
                              onPress={() => setRecurringFreq(opt)} activeOpacity={0.8}>
                              <Text style={[styles.freqChipText, recurringFreq === opt && styles.freqChipTextActive]}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* STEP 3: Review */}
                {step === 3 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.sectionTitle}>📋 Schedule Summary</Text>
                    {[
                      { icon: "📦", label: "Item",       value: listing?.title || "N/A" },
                      { icon: "📅", label: "Date & Time", value: formatDateTime() },
                      { icon: "📍", label: "Location",    value: address || "Not set" },
                      isRecurring ? { icon: "🔄", label: "Recurring", value: recurringFreq } : null,
                    ].filter(Boolean).map((item, i) => (
                      <View key={i} style={styles.summaryItem}>
                        <Text style={styles.summaryIcon}>{item.icon}</Text>
                        <Text style={styles.summaryLabel}>{item.label}</Text>
                        <Text style={styles.summaryValue} numberOfLines={2}>{item.value}</Text>
                      </View>
                    ))}
                    {notes ? (
                      <View style={[styles.summaryItem, { flexDirection: "column", gap: 4 }]}>
                        <Text style={styles.summaryLabel}>📝 Notes</Text>
                        <Text style={styles.summaryValue}>{notes}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                {step > 1
                  ? <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setStep(s => s - 1)} activeOpacity={0.85}>
                      <Text style={styles.btnSecondaryText}>← Back</Text>
                    </TouchableOpacity>
                  : <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onClose} activeOpacity={0.85}>
                      <Text style={styles.btnSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                }
                {step < 3
                  ? <TouchableOpacity style={[styles.btn, styles.btnPrimary, !canProceed() && styles.btnDisabled]}
                      onPress={() => setStep(s => s + 1)} disabled={!canProceed()} activeOpacity={0.85}>
                      <Text style={styles.btnPrimaryText}>Next →</Text>
                    </TouchableOpacity>
                  : <TouchableOpacity style={[styles.btn, styles.btnPrimary, submitting && styles.btnDisabled]}
                      onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
                      {submitting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.btnPrimaryText}>Confirm Schedule ✓</Text>
                      }
                    </TouchableOpacity>
                }
              </View>

            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center" },
  modal:   { backgroundColor: "#131c2e", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#1e2d45", maxHeight: "95%" },
  header:  { backgroundColor: "#667eea", paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeBtn:    { width: 32, height: 32, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  closeBtnText:{ color: "#fff", fontSize: 14, fontWeight: "700" },
  stepsRow:    { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e2d45" },
  step:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#1e2d45" },
  stepActive:  { backgroundColor: "#667eea" },
  stepDone:    { backgroundColor: "rgba(74,222,128,0.15)" },
  stepNum:     { width: 22, height: 22, borderRadius: 11, backgroundColor: "#334155", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 11, fontWeight: "700", textAlign: "center", lineHeight: 22 },
  stepNumActive: { color: "#fff" },
  stepLabel:   { color: "#64748b", fontSize: 12, fontWeight: "600" },
  stepLabelActive: { color: "#fff" },
  body:        { padding: 16 },
  stepContent: { gap: 4 },
  sectionTitle:{ color: "#f1f5f9", fontWeight: "700", fontSize: 14, marginBottom: 10 },
  searchRow:   { flexDirection: "row", gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: "#1e2d45", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#f1f5f9", fontSize: 13, borderWidth: 1, borderColor: "#334155" },
  resultsBox:  { backgroundColor: "#1e2d45", borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
  resultItem:  { padding: 12, borderBottomWidth: 1, borderBottomColor: "#334155" },
  resultText:  { color: "#f1f5f9", fontSize: 12 },
  gpsBtn:      { borderWidth: 1, borderColor: "#4ade80", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start", marginBottom: 10 },
  gpsBtnText:  { color: "#4ade80", fontWeight: "700", fontSize: 13 },
  mapWrapper:  { height: 220, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#334155", marginBottom: 10 },
  selectedAddr:{ backgroundColor: "#1e2d45", borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  selectedAddrText: { color: "#94a3b8", fontSize: 12 },
  textarea:    { backgroundColor: "#1e2d45", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#f1f5f9", fontSize: 13, minHeight: 80, borderWidth: 1, borderColor: "#334155" },
  recurringBox:{ backgroundColor: "#1e2d45", borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "#334155" },
  checkRow:    { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox:    { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#667eea", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#667eea" },
  checkLabel:  { color: "#f1f5f9", fontWeight: "600", fontSize: 13 },
  freqRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  freqChip:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#131c2e", borderWidth: 1, borderColor: "#334155" },
  freqChipActive: { backgroundColor: "#667eea", borderColor: "#667eea" },
  freqChipText:   { color: "#94a3b8", fontWeight: "600", fontSize: 12 },
  freqChipTextActive: { color: "#fff" },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e2d45" },
  summaryIcon: { fontSize: 18 },
  summaryLabel:{ color: "#94a3b8", fontSize: 13, flex: 1 },
  summaryValue:{ color: "#f1f5f9", fontWeight: "600", fontSize: 13, flex: 2, textAlign: "right", textTransform: "capitalize" },
  footer:      { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#1e2d45" },
  btn:         { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },
  btnSecondary:    { backgroundColor: "#1e2d45", borderWidth: 1, borderColor: "#334155" },
  btnSecondaryText:{ color: "#94a3b8", fontWeight: "700", fontSize: 14 },
  btnPrimary:      { backgroundColor: "#667eea" },
  btnPrimaryText:  { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default ScheduleModal;