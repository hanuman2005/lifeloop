// backend/controllers/aiController.js
// ✅ ZERO API KEYS NEEDED — completely free, offline-capable
// ✅ Image analysis  → MobileNet (runs locally on your backend server)
// ✅ Reuse ideas     → Pre-scraped Wikipedia/wikiHow database (ideaScraper.js)
// ✅ Upcycle ideas   → Pre-scraped Wikipedia/wikiHow database (ideaScraper.js)
// ✅ No Gemini, no OpenAI, no rate limits, no quota

const {
  getIdeasByCategory,
  getIdeasForItem,
  getCategoryFromMaterial,
} = require("../services/ideaScraper");
const { classifyImage, loadModel } = require("../services/mobilenetClassifier");
const UpcycleIdea = require("../models/UpcycleIdea");
const crypto = require("crypto");

// Pre-load MobileNet when server starts
loadModel().catch((err) =>
  console.warn("⚠️  MobileNet preload failed:", err.message),
);

console.log("🧠 aiController: MobileNet + Scraped Database (zero API keys)");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze-image
// ─────────────────────────────────────────────────────────────────────────────
const analyzeWasteImage = async (req, res) => {
  try {
    const {
      imageBase64,
      mediaType = "image/jpeg",
      prompt,
      textOnly,
    } = req.body;

    if (textOnly && prompt) {
      return res.json({
        success: true,
        result:
          "This item can likely be reused or recycled. Check local waste guidelines for proper disposal.",
      });
    }

    if (!imageBase64) {
      return res
        .status(400)
        .json({ success: false, error: "No image provided" });
    }

    console.log("📸 Classifying with MobileNet (local, no API)...");

    try {
      const result = await classifyImage(imageBase64);
      console.log(
        `✅ MobileNet: ${result.label} → ${result.category} (${result.confidence}%)`,
      );
      return res.json({ success: true, analysis: result });
    } catch (mobileNetErr) {
      console.error("❌ MobileNet failed:", mobileNetErr.message);

      // Fallback — return a safe default so front-end never crashes
      return res.json({
        success: true,
        analysis: {
          label: "Unidentified Item",
          material: "Plastic",
          category: "Plastic",
          confidence: 50,
          reasoning: "Could not classify — try a clearer, well-lit photo",
          isRecyclable: true,
          urgency: "medium",
          donationPossible: false,
          condition: "fair",
          source: "fallback",
        },
        message:
          "Could not classify image. Please try a clearer, well-lit photo.",
      });
    }
  } catch (error) {
    console.error("❌ analyzeWasteImage crash:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/upcycle
// ─────────────────────────────────────────────────────────────────────────────
const generateUpcyclingIdeas = async (req, res) => {
  try {
    const { itemLabel, condition, material, prompt, item } = req.body;

    console.log("📥 /api/ai/upcycle:", {
      item: item || itemLabel,
      material,
      hasPrompt: !!prompt,
    });

    // ── PATH A: prompt from screens ───────────────────────────────────────
    if (prompt) {
      const isUpcycle = prompt.toLowerCase().includes("upcycl");
      const type = isUpcycle ? "upcycle" : "reuse";
      const category = getCategoryFromMaterial(material);
      const itemName = item || itemLabel || "";

      // Try item-specific ideas first (e.g. "Watch" → watch ideas)
      let ideas = getIdeasForItem(itemName, type);
      let source = "item-database";

      if (!ideas || ideas.length === 0) {
        // Fall back to generic category ideas (e.g. "Metal" → metal ideas)
        console.log(
          `📚 No item ideas for "${itemName}", falling back to category: ${category}`,
        );
        ideas = getIdeasByCategory(category, type);
        source = "category-database";
      }

      if (!ideas || ideas.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No ${type} ideas found for ${itemName || category}`,
        });
      }

      console.log(
        `✅ ${ideas.length} ${type} ideas [${source}] for "${itemName || category}"`,
      );
      return res.json({ success: true, ideas, source });
    }

    // ── PATH B: { itemLabel, condition, material } ────────────────────────
    if (!itemLabel || !condition || !material) {
      return res.status(400).json({
        success: false,
        error: "Missing: itemLabel, condition, material",
      });
    }

    const cacheKey = crypto
      .createHash("md5")
      .update(`${itemLabel}-${condition}-${material}`)
      .digest("hex");
    const cached = await UpcycleIdea.findOne({ cacheKey });
    if (cached) {
      console.log("✅ Cache hit:", itemLabel);
      return res.json({ success: true, data: cached.ideas });
    }

    const category = getCategoryFromMaterial(material);

    // Try item-specific ideas first, then fall back to category
    let ideas = getIdeasForItem(itemLabel, "upcycle");
    if (!ideas || ideas.length === 0) {
      ideas = getIdeasByCategory(category, "upcycle");
    }
    ideas = (ideas || []).slice(0, 3);

    if (!ideas || ideas.length === 0) {
      return res.status(404).json({ success: false, error: "No ideas found" });
    }

    await UpcycleIdea.create({
      cacheKey,
      itemLabel,
      condition,
      material,
      ideas,
      userId: req.user?._id || null,
    });

    return res.json({ success: true, data: ideas });
  } catch (error) {
    console.error("❌ generateUpcyclingIdeas crash:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { generateUpcyclingIdeas, analyzeWasteImage };
