// backend/routes/collector.js — M4 Collector Formalization
const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const {
  generateTasks,
  getNearbyTasks,
  acceptTask,
  completeTask,
  verifyTask,
  getLedger,
  getMyTasks,
} = require("../controllers/collectorController");

router.post("/tasks/generate", auth, generateTasks);
router.get("/tasks/nearby", auth, getNearbyTasks);
router.get("/tasks/mine", auth, getMyTasks);
router.post("/tasks/:id/accept", auth, acceptTask);
router.post("/tasks/:id/complete", auth, completeTask);
// Verification is done by the citizen who raised the work, not the collector,
// so this route is deliberately not gated on the collector role.
router.post("/tasks/:id/verify", auth, verifyTask);
router.get("/ledger", auth, getLedger);

module.exports = router;
