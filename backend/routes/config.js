// backend/routes/config.js
const express = require("express");
const router = express.Router();
const {
  getCategories,
  getUnits,
  getWasteCategories,
  getMotivationQuotes,
  getAllConfig,
} = require("../controllers/configController");

// GET all config at once (recommended)
router.get("/all", getAllConfig);

// GET individual config
router.get("/categories", getCategories);
router.get("/units", getUnits);
router.get("/waste-categories", getWasteCategories);
router.get("/motivation-quotes", getMotivationQuotes);

module.exports = router;
