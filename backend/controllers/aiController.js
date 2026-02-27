// backend/controllers/aiController.js
// ✅ HYBRID: COCO-SSD for images (FREE), OpenAI for ideas with Gemini fallback
// ✅ Try OpenAI → If 429 quota, use Gemini (fallback)
// ✅ Cache + dedupe, return errors immediately

const cocoSsd = require("@tensorflow-models/coco-ssd");
const tf = require("@tensorflow/tfjs");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const UpcycleIdea = require("../models/UpcycleIdea");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// CACHING & DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
const pendingRequests = new Map();
const requestCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

let cocoModel = null;

const getCacheKey = (prompt, material, item) => {
  return crypto
    .createHash("md5")
    .update(`${prompt}-${material}-${item}`)
    .digest("hex");
};

// ─────────────────────────────────────────────────────────────────────────────
// LOAD COCO-SSD MODEL (once on startup)
// ─────────────────────────────────────────────────────────────────────────────
const loadCocoModel = async () => {
  if (!cocoModel) {
    try {
      console.log("📦 Loading COCO-SSD model...");
      cocoModel = await cocoSsd.load();
      console.log("✅ COCO-SSD ready for image classification");
    } catch (err) {
      console.error("⚠️  Failed to load COCO-SSD:", err.message);
    }
  }
  return cocoModel;
};

// ─────────────────────────────────────────────────────────────────────────────
// BASE64 TO IMAGE TENSOR
// ─────────────────────────────────────────────────────────────────────────────
const base64ToImage = (base64String) => {
  return Buffer.from(base64String, "base64");
};

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFY WASTE BY DETECTED OBJECTS
// Maps COCO-SSD classes to waste categories
// ─────────────────────────────────────────────────────────────────────────────
const classifyWaste = (detections) => {
  const classMap = {
    bottle: {
      material: "Plastic",
      label: "Plastic Bottle",
      donationPossible: false,
    },
    cup: { material: "Plastic", label: "Plastic Cup", donationPossible: false },
    bowl: {
      material: "Plastic",
      label: "Plastic Bowl",
      donationPossible: true,
    },
    glass: { material: "Glass", label: "Glass", donationPossible: true },
    jar: { material: "Glass", label: "Glass Jar", donationPossible: true },
    can: { material: "Metal", label: "Metal Can", donationPossible: false },
    fork: { material: "Metal", label: "Metal Fork", donationPossible: true },
    spoon: { material: "Metal", label: "Metal Spoon", donationPossible: true },
    book: { material: "Paper", label: "Book", donationPossible: true },
    backpack: {
      material: "Textile",
      label: "Backpack",
      donationPossible: true,
    },
    shoe: { material: "Textile", label: "Shoe", donationPossible: true },
    apple: { material: "Organic", label: "Apple", donationPossible: false },
    banana: { material: "Organic", label: "Banana", donationPossible: false },
    laptop: { material: "Electronic", label: "Laptop", donationPossible: true },
    mouse: {
      material: "Electronic",
      label: "Computer Mouse",
      donationPossible: true,
    },
    phone: {
      material: "Electronic",
      label: "Cell Phone",
      donationPossible: true,
    },
    remote: { material: "Electronic", label: "Remote", donationPossible: true },
  };

  let bestMatch = null;
  let highestScore = 0;

  detections.forEach((detection) => {
    const className = detection.class.toLowerCase();
    const score = detection.score;

    if (score > highestScore) {
      for (const [key, waste] of Object.entries(classMap)) {
        if (className.includes(key)) {
          bestMatch = waste;
          highestScore = score;
          break;
        }
      }
    }
  });

  if (!bestMatch) {
    const topClass = detections[0]?.class || "Unknown";
    bestMatch = { material: "Other", label: topClass, donationPossible: false };
  }

  return {
    ...bestMatch,
    confidence: Math.round(highestScore * 100),
    reasoning: `Detected ${bestMatch.label} from image analysis`,
    isRecyclable: ["Plastic", "Glass", "Metal", "Paper"].includes(
      bestMatch.material,
    ),
    urgency: ["Electronic", "Organic"].includes(bestMatch.material)
      ? "high"
      : "medium",
    condition: "good",
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI FOR TEXT IDEAS (PRIMARY)
// ─────────────────────────────────────────────────────────────────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI FOR TEXT IDEAS (FALLBACK when OpenAI quota exceeded)
// ─────────────────────────────────────────────────────────────────────────────
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const callGemini = async (prompt) => {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    throw err;
  }
};

const callOpenAI = async (prompt, isUpcycle = true) => {
  if (!openai) throw new Error("OPENAI_API_KEY not configured");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: isUpcycle
          ? "You are a creative upcycling expert. Always respond ONLY with a valid JSON array, no markdown."
          : "You are a sustainability expert. Always respond ONLY with a valid JSON array, no markdown.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Empty response");
  return content;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSE JSON
// ─────────────────────────────────────────────────────────────────────────────
const parseJSON = (raw) => {
  const clean = raw.replace(/```json\s*|```\s*/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error("No valid JSON");
  }
};

console.log(
  "🤖 OpenAI:",
  openai ? "ready (gpt-4o-mini for ideas)" : "NOT configured",
);
console.log(
  "🤖 Gemini:",
  genAI
    ? "ready (fallback for ideas if OpenAI quota exceeded)"
    : "NOT configured",
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze-image
// Uses COCO-SSD (FREE, no API calls, no quota limits)
// ─────────────────────────────────────────────────────────────────────────────
const analyzeWasteImage = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64)
      return res
        .status(400)
        .json({ success: false, error: "No image provided" });

    const model = await loadCocoModel();
    if (!model) {
      return res.json({
        success: true,
        analysis: {
          label: "Unknown Item",
          material: "Plastic",
          confidence: 50,
          reasoning: "Model not loaded",
          isRecyclable: true,
          urgency: "medium",
          donationPossible: false,
          condition: "good",
        },
        mode: "fallback",
      });
    }

    try {
      const imageBuffer = base64ToImage(imageBase64);
      const img = tf.node.decodeImage(imageBuffer, 3);

      console.log("📤 Running COCO-SSD...");
      const predictions = await model.estimateObjects(img);
      img.dispose();

      if (!predictions || predictions.length === 0) {
        return res.json({
          success: true,
          analysis: {
            label: "Unrecognized Item",
            material: "Other",
            confidence: 30,
            reasoning: "No objects detected",
            isRecyclable: false,
            urgency: "low",
            donationPossible: false,
            condition: "good",
          },
          mode: "demo",
        });
      }

      console.log(`✅ Detected: ${predictions.map((p) => p.class).join(", ")}`);
      const analysis = classifyWaste(predictions);
      return res.json({ success: true, analysis });
    } catch (inferenceErr) {
      console.error("❌ Inference error:", inferenceErr.message);
      return res.json({
        success: true,
        analysis: {
          label: "Unable to analyze",
          material: "Plastic",
          confidence: 40,
          reasoning: "Image analysis failed",
          isRecyclable: true,
          urgency: "medium",
          donationPossible: false,
          condition: "good",
        },
        mode: "fallback",
      });
    }
  } catch (error) {
    console.error("❌ analyzeWasteImage:", error.message);
    return res.json({
      success: true,
      analysis: {
        label: "Unknown Item",
        material: "Plastic",
        confidence: 60,
        reasoning: "Service error",
        isRecyclable: true,
        urgency: "medium",
        donationPossible: false,
        condition: "good",
      },
      mode: "fallback",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/upcycle
// Text-only ideas using OpenAI
// ─────────────────────────────────────────────────────────────────────────────
const generateUpcyclingIdeas = async (req, res) => {
  try {
    const { itemLabel, condition, material, prompt, item } = req.body;

    console.log("📥 /api/ai/upcycle:", {
      hasPrompt: !!prompt,
      item: item || itemLabel,
      material,
    });

    if (prompt) {
      console.log("🎯 Custom prompt mode");

      if (!openai) {
        return res.status(503).json({
          success: false,
          error: "OpenAI API key not configured",
        });
      }

      const isUpcycle = prompt.toLowerCase().includes("upcycl");
      const ideasType = isUpcycle ? "upcycle" : "reuse";
      const cacheKey = getCacheKey(prompt, material, item);

      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`♻️  Cache hit for ${ideasType}`);
        return res.json({ success: true, ideas: cached.ideas });
      }

      if (pendingRequests.has(cacheKey)) {
        console.log(`⏳ Deduplicating: waiting...`);
        try {
          const ideas = await pendingRequests.get(cacheKey);
          return res.json({ success: true, ideas });
        } catch {
          // retry
        }
      }

      const promptText = isUpcycle
        ? `Creative upcycling expert. Give exactly 4 ideas for: "${item}" (${material}).
RESPOND ONLY WITH JSON ARRAY:
[{"title":"","description":"","difficulty":"Easy","timeMin":45,"toolsNeeded":[],"materials":[],"steps":[],"valueAdded":"","youtubeQuery":""}]`
        : `Sustainability expert. Give exactly 4 reuse ideas for: "${item}" (${material}).
RESPOND ONLY WITH JSON ARRAY:
[{"title":"","description":"","difficulty":"Easy","timeMin":15,"materials":[],"steps":[],"youtubeQuery":""}]`;

      try {
        const apiCall = (async () => {
          try {
            console.log(`📤 OpenAI for ${ideasType}...`);
            const raw = await callOpenAI(promptText, isUpcycle);
            const ideas = parseJSON(raw);
            if (!Array.isArray(ideas) || !ideas.length)
              throw new Error("Empty");
            console.log(`✅ OpenAI: ${ideas.length} ideas`);
            requestCache.set(cacheKey, { ideas, timestamp: Date.now() });
            return ideas;
          } catch (openaiErr) {
            const is429 = openaiErr.status === 429;
            console.warn(`⚠️  OpenAI failed:`, openaiErr.message);

            // If quota exceeded, fall back to Gemini
            if (is429 && genAI) {
              try {
                console.log(
                  `🔄 Falling back to Gemini (OpenAI quota exceeded)...`,
                );
                const raw = await callGemini(promptText);
                const ideas = parseJSON(raw);
                if (!Array.isArray(ideas) || !ideas.length)
                  throw new Error("Empty from Gemini");
                console.log(`✅ Gemini: ${ideas.length} ideas [FALLBACK]`);
                requestCache.set(cacheKey, { ideas, timestamp: Date.now() });
                return ideas;
              } catch (geminiErr) {
                console.error(`❌ Gemini fallback failed:`, geminiErr.message);
                throw geminiErr;
              }
            }

            throw openaiErr;
          }
        })();

        pendingRequests.set(cacheKey, apiCall);
        const ideas = await apiCall;
        pendingRequests.delete(cacheKey);
        return res.json({ success: true, ideas });
      } catch (err) {
        pendingRequests.delete(cacheKey);
        const is429 = err.status === 429;
        console.error(`❌ ${ideasType}:`, err.message);
        return res.status(is429 ? 429 : 500).json({
          success: false,
          error: is429 ? "Rate limit. Wait 1 minute." : err.message,
          retryAfter: is429 ? 60 : undefined,
        });
      }
    }

    // PATH B
    if (!itemLabel || !condition || !material) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const cacheKey = crypto
      .createHash("md5")
      .update(`${itemLabel}-${condition}-${material}`)
      .digest("hex");
    const cached = await UpcycleIdea.findOne({ cacheKey });
    if (cached) {
      console.log("✅ DB cache:", itemLabel);
      return res.json({ success: true, data: cached.ideas });
    }

    if (!openai)
      return res
        .status(503)
        .json({ success: false, error: "OpenAI not configured" });

    try {
      const raw = await callOpenAI(
        `Item: "${itemLabel}", condition: "${condition}", material: "${material}".
Give 3 ideas.
RESPOND WITH JSON: [{"title":"","description":"","steps":[],"materials":[],"difficulty":"easy","timeMin":30}]`,
      );

      const ideas = parseJSON(raw);
      if (!Array.isArray(ideas) || !ideas.length) throw new Error("Empty");

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
      const is429 = err.status === 429;
      return res
        .status(is429 ? 429 : 500)
        .json({ success: false, error: err.message });
    }
  } catch (error) {
    console.error("❌ crash:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { generateUpcyclingIdeas, analyzeWasteImage };
