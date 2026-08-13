// backend/routes/ai.js — M1 AI Waste Scanner
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { auth } = require("../middleware/auth");
const { analyzeImage } = require("../controllers/aiController");

// Gemini free-tier quota is the binding constraint on this project, and an
// unthrottled scan endpoint is also the obvious way to game the points economy.
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: {
    success: false,
    message: "Scan limit reached for this hour. Try again later.",
  },
});

// POST /api/ai/analyze-image
router.post("/analyze-image", auth, analyzeLimiter, analyzeImage);

module.exports = router;
