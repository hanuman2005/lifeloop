// backend/models/PickupRequest.js
const mongoose = require("mongoose");

const pickupRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    centerId: { type: mongoose.Schema.Types.ObjectId, ref: "RecyclingCenter" },

    items: [
      {
        label: { type: String, required: true },
        category: { type: String, required: true },
        quantity: { type: String, default: "1 item" }, // "2kg", "3 bottles"
        imageUri: { type: String },
      },
    ],

    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      landmark: { type: String },
    },

    scheduledDate: { type: Date, required: true },
    scheduledSlot: { type: String, required: true }, // "9AM-12PM", "12PM-3PM", "3PM-6PM"
    status: {
      type: String,
      enum: ["pending", "confirmed", "picked_up", "cancelled"],
      default: "pending",
    },
    estimatedAmount: { type: Number, default: 0 }, // estimated payment to user (for recyclables)
    actualAmount: { type: Number },
    collectorName: { type: String },
    collectorPhone: { type: String },
    notes: { type: String },
    pointsEarned: { type: Number, default: 30 },

    // Confirmation
    confirmedAt: { type: Date },
    pickedUpAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PickupRequest", pickupRequestSchema);
