// backend/controllers/listingController.js

const { validationResult } = require("express-validator");
const Listing = require("../models/Listing");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const notificationHelper = require("../utils/notificationHelper");
const emailService = require("../services/emailService");
const contentModeration = require("../services/contentModerationService");

// ✅ Create listing with REAL-TIME NOTIFICATIONS and CONTENT MODERATION
const createListing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      category,
      quantity,
      unit,
      pickupLocation,
      address,
      expiryDate,
      additionalNotes,
      urgency,
    } = req.body;

    // 🛡️ Content Moderation Check
    const moderationResult = contentModeration.moderateContent(
      title,
      description,
    );

    if (moderationResult.autoRejected) {
      return res.status(400).json({
        success: false,
        message: "Content rejected due to policy violations",
        moderationIssues: moderationResult.issues,
        moderationScore: moderationResult.score,
      });
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path);
    }

    const defaultCoordinates = [0, 0];

    const listing = new Listing({
      title: moderationResult.cleanedTitle || title,
      description: moderationResult.cleanedDescription || description,
      category,
      quantity: parseFloat(quantity),
      unit: unit || "items",
      images,
      donor: req.user._id,
      location: {
        type: "Point",
        coordinates: defaultCoordinates,
      },
      pickupLocation,
      address,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      additionalNotes,
      urgency: urgency || 1,
      // Store moderation data
      moderationScore: moderationResult.score,
      moderationFlags: moderationResult.issues,
      status: moderationResult.requiresReview ? "pending_review" : "available",
    });

    await listing.save();
    await listing.populate("donor", "firstName lastName avatar rating");

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { listingsCount: 1 },
    });

    // 🔔 Only broadcast if not flagged for review
    if (!moderationResult.requiresReview) {
      try {
        const notificationCount = await notificationHelper.broadcastNewListing(
          listing,
          req.user,
          req.io,
        );
        console.log(
          `✅ Sent ${notificationCount} notifications for new listing`,
        );
      } catch (notifError) {
        console.error("⚠️ Notification error (non-critical):", notifError);
      }
    } else {
      console.log(
        `⚠️ Listing ${listing._id} flagged for review, notifications held`,
      );
    }

    return res.status(201).json({
      success: true,
      message: moderationResult.requiresReview
        ? "Listing created and pending review"
        : "Listing created successfully",
      listing,
      moderation: {
        score: moderationResult.score,
        requiresReview: moderationResult.requiresReview,
        flagged: moderationResult.flagged,
      },
    });
  } catch (error) {
    console.error("Create listing error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error creating listing",
      error: error.message,
    });
  }
};

// ✅ Get all listings
const getListings = async (req, res) => {
  try {
    const {
      category,
      status,
      page = 1,
      limit = 20,
      search,
      donorId,
    } = req.query;

    let query = {};

    // ✅ Filter by status if provided
    if (status) {
      query.status = status;
    }

    // ✅ Filter by specific donor if donorId is provided
    if (donorId) {
      query.donor = donorId;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { pickupLocation: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await Listing.find(query)
      .populate("donor", "firstName lastName avatar rating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    res.json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching listings",
    });
  }
};

// ✅ Get single listing by ID
const getListingById = async (req, res) => {
  try {
    console.log("🔍 Fetching listing:", req.params.id);

    const listing = await Listing.findById(req.params.id)
      .populate("donor", "firstName lastName avatar rating phone")
      .populate("assignedTo", "firstName lastName avatar rating")
      .populate("interestedUsers.user", "firstName lastName avatar");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Increment views
    await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { validateBeforeSave: false },
    );

    console.log("✅ Returning listing");
    res.json(listing);
  } catch (error) {
    console.error("❌ Get listing error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching listing",
      error: error.message,
    });
  }
};

// ✅ Update listing - WITH NOTIFICATIONS
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("interestedUsers.user", "firstName lastName")
      .populate("assignedTo", "firstName lastName");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    const {
      title,
      description,
      category,
      quantity,
      unit,
      status,
      additionalNotes,
      expiryDate,
      pickupLocation,
    } = req.body;

    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = req.files.map((file) => file.path);
    }

    const updateData = {
      title: title || listing.title,
      description: description || listing.description,
      category: category || listing.category,
      quantity: quantity ? parseFloat(quantity) : listing.quantity,
      unit: unit || listing.unit,
      status: status || listing.status,
      additionalNotes:
        additionalNotes !== undefined
          ? additionalNotes
          : listing.additionalNotes,
      expiryDate: expiryDate ? new Date(expiryDate) : listing.expiryDate,
      pickupLocation: pickupLocation || listing.pickupLocation,
    };

    if (newImages.length > 0) {
      updateData.images = [...listing.images, ...newImages];
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    )
      .populate("donor", "firstName lastName avatar rating")
      .populate("interestedUsers.user", "firstName lastName")
      .populate("assignedTo", "firstName lastName");

    // 🔔 NOTIFY INTERESTED USERS ABOUT THE UPDATE
    try {
      if (
        updatedListing.interestedUsers?.length > 0 ||
        updatedListing.assignedTo
      ) {
        await notificationHelper.onListingUpdated(
          updatedListing,
          updateData,
          req.io,
        );
      }
    } catch (notifError) {
      console.error("⚠️ Update notification error (non-critical):", notifError);
    }

    res.json({
      success: true,
      message: "Listing updated successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Update listing error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating listing",
    });
  }
};

// ✅ Delete listing - WITH NOTIFICATIONS
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("interestedUsers.user", "firstName lastName")
      .populate("assignedTo", "firstName lastName");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (
      listing.donor.toString() !== req.user._id.toString() &&
      req.user.userType !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this listing",
      });
    }

    // 🔔 NOTIFY INTERESTED USERS BEFORE DELETING
    try {
      if (listing.interestedUsers?.length > 0 || listing.assignedTo) {
        const reason = req.body.reason || "The donor has removed this listing";
        await notificationHelper.onListingDeleted(listing, reason, req.io);
      }
    } catch (notifError) {
      console.error("⚠️ Delete notification error (non-critical):", notifError);
    }

    // Delete images from Cloudinary
    if (listing.images && listing.images.length > 0) {
      const deletePromises = listing.images.map((imageUrl) => {
        const parts = imageUrl.split("/");
        const filename = parts[parts.length - 1];
        const publicId = filename.split(".")[0];
        return cloudinary.uploader.destroy(`food-distribution/${publicId}`);
      });
      await Promise.allSettled(deletePromises);
    }

    await Listing.findByIdAndDelete(req.params.id);

    await User.findByIdAndUpdate(listing.donor, {
      $inc: { listingsCount: -1 },
    });

    res.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting listing",
    });
  }
};

// ✅ Express interest - ALREADY HAS NOTIFICATIONS
const expressInterest = async (req, res) => {
  try {
    const { message } = req.body;
    const listingId = req.params.id;
    const userId = req.user._id;

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Listing is not available",
      });
    }

    if (listing.donor.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot express interest in your own listing",
      });
    }

    const alreadyInterested = listing.interestedUsers.some(
      (interest) => interest.user.toString() === userId.toString(),
    );

    if (alreadyInterested) {
      return res.status(400).json({
        success: false,
        message: "Already expressed interest in this listing",
      });
    }

    listing.interestedUsers.push({
      user: userId,
      message: message || "Interested in this item",
      timestamp: new Date(),
    });

    await listing.save();
    await listing.populate("interestedUsers.user", "firstName lastName avatar");

    // 🔔 Notify donor
    await notificationHelper.onInterestExpressed(listing, req.user, req.io);

    res.json({
      success: true,
      message: "Interest expressed successfully",
      listing,
    });
  } catch (error) {
    console.error("Express interest error:", error);
    res.status(500).json({
      success: false,
      message: "Server error expressing interest",
    });
  }
};

// ✅ Assign listing - WITH NOTIFICATIONS FOR ALL INTERESTED USERS
// backend/controllers/listingController.js

const assignListing = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const listingId = req.params.id;

    const listing = await Listing.findById(listingId).populate(
      "queue.user",
      "firstName lastName avatar rating",
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to assign this listing",
      });
    }

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // ==========================================
    // 🧠 HYBRID PRIORITY SYSTEM
    // Queue priority + AI Manual Selection
    // ==========================================
    const inQueue = listing.queue.find(
      (q) => q.user._id.toString() === recipientId,
    );

    if (inQueue) {
      // Respect queue order
      inQueue.status = "notified";
      inQueue.notifiedAt = new Date();

      listing.queue.forEach((q) => {
        if (q.user._id.toString() !== recipientId) {
          if (q.position > inQueue.position) q.status = "waiting";
        }
      });
    } else {
      // If manually selected or AI suggested outside queue → add as #1
      listing.queue.unshift({
        user: recipientId,
        position: 1,
        status: "notified",
        joinedAt: new Date(),
      });
    }

    // Re-calculate queue ordering
    listing.queue.sort((a, b) => a.position - b.position);
    listing.queue.forEach((q, i) => (q.position = i + 1));

    // ==========================================
    // Update listing assignment
    // ==========================================
    listing.assignedTo = recipientId;
    listing.status = "pending"; // 🔥 correct enum value
    await listing.save();

    await listing.populate("assignedTo", "firstName lastName avatar rating");

    // 🔔 Notify the assigned recipient
    await notificationHelper.onListingAssigned(listing, recipient, req.io);

    return res.json({
      success: true,
      message: "Listing assigned successfully",
      listing,
    });
  } catch (error) {
    console.error("Assign listing error:", error);
    res.status(500).json({
      success: false,
      message: "Assignment failed",
      error: error.message,
    });
  }
};

// ✅ Complete listing
const completeListing = async (req, res) => {
  try {
    const listingId = req.params.id;

    const listing = await Listing.findById(listingId).populate("assignedTo");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to complete this listing",
      });
    }

    listing.status = "completed";
    listing.completedAt = new Date();
    await listing.save();

    // Get donor info
    const donor = await User.findById(listing.donor);

    // 🔔 Notify recipient
    if (listing.assignedTo) {
      await notificationHelper.onListingCompleted(
        listing,
        listing.assignedTo,
        req.io,
      );

      // Send donation confirmation emails
      const recipient = await User.findById(listing.assignedTo);
      if (donor && recipient) {
        // Email to donor
        emailService
          .sendDonationConfirmationEmail(donor, recipient, listing)
          .catch((err) => {
            console.error("Failed to send donor confirmation email:", err);
          });
        // Email to recipient
        emailService
          .sendItemReceivedEmail(recipient, donor, listing)
          .catch((err) => {
            console.error("Failed to send recipient email:", err);
          });
      }
    }

    res.json({
      success: true,
      message: "Listing marked as completed",
      listing,
    });
  } catch (error) {
    console.error("Complete listing error:", error);
    res.status(500).json({
      success: false,
      message: "Server error completing listing",
    });
  }
};

// ✅ Get user's listings
const getUserListings = async (req, res) => {
  try {
    const { status, type = "donated" } = req.query;
    let query = {};

    if (type === "donated") {
      query.donor = req.user._id;
    } else if (type === "received") {
      query.assignedTo = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const listings = await Listing.find(query)
      .populate("donor", "firstName lastName avatar rating")
      .populate("assignedTo", "firstName lastName avatar rating")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      listings,
    });
  } catch (error) {
    console.error("Get user listings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user listings",
    });
  }
};

// ✅ Get nearby listings
const getNearbyListings = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const listings = await Listing.find({
      status: "available",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    })
      .populate("donor", "firstName lastName avatar rating")
      .limit(50);

    res.json({
      success: true,
      listings,
    });
  } catch (error) {
    console.error("Nearby listings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching nearby listings",
    });
  }
};

// ✅ Search listings
const searchListings = async (req, res) => {
  try {
    const {
      search, // ← NEW: Keyword search
      categories, // ← NEW: Multiple categories
      category, // Keep for backward compatibility
      urgency,
      condition, // ← NEW: Item condition
      expiryBefore,
      minQuantity, // ← NEW: Quantity range
      maxQuantity, // ← NEW: Quantity range
      postedAfter, // ← NEW: Date range filter
      postedBefore, // ← NEW: Date range filter
      sortBy,
      lat,
      lng,
      maxDistance,
    } = req.query;

    const query = { status: "available" };

    // ✅ Keyword Search (title, description, location)
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { pickupLocation: { $regex: search.trim(), $options: "i" } },
        { additionalNotes: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // ✅ Multiple Categories Support
    if (categories) {
      const categoryArray = categories.split(",").map((c) => c.trim());
      query.category = { $in: categoryArray };
    } else if (category) {
      // Backward compatibility
      query.category = category;
    }

    // ✅ Condition Filter
    if (condition) {
      query.condition = condition;
    }

    // ✅ Urgency Filter
    if (urgency) {
      query.urgency = { $gte: parseInt(urgency) };
    }

    // ✅ Expiry Date Filter
    if (expiryBefore) {
      query.expiryDate = { $lte: new Date(expiryBefore) };
    }

    // ✅ Date Range Filter (when posted)
    if (postedAfter || postedBefore) {
      query.createdAt = {};
      if (postedAfter) {
        query.createdAt.$gte = new Date(postedAfter);
      }
      if (postedBefore) {
        // Add one day to include the entire end date
        const endDate = new Date(postedBefore);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt.$lte = endDate;
      }
    }

    // ✅ Quantity Range Filter
    if (minQuantity || maxQuantity) {
      query.quantity = {};
      if (minQuantity) query.quantity.$gte = parseInt(minQuantity);
      if (maxQuantity) query.quantity.$lte = parseInt(maxQuantity);
    }

    // ✅ Location-based Filter
    if (lat && lng && maxDistance) {
      query.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      };
    }

    // ✅ Enhanced Sorting
    let sort = {};
    switch (sortBy) {
      case "newest":
        sort.createdAt = -1;
        break;
      case "oldest":
        sort.createdAt = 1;
        break;
      case "popular":
        sort.views = -1;
        break;
      case "expiry":
        sort.expiryDate = 1; // Soonest expiry first
        break;
      case "distance":
        // Distance sorting is handled by $near
        break;
      default:
        sort.createdAt = -1;
    }

    console.log("🔍 Search Query:", JSON.stringify(query, null, 2));
    console.log("📊 Sort:", sort);

    const listings = await Listing.find(query)
      .sort(sort)
      .populate("donor", "firstName lastName avatar rating")
      .limit(100);

    console.log(`✅ Found ${listings.length} listings`);

    res.status(200).json({
      success: true,
      count: listings.length,
      listings,
      filters: {
        search,
        categories,
        condition,
        urgency,
        expiryBefore,
        minQuantity,
        maxQuantity,
        sortBy,
      },
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
      error: error.message,
    });
  }
};

// Check-in endpoint
const checkIn = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Verify user is assigned or donor
    const isDonor = listing.donor.toString() === req.user._id.toString();
    const isAssigned =
      listing.assignedTo &&
      listing.assignedTo.toString() === req.user._id.toString();

    if (!isDonor && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to check in",
      });
    }

    // Create check-in record
    const checkIn = {
      user: req.user._id,
      timestamp: new Date(),
      location: req.body.location || null,
      notes: req.body.notes || "",
    };

    if (!listing.checkIns) {
      listing.checkIns = [];
    }

    listing.checkIns.push(checkIn);
    await listing.save();

    // Emit real-time event
    if (req.app.get("io")) {
      req.app.get("io").emit("checkInRecorded", {
        listing: listing._id,
        user: req.user._id,
        timestamp: checkIn.timestamp,
      });
    }

    res.json({
      success: true,
      message: "Check-in recorded successfully",
      listing: {
        _id: listing._id,
        title: listing.title,
        status: listing.status,
      },
      checkIn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Check-in failed",
      error: error.message,
    });
  }
};

// MAKE SURE TO EXPORT THEM:
module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  expressInterest,
  assignListing,
  completeListing,
  getUserListings,
  getNearbyListings,
  searchListings,
  checkIn,
};
