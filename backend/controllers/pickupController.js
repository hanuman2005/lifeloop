// backend/controllers/pickupController.js
const PickupRequest = require("../models/PickupRequest");
const EcoPoints = require("../models/EcoPoints");
const WasteDiary = require("../models/WasteDiary");
const RecyclingCenter = require("../models/RecyclingCenter");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pickup/request
// Schedule a waste pickup
// ─────────────────────────────────────────────────────────────────────────────
const createPickupRequest = async (req, res) => {
  try {
    const { items, address, scheduledDate, scheduledSlot, centerId } = req.body;

    if (!items?.length || !address || !scheduledDate || !scheduledSlot) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Calculate estimated payment for recyclables
    const PRICES = {
      Plastic: 8,
      Metal: 35,
      Paper: 11,
      Glass: 1,
      Electronic: 50,
    };
    let estimatedAmount = 0;
    items.forEach((item) => {
      estimatedAmount += PRICES[item.category] || 0;
    });

    const pickup = await PickupRequest.create({
      userId: req.user._id,
      centerId,
      items,
      address,
      scheduledDate: new Date(scheduledDate),
      scheduledSlot,
      estimatedAmount,
    });

    // Award eco points
    let eco = await EcoPoints.findOne({ userId: req.user._id });
    if (!eco) eco = await EcoPoints.create({ userId: req.user._id });
    await eco.awardPoints(
      "pickup_request",
      `Scheduled pickup for ${items.length} item(s)`,
      {
        pickupId: pickup._id,
        items: items.map((i) => i.label),
      },
    );

    // Add to waste diary
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let diary = await WasteDiary.findOne({ userId: req.user._id, month });
    if (!diary)
      diary = await WasteDiary.create({
        userId: req.user._id,
        month,
        year: now.getFullYear(),
      });

    for (const item of items) {
      await diary.addEntry(item.label, item.category, "pickup_scheduled");
    }

    return res.json({
      success: true,
      data: pickup,
      message: `Pickup scheduled for ${new Date(scheduledDate).toLocaleDateString("en-IN")} ${scheduledSlot}`,
      pointsEarned: 30,
      estimatedAmount,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pickup/my-requests
// Get user's pickup requests
// ─────────────────────────────────────────────────────────────────────────────
const getMyPickups = async (req, res) => {
  try {
    const pickups = await PickupRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("centerId", "name phone address");

    return res.json({ success: true, data: pickups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/pickup/:id/cancel
// Cancel a pickup request
// ─────────────────────────────────────────────────────────────────────────────
const cancelPickup = async (req, res) => {
  try {
    const pickup = await PickupRequest.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!pickup)
      return res
        .status(404)
        .json({ success: false, error: "Pickup not found" });
    if (pickup.status === "picked_up")
      return res
        .status(400)
        .json({ success: false, error: "Cannot cancel completed pickup" });

    pickup.status = "cancelled";
    pickup.cancelledAt = new Date();
    pickup.cancelReason = req.body.reason || "Cancelled by user";
    await pickup.save();

    return res.json({
      success: true,
      message: "Pickup cancelled successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/pickup/:id/confirm  (Admin/Collector)
// Confirm pickup was completed
// ─────────────────────────────────────────────────────────────────────────────
const confirmPickup = async (req, res) => {
  try {
    const { actualAmount, collectorName } = req.body;

    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup)
      return res.status(404).json({ success: false, error: "Not found" });

    pickup.status = "picked_up";
    pickup.pickedUpAt = new Date();
    pickup.actualAmount = actualAmount;
    pickup.collectorName = collectorName;
    await pickup.save();

    // Update user's diary with actual confirmation
    const userId = pickup.userId;
    let eco = await EcoPoints.findOne({ userId });
    if (eco) {
      await eco.awardPoints(
        "pickup_request",
        "Pickup confirmed and completed!",
        {
          pickupId: pickup._id,
          amount: actualAmount,
        },
      );
    }

    return res.json({
      success: true,
      message: "Pickup confirmed",
      data: pickup,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pickup/slots?date=2026-02-28
// Get available pickup time slots for a date
// ─────────────────────────────────────────────────────────────────────────────
const getAvailableSlots = async (req, res) => {
  const { date } = req.query;
  const slots = [
    { id: "morning", label: "Morning", time: "8AM - 12PM", available: true },
    {
      id: "afternoon",
      label: "Afternoon",
      time: "12PM - 4PM",
      available: true,
    },
    { id: "evening", label: "Evening", time: "4PM - 7PM", available: true },
  ];

  // Check existing bookings to mark full slots
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const bookings = await PickupRequest.countDocuments({
      scheduledDate: { $gte: start, $lt: end },
      status: { $ne: "cancelled" },
    });

    // Simple cap — if more than 20 bookings per slot, mark unavailable
    if (bookings > 20) slots[0].available = false;
    if (bookings > 40) slots[1].available = false;
    if (bookings > 60) slots[2].available = false;
  }

  return res.json({ success: true, slots });
};

module.exports = {
  createPickupRequest,
  getMyPickups,
  cancelPickup,
  confirmPickup,
  getAvailableSlots,
};
