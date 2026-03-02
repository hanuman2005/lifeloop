// LifeLoop/src/services/configAPI.js
import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://localhost:5000/api";

let cachedConfig = null;

const configAPI = {
  /**
   * Get all configuration at once (recommended)
   * Caches the result to avoid repeated API calls
   */
  getAllConfig: async () => {
    try {
      if (cachedConfig) {
        return cachedConfig;
      }

      const response = await fetch(`${API_URL}/config/all`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch config");

      const data = await response.json();
      cachedConfig = data.data;
      return cachedConfig;
    } catch (error) {
      console.error("❌ Config API error:", error.message);
      // Return empty defaults if API fails
      return {
        categories: [],
        units: [],
        wasteCategories: [],
        motivationQuotes: [],
      };
    }
  },

  /**
   * Get listing categories
   */
  getCategories: async () => {
    try {
      const config = await configAPI.getAllConfig();
      return config.categories || [];
    } catch (error) {
      console.error("❌ Get categories error:", error.message);
      return [];
    }
  },

  /**
   * Get measurement units
   */
  getUnits: async () => {
    try {
      const config = await configAPI.getAllConfig();
      return config.units || [];
    } catch (error) {
      console.error("❌ Get units error:", error.message);
      return [];
    }
  },

  /**
   * Get waste analysis categories
   */
  getWasteCategories: async () => {
    try {
      const config = await configAPI.getAllConfig();
      return config.wasteCategories || [];
    } catch (error) {
      console.error("❌ Get waste categories error:", error.message);
      return [];
    }
  },

  /**
   * Get motivation quotes
   */
  getMotivationQuotes: async () => {
    try {
      const config = await configAPI.getAllConfig();
      return config.motivationQuotes || [];
    } catch (error) {
      console.error("❌ Get motivation quotes error:", error.message);
      return [];
    }
  },

  /**
   * Get reuse/upcycle ideas for an item (automatically scrapes if not in DB)
   * @param {string} item - Item name (e.g., "celery", "glass bottle")
   * @param {string} type - "reuse" or "upcycle"
   */
  getIdeas: async (item, type = "reuse") => {
    try {
      if (!item) {
        console.warn("⚠️ getIdeas called without item parameter");
        return [];
      }

      const response = await fetch(
        `${API_URL}/config/ideas?item=${encodeURIComponent(
          item,
        )}&type=${encodeURIComponent(type)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch ideas");

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`❌ Get ideas error for "${item}":`, error.message);
      return [];
    }
  },

  /**
   * Clear cache (call after app updates)
   */
  clearCache: () => {
    cachedConfig = null;
  },
};

export default configAPI;
