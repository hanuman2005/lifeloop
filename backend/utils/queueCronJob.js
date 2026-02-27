const cron = require("node-cron");
const Listing = require("../models/Listing");
const notificationHelper = require("./notificationHelper");

let io; // ✅ ADD THIS

// ✅ ADD THIS FUNCTION
const setIO = (socketIO) => {
  io = socketIO;
};

// Run every hour
const checkExpiredQueueAssignments = cron.schedule("0 * * * *", async () => {
  try {
    console.log("🔍 Checking for expired queue assignments...");

    const listings = await Listing.find({
      status: "pending",
      "queue.status": "notified",
      "queue.expiresAt": { $lt: new Date() },
    });

    for (const listing of listings) {
      const expiredEntry = listing.queue.find(
        (q) => q.status === "notified" && q.expiresAt < new Date(),
      );

      if (expiredEntry) {
        console.log(`⏰ Assignment expired for listing ${listing._id}`);

        await listing.removeFromQueue(expiredEntry.user);

        const nextUser = await listing.assignToNextInQueue();

        if (nextUser && io) {
          // ✅ FIXED
          await notificationHelper.notifyAssignedFromQueue(
            listing,
            nextUser,
            io,
          );
        } else {
          listing.assignedTo = null;
          listing.status = "available";
          await listing.save();
        }

        // Notify expired user
        if (io) {
          // ✅ ADD CHECK
          await notificationHelper.create({
            recipient: expiredEntry.user,
            type: "queue_expired",
            title: "⏰ Assignment Expired",
            message: `Your 24-hour window for "${listing.title}" has expired`,
            listing: listing._id,
            io, // ✅ PASS io
          });
        }
      }
    }

    console.log("✅ Queue expiry check complete");
  } catch (error) {
    console.error("❌ Error in queue cron job:", error);
  }
});

// 24-hour assignment timeout — auto-reassign if no response
const checkAssignmentTimeout = cron.schedule("*/15 * * * *", async () => {
  try {
    console.log(
      "⏰ Checking for assignment timeouts (no accept/decline in 24hrs)...",
    );

    const now = new Date();
    const listings = await Listing.find({
      assignedTo: { $ne: null },
      status: "pending",
      assignedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // 24 hours ago
    }).populate("queue.user assignedTo");

    for (const listing of listings) {
      console.log(
        `⏱️ Assignment timeout for ${listing.title} (assigned to ${listing.assignedTo?.firstName})`,
      );

      const prevRecipient = listing.assignedTo._id;
      listing.assignedTo = null;
      listing.status = "available";

      // Find next in queue
      const nextQueueEntry = listing.queue.find(
        (q) =>
          q.user._id.toString() !== prevRecipient.toString() &&
          q.status === "waiting",
      );

      if (nextQueueEntry) {
        listing.assignedTo = nextQueueEntry.user._id;
        listing.status = "pending";
        listing.assignedAt = now;
        nextQueueEntry.status = "notified";
        nextQueueEntry.notifiedAt = now;

        await listing.save();

        console.log(
          `✅ Auto-reassigned to next queue member: ${nextQueueEntry.user.firstName}`,
        );

        if (io) {
          const Notification = require("../models/Notification");
          await Notification.create({
            recipient: nextQueueEntry.user._id,
            type: "assignment_notified",
            title: "🎯 Item Ready for You!",
            message: `You've been assigned: ${listing.title}. Respond within 24 hours.`,
            data: { listingId: listing._id },
          });
        }
      } else {
        await listing.save();
        console.log(`✅ No more queue members, listing now available to all`);
      }
    }

    console.log("✅ Assignment timeout check complete");
  } catch (error) {
    console.error("❌ Error in assignment timeout cron:", error);
  }
});

// ✅ EXPORT BOTH
module.exports = {
  checkExpiredQueueAssignments,
  checkAssignmentTimeout,
  setIO,
};
