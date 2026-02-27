const express = require("express");
const router = express.Router();
const {
  getNearby,
  getPrices,
  seedCenters,
} = require("../controllers/mapController");
const { auth, adminAuth } = require("../middleware/auth");

router.get("/nearby", auth, getNearby);
router.get("/prices", auth, getPrices);
router.post("/seed", auth, adminAuth, seedCenters);

module.exports = router;
