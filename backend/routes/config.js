// backend/routes/config.js
const express = require("express");
const router = express.Router();
const {
  getCategories,
  getUnits,
  getWasteCategories,
  getMotivationQuotes,
  getAllConfig,
  getIdeas,
  getTaskStatus,
} = require("../controllers/configController");

// GET all config at once (recommended)
router.get("/all", getAllConfig);

// GET individual config
router.get("/categories", getCategories);
router.get("/units", getUnits);
router.get("/waste-categories", getWasteCategories);
router.get("/motivation-quotes", getMotivationQuotes);
router.get("/ideas", getIdeas);

// GET task status (for Celery async scraping)
router.get("/task-status/:taskId", getTaskStatus);

module.exports = router;
