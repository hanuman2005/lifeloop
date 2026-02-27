const mongoose = require("mongoose");

const donationCenterSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "donation",
        "recycling",
        "both",
        "recycler",
        "ewaste",
        "compost",
        "kabadiwala",
        "pickup",
      ],
      default: "donation",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    phone: {
      type: String,
      required: true,
    },
    email: String,
    website: String,
    hours: {
      Monday: { open: String, close: String, closed: Boolean },
      Tuesday: { open: String, close: String, closed: Boolean },
      Wednesday: { open: String, close: String, closed: Boolean },
      Thursday: { open: String, close: String, closed: Boolean },
      Friday: { open: String, close: String, closed: Boolean },
      Saturday: { open: String, close: String, closed: Boolean },
      Sunday: { open: String, close: String, closed: Boolean },
    },
    acceptedItems: [String],
    acceptedMaterials: [String],
    operatingHours: String,
    rating: { type: Number, default: 0 },
    prices: mongoose.Schema.Types.Mixed,
    specialNotes: String,
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Geospatial index
donationCenterSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DonationCenter", donationCenterSchema);
