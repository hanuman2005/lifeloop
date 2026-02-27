const express = require("express");
const router = express.Router();
const {
  generateUpcyclingIdeas,
  analyzeWasteImage,
} = require("../controllers/aiController");
const { auth } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const aiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 requests per day (increased for public endpoint)
  message: "Too many AI requests, please try again later",
  skip: (req) => {
    // Skip rate limit for unauthenticated users (more lenient)
    return !req.user;
  },
});

// Waste image analysis endpoint (requires auth)
router.post("/analyze-image", auth, analyzeWasteImage);

// Upcycling ideas endpoint (PUBLIC - no auth required but rate-limited)
// Used by ReuseGuideScreen, UpcycleScreen, and WasteAnalyzer
router.post("/upcycle", aiLimiter, generateUpcyclingIdeas);

module.exports = router;
