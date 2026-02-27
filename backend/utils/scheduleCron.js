// backend/utils/scheduleCron.js - NEW FILE
const cron = require("node-cron");
const Schedule = require("../models/Schedule");
const Listing = require("../models/Listing");
const User = require("../models/User");
const notificationHelper = require("./notificationHelper");
const smsService = require("../services/smsService");

/**
 * Initialize schedule automation cron jobs
 */
const initScheduleCronJobs = (io) => {
  console.log("🕐 Initializing schedule cron jobs...");

  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running schedule automation...");

    try {
      // 1. Send reminders for upcoming pickups
      await sendUpcomingReminders(io);

      // 2. Mark expired schedules
      await markExpiredSchedules(io);

      // 3. Handle assignment timeouts (24-hour expiry)
      await handleAssignmentTimeouts(io);

      console.log("✅ Schedule automation completed");
    } catch (error) {
      console.error("❌ Schedule automation error:", error);
    }
  });

  console.log("✅ Schedule cron jobs initialized");
};

/**
 * Send reminders for schedules within 24 hours
 */
const sendUpcomingReminders = async (io) => {
  try {
    const schedules = await Schedule.findNeedingReminders();

    console.log(`📬 Found ${schedules.length} schedules needing reminders`);

    for (const schedule of schedules) {
      try {
        // Send app notification
        await notificationHelper.sendScheduleReminder(schedule, io);

        // Send SMS reminders if enabled
        try {
          await sendSMSReminders(schedule);
        } catch (smsError) {
          console.warn(
            `⚠️ SMS reminder failed for schedule ${schedule._id}:`,
            smsError.message,
          );
        }

        console.log(`✅ Reminder sent for schedule ${schedule._id}`);
      } catch (error) {
        console.error(
          `❌ Failed to send reminder for schedule ${schedule._id}:`,
          error,
        );
      }
    }

    return schedules.length;
  } catch (error) {
    console.error("sendUpcomingReminders error:", error);
    throw error;
  }
};

/**
 * Send SMS reminders if users have SMS enabled
 */
const sendSMSReminders = async (schedule) => {
  // Get donor and recipient with their SMS preferences
  const donor = await User.findById(schedule.donor).select(
    "phone phoneVerified smsPreferences",
  );
  const recipient = await User.findById(schedule.recipient).select(
    "phone phoneVerified smsPreferences",
  );

  // Calculate hours until pickup
  const hoursUntil = Math.round(
    (new Date(schedule.scheduledDate) - new Date()) / (1000 * 60 * 60),
  );

  const scheduleInfo = {
    listingTitle: schedule.listing?.title || "Donation Item",
    pickupLocation: schedule.pickupLocation || "See app for details",
    scheduledDate: schedule.scheduledDate,
  };

  const promises = [];

  // Send SMS to donor if enabled
  if (
    donor?.phone &&
    donor?.phoneVerified &&
    donor?.smsPreferences?.enabled &&
    donor?.smsPreferences?.pickupReminders
  ) {
    promises.push(
      smsService.sendPickupReminder(scheduleInfo, donor.phone, hoursUntil),
    );
  }

  // Send SMS to recipient if enabled
  if (
    recipient?.phone &&
    recipient?.phoneVerified &&
    recipient?.smsPreferences?.enabled &&
    recipient?.smsPreferences?.pickupReminders
  ) {
    promises.push(
      smsService.sendPickupReminder(scheduleInfo, recipient.phone, hoursUntil),
    );
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
    console.log(`📱 SMS reminders sent for schedule ${schedule._id}`);
  }
};

/**
 * Mark expired schedules (proposed but not confirmed)
 */
const markExpiredSchedules = async (io) => {
  try {
    const expiredSchedules = await Schedule.findExpired();

    console.log(`⏰ Found ${expiredSchedules.length} expired schedules`);

    for (const schedule of expiredSchedules) {
      try {
        await schedule.expire();

        // Update listing
        const listing = await Listing.findById(schedule.listing);
        if (listing) {
          await listing.updateScheduleStatus("expired");
          listing.status = "available";
          listing.assignedTo = null;
          await listing.save();
        }

        // Populate for notification
        await schedule.populate([
          { path: "donor", select: "firstName lastName email" },
          { path: "recipient", select: "firstName lastName email" },
          { path: "listing", select: "title" },
        ]);

        // Notify both parties
        await notificationHelper.onScheduleExpired(schedule, io);

        console.log(`✅ Marked schedule ${schedule._id} as expired`);
      } catch (error) {
        console.error(`❌ Failed to expire schedule ${schedule._id}:`, error);
      }
    }

    return expiredSchedules.length;
  } catch (error) {
    console.error("markExpiredSchedules error:", error);
    throw error;
  }
};

/**
 * Handle assignment timeouts (24-hour deadline for receivers to accept)
 */
const handleAssignmentTimeouts = async (io) => {
  try {
    const now = new Date();

    // Find all listings with expired assignments
    const expiredAssignments = await Listing.find({
      status: "assigned",
      assignmentDeadline: { $lt: now },
      assignedTo: { $exists: true, $ne: null },
    }).populate([
      { path: "assignedTo", select: "firstName lastName email" },
      { path: "donor", select: "firstName lastName email" },
    ]);

    console.log(`⏳ Found ${expiredAssignments.length} expired assignments`);

    for (const listing of expiredAssignments) {
      try {
        const previousRecipient = listing.assignedTo;

        // Remove current assignment
        listing.assignedTo = null;
        listing.status = "available";
        listing.assignmentDeadline = null;

        // Get next waiting person in queue
        const nextQueueEntry = listing.queue.find(
          (entry) =>
            entry.user.toString() !== previousRecipient._id.toString() &&
            entry.status === "waiting",
        );

        if (nextQueueEntry) {
          // Assign to next person
          listing.assignedTo = nextQueueEntry.user;
          listing.status = "assigned";
          listing.assignedAt = new Date();
          listing.assignmentDeadline = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          );

          // Update queue entry
          nextQueueEntry.status = "notified";
          nextQueueEntry.notifiedAt = new Date();

          await listing.save();

          // Notify next recipient
          const Notification = require("../models/Notification");
          const notification = await Notification.create({
            recipient: nextQueueEntry.user,
            type: "assignment",
            title: "Item Available - Accept Soon!",
            message: `Time's running out! You're next for: ${listing.title}`,
            data: {
              listingId: listing._id,
              donorId: listing.donor._id,
            },
          });

          // Socket notification
          if (io) {
            io.to(nextQueueEntry.user.toString()).emit(
              "assignment_notification",
              {
                message: `You're next in line for ${listing.title}!`,
                listingId: listing._id,
                recipientId: nextQueueEntry.user,
              },
            );
          }

          console.log(
            `✅ Auto-reassigned ${listing.title} from ${previousRecipient.firstName} to next in queue`,
          );
        } else {
          // No more queue members, listing available to all
          await listing.save();

          // Notify donor
          const Notification = require("../models/Notification");
          await Notification.create({
            recipient: listing.donor._id,
            type: "assignment_failed",
            title: "Assignment Expired",
            message: `No one accepted your item: ${listing.title}. It's now available to all.`,
            data: {
              listingId: listing._id,
            },
          });

          console.log(
            `⚠️ Assignment expired for ${listing.title}, listing now available to all`,
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to handle timeout for listing ${listing._id}:`,
          error,
        );
      }
    }

    return expiredAssignments.length;
  } catch (error) {
    console.error("handleAssignmentTimeouts error:", error);
    throw error;
  }
};

/**
 * Manual trigger for testing
 */
const runScheduleAutomationNow = async (io) => {
  console.log("🚀 Running schedule automation manually...");

  const reminderCount = await sendUpcomingReminders(io);
  const expiredCount = await markExpiredSchedules(io);

  return {
    remindersSent: reminderCount,
    schedulesExpired: expiredCount,
  };
};

module.exports = {
  initScheduleCronJobs,
  sendUpcomingReminders,
  markExpiredSchedules,
  handleAssignmentTimeouts,
  runScheduleAutomationNow,
};
