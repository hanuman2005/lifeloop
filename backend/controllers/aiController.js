// backend/controllers/aiController.js
// ✅ SMART SPLIT: Gemini for images, OpenAI for text ideas
// ✅ Return 429 errors IMMEDIATELY (don't retry, let frontend handle)
// ✅ Cache results for 5 minutes to reduce API calls
// ✅ Deduplicate simultaneous identical requests

const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const UpcycleIdea = require("../models/UpcycleIdea");
const crypto = require("crypto");

const GEMINI_FLASH = "gemini-2.0-flash";

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DEDUPLICATION & CACHING
// ─────────────────────────────────────────────────────────────────────────────
const pendingRequests = new Map();
const requestCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

const getCacheKey = (prompt, material, item) => {
  return crypto
    .createHash("md5")
    .update(`${prompt}-${material}-${item}`)
    .digest("hex");
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE APIs
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set — image analysis disabled.");
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

console.log(
  "🤖 Gemini:",
  genAI ? `ready (${GEMINI_FLASH} for vision)` : "NOT configured",
);
console.log(
  "🤖 OpenAI:",
  openai ? "ready (gpt-4o-mini for ideas)" : "NOT configured",
);

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const callGeminiWithRetry = async (
  prompt,
  modelName = GEMINI_FLASH,
  retries = 1, // Only 1 attempt - fail fast on rate limits
) => {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const is429 =
        err.message?.includes("429") ||
        err.message?.includes("Too Many Requests");

      if (is429 && attempt < retries) {
        const delayMatch = err.message?.match(/retry[^0-9]*([0-9.]+)\s*s/i);
        const waitSec = delayMatch
          ? Math.ceil(parseFloat(delayMatch[1])) + 1
          : attempt * 15;
        console.warn(
          `⏳ Gemini 429 (attempt ${attempt}/${retries}) — waiting ${waitSec}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
        continue;
      }

      throw err; // Fail fast on first attempt
    }
  }
};

const callGeminiVisionWithRetry = async (
  prompt,
  imageBase64,
  mediaType,
  retries = 1,
) => {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_FLASH });
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: mediaType, data: imageBase64 } },
      ]);
      return result.response.text();
    } catch (err) {
      const is429 =
        err.message?.includes("429") ||
        err.message?.includes("Too Many Requests");

      if (is429 && attempt < retries) {
        const delayMatch = err.message?.match(/retry[^0-9]*([0-9.]+)\s*s/i);
        const waitSec = delayMatch
          ? Math.ceil(parseFloat(delayMatch[1])) + 1
          : attempt * 15;
        console.warn(
          `⏳ Vision 429 (attempt ${attempt}/${retries}) — waiting ${waitSec}s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
        continue;
      }

      throw err;
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI HELPER - Return 429 errors immediately (don't retry)
// ─────────────────────────────────────────────────────────────────────────────
const callOpenAI = async (prompt, isUpcycle = true) => {
  if (!openai) throw new Error("OPENAI_API_KEY not configured");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: isUpcycle
            ? "You are a creative upcycling expert. Always respond ONLY with a valid JSON array, no markdown fences."
            : "You are a sustainability expert. Always respond ONLY with a valid JSON array, no markdown fences.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response from OpenAI");
    return content;
  } catch (err) {
    // Return 429 immediately - don't retry
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSE JSON (strips markdown fences)
// ─────────────────────────────────────────────────────────────────────────────
const parseGeminiJSON = (raw) => {
  const clean = raw.replace(/```json\s*|```\s*/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("No valid JSON in response");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA (fallback for image analysis only)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_ANALYSES = [
  {
    label: "Plastic Water Bottle",
    material: "Plastic",
    confidence: 92,
    reasoning:
      "Clear plastic container with ribbed sides typical of single-use bottles",
    isRecyclable: true,
    urgency: "medium",
    donationPossible: false,
  },
  {
    label: "Glass Jar",
    material: "Glass",
    confidence: 88,
    reasoning: "Clear glass container suitable for storage and reuse",
    isRecyclable: true,
    urgency: "high",
    donationPossible: true,
  },
  {
    label: "Metal Can",
    material: "Metal",
    confidence: 95,
    reasoning: "Aluminum beverage can - easily recyclable",
    isRecyclable: true,
    urgency: "medium",
    donationPossible: false,
  },
];

const MATERIAL_MAP = {
  Plastic: "Plastic",
  Glass: "Glass",
  Metal: "Metal",
  Paper: "Paper/Cardboard",
  Organic: "Organic Waste",
  Electronic: "E-Waste",
  Textile: "Cloth/Textile",
  Wood: "Other",
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze-image
// ─────────────────────────────────────────────────────────────────────────────
const analyzeWasteImage = async (req, res) => {
  try {
    const { imageBase64, mediaType = "image/jpeg", prompt } = req.body;

    // Text-only mode
    if (prompt && !imageBase64) {
      if (!genAI)
        return res.json({
          success: true,
          result: "This can likely be reused or recycled.",
        });
      try {
        const text = await callGeminiWithRetry(prompt);
        return res.json({ success: true, result: text });
      } catch {
        return res.json({
          success: true,
          result: "This can likely be reused or recycled.",
        });
      }
    }

    if (!imageBase64)
      return res
        .status(400)
        .json({ success: false, error: "No image provided" });

    let analysis;
    let usedMock = false;

    if (!genAI) {
      analysis =
        MOCK_ANALYSES[Math.floor(Math.random() * MOCK_ANALYSES.length)];
      usedMock = true;
    } else {
      try {
        console.log("📤 Calling Gemini Vision...");

        const visionPrompt = `You are a waste classification expert. Analyze this image.

Respond ONLY with valid JSON, no markdown:
{
  "label": "specific item name",
  "material": "one of: Plastic, Glass, Metal, Paper, Organic, Electronic, Textile, Wood",
  "confidence": <0-100>,
  "reasoning": "one sentence explanation",
  "isRecyclable": <boolean>,
  "urgency": "low or medium or high",
  "donationPossible": <boolean>,
  "condition": "excellent or good or fair or poor or broken"
}`;

        const raw = await callGeminiVisionWithRetry(
          visionPrompt,
          imageBase64,
          mediaType,
        );
        analysis = parseGeminiJSON(raw.trim());
        if (!analysis?.label) throw new Error("Invalid response");

        console.log(`✅ Vision: ${analysis.label} (${analysis.confidence}%)`);
      } catch (err) {
        console.warn("⚠️  Vision failed:", err.message);
        analysis =
          MOCK_ANALYSES[Math.floor(Math.random() * MOCK_ANALYSES.length)];
        usedMock = true;
      }
    }

    analysis.material = MATERIAL_MAP[analysis.material] || "Other";
    return res.json({
      success: true,
      analysis,
      ...(usedMock && { mode: "demo" }),
    });
  } catch (error) {
    console.error("❌ analyzeWasteImage:", error.message);
    return res.json({
      success: true,
      analysis: {
        label: "Unknown Item",
        material: "Plastic",
        confidence: 60,
        reasoning: "Service temporarily unavailable",
        isRecyclable: true,
        urgency: "medium",
        donationPossible: false,
      },
      mode: "fallback",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/upcycle
// Smart split: OpenAI (fast) → Gemini (fallback) → return errors immediately
// ─────────────────────────────────────────────────────────────────────────────
const generateUpcyclingIdeas = async (req, res) => {
  try {
    const { itemLabel, condition, material, prompt, item } = req.body;

    console.log("📥 /api/ai/upcycle:", {
      hasPrompt: !!prompt,
      item: item || itemLabel,
      material,
    });

    // ── PATH A: Custom prompt from screens ──────────────────────────────
    if (prompt) {
      console.log("🎯 Custom prompt mode");

      if (!genAI && !openai) {
        return res.status(503).json({
          success: false,
          error: "Neither OpenAI nor Gemini API keys configured",
        });
      }

      const isUpcycle = prompt.toLowerCase().includes("upcycl");
      const ideasType = isUpcycle ? "upcycle" : "reuse";
      const cacheKey = getCacheKey(prompt, material, item);

      // Check cache
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`♻️  Cache hit for ${ideasType}`);
        return res.json({ success: true, ideas: cached.ideas });
      }

      // Check for pending request (deduplication)
      if (pendingRequests.has(cacheKey)) {
        console.log(`⏳ Deduplicating: waiting for pending ${ideasType}...`);
        try {
          const ideas = await pendingRequests.get(cacheKey);
          return res.json({ success: true, ideas });
        } catch {
          // Fall through to retry
        }
      }

      const geminiPrompt = isUpcycle
        ? `You are a creative upcycling expert. Give exactly 4 CREATIVE upcycling ideas for: "${item}" (material: ${material}).

RESPOND ONLY WITH JSON ARRAY. No text before/after. No markdown fences.

[{"title":"","description":"","difficulty":"Easy","timeMin":45,"toolsNeeded":[],"materials":[],"steps":[],"valueAdded":"","youtubeQuery":""}]`
        : `You are a sustainability expert. Give exactly 4 PRACTICAL reuse ideas for: "${item}" (material: ${material}).

RESPOND ONLY WITH JSON ARRAY. No text before/after. No markdown fences.

[{"title":"","description":"","difficulty":"Easy","timeMin":15,"materials":[],"steps":[],"youtubeQuery":""}]`;

      try {
        const apiCall = (async () => {
          // Try OpenAI first
          if (openai) {
            try {
              console.log(`📤 OpenAI for ${ideasType}...`);
              const raw = await callOpenAI(geminiPrompt, isUpcycle);
              const ideas = parseGeminiJSON(raw);
              if (!Array.isArray(ideas) || !ideas.length)
                throw new Error("Empty ideas");
              console.log(`✅ OpenAI: ${ideas.length} ideas`);
              requestCache.set(cacheKey, { ideas, timestamp: Date.now() });
              return ideas;
            } catch (err) {
              const is429 = err.status === 429 || err.message?.includes("429");
              console.warn(`⚠️  OpenAI failed:`, err.message);

              // If 429, throw immediately (don't try Gemini)
              if (is429) throw err;

              // Otherwise, try Gemini
              if (!genAI) throw err;
              console.log("🔄 Falling back to Gemini...");
            }
          }

          // Use Gemini
          if (!genAI) throw new Error("No APIs available");
          console.log(`📤 Gemini for ${ideasType}...`);
          const raw = await callGeminiWithRetry(geminiPrompt, GEMINI_FLASH, 1);
          const ideas = parseGeminiJSON(raw);
          if (!Array.isArray(ideas) || !ideas.length)
            throw new Error("Empty ideas");
          console.log(`✅ Gemini: ${ideas.length} ideas`);
          requestCache.set(cacheKey, { ideas, timestamp: Date.now() });
          return ideas;
        })();

        pendingRequests.set(cacheKey, apiCall);
        const ideas = await apiCall;
        pendingRequests.delete(cacheKey);
        return res.json({ success: true, ideas });
      } catch (err) {
        pendingRequests.delete(cacheKey);
        const is429 = err.status === 429 || err.message?.includes("429");

        console.error(`❌ ${ideasType} error:`, err.message);
        return res.status(is429 ? 429 : 500).json({
          success: false,
          error: is429
            ? `API rate limit. Please wait 1 minute and try again.`
            : `Failed to generate ${ideasType} ideas: ${err.message}`,
          retryAfter: is429 ? 60 : undefined,
        });
      }
    }

    // ── PATH B: Original shape { itemLabel, condition, material } ─────────
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
      console.log("✅ DB cache hit:", itemLabel);
      return res.json({ success: true, data: cached.ideas });
    }

    if (!genAI)
      return res
        .status(503)
        .json({ success: false, error: "GEMINI_API_KEY not configured" });

    try {
      const raw = await callGeminiWithRetry(
        `Item: "${itemLabel}", condition: "${condition}", material: "${material}".
Provide 3 beginner upcycling ideas.
RESPOND ONLY WITH JSON ARRAY:
[{"title":"","description":"","steps":[],"materials":[],"difficulty":"easy","timeMin":30}]`,
      );

      const ideas = parseGeminiJSON(raw);
      if (!Array.isArray(ideas) || !ideas.length)
        throw new Error("Empty ideas");

      await UpcycleIdea.create({
        cacheKey,
        itemLabel,
        condition,
        material,
        ideas,
        userId: req.user?._id || null,
      });
      return res.json({ success: true, data: ideas });
    } catch (err) {
      const is429 = err.status === 429 || err.message?.includes("429");
      return res.status(is429 ? 429 : 500).json({
        success: false,
        error: is429 ? "Rate limit — wait 1 minute" : err.message,
      });
    }
  } catch (error) {
    console.error("❌ generateUpcyclingIdeas:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { generateUpcyclingIdeas, analyzeWasteImage };
