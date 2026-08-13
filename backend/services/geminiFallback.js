// backend/services/geminiFallback.js
//
// Temporary fallback classifier, used only while the project's own model is being
// trained (PROJECT-PLAN.md phase 1). It fires when the model service is
// unavailable — not when the model returns a low-confidence answer.
//
// That distinction matters. Falling back on low confidence would silently paper over
// a weak model and make the phase 1 accuracy evaluation meaningless. Every response
// carries an `engine` field so a Gemini-produced result can never be mistaken for
// the project's own model output.
//
// Remove this module once the classifier clears its macro-F1 target.

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

const CONDITIONS = ["new", "good", "worn", "damaged", "unusable", "unknown"];
const URGENCIES = ["low", "medium", "high"];

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const PLACEHOLDER_KEY = "your_gemini_api_key";

const PROMPT = `You are a waste classification expert working in India. Classify the single most prominent discardable item in this photograph.

Respond with JSON only, matching exactly this shape:
{
  "label": "short name of the item, 1-4 words",
  "material": one of ${JSON.stringify(MATERIALS)},
  "confidence": integer 0-100,
  "reasoning": "one sentence explaining the material call and what the user should do",
  "isRecyclable": boolean,
  "donationPossible": boolean,
  "condition": one of ${JSON.stringify(CONDITIONS)},
  "urgency": one of ${JSON.stringify(URGENCIES)},
  "noItem": boolean
}

Rules:
- "material" is what the item is predominantly MADE OF, not what it contains. A plastic bottle holding milk is Plastic.
- Food scraps, garden waste and other compostables are Organic.
- Batteries, cables, appliances and anything with a circuit board are Electronic.
- Batteries, CFL bulbs, medicine strips and paint tins are Hazardous — hazard overrides material.
- "urgency" is high for anything hazardous or rapidly decomposing, low for inert items.
- "donationPossible" is true only if the item is intact enough that another person could use it as-is.
- Set "noItem" true if the photograph shows no discardable item at all (a wall, a floor, a hand, an empty room). In that case the other fields are ignored.
- If the image is unclear but does contain an item, still answer, but set confidence below 40.
- Output raw JSON. No markdown fences, no commentary.`;

/** Whether a usable key is configured. The .env.example placeholder counts as unset. */
const isConfigured = () => {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key) && key !== PLACEHOLDER_KEY;
};

// Gemini is instructed to return JSON but is still an LLM, so every field is coerced
// before it reaches the rest of the system.
const parse = (rawText) => {
  const cleaned = String(rawText || "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (parsed.noItem === true) return { noItem: true };

  const material = MATERIALS.includes(parsed.material) ? parsed.material : MATERIALS[0];

  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  return {
    label: String(parsed.label || "Unidentified item").slice(0, 80),
    material,
    confidence,
    reasoning: String(parsed.reasoning || "").slice(0, 400),
    isRecyclable: Boolean(parsed.isRecyclable),
    donationPossible: Boolean(parsed.donationPossible),
    condition: CONDITIONS.includes(parsed.condition) ? parsed.condition : "unknown",
    urgency: URGENCIES.includes(parsed.urgency) ? parsed.urgency : "medium",
    // A fallback result is never treated as confident enough to celebrate; the
    // client shows it as a best guess the user should check.
    uncertain: confidence < 55,
    topK: [],
    modelVersion: `gemini:${MODEL}`,
  };
};

/**
 * Classify an image via Gemini.
 * @returns the same analysis shape the model service produces, or null if unparseable.
 * @throws if the key is missing or the API call fails, so the caller can report honestly.
 */
const classify = async (imageBase64, mediaType = "image/jpeg") => {
  if (!isConfigured()) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "NO_FALLBACK_KEY";
    throw error;
  }

  // Required lazily so the backend still boots when the package is absent.
  const { GoogleGenerativeAI } = require("@google/generative-ai");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    { inlineData: { mimeType: mediaType, data: imageBase64 } },
  ]);

  return parse(result.response.text());
};

module.exports = { classify, isConfigured, MATERIALS, MODEL, _parse: parse };
