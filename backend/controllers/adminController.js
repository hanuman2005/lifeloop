// backend/controllers/adminController.js - Admin Controller
const User = require("../models/User");
const Listing = require("../models/Listing");
const Report = require("../models/Report");
const Chat = require("../models/Chat");
const Rating = require("../models/Rating");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const emailService = require("../services/emailService");

// ================================
// Admin Log Schema (embedded for simplicity)
// ================================
const AdminLog = mongoose.model(
  "AdminLog",
  new mongoose.Schema({
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["user", "listing", "report", "verification", "content"],
    },
    targetId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    createdAt: { type: Date, default: Date.now },
  }),
);

// Helper to log admin actions
const logAdminAction = async (
  adminId,
  action,
  targetType,
  targetId,
  details,
  ip,
) => {
  try {
    await AdminLog.create({
      admin: adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress: ip,
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
};

// ================================
// Dashboard Stats
// ================================
const getAdminDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersToday,
      newUsersWeek,
      totalListings,
      activeListings,
      completedListings,
      pendingReports,
      totalReports,
      pendingVerifications,
      flaggedListings,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, isSuspended: false }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: "available" }),
      Listing.countDocuments({ status: "completed" }),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments(),
      User.countDocuments({
        "verificationStatus.identity": false,
        isVerified: false,
      }),
      Listing.countDocuments({ isFlagged: true }),
    ]);

    // Growth calculations
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $lt: monthAgo },
    });
    const userGrowth =
      lastMonthUsers > 0
        ? (((totalUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
        : 100;

    // Recent activity
    const recentListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title category status createdAt")
      .populate("donor", "firstName lastName");

    const recentReports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("reportType reason status priority createdAt")
      .populate("reportedBy", "firstName lastName");

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersWeek,
          growth: parseFloat(userGrowth),
        },
        listings: {
          total: totalListings,
          active: activeListings,
          completed: completedListings,
          flagged: flaggedListings,
        },
        reports: {
          pending: pendingReports,
          total: totalReports,
        },
        verifications: {
          pending: pendingVerifications,
        },
        recentActivity: {
          listings: recentListings,
          reports: recentReports,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};

// ================================
// User Management
// ================================
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "all",
      userType = "all",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "all") {
      if (status === "suspended") {
        query.isSuspended = true;
      } else if (status === "active") {
        query.isSuspended = false;
        query.isActive = true;
      }
    }

    if (userType !== "all") {
      query.userType = userType;
    }

    // Build sort
    const sort = {};
    if (sortBy === "name") {
      sort.firstName = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "trustScore") {
      sort.trustScore = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "rating") {
      sort["rating.average"] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    const users = await User.find(query)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get additional stats
    const [listingsCount, reportsAgainst, reportsBy] = await Promise.all([
      Listing.countDocuments({ donor: user._id }),
      Report.countDocuments({ user: user._id }),
      Report.countDocuments({ reportedBy: user._id }),
    ]);

    res.json({
      success: true,
      user,
      stats: {
        listingsCount,
        reportsAgainst,
        reportsBy,
      },
    });
  } catch (error) {
    console.error("Get user by id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, days = 30 } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.userType === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot suspend admin users",
      });
    }

    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    user.isSuspended = true;
    user.suspendedUntil = suspendedUntil;
    user.suspensionReason = reason;
    user.isActive = false; // ✅ Mark as inactive when suspended
    await user.save();

    // Log action
    await logAdminAction(
      req.user._id,
      "suspend_user",
      "user",
      id,
      { reason, days },
      req.ip,
    );

    // Create notification
    await Notification.create({
      recipient: user._id,
      type: "system",
      title: "Account Suspended",
      message: `Your account has been suspended until ${suspendedUntil.toDateString()}. Reason: ${reason}`,
      priority: "high",
    });

    // Send suspension email
    emailService
      .sendAccountSuspensionEmail(user, reason, suspendedUntil)
      .catch((err) => {
        console.error("Failed to send suspension email:", err);
      });

    res.json({
      success: true,
      message: `User suspended for ${days} days`,
      user: {
        _id: user._id,
        isSuspended: user.isSuspended,
        isActive: user.isActive,
        suspendedUntil: user.suspendedUntil,
      },
    });
  } catch (error) {
    console.error("Suspend user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend user",
    });
  }
};

const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isSuspended = false;
    user.suspendedUntil = null;
    user.suspensionReason = null;
    user.isActive = true; // ✅ Ensure user is marked as active
    await user.save();

    // Log action
    await logAdminAction(
      req.user._id,
      "unsuspend_user",
      "user",
      id,
      {},
      req.ip,
    );

    // Notify user
    await Notification.create({
      recipient: user._id,
      type: "system",
      title: "Account Restored",
      message: "Your account suspension has been lifted. Welcome back!",
      priority: "medium",
    });

    res.json({
      success: true,
      message: "User unsuspended successfully",
      user: {
        _id: user._id,
        isSuspended: user.isSuspended,
        isActive: user.isActive,
        suspendedUntil: user.suspendedUntil,
      },
    });
  } catch (error) {
    console.error("Unsuspend user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unsuspend user",
    });
  }
};

const warnUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, type = "policy_violation" } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add warning
    if (!user.accountWarnings) {
      user.accountWarnings = [];
    }
    user.accountWarnings.push({
      type,
      reason,
      issuedAt: new Date(),
    });

    // Decrease trust score
    user.trustScore = Math.max(0, (user.trustScore || 50) - 10);
    await user.save();

    // Log action
    await logAdminAction(
      req.user._id,
      "warn_user",
      "user",
      id,
      { reason, type },
      req.ip,
    );

    // Notify user
    await Notification.create({
      recipient: user._id,
      type: "system",
      title: "Account Warning",
      message: `You have received a warning: ${reason}. Please review our community guidelines.`,
      priority: "high",
    });

    // Send warning email
    emailService.sendAccountWarningEmail(user, reason).catch((err) => {
      console.error("Failed to send warning email:", err);
    });

    res.json({
      success: true,
      message: "Warning sent to user",
      warningsCount: user.accountWarnings.length,
    });
  } catch (error) {
    console.error("Warn user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to warn user",
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldRole = user.userType;
    user.userType = userType;
    await user.save();

    // Log action
    await logAdminAction(
      req.user._id,
      "update_role",
      "user",
      id,
      { oldRole, newRole: userType },
      req.ip,
    );

    res.json({
      success: true,
      message: `User role updated to ${userType}`,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
};

const bulkUserAction = async (req, res) => {
  try {
    const { userIds, action, reason } = req.body;

    let updatedCount = 0;

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user || user.userType === "admin") continue;

        if (action === "suspend") {
          user.isSuspended = true;
          user.suspendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          user.suspensionReason = reason || "Bulk action by admin";
        } else if (action === "unsuspend") {
          user.isSuspended = false;
          user.suspendedUntil = null;
        } else if (action === "warn") {
          user.accountWarnings = user.accountWarnings || [];
          user.accountWarnings.push({
            type: "other",
            reason,
            issuedAt: new Date(),
          });
        }

        await user.save();
        updatedCount++;
      } catch (err) {
        console.error(`Bulk action failed for user ${userId}:`, err);
      }
    }

    // Log action
    await logAdminAction(
      req.user._id,
      `bulk_${action}`,
      "user",
      null,
      { userIds, reason },
      req.ip,
    );

    res.json({
      success: true,
      message: `${action} applied to ${updatedCount} users`,
    });
  } catch (error) {
    console.error("Bulk user action error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform bulk action",
    });
  }
};

// ================================
// Verification Management
// ================================
const getPendingVerifications = async (req, res) => {
  try {
    const {
      status = "pending",
      type = "all",
      page = 1,
      limit = 20,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // For simplicity, we'll query users who need verification
    let query = {};

    if (status === "pending") {
      query.$or = [
        { "verificationStatus.identity": false },
        { "verificationStatus.address": false },
      ];
      query.isVerified = false;
    }

    const users = await User.find(query)
      .select(
        "firstName lastName email avatar verificationStatus trustScore createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Transform to verification requests format
    const verifications = users.map((user) => ({
      _id: user._id,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
      },
      verificationStatus: user.verificationStatus,
      trustScore: user.trustScore,
      requestedAt: user.createdAt,
      status: user.isVerified ? "approved" : "pending",
    }));

    res.json({
      success: true,
      verifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get verifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verifications",
    });
  }
};

const approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isVerified = true;
    user.verificationStatus = {
      phone: true,
      email: true,
      identity: true,
      address: true,
    };
    user.trustScore = Math.min(100, (user.trustScore || 50) + 20);

    // Add verified badge
    if (!user.trustBadges) user.trustBadges = [];
    user.trustBadges.push({
      badge: "verified_contributor",
      earnedAt: new Date(),
      description: "Identity verified by admin",
    });

    await user.save();

    // Log action
    await logAdminAction(
      req.user._id,
      "approve_verification",
      "verification",
      id,
      { notes },
      req.ip,
    );

    // Notify user
    await Notification.create({
      recipient: user._id,
      type: "system",
      title: "✅ Verification Approved!",
      message:
        "Congratulations! Your account has been verified. You now have a verified badge.",
      priority: "medium",
    });

    // Send verification approved email
    emailService.sendVerificationApprovedEmail(user).catch((err) => {
      console.error("Failed to send verification approval email:", err);
    });

    res.json({
      success: true,
      message: "Verification approved",
    });
  } catch (error) {
    console.error("Approve verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve verification",
    });
  }
};

const rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Log action
    await logAdminAction(
      req.user._id,
      "reject_verification",
      "verification",
      id,
      { reason },
      req.ip,
    );

    // Notify user
    await Notification.create({
      recipient: user._id,
      type: "system",
      title: "Verification Request Rejected",
      message: `Your verification request was rejected. Reason: ${reason}. Please try again with valid documents.`,
      priority: "medium",
    });

    // Send verification rejected email
    emailService.sendVerificationRejectedEmail(user, reason).catch((err) => {
      console.error("Failed to send verification rejection email:", err);
    });

    res.json({
      success: true,
      message: "Verification rejected",
    });
  } catch (error) {
    console.error("Reject verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject verification",
    });
  }
};

// ================================
// Flagged Content
// ================================
const getFlaggedContent = async (req, res) => {
  try {
    const {
      type = "all",
      status = "pending",
      page = 1,
      limit = 20,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get flagged listings
    let listingsQuery = { isFlagged: true };
    if (status === "removed") {
      listingsQuery.status = "removed";
    } else if (status === "pending") {
      listingsQuery.status = { $ne: "removed" };
    }

    const flaggedListings =
      type === "review"
        ? []
        : await Listing.find(listingsQuery)
            .populate("donor", "firstName lastName email avatar")
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

    const totalListings =
      type === "review" ? 0 : await Listing.countDocuments(listingsQuery);

    // Transform to unified format
    const content = flaggedListings.map((listing) => ({
      _id: listing._id,
      contentType: "listing",
      title: listing.title,
      description: listing.description,
      images: listing.images,
      owner: listing.donor,
      flagReason: listing.flagReason || "Multiple reports",
      reportCount: listing.reportCount || 0,
      status: listing.status === "removed" ? "removed" : "pending",
      createdAt: listing.createdAt,
      flaggedAt: listing.updatedAt,
    }));

    res.json({
      success: true,
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalListings,
        pages: Math.ceil(totalListings / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get flagged content error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flagged content",
    });
  }
};

const removeFlaggedContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, contentType } = req.body;

    if (contentType === "listing") {
      const listing = await Listing.findById(id);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }

      listing.status = "removed";
      listing.flagReason = reason;
      await listing.save();

      // Notify owner
      await Notification.create({
        recipient: listing.donor,
        type: "listing",
        title: "Listing Removed",
        message: `Your listing "${listing.title}" has been removed. Reason: ${reason}`,
        listing: listing._id,
        priority: "high",
      });
    }

    // Log action
    await logAdminAction(
      req.user._id,
      "remove_content",
      "content",
      id,
      { reason, contentType },
      req.ip,
    );

    res.json({
      success: true,
      message: "Content removed successfully",
    });
  } catch (error) {
    console.error("Remove flagged content error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove content",
    });
  }
};

const restoreFlaggedContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, contentType } = req.body;

    if (contentType === "listing") {
      const listing = await Listing.findById(id);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }

      listing.status = "available";
      listing.isFlagged = false;
      listing.flagReason = null;
      listing.reportCount = 0;
      await listing.save();

      // Notify owner
      await Notification.create({
        recipient: listing.donor,
        type: "listing",
        title: "Listing Restored",
        message: `Your listing "${listing.title}" has been restored after review.`,
        listing: listing._id,
        priority: "medium",
      });
    }

    // Log action
    await logAdminAction(
      req.user._id,
      "restore_content",
      "content",
      id,
      { notes, contentType },
      req.ip,
    );

    res.json({
      success: true,
      message: "Content restored successfully",
    });
  } catch (error) {
    console.error("Restore flagged content error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore content",
    });
  }
};

// ================================
// Reports (Admin view)
// ================================
const getAllReports = async (req, res) => {
  try {
    const {
      status = "all",
      type = "all",
      priority = "all",
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status !== "all") query.status = status;
    if (type !== "all") query.reportType = type;
    if (priority !== "all") query.priority = priority;

    const reports = await Report.find(query)
      .populate("reportedBy", "firstName lastName email avatar")
      .populate("listing", "title images category")
      .populate("user", "firstName lastName email avatar")
      .populate("reviewedBy", "firstName lastName")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    // Get counts by status
    const statusCounts = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      reports,
      statusCounts: statusCounts.reduce(
        (acc, s) => ({ ...acc, [s._id]: s.count }),
        {},
      ),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
};

// ================================
// Admin Logs
// ================================
const getAdminLogs = async (req, res) => {
  try {
    const {
      action,
      adminId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (action) query.action = { $regex: action, $options: "i" };
    if (adminId) query.admin = adminId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AdminLog.find(query)
      .populate("admin", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get admin logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
    });
  }
};

// ================================
// Content Moderation
// ================================
const getPendingModerationListings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await Listing.find({
      $or: [
        { status: "pending_review" },
        { moderationStatus: "pending" },
        { moderationScore: { $lt: 70 } },
      ],
    })
      .populate("donor", "firstName lastName email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments({
      $or: [
        { status: "pending_review" },
        { moderationStatus: "pending" },
        { moderationScore: { $lt: 70 } },
      ],
    });

    res.json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get pending moderation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch moderation queue",
    });
  }
};

const moderateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (action === "approve") {
      listing.status = "available";
      listing.moderationStatus = "approved";
      listing.moderatedBy = req.user._id;
      listing.moderatedAt = new Date();
      listing.moderationNotes = notes;
    } else if (action === "reject") {
      listing.status = "rejected";
      listing.moderationStatus = "rejected";
      listing.moderatedBy = req.user._id;
      listing.moderatedAt = new Date();
      listing.moderationNotes = notes;
    }

    await listing.save();

    // Log admin action
    await logAdminAction(
      req.user._id,
      `content_${action}`,
      "content",
      id,
      { notes, previousStatus: listing.status },
      req.ip,
    );

    // Notify user
    try {
      const notification = new Notification({
        recipient: listing.donor,
        type: "system",
        message:
          action === "approve"
            ? `Your listing "${listing.title}" has been approved and is now live!`
            : `Your listing "${listing.title}" was not approved. Reason: ${
                notes || "Policy violation"
              }`,
        relatedListing: listing._id,
      });
      await notification.save();
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    res.json({
      success: true,
      message: `Listing ${action}d successfully`,
      listing,
    });
  } catch (error) {
    console.error("Moderate listing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to moderate listing",
    });
  }
};

const getModerationStats = async (req, res) => {
  try {
    const [
      pendingCount,
      approvedToday,
      rejectedToday,
      avgScore,
      flaggedByType,
    ] = await Promise.all([
      Listing.countDocuments({
        $or: [{ status: "pending_review" }, { moderationStatus: "pending" }],
      }),
      Listing.countDocuments({
        moderationStatus: "approved",
        moderatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Listing.countDocuments({
        moderationStatus: "rejected",
        moderatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Listing.aggregate([
        { $match: { moderationScore: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: "$moderationScore" } } },
      ]),
      Listing.aggregate([
        { $unwind: "$moderationFlags" },
        { $group: { _id: "$moderationFlags.type", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        pending: pendingCount,
        approvedToday,
        rejectedToday,
        avgModerationScore: avgScore[0]?.avg || 100,
        flagsByType: flaggedByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get moderation stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch moderation stats",
    });
  }
};

module.exports = {
  getAdminDashboardStats,
  getAllUsers,
  getUserById,
  suspendUser,
  unsuspendUser,
  warnUser,
  updateUserRole,
  bulkUserAction,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getFlaggedContent,
  removeFlaggedContent,
  restoreFlaggedContent,
  getAllReports,
  getAdminLogs,
  // Content Moderation
  getPendingModerationListings,
  moderateListing,
  getModerationStats,
};
