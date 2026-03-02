// src/components/FiltersPanel/index.js - React Native
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { listingsAPI } from "../services/api";
import configAPI from "../services/configAPI";
import Toast from "react-native-toast-message";

// Static options (non-dynamic)
const SORT_OPTIONS = [
  { value: "newest", label: "🆕 Newest" },
  { value: "oldest", label: "⏰ Oldest" },
  { value: "popular", label: "⭐ Popular" },
  { value: "distance", label: "📍 Nearest" },
  { value: "expiry", label: "⏱️ Expiring" },
];

const CONDITION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "new", label: "🆕 New" },
  { value: "like-new", label: "✨ Like New" },
  { value: "good", label: "👍 Good" },
  { value: "fair", label: "👌 Fair" },
];

const DISTANCE_OPTIONS = [1, 5, 10, 25, 50];

// Horizontal scrollable chip row
const ChipRow = ({ options, value, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
  >
    {options.map((opt) => {
      const sel = value === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, sel && styles.chipSelected]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const FiltersPanel = ({ onResults, autoSearch = false, userLocation }) => {
  const [categories, setCategories] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [condition, setCondition] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [maxDistance, setMaxDistance] = useState(5);
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [savedSearches, setSavedSearches] = useState([]);
  const [searchAlertEnabled, setSearchAlertEnabled] = useState(false);
  const [lat, setLat] = useState(userLocation?.lat || null);
  const [lng, setLng] = useState(userLocation?.lng || null);
  const [locationError, setLocationError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const advancedAnim = useRef(new Animated.Value(0)).current;
  const hasSearchedRef = useRef(false);

  // Load categories from API
  useEffect(() => {
    configAPI.getCategories().then((cats) => {
      setCategories(cats);
    });
  }, []);

  const activeFiltersCount = [
    searchKeyword && 1,
    selectedCategories.length,
    condition && 1,
    minQuantity && 1,
    maxQuantity && 1,
  ].filter(Boolean).length;

  useEffect(() => {
    AsyncStorage.getItem("savedSearches").then((v) => {
      if (v) setSavedSearches(JSON.parse(v));
    });
  }, []);

  useEffect(() => {
    if (userLocation) {
      setLat(userLocation.lat);
      setLng(userLocation.lng);
      return;
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location access denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
    })();
  }, [userLocation]);

  useEffect(() => {
    if (autoSearch && !hasSearchedRef.current) {
      const t = setTimeout(() => {
        if (!hasSearchedRef.current) handleSearch();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [autoSearch]);

  useEffect(() => {
    Animated.timing(advancedAnim, {
      toValue: showAdvanced ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showAdvanced]);

  const toggleCategory = (val) =>
    setSelectedCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val],
    );

  const handleSearch = async () => {
    if (isSearching) return;
    hasSearchedRef.current = true;
    setIsSearching(true);
    try {
      const params = { sortBy, status: "available" };
      if (searchKeyword.trim()) params.search = searchKeyword.trim();
      if (selectedCategories.length > 0)
        params.categories = selectedCategories.join(",");
      if (condition) params.condition = condition;
      if (minQuantity) params.minQuantity = minQuantity;
      if (maxQuantity) params.maxQuantity = maxQuantity;
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
        params.maxDistance = maxDistance * 1000;
      }

      const res = await listingsAPI.search(params);
      const results = res.data.listings || [];
      onResults(results, false);
      Toast.show({
        type: "success",
        text1: `Found ${results.length} listing${results.length !== 1 ? "s" : ""}!`,
      });
    } catch {
      onResults([], true);
      Toast.show({ type: "error", text1: "Search failed. Please try again." });
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setSearchKeyword("");
    setSelectedCategories([]);
    setCondition("");
    setSortBy("newest");
    setMaxDistance(5);
    setMinQuantity("");
    setMaxQuantity("");
    setSearchAlertEnabled(false);
    hasSearchedRef.current = false;
    handleSearch();
  };

  const saveSearch = async () => {
    if (!searchKeyword && selectedCategories.length === 0) {
      Toast.show({ type: "info", text1: "Add a keyword or category first" });
      return;
    }
    const entry = {
      id: Date.now(),
      name: searchKeyword || `Search ${new Date().toLocaleDateString("en-IN")}`,
      keyword: searchKeyword,
      categories: selectedCategories,
      condition,
      sortBy,
      maxDistance,
      minQuantity,
      maxQuantity,
      alertEnabled: searchAlertEnabled,
    };
    const updated = [entry, ...savedSearches.slice(0, 9)];
    setSavedSearches(updated);
    await AsyncStorage.setItem("savedSearches", JSON.stringify(updated));
    Toast.show({ type: "success", text1: "Search saved! 💾" });
  };

  const loadSearch = (s) => {
    setSearchKeyword(s.keyword || "");
    setSelectedCategories(s.categories || []);
    setCondition(s.condition || "");
    setSortBy(s.sortBy || "newest");
    setMaxDistance(s.maxDistance || 5);
    setMinQuantity(s.minQuantity || "");
    setMaxQuantity(s.maxQuantity || "");
    setSearchAlertEnabled(s.alertEnabled || false);
    setShowSaved(false);
  };

  const deleteSearch = async (id) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    await AsyncStorage.setItem("savedSearches", JSON.stringify(updated));
  };

  const advancedMaxHeight = advancedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 22 }}>🔍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.headerTitle}>Advanced Search</Text>
            {activeFiltersCount > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>
                  {activeFiltersCount} active
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>Find what you need nearby</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, description..."
          placeholderTextColor="#64748b"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          onSubmitEditing={() => {
            hasSearchedRef.current = false;
            handleSearch();
          }}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.searchBtn, isSearching && { opacity: 0.5 }]}
          onPress={() => {
            hasSearchedRef.current = false;
            handleSearch();
          }}
          disabled={isSearching}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 20 }}>{isSearching ? "⏳" : "🔍"}</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.label}>🏷️ CATEGORIES</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => {
            const sel = selectedCategories.includes(cat.value);
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.catTag, sel && styles.catTagSel]}
                onPress={() => toggleCategory(cat.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catTagText, sel && styles.catTagTextSel]}>
                  {cat.emoji} {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sort */}
      <View style={styles.section}>
        <Text style={styles.label}>🔄 SORT BY</Text>
        <ChipRow options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      </View>

      {/* Distance */}
      {lat && lng && (
        <View style={styles.section}>
          <Text style={styles.label}>📏 MAX DISTANCE: {maxDistance}km</Text>
          <View style={styles.distanceRow}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.distanceChip,
                  maxDistance === d && styles.distanceChipSel,
                ]}
                onPress={() => setMaxDistance(d)}
              >
                <Text
                  style={[
                    styles.distanceText,
                    maxDistance === d && styles.distanceTextSel,
                  ]}
                >
                  {d}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.locationOk}>
            <Text style={styles.locationOkText}>✅ Location detected</Text>
          </View>
        </View>
      )}
      {locationError && !lat && (
        <View style={styles.locationErr}>
          <Text style={styles.locationErrText}>⚠️ {locationError}</Text>
        </View>
      )}

      {/* Advanced toggle */}
      <TouchableOpacity
        style={styles.advToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
        activeOpacity={0.8}
      >
        <Text style={styles.advToggleText}>
          {showAdvanced ? "▼ Hide" : "▶ Show"} Advanced Filters
        </Text>
      </TouchableOpacity>

      {/* Advanced panel */}
      <Animated.View
        style={[{ overflow: "hidden" }, { maxHeight: advancedMaxHeight }]}
      >
        <View style={styles.section}>
          <Text style={styles.label}>✨ CONDITION</Text>
          <ChipRow
            options={CONDITION_OPTIONS}
            value={condition}
            onChange={setCondition}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>📦 QUANTITY RANGE</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="Min"
              placeholderTextColor="#64748b"
              value={minQuantity}
              onChangeText={setMinQuantity}
              keyboardType="numeric"
            />
            <Text style={{ color: "#94a3b8", fontWeight: "600" }}>to</Text>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="Max"
              placeholderTextColor="#64748b"
              value={maxQuantity}
              onChangeText={setMaxQuantity}
              keyboardType="numeric"
            />
          </View>
        </View>
      </Animated.View>

      {/* Saved searches */}
      <View style={styles.savedBox}>
        <View style={styles.savedBoxHeader}>
          <TouchableOpacity onPress={() => setShowSaved(!showSaved)}>
            <Text style={styles.savedBoxTitle}>
              💾 Saved {savedSearches.length > 0 && `(${savedSearches.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveSearch}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>+ Save</Text>
          </TouchableOpacity>
        </View>

        {showSaved &&
          savedSearches.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.savedItem}
              onPress={() => loadSearch(s)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.savedItemName} numberOfLines={1}>
                  {s.name}
                </Text>
                {s.categories?.length > 0 && (
                  <Text style={styles.savedItemMeta}>
                    {s.categories.length} categories
                  </Text>
                )}
              </View>
              {s.alertEnabled && <Text style={{ marginRight: 8 }}>🔔</Text>}
              <TouchableOpacity
                onPress={() => deleteSearch(s.id)}
                style={{ padding: 6 }}
              >
                <Text style={{ color: "#64748b", fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

        {showSaved && savedSearches.length === 0 && (
          <Text style={styles.noSaved}>No saved searches yet!</Text>
        )}

        <View style={styles.alertRow}>
          <Text style={styles.alertLabel}>
            🔔 Alert me when new items match
          </Text>
          <Switch
            value={searchAlertEnabled}
            onValueChange={setSearchAlertEnabled}
            trackColor={{ false: "#334155", true: "#4ade80" }}
            thumbColor={searchAlertEnabled ? "#fff" : "#94a3b8"}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            isSearching && { opacity: 0.5 },
          ]}
          onPress={() => {
            hasSearchedRef.current = false;
            handleSearch();
          }}
          disabled={isSearching}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnPrimaryText}>
            {isSearching ? "⏳ Searching..." : "🔍 Search"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={handleReset}
          disabled={isSearching}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnSecondaryText}>🔄 Reset</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  content: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 46,
    height: 46,
    backgroundColor: "#166534",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#f1f5f9" },
  headerSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  activeBadge: {
    backgroundColor: "#4ade80",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: { color: "#0a0f1e", fontWeight: "700", fontSize: 11 },

  searchBar: { flexDirection: "row", gap: 10, marginBottom: 16 },
  searchInput: {
    flex: 1,
    backgroundColor: "#1e2d45",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f1f5f9",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchBtn: {
    width: 46,
    height: 46,
    backgroundColor: "#4ade80",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  section: { marginBottom: 16 },
  label: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#334155",
  },
  catTagSel: { backgroundColor: "#166534", borderColor: "#4ade80" },
  catTagText: { color: "#94a3b8", fontWeight: "600", fontSize: 12 },
  catTagTextSel: { color: "#4ade80" },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipSelected: { backgroundColor: "#166534", borderColor: "#4ade80" },
  chipText: { color: "#94a3b8", fontWeight: "600", fontSize: 12 },
  chipTextSelected: { color: "#4ade80" },

  distanceRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  distanceChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#1e2d45",
    borderWidth: 1,
    borderColor: "#334155",
  },
  distanceChipSel: { backgroundColor: "#166534", borderColor: "#4ade80" },
  distanceText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  distanceTextSel: { color: "#4ade80" },

  locationOk: {
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  locationOkText: { color: "#4ade80", fontWeight: "600", fontSize: 12 },
  locationErr: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ef4444",
    marginBottom: 14,
  },
  locationErrText: { color: "#ef4444", fontWeight: "600", fontSize: 12 },

  advToggle: {
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
    alignSelf: "flex-start",
  },
  advToggleText: { color: "#94a3b8", fontWeight: "600", fontSize: 12 },

  textInput: {
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },

  savedBox: {
    backgroundColor: "#131c2e",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1e2d45",
  },
  savedBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  savedBoxTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 13 },
  saveBtn: {
    backgroundColor: "#4ade80",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveBtnText: { color: "#0a0f1e", fontWeight: "700", fontSize: 12 },
  savedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  savedItemName: { color: "#f1f5f9", fontWeight: "600", fontSize: 13 },
  savedItemMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },
  noSaved: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e2d45",
  },
  alertLabel: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 12,
    flex: 1,
    marginRight: 12,
  },

  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnPrimary: { backgroundColor: "#4ade80" },
  actionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#334155",
  },
  actionBtnPrimaryText: { color: "#0a0f1e", fontWeight: "700", fontSize: 14 },
  actionBtnSecondaryText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
});

export default FiltersPanel;
