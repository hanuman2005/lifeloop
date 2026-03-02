// ============================================
// backend/controllers/aiMatchingController.js - NEW FILE
// ============================================
const { findBestMatches } = require("../utils/aiMatching");
const Notification = require("../models/Notification");

/**
 * @route   GET /api/listings/:id/match-suggestions
 * @desc    Get AI-powered match suggestions for a listing
 * @access  Private (Donor only)
 */
const getMatchSuggestions = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { limit = 5 } = req.query;

    // Get AI matches
    const result = await findBestMatches(listingId, parseInt(limit));

    // 🔔 Notify top 3 matches
    if (result.matches.length > 0 && req.io) {
      const topMatches = result.matches.slice(0, 3);

      for (const match of topMatches) {
        try {
          const notification = await Notification.create({
            recipient: match.recipient._id,
            type: "new_listing",
            title: "🎯 Perfect Match Found!",
            message: `A ${result.listing.category} donation near you matches your profile (${match.score}% match)`,
            icon: "🎯",
            priority: "high",
            relatedListing: listingId,
            actionUrl: `/listings/${listingId}`,
            metadata: {
              matchScore: match.score,
              confidence: match.confidence,
            },
          });

          await notification.populate(
            "relatedListing",
            "title images category",
          );

          req.io
            .to(match.recipient._id.toString())
            .emit("newNotification", notification);
          console.log(
            `🎯 Match notification sent to ${match.recipient.firstName}`,
          );
        } catch (notifError) {
          console.error("Match notification error:", notifError);
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Get match suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate match suggestions",
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/listings/:id/assign-top-match
 * @desc    Automatically assign to top match
 * @access  Private (Donor only)
 */
const assignTopMatch = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const Listing = require("../models/Listing");

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check if user is donor
    if (listing.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the donor can assign this listing",
      });
    }

    // Prevent reassignment if already assigned
    if (listing.assignedTo) {
      return res.status(400).json({
        success: false,
        message: "This listing is already assigned. Cannot reassign.",
      });
    }

    // Get best match
    const result = await findBestMatches(listingId, 1);

    if (result.matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No suitable matches found",
      });
    }

    const topMatch = result.matches[0];

    // Assign to top match
    listing.assignedTo = topMatch.recipient._id;
    listing.status = "pending";
    await listing.save();

    // Notify recipient
    try {
      const notification = await Notification.create({
        recipient: topMatch.recipient._id,
        sender: listing.donor,
        type: "assignment",
        title: "🎉 You've Been Selected!",
        message: `You've been matched with a ${listing.category} donation based on AI analysis (${topMatch.score}% match)`,
        icon: "🎉",
        priority: "high",
        relatedListing: listingId,
        actionUrl: `/listings/${listingId}`,
      });

      await notification.populate([
        { path: "sender", select: "firstName lastName avatar" },
        { path: "relatedListing", select: "title images category" },
      ]);

      req.io
        .to(topMatch.recipient._id.toString())
        .emit("newNotification", notification);
    } catch (notifError) {
      console.error("Assignment notification error:", notifError);
    }

    res.json({
      success: true,
      message: "Assigned to top match successfully",
      match: topMatch,
      listing,
    });
  } catch (error) {
    console.error("Assign top match error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign to top match",
      error: error.message,
    });
  }
};

module.exports = {
  getMatchSuggestions,
  assignTopMatch,
};
