// ============================================
// models/CollectionTask.js — M4 Collector Formalization
// ============================================
//
// A unit of work assigned to a registered collector. Tasks are generated from
// bin reports that need emptying (M2) and from Exchange donations awaiting
// pickup (M3), which is what connects the modules into a loop rather than three
// separate features.
//
// Verification is before/after photographs plus a citizen confirmation. Not a
// weighbridge — the synopsis is explicit that weight-scale integration is future
// scope, and pretending otherwise would put an unverifiable number in the ledger.

const mongoose = require("mongoose");

const STATUSES = ["open", "assigned", "in_progress", "completed", "verified", "cancelled"];
const SOURCES = ["bin_report", "listing", "pickup_request"];

const collectionTaskSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: SOURCES,
      required: true,
    },

    // Polymorphic by design: the referenced collection depends on `source`, so
    // refPath rather than a fixed ref.
    sourceRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sourceModel",
    },
    sourceModel: {
      type: String,
      enum: ["BinReport", "Listing", "PickupRequest"],
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

    ward: { type: String, index: true },

    status: {
      type: String,
      enum: STATUSES,
      default: "open",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedAt: Date,

    // Urgency inherited from the source. An overflowing bin outranks a book
    // waiting for collection.
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },

    // ── Verification ─────────────────────────────────────────────────────────
    beforePhotoUrl: String,
    afterPhotoUrl: String,

    completedAt: Date,

    // The citizen who raised the source confirms the work happened. Without an
    // independent confirmation a collector could mark their own work done, which
    // would make the ledger worthless as evidence.
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,

    notes: {
      type: String,
      maxlength: [300, "Notes cannot exceed 300 characters"],
    },
  },
  { timestamps: true },
);

// Assignment is "open tasks near this collector".
collectionTaskSchema.index({ location: "2dsphere" });
collectionTaskSchema.index({ status: 1, priority: -1, createdAt: 1 });
// One task per source document; regenerating assignments must not duplicate work.
collectionTaskSchema.index({ sourceRef: 1 }, { unique: true });

collectionTaskSchema.statics.STATUSES = STATUSES;
collectionTaskSchema.statics.SOURCES = SOURCES;

module.exports = mongoose.model("CollectionTask", collectionTaskSchema);
