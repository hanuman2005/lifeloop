// ============================================
// src/utils/constants.js
// ============================================

export const CATEGORIES = [
  { value: 'produce', label: 'Fresh Produce' },
  { value: 'canned-goods', label: 'Canned Goods' },
  { value: 'dairy', label: 'Dairy Products' },
  { value: 'bakery', label: 'Bakery Items' },
  { value: 'household-items', label: 'Household Items' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' }
];

export const USER_TYPES = [
  { value: 'donor', label: 'Donor Only' },
  { value: 'recipient', label: 'Recipient Only' },
  { value: 'both', label: 'Both Donor & Recipient' }
];

export const LISTING_STATUS = [
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const DEFAULT_LOCATION = {
  latitude: 40.7128,
  longitude: -74.0060 // New York City
};

export const MAP_CONFIG = {
  defaultZoom: 13,
  maxZoom: 18,
  minZoom: 5
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  SYSTEM: 'system'
};