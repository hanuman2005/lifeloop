// backend/routes/bins.js — M2 Crowd-Sensing Bin Network
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { auth } = require("../middleware/auth");
const {
  createReport,
  getNearby,
  getWardSummary,
  getActionable,
  getCollectionRoute,
  resolveReport,
  getMyReports,
} = require("../controllers/binController");

// Transport-level ceiling. The real per-user limit and the duplicate, geofence and
// spam rules live in services/binTrust.js, because those need to record a rejected
// report rather than silently drop the request — the rejection rate is evidence
// that the anti-gaming works.
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  message: { success: false, message: "Too many bin reports. Please try again later." },
});

router.post("/report", auth, reportLimiter, createReport);
router.get("/nearby", auth, getNearby);
router.get("/wards", auth, getWardSummary);
router.get("/actionable", auth, getActionable);
router.post("/route", auth, getCollectionRoute);
router.get("/my-reports", auth, getMyReports);
router.patch("/:id/resolve", auth, resolveReport);

module.exports = router;
