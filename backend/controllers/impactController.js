// backend/controllers/impactController.js - FIXED
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Helper: Aggregate user impact
const aggregateUserImpact = (transactions) => {
  return transactions.reduce(
    (acc, t) => ({
      totalWastePreventedKg:
        acc.totalWastePreventedKg + (t.impact?.wastePreventedKg || 0),
      totalCO2SavedKg: acc.totalCO2SavedKg + (t.impact?.co2SavedKg || 0),
      totalItemsDiverted:
        acc.totalItemsDiverted + (t.impact?.itemsDiverted || 0),
      totalWaterSavedLiters:
        acc.totalWaterSavedLiters + (t.impact?.wastePreventedKg || 0) * 15,
      treesEquivalent:
        acc.treesEquivalent + Math.floor((t.impact?.co2SavedKg || 0) / 20),
      carsOffRoadDays:
        acc.carsOffRoadDays + Math.floor((t.impact?.co2SavedKg || 0) / 4.6),
    }),
    {
      totalWastePreventedKg: 0,
      totalCO2SavedKg: 0,
      totalItemsDiverted: 0,
      totalWaterSavedLiters: 0,
      treesEquivalent: 0,
      carsOffRoadDays: 0,
    }
  );
};

// Helper: Get milestones
const getImpactMilestones = (totalCO2) => {
  const milestones = [
    {
      threshold: 10,
      message: "🌱 First Steps",
      description: "Started your journey",
    },
    {
      threshold: 50,
      message: "🌿 Growing Impact",
      description: "Making a difference",
    },
    {
      threshold: 100,
      message: "🌳 Tree Planter",
      description: "Equivalent to planting trees",
    },
    { threshold: 500, message: "🏆 Champion", description: "Community leader" },
    { threshold: 1000, message: "⭐ Hero", description: "Environmental hero" },
  ];

  const achieved = milestones.filter((m) => totalCO2 >= m.threshold);
  const next = milestones.find((m) => totalCO2 < m.threshold);

  return {
    achieved: achieved.map((m) => m.message),
    nextMilestone: next
      ? {
          ...next,
          progress: (totalCO2 / next.threshold) * 100,
        }
      : null,
  };
};

// GET /api/impact/personal
const getPersonalImpact = async (req, res) => {
  try {
    const userId = req.user._id;

    const donorTransactions = await Transaction.find({
      donor: userId,
      status: "completed",
    }).populate("listing", "title category quantity");

    const recipientTransactions = await Transaction.find({
      recipient: userId,
      status: "completed",
    }).populate("listing", "title category quantity");

    const donorImpact = aggregateUserImpact(donorTransactions);
    const recipientImpact = aggregateUserImpact(recipientTransactions);

    const combinedImpact = {
      totalWastePreventedKg:
        donorImpact.totalWastePreventedKg +
        recipientImpact.totalWastePreventedKg,
      totalCO2SavedKg:
        donorImpact.totalCO2SavedKg + recipientImpact.totalCO2SavedKg,
      totalItemsDiverted:
        donorImpact.totalItemsDiverted + recipientImpact.totalItemsDiverted,
      totalWaterSavedLiters:
        donorImpact.totalWaterSavedLiters +
        recipientImpact.totalWaterSavedLiters,
      totalDonations: donorTransactions.length,
      totalReceived: recipientTransactions.length,
      totalTransactions:
        donorTransactions.length + recipientTransactions.length,
      treesEquivalent:
        donorImpact.treesEquivalent + recipientImpact.treesEquivalent,
      carsOffRoadDays:
        donorImpact.carsOffRoadDays + recipientImpact.carsOffRoadDays,
    };

    const milestones = getImpactMilestones(combinedImpact.totalCO2SavedKg);

    const allUsers = await Transaction.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$donor",
          totalCO2: { $sum: "$impact.co2SavedKg" },
        },
      },
      { $sort: { totalCO2: -1 } },
    ]);

    const userRank =
      allUsers.findIndex((u) => u._id.toString() === userId.toString()) + 1;

    const recentActivities = await Transaction.find({
      $or: [{ donor: userId }, { recipient: userId }],
      status: "completed",
    })
      .populate("listing", "title category")
      .populate("donor", "firstName lastName")
      .populate("recipient", "firstName lastName")
      .sort({ completedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      impact: combinedImpact,
      milestones,
      rank: {
        position: userRank || 0,
        total: allUsers.length,
      },
      recentActivities: recentActivities.map((t) => ({
        id: t._id,
        listing: t.listing,
        type:
          t.donor._id.toString() === userId.toString() ? "donated" : "received",
        completedAt: t.completedAt,
        impact: t.impact,
      })),
    });
  } catch (error) {
    console.error("Get Personal Impact Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch personal impact",
      error: error.message,
    });
  }
};

// GET /api/impact/community
const getCommunityImpact = async (req, res) => {
  try {
    const allTransactions = await Transaction.find({
      status: "completed",
    }).populate("donor", "firstName lastName");

    const totalImpact = aggregateUserImpact(allTransactions);

    const topDonors = await Transaction.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$donor",
          totalCO2: { $sum: "$impact.co2SavedKg" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCO2: -1 } },
      { $limit: 10 },
    ]);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const trendingCategories = await Transaction.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: oneWeekAgo },
        },
      },
      {
        $lookup: {
          from: "listings",
          localField: "listing",
          foreignField: "_id",
          as: "listingData",
        },
      },
      { $unwind: "$listingData" },
      {
        $group: {
          _id: "$listingData.category",
          count: { $sum: 1 },
          totalWaste: { $sum: "$impact.wastePreventedKg" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topDonorsWithDetails = await User.find({
      _id: { $in: topDonors.map((d) => d._id) },
    }).select("firstName lastName avatar");

    const enrichedTopDonors = topDonors.map((donor) => {
      const userDetails = topDonorsWithDetails.find(
        (u) => u._id.toString() === donor._id.toString()
      );
      return {
        userId: donor._id,
        totalCO2: donor.totalCO2,
        count: donor.count,
        user: userDetails,
      };
    });

    const activeThisWeek = await Transaction.distinct("donor", {
      status: "completed",
      completedAt: { $gte: oneWeekAgo },
    });

    res.status(200).json({
      success: true,
      community: totalImpact,
      topDonors: enrichedTopDonors,
      trendingCategories,
      stats: {
        activeUsersThisWeek: activeThisWeek.length,
        transactionsThisWeek: allTransactions.filter(
          (t) => t.completedAt >= oneWeekAgo
        ).length,
      },
    });
  } catch (error) {
    console.error("Get Community Impact Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch community impact",
      error: error.message,
    });
  }
};

// GET /api/impact/heatmap
const getImpactHeatmap = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      status: "completed",
      "pickupLocation.coordinates": { $exists: true },
    }).select("pickupLocation impact completedAt");

    const heatmapData = transactions.map((t) => ({
      lat: t.pickupLocation.coordinates[1],
      lng: t.pickupLocation.coordinates[0],
      weight: t.impact?.wastePreventedKg || 1,
      timestamp: t.completedAt,
    }));

    res.status(200).json({
      success: true,
      heatmap: heatmapData,
      count: heatmapData.length,
    });
  } catch (error) {
    console.error("Get Heatmap Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch heatmap data",
      error: error.message,
    });
  }
};

// GET /api/impact/timeline
const getImpactTimeline = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ FIXED
    const { period = "30" } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // ✅ FIXED: Use new mongoose.Types.ObjectId()
    const timeline = await Transaction.aggregate([
      {
        $match: {
          donor: new mongoose.Types.ObjectId(userId),
          status: "completed",
          completedAt: { $gte: daysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
          },
          count: { $sum: 1 },
          totalWaste: { $sum: "$impact.wastePreventedKg" },
          totalCO2: { $sum: "$impact.co2SavedKg" },
          totalItemsDiverted: { $sum: "$impact.itemsDiverted" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      timeline,
      period: parseInt(period),
    });
  } catch (error) {
    console.error("Get Timeline Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch timeline",
      error: error.message,
    });
  }
};

// GET /api/impact/share-card
const generateShareCard = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ FIXED

    const user = await User.findById(userId).select(
      "firstName lastName avatar"
    );

    const transactions = await Transaction.find({
      donor: userId,
      status: "completed",
    });

    const impact = aggregateUserImpact(transactions);

    const shareData = {
      user: {
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
      },
      impact: {
        wasteKg: impact.totalWastePreventedKg,
        co2Kg: impact.totalCO2SavedKg,
        itemsDiverted: impact.totalItemsDiverted,
        trees: impact.treesEquivalent,
      },
      message: `I've kept ${
        impact.totalItemsDiverted
      } items out of landfill and avoided ${impact.totalCO2SavedKg.toFixed(
        1
      )}kg of CO2 on LifeLoop. ♻️`,
      timestamp: new Date(),
    };

    res.status(200).json({
      success: true,
      shareData,
    });
  } catch (error) {
    console.error("Generate Share Card Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate share card",
      error: error.message,
    });
  }
};

module.exports = {
  getPersonalImpact,
  getCommunityImpact,
  getImpactHeatmap,
  getImpactTimeline,
  generateShareCard,
};
