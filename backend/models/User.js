// backend/models/User.js - STREAMLINED FOR DEVELOPMENT

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    userType: {
      type: String,
      enum: ["donor", "recipient", "both", "admin"],
      default: "both",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ============================================
    // PROFILE INFO
    // ============================================
    phoneNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "India" },
    },
    avatar: String,
    bio: {
      type: String,
      maxlength: 500,
    },

    // ============================================
    // LOCATION (CRITICAL FOR LIFELOOP)
    // ============================================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    // ============================================
    // RATINGS & REVIEWS (CORE TRUST)
    // ============================================
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    reviews: [
      {
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, required: true, min: 1, max: 5 },
        review: { type: String, maxlength: 500 },
        listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ============================================
    // TRUST & MODERATION (GOOD FOR DEMO)
    // ============================================
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Simplified badges - keep only essential ones
    badges: [
      {
        type: String,
        enum: [
          "verified_contributor",
          "trusted_recipient",
          "community_champion",
          "early_adopter",
        ],
      },
    ],

    // Activity counters
    completedDonations: { type: Number, default: 0 },
    completedPickups: { type: Number, default: 0 },

    // Moderation
    isSuspended: { type: Boolean, default: false },
    suspendedUntil: Date,
    suspensionReason: String,
    accountWarnings: [
      {
        type: String,
        reason: String,
        issuedAt: { type: Date, default: Date.now },
      },
    ],

    // ============================================
    // LIFELOOP-SPECIFIC METRICS
    // ============================================
    ecoScore: {
      type: Number,
      default: 0,
    },
    wasteAnalysisCount: {
      type: Number,
      default: 0,
    },

    // ============================================
    // FUTURE FEATURES (Commented for reference)
    // ============================================
    // FUTURE: Email verification with tokens
    // passwordResetToken: String,
    // passwordResetExpires: Date,
    // emailVerifyToken: String,
    // emailVerifyExpires: Date,

    // FUTURE: Advanced notification preferences
    emailPreferences: {
      marketing: { type: Boolean, default: true },
      donations: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
    },

    // ============================================
    // OTP VERIFICATION (Email & Phone)
    // ============================================
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailOTP: {
      code: String,
      expiresAt: Date,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneOTP: {
      code: String,
      expiresAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ============================================
// INDEXES
// ============================================
userSchema.index({ location: "2dsphere" }); // Critical for matching
userSchema.index({ email: 1 });
userSchema.index({ trustScore: -1 });
userSchema.index({ "rating.average": -1 });

// ============================================
// VIRTUALS
// ============================================
userSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ============================================
// PRE-SAVE HOOKS
// ============================================
// Password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

// Password comparison
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Hide password in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Update rating
userSchema.methods.updateRating = function () {
  if (this.rating.count === 0) {
    this.rating.average = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.rating.average = Math.round((total / this.rating.count) * 10) / 10;
  }
};

// Add review
userSchema.methods.addReview = async function (
  reviewerId,
  rating,
  reviewText,
  listingId,
) {
  // Prevent duplicate reviews
  if (
    this.reviews.some((r) => r.reviewer.toString() === reviewerId.toString())
  ) {
    throw new Error("You already reviewed this user");
  }

  this.reviews.unshift({
    reviewer: reviewerId,
    rating,
    review: reviewText,
    listing: listingId,
  });

  this.rating.count += 1;
  this.updateRating();

  await this.save();
  return this.reviews[0];
};

// Simple badge awarding
userSchema.methods.awardBadge = async function (badgeName) {
  if (!this.badges.includes(badgeName)) {
    this.badges.push(badgeName);
    this.trustScore = Math.min(this.trustScore + 5, 100);
    await this.save();
  }
  return this;
};

// Check and award automatic badges
userSchema.methods.checkAndAwardBadges = async function () {
  if (
    this.completedDonations >= 5 &&
    !this.badges.includes("verified_contributor")
  ) {
    await this.awardBadge("verified_contributor");
  }

  if (
    this.completedPickups >= 5 &&
    !this.badges.includes("trusted_recipient")
  ) {
    await this.awardBadge("trusted_recipient");
  }

  if (
    this.trustScore >= 80 &&
    this.completedDonations + this.completedPickups >= 15 &&
    !this.badges.includes("community_champion")
  ) {
    await this.awardBadge("community_champion");
  }

  return this;
};

// Increment donation counter
userSchema.methods.incrementCompletedDonations = async function () {
  this.completedDonations += 1;
  this.trustScore = Math.min(this.trustScore + 2, 100);
  await this.checkAndAwardBadges();
  await this.save();
  return this;
};

// Increment pickup counter
userSchema.methods.incrementCompletedPickups = async function () {
  this.completedPickups += 1;
  this.trustScore = Math.min(this.trustScore + 2, 100);
  await this.checkAndAwardBadges();
  await this.save();
  return this;
};

// Moderation methods
userSchema.methods.addWarning = async function (type, reason) {
  this.accountWarnings.push({ type, reason });
  this.trustScore = Math.max(this.trustScore - 10, 0);

  // Auto-suspend after 3 warnings
  if (this.accountWarnings.length >= 3) {
    await this.suspend("Multiple violations", 30);
  }

  await this.save();
  return this;
};

userSchema.methods.suspend = async function (reason, days = 30) {
  this.isSuspended = true;
  this.suspensionReason = reason;
  this.suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await this.save();
  return this;
};

userSchema.methods.unsuspend = async function () {
  this.isSuspended = false;
  this.suspensionReason = null;
  this.suspendedUntil = null;
  await this.save();
  return this;
};

module.exports = mongoose.model("User", userSchema);
