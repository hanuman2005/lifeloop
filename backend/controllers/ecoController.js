// backend/controllers/ecoController.js
// Handles: Eco Points, Waste Diary, CO2 Tracking, Leaderboard

const EcoPoints = require("../models/EcoPoints");
const WasteDiary = require("../models/WasteDiary");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/eco/points
// Get current user's points, level, and recent transactions
// ─────────────────────────────────────────────────────────────────────────────
const getMyPoints = async (req, res) => {
  try {
    let eco = await EcoPoints.findOne({ userId: req.user._id });

    if (!eco) {
      eco = await EcoPoints.create({ userId: req.user._id });
    }

    return res.json({
      success: true,
      data: {
        totalPoints: eco.totalPoints,
        level: eco.level,
        stats: eco.stats,
        recentTransactions: eco.transactions.slice(-10).reverse(),
        nextLevel: getNextLevel(eco.totalPoints),
        progressToNext: getProgressToNext(eco.totalPoints),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/eco/award
// Award points for an action (called from other controllers)
// Body: { action, description, metadata }
// ─────────────────────────────────────────────────────────────────────────────
const awardPoints = async (req, res) => {
  try {
    const { action, description, metadata, itemLabel, category, imageUri } =
      req.body;

    // Get or create eco record
    let eco = await EcoPoints.findOne({ userId: req.user._id });
    if (!eco) eco = await EcoPoints.create({ userId: req.user._id });

    // Award points
    const result = await eco.awardPoints(action, description, metadata);

    // Also add to waste diary
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let diary = await WasteDiary.findOne({ userId: req.user._id, month });
    if (!diary) {
      diary = await WasteDiary.create({
        userId: req.user._id,
        month,
        year: now.getFullYear(),
      });
    }

    let diaryEntry = null;
    if (itemLabel && category) {
      const diaryAction =
        action === "scan"
          ? "scanned"
          : action === "reuse_project"
            ? "reused"
            : action === "upcycle_project"
              ? "upcycled"
              : action === "pickup_request"
                ? "pickup_scheduled"
                : action === "donate"
                  ? "donated"
                  : "scanned";

      diaryEntry = await diary.addEntry(
        itemLabel,
        category,
        diaryAction,
        imageUri,
      );
    }

    return res.json({
      success: true,
      pointsEarned: result.points,
      totalPoints: result.totalPoints,
      level: result.level,
      levelUp: result.level !== eco.level,
      co2Saved: diaryEntry?.co2Saved || 0,
      message: `+${result.points} points earned! ${result.level}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/eco/diary
// Get waste diary for current month (or ?month=2026-01 for specific month)
// ─────────────────────────────────────────────────────────────────────────────
const getWasteDiary = async (req, res) => {
  try {
    const now = new Date();
    const month =
      req.query.month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let diary = await WasteDiary.findOne({ userId: req.user._id, month });

    if (!diary) {
      // Return empty diary structure
      return res.json({
        success: true,
        data: {
          month,
          entries: [],
          summary: {
            totalItems: 0,
            totalWeightKg: 0,
            totalCo2Saved: 0,
            totalPoints: 0,
            byCategory: {},
            byAction: {},
          },
        },
      });
    }

    // Get last 6 months for trend
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    const trend = await WasteDiary.find(
      { userId: req.user._id, month: { $in: months } },
      {
        month: 1,
        "summary.totalItems": 1,
        "summary.totalCo2Saved": 1,
        "summary.totalPoints": 1,
      },
    ).sort({ month: 1 });

    return res.json({
      success: true,
      data: {
        month,
        entries: diary.entries.slice(-20).reverse(), // last 20 entries
        summary: diary.summary,
        trend: trend.map((t) => ({
          month: t.month,
          totalItems: t.summary.totalItems,
          co2Saved: t.summary.totalCo2Saved,
          points: t.summary.totalPoints,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/eco/leaderboard
// Top users by eco points
// ─────────────────────────────────────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const top = await EcoPoints.find()
      .sort({ totalPoints: -1 })
      .limit(20)
      .populate("userId", "name email profileImage");

    const myRank =
      (await EcoPoints.countDocuments({
        totalPoints: {
          $gt:
            (await EcoPoints.findOne({ userId: req.user._id }))?.totalPoints ||
            0,
        },
      })) + 1;

    return res.json({
      success: true,
      data: {
        leaderboard: top.map((e, i) => ({
          rank: i + 1,
          name: e.userId?.name || "Eco Warrior",
          totalPoints: e.totalPoints,
          level: e.level,
          co2Saved: e.stats.co2Saved,
          totalScans: e.stats.totalScans,
        })),
        myRank,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/eco/impact
// City-wide / total impact stats
// ─────────────────────────────────────────────────────────────────────────────
const getCityImpact = async (req, res) => {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [allTime, thisMonth] = await Promise.all([
      EcoPoints.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            totalScans: { $sum: "$stats.totalScans" },
            totalPickups: { $sum: "$stats.totalPickups" },
            totalCo2: { $sum: "$stats.co2Saved" },
          },
        },
      ]),
      WasteDiary.aggregate([
        { $match: { month } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: "$summary.totalItems" },
            totalWeight: { $sum: "$summary.totalWeightKg" },
            totalCo2: { $sum: "$summary.totalCo2Saved" },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        allTime: allTime[0] || {
          totalUsers: 0,
          totalScans: 0,
          totalPickups: 0,
          totalCo2: 0,
        },
        thisMonth: thisMonth[0] || {
          totalItems: 0,
          totalWeight: 0,
          totalCo2: 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const LEVELS = [
  { name: "Eco Beginner 🌍", min: 0 },
  { name: "Eco Learner 📚", min: 100 },
  { name: "Eco Enthusiast 🌱", min: 500 },
  { name: "Green Guardian 🌿", min: 1000 },
  { name: "Waste Warrior ⚔️", min: 2000 },
  { name: "Eco Champion 🏆", min: 5000 },
];

const getNextLevel = (points) => {
  const next = LEVELS.find((l) => l.min > points);
  return next || { name: "Max Level", min: points };
};

const getProgressToNext = (points) => {
  const current = [...LEVELS].reverse().find((l) => l.min <= points);
  const next = LEVELS.find((l) => l.min > points);
  if (!next) return 100;
  const range = next.min - current.min;
  const progress = points - current.min;
  return Math.round((progress / range) * 100);
};

module.exports = {
  getMyPoints,
  awardPoints,
  getWasteDiary,
  getLeaderboard,
  getCityImpact,
};
