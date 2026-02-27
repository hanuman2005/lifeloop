// backend/controllers/wasteAnalysisController.js

const WasteAnalysis = require("../models/WasteAnalysis");
const User = require("../models/User");
const Listing = require("../models/Listing");

// @desc    Save waste analysis (from TensorFlow.js frontend)
// @route   POST /api/waste-analysis
// @access  Private
exports.saveAnalysis = async (req, res) => {
  try {
    // ✅ EXTRACT ALL FIELDS FROM REQUEST BODY
    const {
      tfLabel,
      confidence,
      material,
      reuseIdeas,
      upcycleIdeas,
      recyclingGuidance,
      donationPossible,
      donationCategory,
      impact, 
      materialComposition,
      recyclingComplexity,
      environmentalImpact,
      hazards,
      recyclingRecommendations,
      eWasteCategory,
      userDescription,
      location,
      deviceType,
      imageUrl,
    } = req.body;

    // ✅ NORMALIZE DATA FOR DUPLICATE DETECTION
    const normalizedLabel = tfLabel.toLowerCase().trim();
    const normalizedMaterial = material.trim();

    // ✅ CHECK FOR DUPLICATE (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existingAnalysis = await WasteAnalysis.findOne({
      user: req.user._id,
      tfLabel: normalizedLabel,
      material: normalizedMaterial,
      createdAt: { $gte: oneDayAgo },
    }).sort({ createdAt: -1 });

    // ✅ IF DUPLICATE FOUND: UPDATE EXISTING INSTEAD OF CREATING NEW
    if (existingAnalysis) {
      // Update confidence (average or use latest)
      existingAnalysis.confidence = confidence;

      // Increment analysis count
      existingAnalysis.analysisCount =
        (existingAnalysis.analysisCount || 1) + 1;

      // Update timestamp
      existingAnalysis.lastAnalyzedAt = new Date();

      // ✅ UPDATE CUMULATIVE IMPACT
      existingAnalysis.impact.carbonSaved += impact?.carbonSaved || 0;
      existingAnalysis.impact.wasteDiverted += impact?.wasteDiverted || 0;
      existingAnalysis.impact.ecoScore += impact?.ecoScore || 0;

      // Update advice if provided (latest wins)
      if (reuseIdeas) existingAnalysis.reuseIdeas = reuseIdeas;
      if (upcycleIdeas) existingAnalysis.upcycleIdeas = upcycleIdeas;
      if (recyclingGuidance)
        existingAnalysis.recyclingGuidance = recyclingGuidance;

      await existingAnalysis.save();

      // ✅ STILL UPDATE USER'S ECO SCORE (they re-analyzed, give them credit!)
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          ecoScore: impact?.ecoScore || 0,
        },
      });

      console.log(
        `♻️ Duplicate detected: Updated analysis ${existingAnalysis._id}`
      );

      return res.status(200).json({
        success: true,
        message: "Analysis updated - this item was recently analyzed",
        analysis: existingAnalysis,
        isDuplicate: true,
      });
    }

    // ✅ NO DUPLICATE: CREATE NEW ANALYSIS
    const analysis = await WasteAnalysis.create({
      user: req.user._id,
      tfLabel: normalizedLabel,
      confidence,
      material: normalizedMaterial,
      reuseIdeas: reuseIdeas || [],
      upcycleIdeas: upcycleIdeas || [],
      recyclingGuidance: recyclingGuidance || "",
      donationPossible: donationPossible || false,
      donationCategory: donationCategory || null,
      impact: {
        carbonSaved: impact?.carbonSaved || 0,
        wasteDiverted: impact?.wasteDiverted || 0,
        ecoScore: impact?.ecoScore || 0,
      },
      // ✨ NEW: Save material composition data
      materialComposition: materialComposition || [],
      recyclingComplexity: recyclingComplexity || 'unknown',
      environmentalImpact: environmentalImpact || {},
      hazards: hazards || {},
      recyclingRecommendations: recyclingRecommendations || [],
      eWasteCategory: eWasteCategory || null,
      
      userDescription: userDescription || "",
      location: location || undefined,
      deviceType: deviceType || "desktop",
      imageUrl: imageUrl || "",
      analysisCount: 1,
      lastAnalyzedAt: new Date(),
    });

    // ✅ UPDATE USER STATS
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        ecoScore: impact?.ecoScore || 0,
        wasteAnalysisCount: 1,
      },
    });

    await analysis.populate("user", "firstName lastName avatar");

    console.log(`✅ New analysis created: ${analysis._id}`);

    res.status(201).json({
      success: true,
      message: "Analysis saved successfully",
      analysis,
      isDuplicate: false,
    });
  } catch (error) {
    console.error("❌ Save analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save analysis",
      error: error.message,
    });
  }
};

// @desc    Get user's analysis history
// @route   GET /api/waste-analysis/my-history
// @access  Private
exports.getMyHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      material,
      saved,
      convertedToListing,
    } = req.query;

    const query = { user: req.user._id };

    if (material) query.material = material;
    if (saved !== undefined) query.saved = saved === "true";
    if (convertedToListing !== undefined) {
      query.convertedToListing = convertedToListing === "true";
    }

    const analyses = await WasteAnalysis.find(query)
      .sort({ lastAnalyzedAt: -1 }) // ✅ Sort by last analyzed instead of createdAt
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("listingId", "title status images");

    const count = await WasteAnalysis.countDocuments(query);

    res.status(200).json({
      success: true,
      analyses,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch history",
    });
  }
};

// @desc    Get single analysis by ID
// @route   GET /api/waste-analysis/:id
// @access  Private
exports.getAnalysisById = async (req, res) => {
  try {
    const analysis = await WasteAnalysis.findById(req.params.id)
      .populate("user", "firstName lastName avatar")
      .populate("listingId", "title status images");

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    // Check ownership
    if (analysis.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json({ analysis });
  } catch (error) {
    console.error("Get analysis error:", error);
    res.status(500).json({ message: "Failed to fetch analysis" });
  }
};

// @desc    Save/bookmark an analysis
// @route   PUT /api/waste-analysis/:id/save
// @access  Private
exports.toggleSaveAnalysis = async (req, res) => {
  try {
    const analysis = await WasteAnalysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    if (analysis.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    analysis.saved = !analysis.saved;
    await analysis.save();

    res.status(200).json({
      message: analysis.saved ? "Analysis saved" : "Analysis unsaved",
      saved: analysis.saved,
    });
  } catch (error) {
    console.error("Toggle save error:", error);
    res.status(500).json({ message: "Failed to update analysis" });
  }
};

// @desc    Delete an analysis
// @route   DELETE /api/waste-analysis/:id
// @access  Private
exports.deleteAnalysis = async (req, res) => {
  try {
    const analysis = await WasteAnalysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    if (analysis.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await analysis.deleteOne();

    res.status(200).json({ message: "Analysis deleted successfully" });
  } catch (error) {
    console.error("Delete analysis error:", error);
    res.status(500).json({ message: "Failed to delete analysis" });
  }
};

// @desc    Create listing from analysis
// @route   POST /api/waste-analysis/:id/create-listing
// @access  Private
exports.createListingFromAnalysis = async (req, res) => {
  try {
    const analysis = await WasteAnalysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    if (analysis.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!analysis.donationPossible) {
      return res.status(400).json({
        message: "This item is not recommended for donation",
      });
    }

    const { title, description, quantity, unit, pickupLocation, images } =
      req.body;

    const listing = await Listing.create({
      title: title || analysis.tfLabel,
      description: description || `${analysis.tfLabel} - ${analysis.material}`,
      category: analysis.donationCategory || "other",
      donor: req.user._id,
      quantity: quantity || 1,
      unit: unit || "item",
      pickupLocation: pickupLocation || req.user.address,
      images: images || [],
      fromAIAnalysis: true,
      aiAnalysisId: analysis._id,
      status: "available",
    });

    await analysis.markAsConverted(listing._id);

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    console.error("Create listing error:", error);
    res.status(500).json({ message: "Failed to create listing" });
  }
};

// @desc    Get user's eco score & stats
// @route   GET /api/waste-analysis/stats/my-impact
// @access  Private
exports.getMyImpact = async (req, res) => {
  try {
    const stats = await WasteAnalysis.getUserTotalEcoScore(req.user._id);
    const materialBreakdown = await WasteAnalysis.getMaterialStats(
      req.user._id
    );

    res.status(200).json({
      totalEcoScore: stats.totalScore,
      totalCarbonSaved: parseFloat(stats.totalCarbon.toFixed(2)),
      totalWasteDiverted: parseFloat(stats.totalWaste.toFixed(2)),
      totalAnalyses: stats.count,
      materialBreakdown,
    });
  } catch (error) {
    console.error("Get impact error:", error);
    res.status(500).json({ message: "Failed to fetch impact stats" });
  }
};

// @desc    Get community stats
// @route   GET /api/waste-analysis/stats/community
// @access  Public
exports.getCommunityStats = async (req, res) => {
  try {
    const stats = await WasteAnalysis.getCommunityStats();
    const materialBreakdown = await WasteAnalysis.getMaterialStats();

    res.status(200).json({
      ...stats,
      totalCarbonSaved: parseFloat(stats.totalCarbonSaved.toFixed(2)),
      totalWasteDiverted: parseFloat(stats.totalWasteDiverted.toFixed(2)),
      avgConfidence: parseFloat(stats.avgConfidence.toFixed(1)),
      materialBreakdown,
    });
  } catch (error) {
    console.error("Get community stats error:", error);
    res.status(500).json({ message: "Failed to fetch community stats" });
  }
};

// @desc    Get leaderboard (top eco score users)
// @route   GET /api/waste-analysis/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, period = "all" } = req.query;

    let dateFilter = {};
    if (period === "week") {
      dateFilter = {
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      };
    } else if (period === "month") {
      dateFilter = {
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      };
    }

    const leaderboard = await WasteAnalysis.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$user",
          totalEcoScore: { $sum: "$impact.ecoScore" },
          totalCarbonSaved: { $sum: "$impact.carbonSaved" },
          totalWasteDiverted: { $sum: "$impact.wasteDiverted" },
          analysisCount: { $sum: 1 },
        },
      },
      { $sort: { totalEcoScore: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          user: {
            _id: "$user._id",
            firstName: "$user.firstName",
            lastName: "$user.lastName",
            avatar: "$user.avatar",
          },
          totalEcoScore: 1,
          totalCarbonSaved: { $round: ["$totalCarbonSaved", 2] },
          totalWasteDiverted: { $round: ["$totalWasteDiverted", 2] },
          analysisCount: 1,
        },
      },
    ]);

    res.status(200).json({ leaderboard, period });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};
