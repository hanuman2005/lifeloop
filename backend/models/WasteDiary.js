// backend/models/WasteDiary.js
const mongoose = require("mongoose");

const wasteDiarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: { type: String, required: true }, // "2026-02" format
    year: { type: Number, required: true },

    entries: [
      {
        date: { type: Date, default: Date.now },
        itemLabel: { type: String, required: true },
        category: { type: String, required: true }, // Plastic, Glass, Metal etc
        action: { type: String, required: true }, // "scanned", "reused", "upcycled", "donated", "recycled", "pickup_scheduled"
        weightKg: { type: Number, default: 0.3 }, // estimated weight
        co2Saved: { type: Number, default: 0 }, // kg CO2 equivalent
        pointsEarned: { type: Number, default: 0 },
        imageUri: { type: String },
        notes: { type: String },
      },
    ],

    // Monthly summary
    summary: {
      totalItems: { type: Number, default: 0 },
      totalWeightKg: { type: Number, default: 0 },
      totalCo2Saved: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      byCategory: {
        Plastic: { type: Number, default: 0 },
        Glass: { type: Number, default: 0 },
        Metal: { type: Number, default: 0 },
        Paper: { type: Number, default: 0 },
        Organic: { type: Number, default: 0 },
        Electronic: { type: Number, default: 0 },
        Textile: { type: Number, default: 0 },
        Wood: { type: Number, default: 0 },
      },
      byAction: {
        scanned: { type: Number, default: 0 },
        reused: { type: Number, default: 0 },
        upcycled: { type: Number, default: 0 },
        donated: { type: Number, default: 0 },
        recycled: { type: Number, default: 0 },
        pickup_scheduled: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true },
);

// CO2 saved per kg by category (approximate values from research)
const CO2_PER_KG = {
  Plastic: 2.5, // kg CO2 saved per kg plastic recycled vs landfill
  Glass: 0.3,
  Metal: 4.0, // aluminum recycling saves a lot
  Paper: 1.1,
  Organic: 0.5, // composting vs landfill methane
  Electronic: 3.0, // e-waste proper recycling
  Textile: 3.5,
  Wood: 0.8,
};

// Average weight per item by category (kg)
const AVG_WEIGHT_KG = {
  Plastic: 0.15,
  Glass: 0.4,
  Metal: 0.2,
  Paper: 0.3,
  Organic: 0.5,
  Electronic: 0.8,
  Textile: 0.4,
  Wood: 2.0,
};

wasteDiarySchema.methods.addEntry = async function (
  itemLabel,
  category,
  action,
  imageUri = null,
) {
  const weightKg = AVG_WEIGHT_KG[category] || 0.3;
  const co2Saved = weightKg * (CO2_PER_KG[category] || 1.0);

  const POINTS = {
    scanned: 5,
    reused: 20,
    upcycled: 25,
    donated: 25,
    recycled: 15,
    pickup_scheduled: 30,
  };
  const pointsEarned = POINTS[action] || 5;

  this.entries.push({
    itemLabel,
    category,
    action,
    weightKg,
    co2Saved,
    pointsEarned,
    imageUri,
  });

  // Update summary
  this.summary.totalItems++;
  this.summary.totalWeightKg = +(this.summary.totalWeightKg + weightKg).toFixed(
    2,
  );
  this.summary.totalCo2Saved = +(this.summary.totalCo2Saved + co2Saved).toFixed(
    2,
  );
  this.summary.totalPoints += pointsEarned;
  this.summary.byCategory[category] =
    (this.summary.byCategory[category] || 0) + 1;
  this.summary.byAction[action] = (this.summary.byAction[action] || 0) + 1;

  await this.save();
  return { weightKg, co2Saved, pointsEarned };
};

module.exports = mongoose.model("WasteDiary", wasteDiarySchema);
