const express = require("express");
const router = express.Router();
const {
  getMyPoints,
  awardPoints,
  getWasteDiary,
  getLeaderboard,
  getCityImpact,
} = require("../controllers/ecoController");
const { auth } = require("../middleware/auth");

router.get("/points", auth, getMyPoints);
router.post("/award", auth, awardPoints);
router.get("/diary", auth, getWasteDiary);
router.get("/leaderboard", auth, getLeaderboard);
router.get("/impact", auth, getCityImpact);

module.exports = router;
