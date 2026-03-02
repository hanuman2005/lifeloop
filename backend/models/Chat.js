// ============================================
// models/Chat.js - FINAL VERSION (NO WARNINGS)
// Copy this entire file to backend/models/Chat.js
// ============================================
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      // ✅ REMOVED: index: true (this was causing duplicate warning)
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: false,
    },
    lastMessage: {
      content: String,
      timestamp: { type: Date, default: Date.now },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for sorting by recent messages
chatSchema.index({ "lastMessage.timestamp": -1 });

// ✅ UNIQUE index on participants (ONE chat per user pair)
// Sort participants to ensure consistent ordering for unique index
chatSchema.pre("save", function (next) {
  if (this.participants && this.participants.length > 1) {
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

chatSchema.index({ participants: 1 }, { unique: true });

module.exports = mongoose.model("Chat", chatSchema);
