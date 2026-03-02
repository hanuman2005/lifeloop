// ============================================
// routes/listings.js - COMPLETE & FIXED
// ============================================
const express = require("express");
const { body, query } = require("express-validator");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
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
} = require("../controllers/listingController");
const queueController = require("../controllers/queueController");
const { proposeSchedule } = require("../controllers/scheduleController");
const { generateQRCode } = require("../utils/qrGenerator");

const router = express.Router();

// ✅ FIXED: Validation rules matching what frontend actually sends
const listingValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .trim()
    .isIn([
      "produce",
      "canned-goods",
      "dairy",
      "bakery",
      "household-items",
      "clothing",
      "electronics",
      "furniture",
      "books",
      "other",
    ])
    .withMessage("Invalid category"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .trim()
    .matches(/^\d+(\.\d+)?$/)
    .withMessage("Quantity must be a valid number")
    .custom((value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        throw new Error("Quantity must be greater than 0");
      }
      return true;
    }),
  body("unit")
    .optional()
    .isIn(["items", "kg", "lbs", "bags", "boxes", "servings"])
    .withMessage("Invalid unit"),
  body("pickupLocation")
    .notEmpty()
    .withMessage("Pickup location is required")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Pickup location must be between 3 and 200 characters"),
  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiry date")
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),
  body("additionalNotes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Additional notes cannot exceed 500 characters"),
];

// Validation for nearby listings
const nearbyValidation = [
  query("lat")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  query("lng")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  query("radius")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Radius must be between 1 and 100 km"),
];

// Validation for search
const searchValidation = [
  query("category")
    .optional()
    .isIn([
      "produce",
      "canned-goods",
      "dairy",
      "bakery",
      "household-items",
      "clothing",
      "other",
    ]),
  query("urgency").optional().isInt({ min: 1, max: 3 }),
  query("sortBy").optional().isIn(["newest", "oldest", "popular", "distance"]),
  query("lat").optional().isFloat({ min: -90, max: 90 }),
  query("lng").optional().isFloat({ min: -180, max: 180 }),
];

const expressInterestValidation = [
  body("message")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Message cannot exceed 200 characters"),
];

const assignValidation = [
  body("recipientId")
    .notEmpty()
    .withMessage("Recipient ID is required")
    .isMongoId()
    .withMessage("Invalid recipient ID"),
];

// Validation middleware
const proposeScheduleValidation = [
  body("recipientId")
    .notEmpty()
    .withMessage("Recipient is required")
    .isMongoId()
    .withMessage("Invalid recipient ID"),
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Invalid date format"),
  body("time")
    .notEmpty()
    .withMessage("Time is required")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Invalid time format (use HH:MM)"),
  body("pickupLocation")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Pickup location too long"),
  body("donorNotes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

// ============================================
// ROUTES - Proper ordering is important!
// ============================================

// Search route (must be before /:id)
router.get("/search", searchValidation, searchListings);

// Nearby route (must be before /:id)
router.get("/nearby", nearbyValidation, getNearbyListings);

router.get("/user/pending", auth, async (req, res) => {
  try {
    const Listing = require("../models/Listing"); // ← Add this import

    const listings = await Listing.find({
      donor: req.user._id,
      status: "pending",
      assignedTo: { $exists: true, $ne: null },
    })
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("donor", "firstName lastName")
      .sort("-updatedAt");

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Error fetching pending listings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending listings",
      error: error.message,
    });
  }
});

// Get listings assigned to current user (as recipient)
router.get("/user/assigned-to-me", auth, async (req, res) => {
  try {
    const Listing = require("../models/Listing");

    const listings = await Listing.find({
      assignedTo: req.user._id,
      status: { $in: ["pending", "assigned"] },
    })
      .populate("donor", "firstName lastName email avatar phone")
      .populate("assignedTo", "firstName lastName")
      .sort("-updatedAt");

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Error fetching assigned listings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned listings",
      error: error.message,
    });
  }
});

// User listings route (must be before /:id)
router.get("/user", auth, getUserListings);

// Match suggestions endpoint (AI powered)
router.get("/:id/match-suggestions", auth, async (req, res) => {
  try {
    const listingId = req.params.id;
    const Listing = require("../models/Listing");
    const aiMatching = require("../utils/aiMatching");

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    }

    // Get best matches using AI
    const matchResult = await aiMatching.findBestMatches(listingId, 5);

    res.json({
      success: true,
      ...matchResult,
    });
  } catch (error) {
    console.error("Error fetching match suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch match suggestions",
      error: error.message,
    });
  }
});

// General listing routes
router.get("/", getListings);
router.get("/:id", getListingById);

// Create listing
router.post(
  "/",
  auth,
  upload.array("images", 5),
  listingValidation,
  createListing,
);

// Update listing
router.put(
  "/:id",
  auth,
  upload.array("images", 5),
  listingValidation,
  updateListing,
);

// Delete listing
router.delete("/:id", auth, deleteListing);

// Express interest
router.post("/:id/interest", auth, expressInterestValidation, expressInterest);

// Assign listing
router.post("/:id/assign", auth, assignValidation, assignListing);

// Complete listing
router.put("/:id/complete", auth, completeListing);

// Check-in listing
router.post("/:id/check-in", auth, checkIn);

// Accept assignment (receiver accepts AI-matched item)
router.put("/:id/assignment/accept", auth, async (req, res) => {
  try {
    const listingId = req.params.id;
    const Listing = require("../models/Listing");
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    }

    // Check if user is the assigned recipient
    if (listing.assignedTo.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Update listing status
    listing.status = "accepted";
    listing.acceptedAt = new Date();
    await listing.save();

    // Notify donor
    const Notification = require("../models/Notification");
    await Notification.create({
      recipient: listing.donor,
      type: "assignment_accepted",
      title: "Assignment Accepted!",
      message: `${req.user.firstName || "Someone"} accepted your item: ${listing.title}`,
      data: {
        listingId: listing._id,
        recipientId: req.user._id,
      },
    });

    res.json({
      success: true,
      message: "Assignment accepted",
      listing,
    });
  } catch (error) {
    console.error("Error accepting assignment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept assignment",
      error: error.message,
    });
  }
});

// Decline assignment (receiver declines, try next in queue)
router.put("/:id/assignment/decline", auth, async (req, res) => {
  try {
    const listingId = req.params.id;
    const Listing = require("../models/Listing");

    const listing = await Listing.findById(listingId).populate("queue.user");

    if (!listing) {
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    }

    // Check if user is the assigned recipient
    if (listing.assignedTo.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const previousRecipient = listing.assignedTo;

    // Remove current assignment
    listing.assignedTo = null;
    listing.status = "available";
    listing.assignmentDeadline = null;

    // Get next waiting person in queue (sorted by position, excluding previous recipient)
    const nextQueueEntry = listing.queue.find(
      (entry) =>
        entry.user._id.toString() !== previousRecipient.toString() &&
        entry.status === "waiting",
    );

    if (nextQueueEntry) {
      // Assign to next person
      listing.assignedTo = nextQueueEntry.user._id;
      listing.status = "assigned";
      listing.assignedAt = new Date();
      listing.assignmentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update queue entry status
      nextQueueEntry.status = "notified";
      nextQueueEntry.notifiedAt = new Date();

      await listing.save();

      // Notify next recipient
      const Notification = require("../models/Notification");
      await Notification.create({
        recipient: nextQueueEntry.user._id,
        type: "assignment",
        title: "Item Now Available for You!",
        message: `You're next in line for: ${listing.title}`,
        data: {
          listingId: listing._id,
          donorId: listing.donor._id,
        },
      });

      res.json({
        success: true,
        message: "Declined, next recipient assigned",
        nextRecipient: {
          _id: nextQueueEntry.user._id,
          firstName: nextQueueEntry.user.firstName,
          lastName: nextQueueEntry.user.lastName,
        },
      });
    } else {
      // No more queue members, listing is available to all
      await listing.save();

      const Notification = require("../models/Notification");
      await Notification.create({
        recipient: listing.donor,
        type: "assignment_failed",
        title: "Assignment Declined",
        message: `${req.user.firstName || "Someone"} declined your item: ${listing.title}. It's now available to all.`,
        data: {
          listingId: listing._id,
        },
      });

      res.json({
        success: true,
        message: "Declined, listing available to all",
      });
    }
  } catch (error) {
    console.error("Error declining assignment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to decline assignment",
      error: error.message,
    });
  }
});

// Queue routes
router.post("/:id/queue/join", auth, queueController.joinQueue);
router.delete("/:id/queue/leave", auth, queueController.leaveQueue);
router.get("/:id/queue/status", auth, queueController.getQueueStatus);
router.post("/:id/queue/cancel", auth, queueController.cancelAssignment);
router.post("/:id/schedule", auth, proposeScheduleValidation, proposeSchedule);

// ✅ QR Code endpoint - generates QR code for listing handoff
router.get("/:id/qrcode", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await require("../models/Listing").findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check if listing is assigned
    if (!listing.assignedTo) {
      return res.status(400).json({
        success: false,
        message:
          "Listing must be assigned to a recipient before generating QR code",
      });
    }

    // Check if transaction already exists
    const Transaction = require("../models/Transaction");
    let transaction = await Transaction.findOne({
      listing: id,
      recipient: listing.assignedTo,
      status: "pending",
    });

    if (!transaction) {
      // Create transaction record
      transaction = new Transaction({
        listing: id,
        donor: listing.donor,
        recipient: listing.assignedTo,
        status: "pending",
        pickupLocation:
          listing.pickupLocation || listing.location || "Not specified",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // valid 24 hrs
      });

      // Calculate impact
      transaction.calculateImpact({
        quantity: listing.quantity,
        estimatedWeight: listing.estimatedWeight || 1,
      });

      await transaction.save();
    }

    // Generate QR code with transaction ID (not listing ID)
    const { generateQRCode } = require("../utils/qrGenerator");
    const qrResult = await generateQRCode(
      transaction._id, // Use transaction ID instead of listing ID
      id,
      listing.assignedTo,
    );

    // Update transaction with QR data
    transaction.qrCode = qrResult.qrCode;
    transaction.qrCodeHash = qrResult.qrCodeHash;
    transaction.qrCodeImage = qrResult.qrCodeImage;
    await transaction.save();

    res.json({
      success: true,
      qrCodeImage: qrResult.qrCodeImage,
      listingId: id,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("QR code generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate QR code",
      error: error.message,
    });
  }
});

module.exports = router;
