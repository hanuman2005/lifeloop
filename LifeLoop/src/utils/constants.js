// ============================================
// src/utils/constants.js
// ============================================
// NOTE: Dynamic list data (CATEGORIES, WASTE_CATEGORIES, UNITS)
// are now served by configAPI from backend

// Static application config
export const USER_TYPES = [
  { value: "donor", label: "Donor Only" },
  { value: "recipient", label: "Recipient Only" },
  { value: "both", label: "Both Donor & Recipient" },
];

export const LISTING_STATUS = [
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const DEFAULT_LOCATION = {
  latitude: 40.7128,
  longitude: -74.006, // New York City
};

export const MAP_CONFIG = {
  defaultZoom: 13,
  maxZoom: 18,
  minZoom: 5,
};

export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  SYSTEM: "system",
};
