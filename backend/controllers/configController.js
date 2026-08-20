// backend/controllers/configController.js
// Serve all app configuration and static data via API

// ──────────────────────────────────────────────────────────────────────────
// LISTING CATEGORIES
// ──────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "produce", label: "🥦 Fresh Produce" },
  { value: "dairy", label: "🥛 Dairy" },
  { value: "bakery", label: "🍞 Bakery" },
  { value: "canned-goods", label: "🥫 Canned Goods" },
  { value: "household-items", label: "🏠 Household" },
  { value: "clothing", label: "👕 Clothing" },
  { value: "electronics", label: "📱 Electronics" },
  { value: "books", label: "📚 Books" },
  { value: "furniture", label: "🪑 Furniture" },
  { value: "other", label: "📦 Other" },
];

// ──────────────────────────────────────────────────────────────────────────
// MEASUREMENT UNITS
// ──────────────────────────────────────────────────────────────────────────
const UNITS = [
  { value: "items", label: "Items" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lbs", label: "Pounds (lbs)" },
  { value: "liters", label: "Liters (L)" },
  { value: "gallons", label: "Gallons (gal)" },
  { value: "boxes", label: "Boxes" },
  { value: "bags", label: "Bags" },
  { value: "servings", label: "Servings" },
  { value: "portions", label: "Portions" },
  { value: "dozen", label: "Dozen (12 items)" },
];

// ──────────────────────────────────────────────────────────────────────────
// WASTE CATEGORIES (AI Analysis)
// ──────────────────────────────────────────────────────────────────────────
const WASTE_CATEGORIES = [
  {
    id: "Plastic",
    label: "Plastic",
    icon: "🧴",
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#93c5fd",
    examples: "Bottles, bags, containers",
    keywords: ["bottle", "bag", "container", "cup", "plastic", "wrap"],
  },
  {
    id: "Glass",
    label: "Glass",
    icon: "🍶",
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#67e8f9",
    examples: "Bottles, jars, glasses",
    keywords: ["bottle", "jar", "glass", "vase"],
  },
  {
    id: "Metal",
    label: "Metal",
    icon: "🥫",
    color: "#6b7280",
    bg: "#f3f4f6",
    border: "#9ca3af",
    examples: "Cans, tins, foil",
    keywords: ["can", "tin", "metal", "foil", "screw", "nail"],
  },
  {
    id: "Paper",
    label: "Paper / Cardboard",
    icon: "📦",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fcd34d",
    examples: "Boxes, books, newspapers",
    keywords: ["box", "paper", "cardboard", "book", "notebook"],
  },
  {
    id: "Organic",
    label: "Organic / Food",
    icon: "🥦",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#86efac",
    examples: "Fruits, vegetables, scraps",
    keywords: ["fruit", "vegetable", "food", "leaf", "plant"],
  },
  {
    id: "Electronic",
    label: "E-Waste",
    icon: "📱",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
    examples: "Phones, batteries, cables",
    keywords: ["phone", "battery", "cable", "charger", "device"],
  },
  {
    id: "Textile",
    label: "Clothing",
    icon: "👕",
    color: "#db2777",
    bg: "#fce7f3",
    border: "#f9a8d4",
    examples: "Clothes, shoes, fabric",
    keywords: ["cloth", "textile", "fabric", "shoe", "clothing"],
  },
  {
    id: "Wood",
    label: "Wood",
    icon: "🪵",
    color: "#92400e",
    bg: "#fefce8",
    border: "#fde047",
    examples: "Furniture, logs, pallets",
    keywords: ["wood", "wooden", "log", "furniture", "pallet"],
  },
  {
    id: "Hazardous",
    label: "Hazardous",
    icon: "⚠️",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    examples: "Batteries, chemicals, tube lights",
    keywords: ["battery", "chemical", "hazardous", "toxic", "paint"],
  },
];

// ──────────────────────────────────────────────────────────────────────────
// MOTIVATION QUOTES
// ──────────────────────────────────────────────────────────────────────────
const MOTIVATION_QUOTES = [
  "♻️ Every small action counts — you're reducing waste and saving the planet!",
  "🌱 Your choice today shapes tomorrow's environment — thank you for caring!",
  "💪 Be part of the circular economy — keep items in the loop instead of landfills!",
  "🌍 One person's waste is another person's treasure — you're making a difference!",
  "✨ Sustainability is a lifestyle — and you're living it!",
  "🚀 You're building a zero-waste future — keep up the amazing work!",
  "💚 Waste less, live better — your actions inspire others!",
  "🌿 Reuse > Recycle > Reduce — you're mastering the art of sustainability!",
];

// ──────────────────────────────────────────────────────────────────────────
// GET /api/config/categories
// ──────────────────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    res.json({
      success: true,
      data: CATEGORIES,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/config/units
// ──────────────────────────────────────────────────────────────────────────
const getUnits = async (req, res) => {
  try {
    res.json({
      success: true,
      data: UNITS,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/config/waste-categories
// ──────────────────────────────────────────────────────────────────────────
const getWasteCategories = async (req, res) => {
  try {
    res.json({
      success: true,
      data: WASTE_CATEGORIES,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/config/motivation-quotes
// ──────────────────────────────────────────────────────────────────────────
const getMotivationQuotes = async (req, res) => {
  try {
    res.json({
      success: true,
      data: MOTIVATION_QUOTES,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// GET /api/config/all (Get all config at once)
// ──────────────────────────────────────────────────────────────────────────
const getAllConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: CATEGORIES,
        units: UNITS,
        wasteCategories: WASTE_CATEGORIES,
        motivationQuotes: MOTIVATION_QUOTES,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCategories,
  getUnits,
  getWasteCategories,
  getMotivationQuotes,
  getAllConfig,
};
