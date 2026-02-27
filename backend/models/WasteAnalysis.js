// backend/models/WasteAnalysis.js
const mongoose = require("mongoose");

const wasteAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Image data
    imageUrl: {
      type: String,
      required: false, // Optional since images processed client-side
    },

    userDescription: {
      type: String,
      maxlength: 500,
    },

    // AI Analysis Results (from TensorFlow.js)
    tfLabel: {
      type: String,
      required: true, // Original MobileNet label
    },

    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    material: {
      type: String,
      required: true,
      enum: [
        "Plastic",
        "Paper/Cardboard",
        "Paper",
        "Glass",
        "Metal",
        "Cloth/Textile",
        "Textile",
        "E-Waste",
        "Electronic",
        "Organic Waste",
        "Organic",
        "Wood",
        "Other",
      ],
    },
    materialComposition: [
      {
        name: String,
        percentage: Number,
        hazard: {
          type: String,
          enum: ["low", "medium", "high", "unknown"],
        },
        recyclable: Boolean,
      },
    ],

    recyclingComplexity: {
      type: String,
      enum: ["low", "medium", "high", "unknown"],
    },

    environmentalImpact: {
      recyclablePercentage: Number,
      co2SavedByRecycling: Number,
      landfillDiversionPotential: String,
      valueRecoveryPotential: String,
      requiresSpecialHandling: Boolean,
    },

    hazards: {
      hasHazardousMaterials: Boolean,
      criticalHazards: [
        {
          material: String,
          warning: String,
          risk: String,
        },
      ],
      mediumHazards: [
        {
          material: String,
          warning: String,
          risk: String,
        },
      ],
      handlingInstructions: [String],
    },

    recyclingRecommendations: [
      {
        priority: String,
        material: String,
        action: String,
        reason: String,
      },
    ],

    eWasteCategory: String,

    // Advice data
    reuseIdeas: [
      {
        type: String,
      },
    ],

    upcycleIdeas: [
      {
        type: String,
      },
    ],

    recyclingGuidance: {
      type: String,
    },

    donationPossible: {
      type: Boolean,
      default: false,
    },

    donationCategory: {
      type: String,
      enum: [
        "electronics",
        "clothing",
        "furniture",
        "books",
        "household-items",
        "toys",
        "other",
        null,
      ],
    },

    // Environmental Impact
    impact: {
      carbonSaved: {
        type: Number,
        default: 0,
      },
      wasteDiverted: {
        type: Number,
        default: 0,
      },
      ecoScore: {
        type: Number,
        default: 0,
      },
    },

    // User location (optional)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // Tracking
    saved: {
      type: Boolean,
      default: false,
    },

    convertedToListing: {
      type: Boolean,
      default: false,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
    },

    // Device info (for analytics)
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop"],
    },
    analysisCount: {
      type: Number,
      default: 1,
    },

    lastAnalyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
wasteAnalysisSchema.index({ user: 1, createdAt: -1 });
wasteAnalysisSchema.index({ material: 1 });
wasteAnalysisSchema.index({ location: "2dsphere" });
wasteAnalysisSchema.index({ convertedToListing: 1 });
wasteAnalysisSchema.index({ user: 1, tfLabel: 1, material: 1, createdAt: -1 });

// Virtual for age
wasteAnalysisSchema.virtual("age").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Static method: Get user's total eco score
wasteAnalysisSchema.statics.getUserTotalEcoScore = async function (userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalScore: { $sum: "$impact.ecoScore" },
        totalCarbon: { $sum: "$impact.carbonSaved" },
        totalWaste: { $sum: "$impact.wasteDiverted" },
        count: { $sum: 1 },
      },
    },
  ]);

  return (
    result[0] || {
      totalScore: 0,
      totalCarbon: 0,
      totalWaste: 0,
      count: 0,
    }
  );
};

// Static method: Get material breakdown
wasteAnalysisSchema.statics.getMaterialStats = async function (userId = null) {
  const match = userId ? { user: mongoose.Types.ObjectId(userId) } : {};

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$material",
        count: { $sum: 1 },
        totalEcoScore: { $sum: "$impact.ecoScore" },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method: Get community stats
wasteAnalysisSchema.statics.getCommunityStats = async function () {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        totalCarbonSaved: { $sum: "$impact.carbonSaved" },
        totalWasteDiverted: { $sum: "$impact.wasteDiverted" },
        totalListingsCreated: {
          $sum: { $cond: ["$convertedToListing", 1, 0] },
        },
        avgConfidence: { $avg: "$confidence" },
      },
    },
  ]);

  return (
    result[0] || {
      totalAnalyses: 0,
      totalCarbonSaved: 0,
      totalWasteDiverted: 0,
      totalListingsCreated: 0,
      avgConfidence: 0,
    }
  );
};

// Instance method: Convert to listing
wasteAnalysisSchema.methods.markAsConverted = async function (listingId) {
  this.convertedToListing = true;
  this.listingId = listingId;
  return await this.save();
};

module.exports = mongoose.model("WasteAnalysis", wasteAnalysisSchema);
