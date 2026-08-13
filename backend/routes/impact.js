// backend/routes/impact.js
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");

// ✅ Import correctly
const {
  getPersonalImpact,
  getCommunityImpact,
  getImpactHeatmap,
  getImpactTimeline,
  generateShareCard,
} = require("../controllers/impactController");

/**
 * @route   GET /api/impact/personal
 * @desc    Get personal impact statistics
 * @access  Private
 */
router.get("/personal", auth, getPersonalImpact);

/**
 * @route   GET /api/impact/community
 * @desc    Get community-wide statistics
 * @access  Public
 */
router.get("/community", getCommunityImpact);

/**
 * @route   GET /api/impact/heatmap
 * @desc    Get geographic heatmap data
 * @access  Public
 */
router.get("/heatmap", getImpactHeatmap);

/**
 * @route   GET /api/impact/timeline
 * @desc    Get historical impact timeline
 * @access  Private
 */
router.get("/timeline", auth, getImpactTimeline);

/**
 * @route   GET /api/impact/share-card
 * @desc    Generate shareable impact card data
 * @access  Private
 */
router.get("/share-card", auth, generateShareCard);

module.exports = router;
