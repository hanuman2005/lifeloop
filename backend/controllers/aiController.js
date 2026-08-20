// backend/controllers/aiController.js
// M1 — AI Waste Scanner. Classifies a photographed item using the project's own
// model, served by the FastAPI service in ml/serve/app.py.
//
// The HTTP contract of this endpoint is unchanged from the Gemini-backed version:
// same request, same response shape, same auth, same rate limit. Only the
// classifier behind it differs.

const crypto = require("crypto");
const geminiFallback = require("../services/geminiFallback");

// Must stay in sync with ml/wasteml/config.py CLASSES, with WASTE_CATEGORIES in
// controllers/configController.js, and with CATEGORY_ADVICE in
// LifeLoop/src/screens/WasteAnalyzer.js.
const MATERIALS = [
  "Plastic",
  "Glass",
  "Metal",
  "Paper",
  "Organic",
  "Electronic",
  "Textile",
  "Wood",
  "Hazardous",
];

const MODEL_SERVICE_URL =
  process.env.MODEL_SERVICE_URL || "http://127.0.0.1:8000";
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 15000);

// The classifier outputs a material and nothing else. Everything a user reads is
// derived here or from CATEGORY_ADVICE on the client — which is exactly why a
// 2.5M-parameter model can replace a large vision-language model for this task.
const MATERIAL_RULES = {
  Plastic: {
    isRecyclable: true,
    urgency: "low",
    reasoning: "Plastic item. Rinse it and keep it with dry recyclables.",
  },
  Glass: {
    isRecyclable: true,
    urgency: "medium",
    reasoning: "Glass item. Handle carefully and keep it separate so it does not shatter.",
  },
  Metal: {
    isRecyclable: true,
    urgency: "low",
    reasoning: "Metal item. Scrap metal has resale value — a kabadiwala will take it.",
  },
  Paper: {
    isRecyclable: true,
    urgency: "low",
    reasoning: "Paper item. Keep it dry; wet paper cannot be recycled.",
  },
  Organic: {
    isRecyclable: false,
    urgency: "high",
    reasoning: "Organic waste. Compost it — it decomposes fast and should not sit with dry waste.",
  },
  Electronic: {
    isRecyclable: true,
    urgency: "medium",
    reasoning: "E-waste. Take it to an authorised collection point, not a household bin.",
  },
  Textile: {
    isRecyclable: true,
    urgency: "low",
    reasoning: "Textile. If it is still wearable, donating beats recycling.",
  },
  Wood: {
    isRecyclable: true,
    urgency: "low",
    reasoning: "Wood. Untreated wood can be reused or composted; treated wood cannot.",
  },
  Hazardous: {
    isRecyclable: false,
    urgency: "high",
    reasoning: "Hazardous waste. Do not bin this — it needs a designated drop-off point.",
  },
};

// ── Image-hash cache ────────────────────────────────────────────────────────
// Repeat scans of the same photo are common (retries, the same item scanned
// twice). The hash also serves the anti-gaming duplicate detection that M2 needs.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map(); // sha256 -> { analysis, at }
const inFlight = new Map(); // sha256 -> Promise<analysis>

const cacheGet = (hash) => {
  const hit = cache.get(hash);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(hash);
    return null;
  }
  // Refresh recency so eviction below is roughly LRU.
  cache.delete(hash);
  cache.set(hash, hit);
  return hit.analysis;
};

const cacheSet = (hash, analysis) => {
  cache.set(hash, { analysis, at: Date.now() });
  while (cache.size > CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
};

// ── Model service ───────────────────────────────────────────────────────────
const callModelService = async (imageBase64, path = "/classify") => {
  const controller = new AbortController();
  // Scene analysis runs the detector plus one classifier pass per item, so it
  // needs a longer budget than a single classification.
  const budget = path === "/analyze-scene" ? MODEL_TIMEOUT_MS * 3 : MODEL_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), budget);

  try {
    const response = await fetch(`${MODEL_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(payload?.detail || `Model service returned ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
};

// The model service is trusted more than an LLM was, but not blindly: a
// checkpoint trained against a different class list would otherwise silently
// mislabel everything.
const toAnalysis = (result) => {
  if (!result) return null;

  // The model has a dedicated NotWaste class, so "no discardable item in frame" is
  // a positive prediction. Inventing a material here is exactly the failure the
  // phase 0 fallback removal was about.
  if (result.no_item) return { noItem: true };

  if (!MATERIALS.includes(result.material)) return null;

  const material = result.material;
  const rules = MATERIAL_RULES[material];

  let confidence = Number(result.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  return {
    label: `${material} item`,
    material,
    confidence,
    engine: "model",
    reasoning: rules.reasoning,
    isRecyclable: rules.isRecyclable,
    urgency: rules.urgency,
    // The classifier sees material, not usability. The client's CATEGORY_ADVICE
    // supplies the per-category default when this is false.
    donationPossible: false,
    condition: "unknown",
    // True when the model's confidence sits below its calibrated per-class
    // threshold. The client asks the user to choose rather than showing a guess.
    uncertain: Boolean(result.uncertain),
    topK: Array.isArray(result.top_k) ? result.top_k.slice(0, 3) : [],
    modelVersion: result.model || "unknown",
  };
};

// @desc    Classify a photographed waste item
// @route   POST /api/ai/analyze-image
// @access  Private
exports.analyzeImage = async (req, res) => {
  const { imageBase64 } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({
      success: false,
      message: "imageBase64 is required",
    });
  }

  const hash = crypto.createHash("sha256").update(imageBase64).digest("hex");

  const cached = cacheGet(hash);
  if (cached) {
    console.log(`♻️ Scan cache hit ${hash.slice(0, 12)}`);
    return res.json({ success: true, analysis: cached, cached: true });
  }

  try {
    // Two identical photos submitted at once should cost one inference.
    let pending = inFlight.get(hash);
    if (!pending) {
      pending = callModelService(imageBase64).finally(() => inFlight.delete(hash));
      inFlight.set(hash, pending);
    }

    const result = await pending;
    const analysis = toAnalysis(result);

    if (!analysis) {
      console.error("❌ Model service returned an unusable result:", result);
      return res.status(502).json({
        success: false,
        message: "Classification service returned an unreadable response",
      });
    }

    // Not an error — the model looked and found no discardable item. Reported as a
    // distinct outcome so the client can ask for a better photo instead of
    // presenting a material the model never predicted.
    if (analysis.noItem) {
      console.log(`🚫 Scan ${hash.slice(0, 12)} → no item in frame`);
      return res.json({
        success: false,
        noItem: true,
        message: "No waste item detected. Point the camera at a single item.",
      });
    }

    cacheSet(hash, analysis);
    console.log(
      `🔍 Scan ${hash.slice(0, 12)} → ${analysis.material} (${analysis.confidence}%)` +
        (analysis.uncertain ? " [uncertain]" : ""),
    );

    return res.json({ success: true, analysis, cached: false });
  } catch (error) {
    const reason = classifyFailure(error);

    // Fall back to Gemini only when our own model could not be consulted at all.
    // A low-confidence answer from our model is a real answer and is returned as-is;
    // masking it here would corrupt the phase 1 accuracy evaluation.
    if (reason.retryable && geminiFallback.isConfigured()) {
      console.warn(`⚠️ ${reason.log} — falling back to Gemini`);

      try {
        const fallback = await geminiFallback.classify(imageBase64);

        if (fallback?.noItem) {
          console.log(`🚫 Scan ${hash.slice(0, 12)} → no item in frame [gemini]`);
          return res.json({
            success: false,
            noItem: true,
            engine: "gemini",
            message: "No waste item detected. Point the camera at a single item.",
          });
        }

        if (fallback) {
          const analysis = { ...fallback, engine: "gemini" };
          cacheSet(hash, analysis);
          console.log(
            `🔍 Scan ${hash.slice(0, 12)} → ${analysis.material} (${analysis.confidence}%) [gemini]`,
          );
          return res.json({ success: true, analysis, cached: false, fallback: true });
        }

        console.error("❌ Gemini fallback returned an unparseable response");
      } catch (fallbackError) {
        console.error("❌ Gemini fallback failed:", fallbackError.message);
      }
    }

    if (reason.status === 503 && !geminiFallback.isConfigured()) {
      console.error(
        `❌ ${reason.log}, and no GEMINI_API_KEY is set for fallback.\n` +
          "   Start the model service:  cd ml && uvicorn serve.app:app --host 127.0.0.1 --port 8000\n" +
          "   Or set GEMINI_API_KEY in backend/.env to use the temporary fallback.",
      );
    }

    return res.status(reason.status).json({ success: false, message: reason.message });
  }
};

// Distinguishes "our model could not be reached" (fall back) from "our model gave a
// bad answer" (do not fall back — that is a result worth surfacing).
const classifyFailure = (error) => {
  if (error.status === 503) {
    return {
      status: 503,
      retryable: true,
      log: "Model service has no checkpoint loaded",
      message: "The waste classifier is not available yet",
    };
  }

  if (error.name === "AbortError") {
    return {
      status: 504,
      retryable: true,
      log: "Model service timed out",
      message: "Classification timed out. Please try again.",
    };
  }

  const offline =
    error.cause?.code === "ECONNREFUSED" || error.message?.includes("fetch failed");

  if (offline) {
    return {
      status: 503,
      retryable: true,
      log: `Model service unreachable at ${MODEL_SERVICE_URL}`,
      message: "The waste classifier is offline",
    };
  }

  return {
    status: 502,
    retryable: false,
    log: `Classification failed: ${error.message}`,
    message: "Image classification failed",
  };
};

exports._internal = { toAnalysis, classifyFailure, MATERIALS, MATERIAL_RULES };

// @desc    Segregate every discardable item in one photograph
// @route   POST /api/ai/analyze-scene
// @access  Private
//
// The municipal case: a mixed pile needs a per-item breakdown, not one label for
// the whole frame. Kept as a separate endpoint rather than a flag on
// analyze-image because the response shape is genuinely different — a list of
// items with boxes, plus a composition summary — and overloading one endpoint to
// return either would push the branch onto every caller.
exports.analyzeScene = async (req, res) => {
  const { imageBase64 } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ success: false, message: "imageBase64 is required" });
  }

  const hash = crypto.createHash("sha256").update(imageBase64).digest("hex");

  try {
    const result = await callModelService(imageBase64, "/analyze-scene");

    if (!result || !Array.isArray(result.items)) {
      return res.status(502).json({
        success: false,
        message: "Scene analysis returned an unreadable response",
      });
    }

    // Attach the same guidance the single-item path uses, so the client does not
    // need a second lookup table.
    const items = result.items.map((item) => ({
      ...item,
      ...(MATERIAL_RULES[item.material] || {}),
    }));

    console.log(
      `🗺️  Scene ${hash.slice(0, 12)} → ${items.length} item(s), ` +
        `${Math.round((result.composition?.recyclableShare || 0) * 100)}% recyclable [${result.mode}]`,
    );

    return res.json({
      success: true,
      mode: result.mode,
      items,
      composition: result.composition,
      engine: "model",
    });
  } catch (error) {
    const reason = classifyFailure(error);
    console.error(`❌ ${reason.log}`);
    return res.status(reason.status).json({ success: false, message: reason.message });
  }
};

// @desc    Detect everyday objects in a photograph (COCO classes)
// @route   POST /api/ai/detect-objects
// @access  Private
//
// Demo-friendly endpoint: recognises phones, laptops, books, bottles, chairs,
// backpacks, etc. using a pre-trained YOLOv8n model. Returns object names,
// emojis, bounding boxes, and waste-category mappings.
exports.detectObjects = async (req, res) => {
  const { imageBase64 } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({
      success: false,
      message: "imageBase64 is required",
    });
  }

  const hash = crypto.createHash("sha256").update(imageBase64).digest("hex");

  try {
    const result = await callModelService(imageBase64, "/detect-objects");

    if (!result || !Array.isArray(result.items)) {
      return res.status(502).json({
        success: false,
        message: "Object detection returned an unreadable response",
      });
    }

    console.log(
      `📦 Objects ${hash.slice(0, 12)} → ${result.items.length} object(s) detected [${result.mode}]`,
    );

    return res.json({
      success: true,
      mode: result.mode,
      items: result.items,
      count: result.items.length,
      engine: "yolov8n-coco",
    });
  } catch (error) {
    const reason = classifyFailure(error);
    console.error(`❌ ${reason.log}`);
    return res.status(reason.status).json({ success: false, message: reason.message });
  }
};
