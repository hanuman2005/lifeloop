// backend/controllers/aiController.js
// ✅ GEMINI ONLY — real dynamic data, no static fallbacks for ideas
// ✅ Auto-retry on 429 (waits the time Gemini tells us, then retries)
// ✅ Model: gemini-2.0-flash

const { GoogleGenerativeAI } = require("@google/generative-ai");
const UpcycleIdea = require("../models/UpcycleIdea");
const crypto = require("crypto");

const GEMINI_FLASH = "gemini-2.0-flash";

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set.");
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

console.log("🤖 Gemini:", genAI ? `ready (${GEMINI_FLASH})` : "NOT configured");

// ─────────────────────────────────────────────────────────────────────────────
// RETRY HELPER
// Gemini 429 response includes "retryDelay: Xs" — we parse it and wait
// Max 3 retries with increasing wait time
// ─────────────────────────────────────────────────────────────────────────────
const callGeminiWithRetry = async (
  prompt,
  modelName = GEMINI_FLASH,
  retries = 3,
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
        // Parse retry delay from Gemini error message e.g. "Please retry in 12.5s"
        const delayMatch = err.message?.match(/retry[^0-9]*([0-9.]+)\s*s/i);
        const waitSec = delayMatch
          ? Math.ceil(parseFloat(delayMatch[1])) + 1
          : attempt * 15;

        console.warn(
          `⏳ Gemini 429 (attempt ${attempt}/${retries}) — waiting ${waitSec}s before retry...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
        continue; // retry
      }

      throw err; // not 429, or out of retries — let caller handle
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VISION CALL (needs image data, separate from text)
// ─────────────────────────────────────────────────────────────────────────────
const callGeminiVisionWithRetry = async (
  prompt,
  imageBase64,
  mediaType,
  retries = 3,
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
// PARSE JSON from Gemini response (strips markdown fences)
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
    throw new Error("No valid JSON in Gemini response");
  }
};

// Mock only for image analysis (no key case)
const MOCK_ANALYSES = [
  {
    label: "Plastic Bottle",
    material: "Plastic",
    confidence: 88,
    reasoning: "Transparent plastic container with ribbed sides",
    isRecyclable: true,
    urgency: "medium",
    donationPossible: false,
  },
  {
    label: "Glass Jar",
    material: "Glass",
    confidence: 92,
    reasoning: "Clear glass container suitable for storage",
    isRecyclable: true,
    urgency: "high",
    donationPossible: true,
  },
  {
    label: "Metal Can",
    material: "Metal",
    confidence: 95,
    reasoning: "Aluminum or steel beverage/food can",
    isRecyclable: true,
    urgency: "medium",
    donationPossible: false,
  },
  {
    label: "Cardboard Box",
    material: "Paper",
    confidence: 90,
    reasoning: "Corrugated cardboard shipping or storage box",
    isRecyclable: true,
    urgency: "low",
    donationPossible: true,
  },
  {
    label: "Electronic Device",
    material: "Electronic",
    confidence: 87,
    reasoning: "Electronic equipment with circuit boards",
    isRecyclable: true,
    urgency: "high",
    donationPossible: true,
  },
  {
    label: "Textile Clothing",
    material: "Textile",
    confidence: 85,
    reasoning: "Woven fabric garment or cloth item",
    isRecyclable: true,
    urgency: "low",
    donationPossible: true,
  },
  {
    label: "Wooden Furniture",
    material: "Wood",
    confidence: 92,
    reasoning: "Solid or composite wood furniture piece",
    isRecyclable: true,
    urgency: "medium",
    donationPossible: true,
  },
  {
    label: "Food Waste",
    material: "Organic",
    confidence: 88,
    reasoning: "Organic matter suitable for composting",
    isRecyclable: false,
    urgency: "high",
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
    const {
      imageBase64,
      mediaType = "image/jpeg",
      prompt,
      textOnly,
    } = req.body;

    // Text-only legacy mode
    if (textOnly && prompt) {
      if (!genAI)
        return res.json({
          success: true,
          result: "This item can likely be reused or recycled.",
        });
      try {
        const text = await callGeminiWithRetry(prompt);
        return res.json({ success: true, result: text });
      } catch (err) {
        return res.json({
          success: true,
          result: "This item can likely be reused or recycled.",
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

        const visionPrompt = `You are a waste classification expert. Analyze this image carefully.

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "label": "specific item name (e.g. Plastic Water Bottle, Old Cotton Shirt, Broken Smartphone)",
  "material": "one of exactly: Plastic, Glass, Metal, Paper, Organic, Electronic, Textile, Wood",
  "confidence": <number 0-100>,
  "reasoning": "one sentence explaining what you see and why you classified it this way",
  "isRecyclable": <true or false>,
  "urgency": "low or medium or high",
  "donationPossible": <true or false>,
  "condition": "excellent or good or fair or poor or broken"
}

Rules:
- Electronic = ANY device, cable, battery, charger, circuit board, phone, laptop, TV, remote
- Textile = clothing, fabric, shoes, bags, curtains, towels
- urgency=high for e-waste, hazardous materials, perishables
- donationPossible=true only if item is in usable condition`;

        const raw = await callGeminiVisionWithRetry(
          visionPrompt,
          imageBase64,
          mediaType,
        );
        analysis = parseGeminiJSON(raw.trim());
        if (!analysis?.label) throw new Error("Invalid response structure");

        console.log(`✅ Vision: ${analysis.label} (${analysis.confidence}%)`);
      } catch (err) {
        console.warn("⚠️  Vision failed after retries:", err.message);
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
        reasoning: "Service unavailable",
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
// NO static fallback for ideas — returns error so frontend shows retry button
// ─────────────────────────────────────────────────────────────────────────────
const generateUpcyclingIdeas = async (req, res) => {
  try {
    const { itemLabel, condition, material, prompt, item } = req.body;

    console.log("📥 /api/ai/upcycle:", {
      hasPrompt: !!prompt,
      item: item || itemLabel,
      material,
      user: req.user ? "auth" : "public",
    });

    // ── PATH A: Custom prompt from screens ────────────────────────────────
    if (prompt) {
      console.log("🎯 Custom prompt mode");

      if (!genAI) {
        return res
          .status(503)
          .json({
            success: false,
            error:
              "GEMINI_API_KEY not configured. Please add it to your .env file.",
          });
      }

      const isUpcycle = prompt.toLowerCase().includes("upcycl");

      const geminiPrompt = isUpcycle
        ? `You are a creative upcycling expert helping people transform waste into valuable items.

Give exactly 4 CREATIVE upcycling project ideas for: "${item || "this item"}" (material: ${material || "unknown"}).
Upcycling = transform into something NEW and MORE VALUABLE (not just reusing as-is).

RESPOND ONLY WITH A JSON ARRAY. No text before or after. No markdown fences.

[
  {
    "title": "Creative project name",
    "description": "2 sentences: what it becomes and why it is valuable",
    "difficulty": "Easy",
    "timeMin": 45,
    "toolsNeeded": ["tool1", "tool2"],
    "materials": ["material1", "material2"],
    "steps": ["Step 1: do this", "Step 2: do this", "Step 3: do this", "Step 4: finish"],
    "valueAdded": "Specific value created",
    "youtubeQuery": "upcycle ${item || material} into [what] diy tutorial"
  }
]

All 4 ideas must be different and specific to ${material || "the material"}. Be creative and practical.`
        : `You are a sustainability expert helping people creatively reuse waste items.

Give exactly 4 PRACTICAL reuse ideas for: "${item || "this item"}" (material: ${material || "unknown"}).
Reuse = find new purpose AS-IS with minimal effort (not a full transformation).

RESPOND ONLY WITH A JSON ARRAY. No text before or after. No markdown fences.

[
  {
    "title": "Reuse idea name",
    "description": "2 sentences describing the reuse and its benefit",
    "difficulty": "Easy",
    "timeMin": 15,
    "materials": ["item needed if any"],
    "steps": ["Step 1: do this", "Step 2: do this", "Step 3: done"],
    "youtubeQuery": "how to reuse ${item || material} at home diy"
  }
]

All 4 ideas must be different and specific to ${material || "the item"}.`;

      try {
        console.log(
          `📤 Calling Gemini for ${isUpcycle ? "upcycle" : "reuse"} ideas (with retry)...`,
        );

        const raw = await callGeminiWithRetry(geminiPrompt, GEMINI_FLASH);
        console.log("✅ Raw response (first 300):", raw.substring(0, 300));

        const ideas = parseGeminiJSON(raw);

        if (!Array.isArray(ideas) || ideas.length === 0) {
          throw new Error("Gemini returned empty ideas array");
        }

        console.log(
          `✅ ${ideas.length} ${isUpcycle ? "upcycle" : "reuse"} ideas from Gemini`,
        );
        return res.json({ success: true, ideas });
      } catch (err) {
        const is429 =
          err.message?.includes("429") ||
          err.message?.includes("quota") ||
          err.message?.includes("Too Many");
        console.error(
          `❌ Gemini ${isUpcycle ? "upcycle" : "reuse"} error:`,
          err.message,
        );

        // Return proper error — frontend will show retry button
        // NO static fallback — user gets real data or retry
        return res.status(is429 ? 429 : 500).json({
          success: false,
          error: is429
            ? "Gemini rate limit reached. Please wait 1 minute and try again."
            : `Failed to generate ideas: ${err.message}`,
          retryAfter: is429 ? 60 : undefined,
        });
      }
    }

    // ── PATH B: Original shape { itemLabel, condition, material } ─────────
    if (!itemLabel || !condition || !material) {
      return res
        .status(400)
        .json({
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

    if (!genAI)
      return res
        .status(503)
        .json({ success: false, error: "GEMINI_API_KEY not configured" });

    try {
      const raw = await callGeminiWithRetry(
        `User has: "${itemLabel}", condition: "${condition}", material: "${material}".
Provide 3 creative beginner upcycling ideas.
RESPOND ONLY WITH JSON ARRAY, no markdown:
[{"title":"name","description":"1 sentence","steps":["Step 1","Step 2","Step 3"],"materials":["m1"],"difficulty":"easy","timeMin":30}]`,
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
      const is429 =
        err.message?.includes("429") || err.message?.includes("quota");
      return res.status(is429 ? 429 : 500).json({
        success: false,
        error: is429
          ? "Rate limit — please try again in 1 minute"
          : err.message,
      });
    }
  } catch (error) {
    console.error("❌ generateUpcyclingIdeas crash:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { generateUpcyclingIdeas, analyzeWasteImage };
