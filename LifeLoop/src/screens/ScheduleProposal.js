// src/screens/ScheduleProposal.js
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
import { scheduleAPI, listingsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";

const { width: SW } = Dimensions.get("window");

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

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    days.push({
      id: date.toISOString().split("T")[0], // YYYY-MM-DD format
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekDays[date.getDay()],
      fullDate: `${months[date.getMonth()]}`,
      date: date,
    });
  }
  return days;
};

export default function ScheduleProposal() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { listingId } = route.params || {};

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [donorNotes, setDonorNotes] = useState("");

  const availableDays = getNextDays();

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getById(listingId);
      setListing(response.data.listing);

      // Pre-fill pickup location with donor's location if available
      if (response.data.listing.donor?.location) {
        setPickupLocation(response.data.listing.donor.location);
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load listing details",
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert(
        "Missing Information",
        "Please select both date and time for pickup.",
      );
      return;
    }

    if (!pickupLocation.trim()) {
      Alert.alert("Missing Information", "Please specify a pickup location.");
      return;
    }

    try {
      setSubmitting(true);

      const scheduleData = {
        recipientId: listing.assignedTo._id,
        date: selectedDate,
        time: selectedTime,
        pickupLocation: pickupLocation.trim(),
        pickupAddress: pickupAddress.trim() || pickupLocation.trim(),
        donorNotes: donorNotes.trim(),
      };

      await scheduleAPI.proposeSchedule(listingId, scheduleData);

      Toast.show({
        type: "success",
        text1: "Schedule Proposed!",
        text2: "Waiting for recipient to confirm the pickup time.",
      });

      // Navigate back to listing details
      navigation.goBack();
    } catch (error) {
      console.error("Error proposing schedule:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to propose schedule";
      Toast.show({
        type: "error",
        text1: "Error",
        text2: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loadingText}>Loading listing details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Listing not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📅 Propose Pickup Schedule</Text>
          <Text style={styles.subtitle}>
            Suggest a time for{" "}
            <Text style={styles.highlight}>
              {listing.assignedTo?.firstName} {listing.assignedTo?.lastName}
            </Text>{" "}
            to pick up your donation
          </Text>
        </View>

        {/* Listing Info */}
        <View style={styles.listingCard}>
          <Text style={styles.listingTitle}>{listing.title}</Text>
          <Text style={styles.listingCategory}>{listing.category}</Text>
          <Text style={styles.listingLocation}>📍 {listing.location}</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Select Date</Text>
          <View style={styles.dateGrid}>
            {availableDays.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dateBtn,
                  selectedDate === day.id && styles.dateBtnSelected,
                ]}
                onPress={() => setSelectedDate(day.id)}
              >
                <Text
                  style={[
                    styles.dateBtnText,
                    selectedDate === day.id && styles.dateBtnTextSelected,
                  ]}
                >
                  {day.label}
                </Text>
                <Text
                  style={[
                    styles.dateBtnSubtext,
                    selectedDate === day.id && styles.dateBtnSubtextSelected,
                  ]}
                >
                  {day.fullDate}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Select Time Slot</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.timeBtn,
                  selectedTime === slot.id && styles.timeBtnSelected,
                ]}
                onPress={() => setSelectedTime(slot.id)}
              >
                <Text style={styles.timeIcon}>{slot.icon}</Text>
                <Text
                  style={[
                    styles.timeBtnText,
                    selectedTime === slot.id && styles.timeBtnTextSelected,
                  ]}
                >
                  {slot.label}
                </Text>
                <Text
                  style={[
                    styles.timeBtnSubtext,
                    selectedTime === slot.id && styles.timeBtnSubtextSelected,
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Pickup Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Front door, Lobby, Parking lot"
            value={pickupLocation}
            onChangeText={setPickupLocation}
            maxLength={100}
          />
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            placeholder="Full address (optional)"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            maxLength={200}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📝 Additional Notes (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any special instructions or notes for the recipient..."
            value={donorNotes}
            onChangeText={setDonorNotes}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!selectedDate || !selectedTime || !pickupLocation.trim()) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              submitting ||
              !selectedDate ||
              !selectedTime ||
              !pickupLocation.trim()
            }
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                📅 Send Schedule Proposal
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: "#166534",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    lineHeight: 22,
  },
  highlight: {
    color: "#4ade80",
    fontWeight: "600",
  },
  listingCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 14,
    color: "#60a5fa",
    marginBottom: 4,
  },
  listingLocation: {
    fontSize: 14,
    color: "#94a3b8",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 16,
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dateBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    minWidth: (SW - 40 - 24) / 3.5, // 3.5 buttons per row
    borderWidth: 1,
    borderColor: "#334155",
  },
  dateBtnSelected: {
    backgroundColor: "#166534",
    borderColor: "#4ade80",
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  dateBtnTextSelected: {
    color: "#f8fafc",
  },
  dateBtnSubtext: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  dateBtnSubtextSelected: {
    color: "#d1fae5",
  },
  timeGrid: {
    gap: 12,
  },
  timeBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  timeBtnSelected: {
    backgroundColor: "#166534",
    borderColor: "#4ade80",
  },
  timeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  timeBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f8fafc",
    flex: 1,
  },
  timeBtnTextSelected: {
    color: "#f8fafc",
  },
  timeBtnSubtext: {
    fontSize: 14,
    color: "#94a3b8",
  },
  timeBtnSubtextSelected: {
    color: "#d1fae5",
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#334155",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  submitSection: {
    marginTop: 12,
    marginBottom: 40,
    alignItems: "center",
  },
  submitBtn: {
    backgroundColor: "#166534",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    maxWidth: 400,
  },
  submitBtnDisabled: {
    backgroundColor: "#374151",
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef4444",
    width: "100%",
    maxWidth: 400,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
});
