// src/screens/CreateListing.js - React Native | Full Build
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { listingsAPI } from "../services/api";
import configAPI from "../services/configAPI";
import { useAuth } from "../context/AuthContext";
import Toast from "react-native-toast-message";
import { uploadPrimaryImage } from "../utils/imageUpload";
import CalendarPicker from "../components/CalendarPicker";

const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────
// No more hardcoded constants - fetched from API
// ─────────────────────────────────────────

// Micro-components
// ─────────────────────────────────────────

// Progress steps header - REMOVED (unused feature)

// Field label
const FieldLabel = ({ text, required }) => (
  <Text style={s.label}>
    {text}
    {required && <Text style={s.labelRequired}> *</Text>}
  </Text>
);

// Styled text input
const Field = ({ label, required, multiline, ...props }) => {
  const border = useRef(new Animated.Value(0)).current;
  const onFocus = () =>
    Animated.timing(border, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  const onBlur = () =>
    Animated.timing(border, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  const borderColor = border.interpolate({
    inputRange: [0, 1],
    outputRange: ["#1e2d45", "#4ade80"],
  });

  return (
    <View style={s.fieldWrap}>
      {label && <FieldLabel text={label} required={required} />}
      <Animated.View
        style={[s.inputBox, { borderColor }, multiline && s.inputBoxMulti]}
      >
        <TextInput
          style={[s.input, multiline && s.inputMulti]}
          placeholderTextColor="#3d5068"
          onFocus={onFocus}
          onBlur={onBlur}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          {...props}
        />
      </Animated.View>
    </View>
  );
};

// Category selector (horizontal chips)
const CategorySelector = ({ value, onChange, categories = [] }) => (
  <View style={s.fieldWrap}>
    <FieldLabel text="Category" required />
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.chipsRow}
    >
      {categories.map((c) => (
        <TouchableOpacity
          key={c.value}
          style={[s.chip, value === c.value && s.chipActive]}
          onPress={() => onChange(c.value)}
          activeOpacity={0.8}
        >
          <Text style={[s.chipText, value === c.value && s.chipTextActive]}>
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Unit selector (horizontal chips, compact)
const UnitSelector = ({ value, onChange, units = [] }) => (
  <View style={[s.fieldWrap, { flex: 1 }]}>
    <FieldLabel text="Unit" />
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.chipsRow}
    >
      {units.map((u) => (
        <TouchableOpacity
          key={u.value}
          style={[s.chip, s.chipSm, value === u.value && s.chipActive]}
          onPress={() => onChange(u.value)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              s.chipText,
              s.chipTextSm,
              value === u.value && s.chipTextActive,
            ]}
          >
            {u.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Image grid with add button
const ImageGrid = ({ images, onAdd, onRemove }) => (
  <View style={s.fieldWrap}>
    <FieldLabel text="Photos" />
    <Text style={s.imageHint}>Up to 5 photos · tap to remove</Text>
    <View style={s.imageGrid}>
      {images.map((img, i) => (
        <TouchableOpacity
          key={i}
          style={s.imageItem}
          onPress={() => onRemove(i)}
          activeOpacity={0.85}
        >
          <Image source={{ uri: img.uri }} style={s.imageThumb} />
          <View style={s.imageRemoveOverlay}>
            <Text style={s.imageRemoveIcon}>✕</Text>
          </View>
        </TouchableOpacity>
      ))}
      {images.length < 5 && (
        <TouchableOpacity
          style={s.imageAddBtn}
          onPress={onAdd}
          activeOpacity={0.8}
        >
          <Text style={s.imageAddIcon}>📷</Text>
          <Text style={s.imageAddText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Bulk item row
const BulkRow = ({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
  categories = [],
}) => (
  <View style={s.bulkRow}>
    <View style={s.bulkRowTop}>
      <View style={s.bulkIndexBadge}>
        <Text style={s.bulkIndexText}>{index + 1}</Text>
      </View>
      <TextInput
        style={s.bulkTitleInput}
        value={item.title}
        onChangeText={(v) => onChange(index, "title", v)}
        placeholder="Item name"
        placeholderTextColor="#3d5068"
      />
      {canRemove && (
        <TouchableOpacity
          style={s.bulkRemoveBtn}
          onPress={() => onRemove(index)}
        >
          <Text style={s.bulkRemoveIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
    <TextInput
      style={s.bulkDescInput}
      value={item.description}
      onChangeText={(v) => onChange(index, "description", v)}
      placeholder="Brief description"
      placeholderTextColor="#3d5068"
      multiline
      numberOfLines={2}
    />
    <View style={s.bulkRowBottom}>
      <TextInput
        style={s.bulkQtyInput}
        value={item.quantity}
        onChangeText={(v) => onChange(index, "quantity", v)}
        placeholder="Qty"
        placeholderTextColor="#3d5068"
        keyboardType="numeric"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {categories.slice(0, 6).map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[s.bulkChip, item.category === c.value && s.bulkChipActive]}
            onPress={() => onChange(index, "category", c.value)}
          >
            <Text
              style={[
                s.bulkChipText,
                item.category === c.value && s.bulkChipTextActive,
              ]}
            >
              {c.label.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </View>
);

// Success animation overlay
const SuccessOverlay = ({ visible, count, onDone }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[s.successOverlay, { opacity: fadeAnim }]}>
      <Animated.View
        style={[s.successCard, { transform: [{ scale: scaleAnim }] }]}
      >
        <Text style={s.successEmoji}>🎉</Text>
        <Text style={s.successTitle}>
          {count > 1 ? `${count} listings created!` : "Listing created!"}
        </Text>
        <Text style={s.successSub}>Your items are now live on LifeLoop</Text>
        <TouchableOpacity style={s.successBtn} onPress={onDone}>
          <Text style={s.successBtnText}>Continue →</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────
const CreateListing = ({ route }) => {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Check if we're editing
  const isEditing = route?.params?.id;
  const editingId = route?.params?.id;

  // Mode
  const [bulkMode, setBulkMode] = useState(false);

  // Config data (fetched from API)
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Single listing form
  const [form, setForm] = useState({
    title: "",
    description: "",
    quantity: "",
    unit: "",
    expiryDate: "",
    pickupLocation: "",
    additionalNotes: "",
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [enableAIMatch, setEnableAIMatch] = useState(false); // AI auto-match toggle

  // Bulk mode
  const [bulkItems, setBulkItems] = useState([
    {
      title: "",
      description: "",
      quantity: "",
      category: "",
    },
  ]);
  const [commonLocation, setCommonLocation] = useState("");
  const [commonExpiry, setCommonExpiry] = useState("");
  const [commonNotes, setCommonNotes] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);

  // Calendar picker states
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState("single"); // "single" or "bulk"

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const modeAnim = useRef(new Animated.Value(0)).current;

  // Load config from API
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const config = await configAPI.getAllConfig();
        setUnits(config.units || []);
        setCategories(config.categories || []);

        // Load listing data if editing
        if (editingId && !configLoading) {
          await loadListingForEdit();
        }
      } catch (error) {
        console.error("Failed to load config:", error);
        Toast.show({
          type: "error",
          text1: "Could not load app data",
          text2: "Check your internet connection",
        });
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, [editingId]);

  // Define INITIAL_FORM and INITIAL_BULK_ITEM after config is loaded
  const getDefaultUnit = () => units[0]?.value || "items";
  const getDefaultCategory = () => categories[0]?.value || "produce";

  const INITIAL_FORM = {
    title: "",
    description: "",
    quantity: "",
    unit: getDefaultUnit(),
    expiryDate: "",
    pickupLocation: "",
    additionalNotes: "",
  };

  const INITIAL_BULK_ITEM = {
    title: "",
    description: "",
    quantity: "",
    category: getDefaultCategory(),
  };

  const loadListingForEdit = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getById(editingId);
      const listing = response.data?.listing || response.data;

      if (listing) {
        setForm({
          title: listing.title || "",
          description: listing.description || "",
          category: listing.category || "produce",
          quantity: listing.quantity?.toString() || "",
          unit: listing.unit || "items",
          expiryDate: listing.expiryDate
            ? new Date(listing.expiryDate).toISOString().split("T")[0]
            : "",
          pickupLocation: listing.pickupLocation || "",
          additionalNotes: listing.additionalNotes || "",
        });

        // Set existing images
        if (listing.images && listing.images.length > 0) {
          setImages(listing.images.map((url) => ({ uri: url })));
        }
      }
    } catch (error) {
      console.error("Error loading listing for edit:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load listing for editing",
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ── Image picker ──
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({ type: "error", text1: "Photo access needed" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - images.length,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 5));
    }
  };

  const removeImage = (index) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  // ── Form helpers ──
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.quantity || form.quantity <= 0)
      e.quantity = "Enter a valid quantity";
    if (!form.pickupLocation.trim())
      e.pickupLocation = "Pickup location is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Single submit ──
  const handleSubmit = async () => {
    if (!validate()) {
      Toast.show({ type: "error", text1: "Please fill required fields" });
      return;
    }
    setLoading(true);
    try {
      // Upload images to Cloudinary first
      const imageUrls = [];
      if (images.length > 0) {
        console.log("📤 Uploading images to Cloudinary...");
        for (const img of images) {
          try {
            const url = await uploadPrimaryImage(img.uri);
            if (url) {
              imageUrls.push(url);
              console.log("✅ Image uploaded:", url);
            }
          } catch (imgErr) {
            console.warn(
              "⚠️ Single image upload failed (continuing anyway):",
              imgErr.message,
            );
            // Don't fail the entire listing if one image fails
          }
        }
        if (imageUrls.length === 0 && images.length > 0) {
          console.warn(
            "⚠️ All images failed to upload, but continuing with listing creation (no images)",
          );
        }
      }

      const formData = new FormData();

      // Append all form fields explicitly (not conditionally)
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("quantity", form.quantity);
      formData.append("unit", form.unit);
      formData.append("pickupLocation", form.pickupLocation);

      // Handle date formatting - convert to ISO8601 if provided
      if (form.expiryDate) {
        try {
          // Try to parse various date formats
          let dateObj;

          // If it's already ISO format (YYYY-MM-DD)
          if (form.expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateObj = new Date(form.expiryDate + "T00:00:00Z");
          }
          // If it's MM/DD/YY or MM/D/YY format
          else if (form.expiryDate.includes("/")) {
            const parts = form.expiryDate.split("/");
            if (parts.length === 3) {
              let month = parseInt(parts[0]);
              let day = parseInt(parts[1]);
              let year = parseInt(parts[2]);

              // Handle 2-digit year
              if (year < 100) {
                year = year + 2000;
              }

              dateObj = new Date(year, month - 1, day);
            }
          }

          if (dateObj && !isNaN(dateObj.getTime())) {
            const isoDate = dateObj.toISOString().split("T")[0];
            formData.append("expiryDate", isoDate);
            console.log(`📅 Date converted: ${form.expiryDate} → ${isoDate}`);
          }
        } catch (dateErr) {
          console.warn("⚠️ Date parsing failed:", dateErr.message);
          // Don't append invalid date
        }
      }

      if (isEditing) {
        // Update existing listing
        console.log("📝 Updating listing with form data...");
        await listingsAPI.update(editingId, formData);

        Toast.show({
          text1: "Listing updated successfully!",
        });
        navigation.goBack();
      } else {
        // Create new listing
        formData.append("donor", user._id);

        // Append uploaded image URLs
        imageUrls.forEach((url) => formData.append("imageUrls", url));

        console.log("📤 Creating listing with form data...");
        // Create listing
        const listingRes = await listingsAPI.create(formData);
        const listingId = listingRes.data._id;

        // Handle AI auto-match if enabled
        if (enableAIMatch) {
          try {
            const matchRes = await listingsAPI.autoAssignTopMatch(listingId);
            if (matchRes.data.topMatch) {
              Toast.show({
                type: "success",
                text1: "Listing created!",
                text2: `AI matched with ${matchRes.data.topMatch.fullName}`,
              });
              // Navigate to show assignment sent to receiver
              navigation.navigate("InterestedUsers", { listingId });
            } else {
              Toast.show({
                type: "info",
                text1: "Listing created",
                text2: "No AI matches found, item available to all",
              });
              setSuccess(true);
            }
          } catch (matchErr) {
            Toast.show({
              type: "warn",
              text1: "Listing created",
              text2: "AI matching failed, manual selection available",
            });
            setSuccess(true);
          }
        } else {
          setSuccess(true);
        }
      }
    } catch (err) {
      console.error("❌ Submit error:", err);
      console.error("❌ Response data:", err.response?.data);
      console.error("❌ Response status:", err.response?.status);

      // Extract detailed error messages
      const errorMsg =
        err.response?.data?.message || "Failed to create listing";
      const validationErrors = err.response?.data?.errors || [];
      const errorDetails =
        validationErrors.length > 0
          ? validationErrors.map((e) => e.msg || e.message).join(", ")
          : err.message;

      Toast.show({
        type: "error",
        text1: errorMsg,
        text2: errorDetails,
        duration: 5000,
      });
      console.log("📋 Full error details:", {
        statusCode: err.response?.status,
        message: errorMsg,
        validationErrors: validationErrors,
        body: err.response?.data,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Bulk submit ──
  const handleBulkSubmit = async () => {
    if (!commonLocation.trim()) {
      Toast.show({
        type: "error",
        text1: "Pickup location required for all items",
      });
      return;
    }
    const invalid = bulkItems.some((i) => !i.title.trim() || !i.quantity);
    if (invalid) {
      Toast.show({
        type: "error",
        text1: "Fill in all item names and quantities",
      });
      return;
    }
    setBulkLoading(true);
    try {
      const listingIds = [];

      // Helper function to convert date format
      const formatDateForBackend = (dateStr) => {
        if (!dateStr) return null;
        try {
          let dateObj;

          // If it's already ISO format (YYYY-MM-DD)
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateObj = new Date(dateStr + "T00:00:00Z");
          }
          // If it's MM/DD/YY or MM/D/YY format
          else if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              let month = parseInt(parts[0]);
              let day = parseInt(parts[1]);
              let year = parseInt(parts[2]);

              // Handle 2-digit year
              if (year < 100) {
                year = year + 2000;
              }

              dateObj = new Date(year, month - 1, day);
            }
          }

          if (dateObj && !isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split("T")[0];
          }
        } catch (e) {
          console.warn("Date parse error:", e);
        }
        return null;
      };

      // Create all listings with proper FormData for each
      const createdListings = await Promise.all(
        bulkItems.map((item) => {
          const formData = new FormData();
          formData.append("title", item.title);
          formData.append("description", item.description || "");
          formData.append("category", item.category || "produce");
          formData.append("quantity", item.quantity);
          formData.append("unit", item.unit || "items");
          formData.append("pickupLocation", commonLocation);
          formData.append("donor", user._id);

          // Convert and append expiry date if provided
          const formattedExpiry = formatDateForBackend(commonExpiry);
          if (formattedExpiry) {
            formData.append("expiryDate", formattedExpiry);
          }

          if (commonNotes) formData.append("additionalNotes", commonNotes);

          return listingsAPI.create(formData);
        }),
      );

      // Collect listing IDs
      createdListings.forEach((res) => {
        if (res.data?._id) listingIds.push(res.data._id);
      });

      // Handle AI auto-match if enabled
      if (enableAIMatch && listingIds.length > 0) {
        try {
          let matched = 0;
          for (const id of listingIds) {
            const matchRes = await listingsAPI.autoAssignTopMatch(id);
            if (matchRes.data.topMatch) matched++;
          }
          Toast.show({
            type: "success",
            text1: `Created ${listingIds.length} listings`,
            text2: `AI matched ${matched} items`,
          });
        } catch {
          Toast.show({
            type: "warn",
            text1: `Created ${listingIds.length} listings`,
            text2: "AI matching had some failures",
          });
        }
      }

      setBulkSuccess(true);
    } catch {
      Toast.show({ type: "error", text1: "Some items failed. Please retry." });
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Bulk item helpers ──
  const updateBulkItem = (i, key, val) => {
    setBulkItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  };
  const addBulkItem = () =>
    setBulkItems((p) => [...p, { ...INITIAL_BULK_ITEM }]);
  const removeBulkItem = (i) =>
    setBulkItems((p) => p.filter((_, idx) => idx !== i));

  const handleDone = () => navigation.replace("Main");

  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Header ── */}
        <Animated.View style={[s.header, { opacity: headerAnim }]}>
          <TouchableOpacity
            style={s.headerBack}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.headerBackText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>
              {bulkMode
                ? "Bulk Donation"
                : isEditing
                  ? "Edit Listing"
                  : "New Listing"}
            </Text>
            <Text style={s.headerSub}>
              {bulkMode
                ? "Add multiple items at once"
                : isEditing
                  ? "Update your listing details"
                  : "Share an item with your community"}
            </Text>
          </View>
          {/* Bulk toggle */}
          <View style={s.bulkToggleRow}>
            <Text style={s.bulkToggleLabel}>Bulk</Text>
            <Switch
              value={bulkMode}
              onValueChange={setBulkMode}
              trackColor={{ false: "#1e2d45", true: "#166534" }}
              thumbColor={bulkMode ? "#4ade80" : "#64748b"}
            />
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ════════════════════════════════
              SINGLE MODE
          ════════════════════════════════ */}
          {!bulkMode && (
            <View>
              {/* Section: Basic Info */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Basic Info</Text>
                </View>

                <Field
                  label="Title"
                  required
                  value={form.title}
                  onChangeText={(v) => setField("title", v)}
                  placeholder="e.g. Fresh vegetables, Old laptop…"
                  error={errors.title}
                />
                {errors.title && (
                  <Text style={s.errorHint}>⚠ {errors.title}</Text>
                )}

                <Field
                  label="Description"
                  required
                  multiline
                  value={form.description}
                  onChangeText={(v) => setField("description", v)}
                  placeholder="Describe the item — condition, quantity details, any notes…"
                />
                {errors.description && (
                  <Text style={s.errorHint}>⚠ {errors.description}</Text>
                )}

                <CategorySelector
                  value={form.category}
                  onChange={(v) => setField("category", v)}
                  categories={categories}
                />
              </View>

              {/* Section: Quantity */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Quantity & Details</Text>
                </View>

                <View style={s.row}>
                  <View style={[s.fieldWrap, { width: 110 }]}>
                    <FieldLabel text="Quantity" required />
                    <Animated.View style={s.inputBox}>
                      <TextInput
                        style={s.input}
                        value={form.quantity}
                        onChangeText={(v) => setField("quantity", v)}
                        placeholder="0"
                        placeholderTextColor="#3d5068"
                        keyboardType="numeric"
                      />
                    </Animated.View>
                  </View>
                  <UnitSelector
                    value={form.unit}
                    onChange={(v) => setField("unit", v)}
                    units={units}
                  />
                </View>
                {errors.quantity && (
                  <Text style={s.errorHint}>⚠ {errors.quantity}</Text>
                )}

                {/* Calendar date picker button */}
                <TouchableOpacity
                  style={[
                    s.calendarButton,
                    form.expiryDate && s.calendarButtonActive,
                  ]}
                  onPress={() => {
                    setCalendarType("single");
                    setShowCalendar(true);
                  }}
                >
                  <Text style={s.calendarButtonText}>
                    📅{" "}
                    {form.expiryDate
                      ? `${form.expiryDate}`
                      : "Select Expiry Date (Optional)"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Section: Pickup */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Pickup Info</Text>
                </View>

                <Field
                  label="Pickup Location"
                  required
                  value={form.pickupLocation}
                  onChangeText={(v) => setField("pickupLocation", v)}
                  placeholder="e.g. 123 Main St, City or general area"
                />
                {errors.pickupLocation && (
                  <Text style={s.errorHint}>⚠ {errors.pickupLocation}</Text>
                )}

                <Field
                  label="Additional Notes"
                  multiline
                  value={form.additionalNotes}
                  onChangeText={(v) => setField("additionalNotes", v)}
                  placeholder="Special instructions, availability hours, contact preference…"
                />
              </View>

              {/* Section: Photos */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Photos</Text>
                </View>
                <ImageGrid
                  images={images}
                  onAdd={pickImages}
                  onRemove={removeImage}
                />
              </View>

              {/* Section: AI Auto-Match */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Smart Assignment</Text>
                </View>
                <View style={s.toggleRow}>
                  <View style={s.toggleLeft}>
                    <Text style={s.toggleLabel}>🤖 Enable AI Auto-Match</Text>
                    <Text style={s.toggleSubtitle}>
                      AI intelligently matches best recipients
                    </Text>
                  </View>
                  <Switch
                    value={enableAIMatch}
                    onValueChange={setEnableAIMatch}
                    trackColor={{ false: "#e0e0e0", true: "#81c784" }}
                    thumbColor={enableAIMatch ? "#4caf50" : "#f1f1f1"}
                  />
                </View>
              </View>

              {/* Submit */}
              <View style={s.submitWrap}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, loading && s.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#0a0f1e" />
                  ) : (
                    <Text style={s.submitBtnText}>
                      {isEditing ? "✨ Update Listing" : "✨ Create Listing"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════
              BULK MODE
          ════════════════════════════════ */}
          {bulkMode && (
            <View>
              <View style={s.bulkInfoBanner}>
                <Text style={s.bulkInfoIcon}>💡</Text>
                <Text style={s.bulkInfoText}>
                  Add each item separately. Location, expiry and notes apply to
                  all.
                </Text>
              </View>

              {/* Items */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>
                    Items ({bulkItems.length})
                  </Text>
                </View>

                {bulkItems.map((item, i) => (
                  <BulkRow
                    key={i}
                    item={item}
                    index={i}
                    onChange={updateBulkItem}
                    onRemove={removeBulkItem}
                    canRemove={bulkItems.length > 1}
                    categories={categories}
                  />
                ))}

                <TouchableOpacity style={s.addItemBtn} onPress={addBulkItem}>
                  <Text style={s.addItemBtnText}>＋ Add Another Item</Text>
                </TouchableOpacity>
              </View>

              {/* Common details */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Common Details</Text>
                </View>
                <Text style={s.commonDetailsSub}>
                  These apply to all {bulkItems.length} items
                </Text>

                <Field
                  label="Pickup Location"
                  required
                  value={commonLocation}
                  onChangeText={setCommonLocation}
                  placeholder="e.g. 123 Main St, City"
                />

                {/* Calendar date picker button for bulk */}
                <TouchableOpacity
                  style={[
                    s.calendarButton,
                    commonExpiry && s.calendarButtonActive,
                  ]}
                  onPress={() => {
                    setCalendarType("bulk");
                    setShowCalendar(true);
                  }}
                >
                  <Text style={s.calendarButtonText}>
                    📅{" "}
                    {commonExpiry
                      ? `${commonExpiry}`
                      : "Select Common Expiry Date (Optional)"}
                  </Text>
                </TouchableOpacity>

                <Field
                  label="Additional Notes"
                  multiline
                  value={commonNotes}
                  onChangeText={setCommonNotes}
                  placeholder="Any notes that apply to all items…"
                />
              </View>

              {/* Section: AI Auto-Match for Bulk */}
              <View style={s.section}>
                <View style={s.sectionLabel}>
                  <View style={s.sectionLabelDot} />
                  <Text style={s.sectionLabelText}>Smart Assignment</Text>
                </View>
                <View style={s.toggleRow}>
                  <View style={s.toggleLeft}>
                    <Text style={s.toggleLabel}>🤖 Enable AI Auto-Match</Text>
                    <Text style={s.toggleSubtitle}>
                      Apply to all {bulkItems.length} items
                    </Text>
                  </View>
                  <Switch
                    value={enableAIMatch}
                    onValueChange={setEnableAIMatch}
                    trackColor={{ false: "#e0e0e0", true: "#81c784" }}
                    thumbColor={enableAIMatch ? "#4caf50" : "#f1f1f1"}
                  />
                </View>
              </View>

              {/* Bulk Submit */}
              <View style={s.submitWrap}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, bulkLoading && s.submitBtnDisabled]}
                  onPress={handleBulkSubmit}
                  disabled={bulkLoading}
                  activeOpacity={0.85}
                >
                  {bulkLoading ? (
                    <ActivityIndicator color="#0a0f1e" />
                  ) : (
                    <Text style={s.submitBtnText}>
                      ✨ Create {bulkItems.length} Listing
                      {bulkItems.length > 1 ? "s" : ""}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Success Overlay ── */}
        <SuccessOverlay
          visible={success || bulkSuccess}
          count={bulkSuccess ? bulkItems.length : 1}
          onDone={handleDone}
        />

        {/* Calendar Picker Modal */}
        {showCalendar && (
          <CalendarPicker
            onDateSelect={(date) => {
              const isoDate = date.toISOString().split("T")[0];
              if (calendarType === "single") {
                setField("expiryDate", isoDate);
              } else {
                setCommonExpiry(isoDate);
              }
              setShowCalendar(false);
            }}
            onClose={() => setShowCalendar(false)}
            title={
              calendarType === "single"
                ? "Select Expiry Date"
                : "Select Common Expiry Date"
            }
            minDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#2A9D8F",
    gap: 12,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackText: { fontSize: 22, color: "#FFF", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#FFF" },
  headerSub: { fontSize: 12, color: "#E0F7F6", marginTop: 1 },
  bulkToggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulkToggleLabel: { fontSize: 12, color: "#666", fontWeight: "600" },

  scrollContent: { paddingBottom: 40 },

  // ── Section ──
  section: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A9D8F",
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2A9D8F",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Field ──
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelRequired: { color: "#ef4444" },
  inputBox: {
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderRadius: 12,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  inputBoxMulti: { minHeight: 100 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#333",
  },
  inputMulti: { textAlignVertical: "top", minHeight: 96 },
  errorHint: {
    color: "#ef4444",
    fontSize: 11,
    marginTop: -10,
    marginBottom: 8,
  },

  // ── Calendar button ──
  calendarButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    marginBottom: 12,
  },
  calendarButtonActive: {
    backgroundColor: "#C8E6E0",
    borderColor: "#2A9D8F",
  },
  calendarButtonText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
  },

  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },

  // ── Category / Unit chips ──
  chipsRow: { marginTop: 2 },
  chip: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  chipActive: { backgroundColor: "#C8E6E0", borderColor: "#2A9D8F" },
  chipSm: { paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { color: "#666", fontSize: 13, fontWeight: "600" },
  chipTextSm: { fontSize: 12 },
  chipTextActive: { color: "#2A9D8F" },

  // ── Images ──
  imageHint: { fontSize: 11, color: "#999", marginBottom: 10 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imageItem: {
    width: (SW - 32 - 18 * 2 - 10 * 3) / 4,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  imageThumb: { width: "100%", height: "100%" },
  imageRemoveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageRemoveIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  imageAddBtn: {
    width: (SW - 32 - 18 * 2 - 10 * 3) / 4,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#4ade80",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,222,128,0.05)",
  },
  imageAddIcon: { fontSize: 22, marginBottom: 2 },
  imageAddText: { color: "#4ade80", fontSize: 10, fontWeight: "700" },

  // ── Submit row ──
  submitWrap: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  cancelBtnText: { color: "#555", fontWeight: "600", fontSize: 15 },
  submitBtn: {
    flex: 2,
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#2A9D8F",
    shadowColor: "#2A9D8F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  // ── Bulk mode ──
  bulkInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.08)",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    gap: 10,
  },
  bulkInfoIcon: { fontSize: 20 },
  bulkInfoText: { flex: 1, fontSize: 13, color: "#86efac", lineHeight: 18 },

  bulkRow: {
    backgroundColor: "#0a0f1e",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  bulkRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  bulkIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1e2d45",
    alignItems: "center",
    justifyContent: "center",
  },
  bulkIndexText: { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  bulkTitleInput: {
    flex: 1,
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  bulkRemoveBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkRemoveIcon: { color: "#64748b", fontSize: 16, fontWeight: "700" },
  bulkDescInput: {
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#1e2d45",
    marginBottom: 10,
    minHeight: 50,
  },
  bulkRowBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulkQtyInput: {
    width: 70,
    backgroundColor: "#131c2e",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#1e2d45",
    textAlign: "center",
  },
  bulkChip: {
    backgroundColor: "#131c2e",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  bulkChipActive: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderColor: "#4ade80",
  },
  bulkChipText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  bulkChipTextActive: { color: "#4ade80" },

  addItemBtn: {
    borderWidth: 1.5,
    borderColor: "#4ade80",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.04)",
    marginTop: 4,
  },
  addItemBtnText: { color: "#4ade80", fontWeight: "700", fontSize: 14 },

  commonDetailsSub: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 14,
    marginTop: -8,
  },

  // ── Toggle row ──
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(74,222,128,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.15)",
  },
  toggleLeft: { flex: 1 },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  toggleSubtitle: { fontSize: 12, color: "#64748b" },

  // ── Success overlay ──
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,15,30,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  successCard: {
    backgroundColor: "#131c2e",
    borderRadius: 28,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    marginHorizontal: 32,
    width: SW - 64,
  },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  successBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  successBtnText: { color: "#0a0f1e", fontWeight: "800", fontSize: 15 },
});

export default CreateListing;
