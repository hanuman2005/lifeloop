// src/components/Map/index.js - React Native
//
// Replaces: react-leaflet (MapContainer, TileLayer, Marker, Popup, Circle)
// With:     react-native-maps (MapView, Marker, Circle, Callout)
//
// Install:  expo install react-native-maps

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const CATEGORY_ICONS = {
  produce:           { emoji: "🥕", color: "#48bb78" },
  dairy:             { emoji: "🥛", color: "#4299e1" },
  bakery:            { emoji: "🍞", color: "#ed8936" },
  "canned-goods":    { emoji: "🥫", color: "#9f7aea" },
  "household-items": { emoji: "🏠", color: "#718096" },
  clothing:          { emoji: "👕", color: "#f56565" },
  other:             { emoji: "📦", color: "#a0aec0" },
};

const LEGEND_ITEMS = [
  { category: "produce",          label: "🥕 Fresh Produce" },
  { category: "dairy",            label: "🥛 Dairy" },
  { category: "bakery",           label: "🍞 Bakery" },
  { category: "canned-goods",     label: "🥫 Canned Goods" },
  { category: "household-items",  label: "🏠 Household" },
  { category: "clothing",         label: "👕 Clothing" },
  { category: "other",            label: "📦 Other" },
];

const getCategoryIcon = (category) => CATEGORY_ICONS[category] || CATEGORY_ICONS.other;

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const Map = ({
  listings     = [],
  userLocation = null,  // { lat, lng }
  height       = 500,
  onMarkerClick = null,
  showRadius   = true,
  radiusKm     = 5,
}) => {
  const navigation  = useNavigation();
  const mapRef      = useRef(null);
  const infoAnim    = useRef(new Animated.Value(0)).current;

  const [selectedListing, setSelectedListing] = useState(null);
  const [mapReady,         setMapReady]        = useState(false);
  const [showLegend,       setShowLegend]      = useState(true);

  const getInitialRegion = () => {
    if (userLocation) {
      return { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.1, longitudeDelta: 0.1 };
    }
    if (listings.length > 0) {
      const c = listings[0]?.location?.coordinates;
      if (c?.length === 2) return { latitude: c[1], longitude: c[0], latitudeDelta: 0.1, longitudeDelta: 0.1 };
    }
    return { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };
  };

  useEffect(() => {
    Animated.spring(infoAnim, { toValue: selectedListing ? 1 : 0, useNativeDriver: true, friction: 7 }).start();
  }, [selectedListing]);

  const handleMarkerPress = (listing) => {
    setSelectedListing(listing);
    onMarkerClick?.(listing);
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        500
      );
    }
  };

  return (
    <View style={[styles.wrapper, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={getInitialRegion()}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelectedListing(null)}
      >
        {/* User location marker */}
        {userLocation && (
          <>
            <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.userMarker} />
              <Callout><Text style={styles.calloutTitle}>📍 Your Location</Text></Callout>
            </Marker>
            {showRadius && (
              <Circle
                center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                radius={radiusKm * 1000}
                strokeColor="#4299e1" strokeWidth={2}
                fillColor="rgba(66,153,225,0.08)"
              />
            )}
          </>
        )}

        {/* Listing markers */}
        {listings.map((listing) => {
          const coords = listing.location?.coordinates;
          if (!coords || coords.length !== 2 || (coords[0] === 0 && coords[1] === 0)) return null;
          const coordinate = { latitude: coords[1], longitude: coords[0] };
          const iconData   = getCategoryIcon(listing.category);
          const distance   = userLocation
            ? calculateDistance(userLocation.lat, userLocation.lng, coordinate.latitude, coordinate.longitude)
            : null;

          return (
            <Marker key={listing._id} coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerPress(listing)}>
              <View style={[styles.markerPin, { backgroundColor: iconData.color }]}>
                <Text style={styles.markerEmoji}>{iconData.emoji}</Text>
              </View>
              <Callout onPress={() => navigation.navigate("ListingDetails", { id: listing._id })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{listing.title}</Text>
                  <Text style={styles.calloutMeta}>{iconData.emoji} {listing.category}</Text>
                  <Text style={styles.calloutMeta}>📦 {listing.quantity} {listing.unit || "items"}</Text>
                  {distance !== null && <Text style={styles.calloutDistance}>📏 {distance.toFixed(2)} km away</Text>}
                  <Text style={styles.calloutCta}>Tap to view →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading overlay */}
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingEmoji}>🗺️</Text>
          <ActivityIndicator size="large" color="#4299e1" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {userLocation && (
          <TouchableOpacity style={styles.controlBtn} onPress={centerOnUser} activeOpacity={0.85}>
            <Text style={styles.controlBtnText}>🎯</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.controlBtn} onPress={() => setShowLegend(v => !v)} activeOpacity={0.85}>
          <Text style={styles.controlBtnText}>🗂️</Text>
        </TouchableOpacity>
        {selectedListing && (
          <TouchableOpacity style={styles.controlBtn} onPress={() => setSelectedListing(null)} activeOpacity={0.85}>
            <Text style={styles.controlBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Categories</Text>
          {LEGEND_ITEMS.map(({ category, label }) => (
            <View key={category} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getCategoryIcon(category).color }]} />
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Info card */}
      {selectedListing && (
        <Animated.View style={[
          styles.infoCard,
          { opacity: infoAnim, transform: [{ translateY: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] },
        ]}>
          <Text style={styles.infoTitle} numberOfLines={1}>{selectedListing.title}</Text>
          <Text style={styles.infoCategory}>
            {getCategoryIcon(selectedListing.category).emoji} {selectedListing.category}
          </Text>
          {userLocation && selectedListing.location?.coordinates && (
            <Text style={styles.infoDistance}>
              📏 {calculateDistance(
                userLocation.lat, userLocation.lng,
                selectedListing.location.coordinates[1],
                selectedListing.location.coordinates[0]
              ).toFixed(2)} km away
            </Text>
          )}
          <TouchableOpacity style={styles.infoBtn} activeOpacity={0.85}
            onPress={() => navigation.navigate("ListingDetails", { id: selectedListing._id })}>
            <Text style={styles.infoBtnText}>View Details →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: 16, overflow: "hidden", position: "relative" },
  userMarker: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#4299e1", borderWidth: 3, borderColor: "#fff",
  },
  markerPin: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  markerEmoji: { fontSize: 18 },
  callout:          { width: 200, padding: 8 },
  calloutTitle:     { fontWeight: "700", fontSize: 14, color: "#1a202c", marginBottom: 4 },
  calloutMeta:      { fontSize: 12, color: "#718096", marginBottom: 2 },
  calloutDistance:  { fontSize: 12, color: "#4299e1", fontWeight: "700", marginBottom: 4 },
  calloutCta:       { fontSize: 11, color: "#667eea", fontWeight: "600" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#131c2e",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  loadingEmoji: { fontSize: 40 },
  loadingText:  { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
  controls:     { position: "absolute", top: 16, right: 16, gap: 8 },
  controlBtn:   {
    width: 42, height: 42, backgroundColor: "rgba(19,28,46,0.92)",
    borderRadius: 10, borderWidth: 1, borderColor: "#334155",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  controlBtnText: { fontSize: 18 },
  legend: {
    position: "absolute", bottom: 100, right: 12,
    backgroundColor: "rgba(19,28,46,0.95)",
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#334155", maxWidth: 170,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  legendTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 12, marginBottom: 8 },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  legendDot:   { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: "#fff" },
  legendLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
  infoCard: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    backgroundColor: "rgba(19,28,46,0.97)", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#334155",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  infoTitle:    { color: "#f1f5f9", fontWeight: "700", fontSize: 16, marginBottom: 4 },
  infoCategory: { color: "#94a3b8", fontSize: 13, marginBottom: 2, textTransform: "capitalize" },
  infoDistance: { color: "#4299e1", fontWeight: "700", fontSize: 13, marginBottom: 10 },
  infoBtn:      { backgroundColor: "#667eea", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  infoBtnText:  { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default Map;