const express = require("express");
const router = express.Router();
const {
  createPickupRequest,
  getMyPickups,
  cancelPickup,
  confirmPickup,
  getAvailableSlots,
} = require("../controllers/pickupController");
const { auth } = require("../middleware/auth");

router.post("/request", auth, createPickupRequest);
router.get("/my-requests", auth, getMyPickups);
router.get("/slots", auth, getAvailableSlots);
router.patch("/:id/cancel", auth, cancelPickup);
router.patch("/:id/confirm", auth, confirmPickup);

module.exports = router;
