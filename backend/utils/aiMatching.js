// backend/utils/aiMatching.js
const User = require("../models/User");
const Listing = require("../models/Listing");
const Transaction = require("../models/Transaction");

/**
 * AI-Powered Smart Matching Algorithm
 * Scores recipients based on multiple factors
 */
const calculateMatchScore = async (listing, recipient) => {
  let score = 0;
  const factors = {};

  // ========================================
  // 1. LOCATION PROXIMITY (40 points max)
  // ========================================
  if (listing.location?.coordinates && recipient.location?.coordinates) {
    const distance = calculateDistance(
      listing.location.coordinates[1], // lat
      listing.location.coordinates[0], // lng
      recipient.location.coordinates[1],
      recipient.location.coordinates[0],
    );

    if (distance <= 1) {
      factors.proximity = 40; // Within 1km
    } else if (distance <= 5) {
      factors.proximity = 30; // Within 5km
    } else if (distance <= 10) {
      factors.proximity = 20; // Within 10km
    } else if (distance <= 20) {
      factors.proximity = 10; // Within 20km
    } else {
      factors.proximity = 5; // Beyond 20km
    }
    score += factors.proximity;
  }

  // ========================================
  // 2. COMPLETION RATE (30 points max)
  // ========================================
  const recipientTransactions = await Transaction.find({
    recipient: recipient._id,
  });

  const totalReceived = recipientTransactions.length;
  const completed = recipientTransactions.filter(
    (t) => t.status === "completed",
  ).length;

  if (totalReceived > 0) {
    const completionRate = (completed / totalReceived) * 100;
    factors.completionRate = Math.round((completionRate / 100) * 30);
    score += factors.completionRate;
  } else {
    // New users get 15 points (benefit of doubt)
    factors.completionRate = 15;
    score += 15;
  }

  // ========================================
  // 3. USER RATING (20 points max)
  // ========================================
  const rating = recipient.rating?.average || 0;
  factors.rating = Math.round((rating / 5) * 20);
  score += factors.rating;

  // ========================================
  // 4. URGENCY MATCH (10 points max)
  // ========================================
  if (listing.urgency === 3) {
    // High urgency listings favor active users
    const recentActivity = await Transaction.countDocuments({
      recipient: recipient._id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    });

    factors.urgency = Math.min(recentActivity * 2, 10);
    score += factors.urgency;
  } else {
    factors.urgency = 5; // Default points
    score += 5;
  }

  // ========================================
  // 5. CATEGORY PREFERENCE (Bonus)
  // ========================================
  const categoryHistory = await Transaction.find({
    recipient: recipient._id,
    status: "completed",
  }).populate("listing", "category");

  const preferredCategories = categoryHistory
    .map((t) => t.listing?.category)
    .filter(Boolean);

  if (preferredCategories.includes(listing.category)) {
    factors.categoryMatch = 10;
    score += 10;
  } else {
    factors.categoryMatch = 0;
  }

  // ========================================
  // 6. TRUST BADGES (Bonus)
  // ========================================
  const badges = recipient.badges || [];
  if (badges.includes("verified")) {
    factors.verified = 5;
    score += 5;
  }
  if (badges.includes("trusted-recipient")) {
    factors.trustedRecipient = 5;
    score += 5;
  }

  // ========================================
  // 7. ACCOUNT AGE (Bonus)
  // ========================================
  const accountAge = Date.now() - new Date(recipient.createdAt).getTime();
  const daysOld = accountAge / (1000 * 60 * 60 * 24);

  if (daysOld > 90) {
    factors.accountAge = 5;
    score += 5;
  } else if (daysOld > 30) {
    factors.accountAge = 3;
    score += 3;
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(Math.round(score), 100);

  return {
    recipient: {
      _id: recipient._id,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      avatar: recipient.avatar,
      rating: recipient.rating,
      badges: recipient.badges,
    },
    score: normalizedScore,
    confidence: getConfidenceLevel(normalizedScore),
    factors,
    recommendation: getRecommendationMessage(normalizedScore),
  };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get confidence level based on score
 */
const getConfidenceLevel = (score) => {
  if (score >= 85) return "Excellent Match";
  if (score >= 70) return "Great Match";
  if (score >= 55) return "Good Match";
  if (score >= 40) return "Fair Match";
  return "Low Match";
};

/**
 * Get recommendation message
 */
const getRecommendationMessage = (score) => {
  if (score >= 85) {
    return "Highly recommended! This recipient is an excellent match based on proximity, reliability, and past behavior.";
  }
  if (score >= 70) {
    return "Recommended! This recipient is a great match with strong history and good location.";
  }
  if (score >= 55) {
    return "Good option! This recipient meets most criteria and is nearby.";
  }
  if (score >= 40) {
    return "Consider this recipient. They may be a bit farther but have good credentials.";
  }
  return "This recipient is available but may not be the optimal match. Consider other options.";
};

/**
 * Find best matches for a listing
 */
const findBestMatches = async (listingId, limit = 5) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    // Get all interested users + nearby users
    const interestedUserIds = listing.interestedUsers.map((u) => u.user);

    // Find nearby users (within 50km)
    let nearbyUsers = [];
    if (listing.location?.coordinates) {
      nearbyUsers = await User.find({
        _id: { $ne: listing.donor }, // Exclude donor
        isActive: true,
        userType: { $in: ["recipient", "both"] },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: listing.location.coordinates,
            },
            $maxDistance: 50000, // 50km
          },
        },
      }).limit(20);
    }

    // Combine interested + nearby users (unique)
    const allPotentialRecipients = [
      ...nearbyUsers,
      ...(await User.find({ _id: { $in: interestedUserIds } })),
    ].filter(
      (user, index, self) =>
        index ===
        self.findIndex((u) => u._id.toString() === user._id.toString()),
    );

    // Calculate scores for all
    const matchPromises = allPotentialRecipients.map((recipient) =>
      calculateMatchScore(listing, recipient),
    );

    const matches = await Promise.all(matchPromises);

    // Sort by score (descending) and return top N
    const sortedMatches = matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      success: true,
      listing: {
        _id: listing._id,
        title: listing.title,
        category: listing.category,
      },
      matches: sortedMatches,
      totalCandidates: allPotentialRecipients.length,
    };
  } catch (error) {
    console.error("AI Matching error:", error);
    throw error;
  }
};

/**
 * Find single top match for auto-assignment
 */
const findTopMatch = async (listingId) => {
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      console.error("Listing not found:", listingId);
      return null;
    }

    // Get all interested users + nearby users
    const interestedUserIds = listing.interestedUsers.map((u) => u.user);

    // Find nearby users (within 50km)
    let nearbyUsers = [];
    if (listing.location?.coordinates) {
      nearbyUsers = await User.find({
        _id: { $ne: listing.donor }, // Exclude donor
        isActive: true,
        userType: { $in: ["recipient", "both"] },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: listing.location.coordinates,
            },
            $maxDistance: 50000, // 50km
          },
        },
      }).limit(20);
    }

    // Combine interested + nearby users (unique)
    const allPotentialRecipients = [
      ...nearbyUsers,
      ...(await User.find({ _id: { $in: interestedUserIds } })),
    ].filter(
      (user, index, self) =>
        index ===
        self.findIndex((u) => u._id.toString() === user._id.toString()),
    );

    if (allPotentialRecipients.length === 0) {
      console.log("No potential recipients found for:", listingId);
      return null;
    }

    // Calculate scores for all
    const matchPromises = allPotentialRecipients.map((recipient) =>
      calculateMatchScore(listing, recipient),
    );

    const matches = await Promise.all(matchPromises);

    // Get top match
    const topMatch = matches.sort((a, b) => b.score - a.score)[0];

    if (!topMatch || topMatch.score < 20) {
      console.log("Top match score too low:", topMatch?.score);
      return null;
    }

    // Return the user object of top match
    return topMatch.recipient;
  } catch (error) {
    console.error("Error finding top match:", error);
    return null;
  }
};

module.exports = {
  calculateMatchScore,
  findBestMatches,
  findTopMatch,
  calculateDistance,
  getConfidenceLevel,
};
