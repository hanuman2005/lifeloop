// ============================================
// models/BinReport.js — M2 Crowd-Sensing Bin Network
// ============================================
//
// A citizen report of a public bin's state. Replaces IoT fill-level sensors with
// participatory sensing: the scalability argument for the whole module is that a
// citizen walking past costs nothing, while a sensor costs hardware plus
// maintenance for every bin in the ward.
//
// Because reports are unverified and earn points, they are also the most
// gameable surface in the platform. The anti-gaming fields here — imageHash,
// weight, accepted — exist so a report can be down-weighted or rejected without
// being deleted, which keeps the audit trail intact.

const mongoose = require("mongoose");

const STATUSES = ["ok", "full", "overflowing"];

const binReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: STATUSES,
      required: [true, "Bin status is required"],
    },

    // GeoJSON, matching the convention used by Listing and User so the same
    // $near / $geoWithin queries work across the codebase.
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (v) =>
            Array.isArray(v) &&
            v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 &&
            v[1] >= -90 && v[1] <= 90,
          message: "Invalid coordinates [longitude, latitude]",
        },
      },
    },

    // Reported by the device. A wildly imprecise fix is still usable for a ward
    // map but should not be trusted to place a bin, so it is recorded and used
    // when weighting the report.
    accuracyMetres: {
      type: Number,
      min: 0,
    },

    imageUrl: String,

    // SHA-256 of the submitted photograph. The same photo sent twice is the
    // simplest way to farm points, and comparing hashes catches it without
    // storing or re-downloading the image.
    imageHash: {
      type: String,
      index: true,
    },

    ward: {
      type: String,
      index: true,
    },

    note: {
      type: String,
      maxlength: [200, "Note cannot exceed 200 characters"],
    },

    // ── Trust ────────────────────────────────────────────────────────────────

    // Reporter reputation at submission time, snapshotted rather than joined so
    // that recomputing someone's reputation later cannot rewrite history.
    weight: {
      type: Number,
      default: 1,
      min: 0,
      max: 3,
    },

    // False when a rule rejected the report. Kept rather than deleted so the
    // rejection rate is measurable — synopsis section 11 promises anti-gaming,
    // and "we reject N% of submissions" is the evidence for it.
    accepted: {
      type: Boolean,
      default: true,
      index: true,
    },

    rejectionReason: {
      type: String,
      enum: ["duplicate_image", "rate_limited", "implausible_location", "spam_pattern"],
    },

    // Set when a collector services the bin, which is what closes the loop from
    // report to collection.
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Ward maps and route building are always "recent reports near here".
binReportSchema.index({ location: "2dsphere" });
binReportSchema.index({ createdAt: -1 });
binReportSchema.index({ status: 1, accepted: 1, createdAt: -1 });
// Duplicate detection looks up one reporter's recent hashes.
binReportSchema.index({ reporter: 1, imageHash: 1, createdAt: -1 });

binReportSchema.statics.STATUSES = STATUSES;

/**
 * Reports that should drive collection: accepted, unresolved, needing attention,
 * and recent enough to still be true.
 *
 * A bin reported full three days ago tells you nothing about today, and routing a
 * truck to it wastes the trip the module exists to save.
 */
binReportSchema.statics.actionable = function ({ hours = 24 } = {}) {
  return this.find({
    accepted: true,
    resolvedAt: { $exists: false },
    status: { $in: ["full", "overflowing"] },
    createdAt: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
  });
};

module.exports = mongoose.model("BinReport", binReportSchema);
