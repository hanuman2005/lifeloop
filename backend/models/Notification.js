// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Recipient of the notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Sender (who triggered the notification)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Notification type
    // backend/models/Notification.js
    // Find the type enum and UPDATE it to:

    type: {
      type: String,
      enum: [
        "new_listing",
        "interest",
        "assignment",
        "assignment_accepted",
        "assignment_failed",
        "message",
        "rating",
        "completion",
        "pickup_scheduled",
        "pickup_completed",
        "listing_expired",
        "listing_updated",
        "listing_cancelled",
        "listing_unavailable",
        "impact_milestone",
        "badge_earned",
        "system",
      ],
      required: true,
      index: true,
    },
    // Related entities
    relatedListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
    },

    relatedChat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },

    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },

    // Notification content
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Icon/emoji for notification
    icon: {
      type: String,
      default: "🔔",
    },

    // Read status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
    },

    // Action URL (where to navigate on click)
    actionUrl: {
      type: String,
    },

    // Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Additional data (flexible JSON field)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
notificationSchema.index({ type: 1, createdAt: -1 });

// Auto-delete old read notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { read: true },
  },
);

// Virtual for time ago
notificationSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    { recipient: userId, read: false },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    },
  );
  return result;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    recipient: userId,
    read: false,
  });
};

// Static method to create and send notification
notificationSchema.statics.createAndSend = async function (
  notificationData,
  io,
) {
  const notification = await this.create(notificationData);

  // Populate sender and related data
  await notification.populate([
    { path: "sender", select: "firstName lastName avatar" },
    { path: "relatedListing", select: "title images category" },
  ]);

  // Send via Socket.io if provided
  if (io) {
    io.to(notification.recipient.toString()).emit(
      "newNotification",
      notification,
    );
    console.log(`🔔 Notification sent to user ${notification.recipient}`);
  }

  return notification;
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
