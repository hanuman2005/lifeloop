// backend/models/RecyclingCenter.js
const mongoose = require("mongoose");

const recyclingCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "recycler",
        "ewaste",
        "donation",
        "compost",
        "kabadiwala",
        "pickup",
      ],
      required: true,
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: "Andhra Pradesh" },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    accepts: [{ type: String }], // ["Plastic", "Glass", "Metal", "Electronic"]
    hours: { type: String, default: "Mon-Sat 9AM-6PM" },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    pricePerKg: { type: mongoose.Schema.Types.Mixed }, // { Plastic: 8, Metal: 45, Paper: 12 }
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number], // [longitude, latitude]
    },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
  },
  { timestamps: true },
);

recyclingCenterSchema.index({ location: "2dsphere" }); // for geospatial queries

module.exports = mongoose.model("RecyclingCenter", recyclingCenterSchema);
