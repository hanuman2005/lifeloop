// ============================================
// models/Listing.js – Full Model (Queue + QR Verification)
// ============================================
const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // Basic Listing Details
    // --------------------------------------------------
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        // Food categories
        "produce",
        "vegetables",
        "cooked_food",
        "canned-goods",
        "dairy",
        "bakery",
        "beverages",
        "frozen",
        "snacks",
        // Non-food categories
        "household-items",
        "clothing",
        "electronics",
        "furniture",
        "books",
        "toys",
        "sports",
        "other",
      ],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    unit: {
      type: String,
      enum: ["items", "kg", "lbs", "bags", "boxes", "servings", "pieces"], // ← added
      default: "items",
    },

    images: [String],
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return (
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 &&
              v[1] >= -90 &&
              v[1] <= 90
            );
          },
          message: "Invalid coordinates [longitude, latitude]",
        },
      },
    },
    pickupLocation: {
      type: String,
      required: [true, "Pickup location is required"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    status: {
      type: String,
      enum: [
        "available",
        "assigned",
        "pending",
        "completed",
        "cancelled",
        "pending_review",
        "rejected",
      ],
      default: "available",
    },

    // --------------------------------------------------
    // Content Moderation Fields
    // --------------------------------------------------
    moderationScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    moderationFlags: [
      {
        field: String,
        type: {
          type: String,
          enum: ["profanity", "spam", "suspicious", "image"],
        },
        details: [String],
        timestamp: { type: Date, default: Date.now },
      },
    ],
    moderationStatus: {
      type: String,
      enum: ["approved", "pending", "rejected", "auto_approved"],
      default: "auto_approved",
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: Date,
    moderationNotes: String,

    expiryDate: Date,
    additionalNotes: {
      type: String,
      maxlength: [500, "Additional notes cannot exceed 500 characters"],
    },
    interestedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: Date,
    assignmentDeadline: Date,
    acceptedAt: Date,

    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
    },

    // Schedule status (add after 'verificationStatus' field)
    hasSchedule: {
      type: Boolean,
      default: false,
    },

    scheduleStatus: {
      type: String,
      enum: [
        "none",
        "proposed",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "none",
    },

    completedAt: Date,
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    urgency: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },
    condition: {
      type: String,
      enum: ["new", "like-new", "good", "fair"],
      default: "good",
    },

    // --------------------------------------------------
    // ✅ Queue System
    // --------------------------------------------------
    queue: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        position: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["waiting", "notified", "expired", "claimed", "cancelled"],
          default: "waiting",
        },
        notifiedAt: Date,
        expiresAt: Date,
      },
    ],
    queueLimit: {
      type: Number,
      default: 10,
    },

    checkIns: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
          },
        },
        notes: String,
      },
    ],

    qrCode: {
      data: String, // Encrypted QR data
      secret: String, // Secret key for lookup
      generatedAt: Date,
      expiresAt: Date, // 24-hour expiry window
      isUsed: {
        type: Boolean,
        default: false,
      },
      usedAt: Date,
      scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    verificationStatus: {
      type: String,
      enum: ["not_generated", "pending", "verified", "expired"],
      default: "not_generated",
    },
  },
  { timestamps: true },
);

//
// --------------------------------------------------
// Indexes
// --------------------------------------------------
listingSchema.index({ location: "2dsphere" });
listingSchema.index({ category: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ urgency: -1 });
listingSchema.index({ assignedTo: 1 });
listingSchema.index({ "qrCode.secret": 1 });
listingSchema.index({ schedule: 1 });

//
// --------------------------------------------------
// Instance Methods — Queue Management
// --------------------------------------------------
listingSchema.methods.addToQueue = async function (userId) {
  const inQueue = this.queue.some(
    (q) => q.user.toString() === userId.toString(),
  );
  if (inQueue) throw new Error("Already in queue");

  if (this.queue.length >= this.queueLimit) throw new Error("Queue is full");

  const position = this.queue.length + 1;
  this.queue.push({
    user: userId,
    position,
    status: "waiting",
  });

  await this.save();
  return { position, queueLength: this.queue.length };
};

listingSchema.methods.removeFromQueue = async function (userId) {
  this.queue = this.queue.filter(
    (q) => q.user.toString() !== userId.toString(),
  );
  this.queue.sort((a, b) => a.joinedAt - b.joinedAt);
  this.queue.forEach((q, i) => (q.position = i + 1));
  await this.save();
};

listingSchema.methods.assignToNextInQueue = async function () {
  const next = this.queue.find((q) => q.status === "waiting");
  if (!next) return null;

  this.assignedTo = next.user;
  this.status = "pending";

  next.status = "notified";
  next.notifiedAt = new Date();
  next.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await this.save();
  return next.user;
};

listingSchema.methods.resolveQueueSlot = async function (userId, action) {
  const entry = this.queue.find((q) => q.user.toString() === userId.toString());
  if (!entry) return;

  entry.status = action === "claimed" ? "claimed" : "expired";
  await this.save();

  if (action !== "claimed") await this.assignToNextInQueue();
};

//
// --------------------------------------------------
// Instance Methods — QR Verification
// --------------------------------------------------
listingSchema.methods.generateQRCode = async function (data, secret) {
  const now = new Date();
  this.qrCode = {
    data,
    secret,
    generatedAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    isUsed: false,
  };
  this.verificationStatus = "pending";
  await this.save();
  return this.qrCode;
};

listingSchema.methods.verifyQRCode = async function (secret, scannedBy) {
  if (!this.qrCode || this.qrCode.secret !== secret)
    throw new Error("Invalid QR code");
  if (this.qrCode.isUsed) throw new Error("QR code already used");
  if (this.qrCode.expiresAt < Date.now()) {
    this.verificationStatus = "expired";
    await this.save();
    throw new Error("QR code expired");
  }

  this.qrCode.isUsed = true;
  this.qrCode.usedAt = new Date();
  this.qrCode.scannedBy = scannedBy;
  this.verificationStatus = "verified";
  await this.save();
  return true;
};

// Add this method (after existing methods)
listingSchema.methods.linkSchedule = async function (scheduleId) {
  this.schedule = scheduleId;
  this.hasSchedule = true;
  this.scheduleStatus = "proposed";
  await this.save();
  return this;
};

listingSchema.methods.updateScheduleStatus = async function (status) {
  this.scheduleStatus = status;
  if (status === "completed") {
    this.status = "completed";
    this.completedAt = new Date();
  }
  await this.save();
  return this;
};

module.exports = mongoose.model("Listing", listingSchema);
