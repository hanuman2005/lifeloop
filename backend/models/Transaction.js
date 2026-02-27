// backend/models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // QR Code data
    qrCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    qrCodeHash: {
      type: String,
      required: true,
      unique: true,
    },
    qrCodeImage: {
      type: String, // Base64 data URL of QR image
    },

    // Transaction parties
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "completed", "expired", "cancelled"],
      default: "pending",
    },

    // Timestamps
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    scannedAt: {
      type: Date,
    },

    // Verification details
    verificationMethod: {
      type: String,
      enum: ["qr_scan", "manual", "auto"],
      default: "qr_scan",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Location data (for verification)
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: [Number], // [longitude, latitude]
    },
    verificationLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: [Number],
    },

    // Impact tracking
    impact: {
      wastePreventedKg: {
        type: Number,
        default: 0,
      },
      co2SavedKg: {
        type: Number,
        default: 0,
      },
      mealsProvided: {
        type: Number,
        default: 0,
      },
    },

    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },

    // Metadata
    metadata: {
      deviceInfo: String,
      scanDuration: Number, // milliseconds
      attemptCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ donor: 1, status: 1 });
transactionSchema.index({ recipient: 1, status: 1 });
transactionSchema.index({ listing: 1 });

// Virtual for checking if expired
transactionSchema.virtual("isExpired").get(function () {
  return this.status === "pending" && new Date() > this.expiresAt;
});

// Method to mark as completed
transactionSchema.methods.complete = async function (
  verifiedBy,
  verificationLocation
) {
  this.status = "completed";
  this.completedAt = new Date();
  this.scannedAt = new Date();
  this.verifiedBy = verifiedBy;

  if (verificationLocation) {
    this.verificationLocation = verificationLocation;
  }

  return this.save();
};

// Method to calculate impact
transactionSchema.methods.calculateImpact = function (listingData) {
  // Basic calculations (you can enhance these)
  const quantity = listingData.quantity || 1;
  const estimatedWeight = listingData.estimatedWeight || 1; // kg

  this.impact = {
    wastePreventedKg: quantity * estimatedWeight,
    co2SavedKg: quantity * estimatedWeight * 2.5, // Rough estimate
    mealsProvided: Math.floor((quantity * estimatedWeight) / 0.5), // 0.5kg per meal
  };

  return this.impact;
};

// Static method to cleanup expired QR codes
transactionSchema.statics.cleanupExpired = async function () {
  const result = await this.updateMany(
    {
      status: "pending",
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: "expired" },
    }
  );

  return result;
};

// Pre-save hook to set expiration
transactionSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    // Default: QR expires in 24 hours
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
