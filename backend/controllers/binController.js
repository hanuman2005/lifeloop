// backend/controllers/binController.js — M2 Crowd-Sensing Bin Network
//
// Citizens report the state of public bins; the aggregate is a live ward map and
// the input to collection routing. No hardware sensors, which is the module's
// scalability argument.

const BinReport = require("../models/BinReport");
const { RouteOptimizer, haversineDistance } = require("../services/routeOptimizer");
const EcoPoints = require("../models/EcoPoints");
const binTrust = require("../services/binTrust");

/**
 * Ward identity from coordinates.
 *
 * Snapping to a ~1.1 km grid rather than using real ward polygons is a deliberate
 * simplification: municipal ward boundaries for Bhimavaram are not available as
 * open data, and a regular grid supports the same aggregation and routing while
 * being reproducible by anyone reading the thesis. Swapping in real polygons later
 * changes only this function.
 */
const wardKey = ([lng, lat]) => `W${lat.toFixed(2)}_${lng.toFixed(2)}`;

const parsePoint = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [longitude, latitude]; // GeoJSON order
};

// @desc    File a bin report
// @route   POST /api/bins/report
// @access  Private
const createReport = async (req, res, next) => {
  try {
    const { status, lat, lng, imageBase64, imageUrl, note, accuracyMetres } = req.body;

    if (!BinReport.STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${BinReport.STATUSES.join(", ")}`,
      });
    }

    const coordinates = parsePoint(lat, lng);
    if (!coordinates) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng are required",
      });
    }

    const screening = await binTrust.screenReport({
      userId: req.user._id,
      coordinates,
      imageBase64,
      accuracyMetres: Number(accuracyMetres) || undefined,
    });

    // Stored either way. A rejected report is evidence that the rules fired, and
    // deleting it would make the rejection rate unmeasurable.
    const report = await BinReport.create({
      reporter: req.user._id,
      status,
      location: { type: "Point", coordinates },
      accuracyMetres: Number(accuracyMetres) || undefined,
      imageUrl,
      imageHash: screening.imageHash,
      ward: wardKey(coordinates),
      note,
      weight: screening.weight,
      accepted: screening.accepted,
      rejectionReason: screening.accepted ? undefined : screening.reason,
    });

    if (!screening.accepted) {
      const explanation = {
        duplicate_image: "You have already submitted this photograph.",
        rate_limited: "You have filed a lot of reports recently. Try again later.",
        implausible_location: "That location is outside the service area.",
        spam_pattern: "You reported this spot moments ago.",
      }[screening.reason];

      return res.status(202).json({
        success: false,
        accepted: false,
        reason: screening.reason,
        message: explanation || "Report could not be accepted.",
      });
    }

    // Points are a side effect of an accepted report, never of a rejected one —
    // otherwise the incentive to game the system survives the screening.
    let pointsEarned = 0;
    try {
      let eco = await EcoPoints.findOne({ userId: req.user._id });
      if (!eco) eco = await EcoPoints.create({ userId: req.user._id });
      const awarded = await eco.awardPoints(
        "bin_report",
        `Reported a ${status} bin`,
        { binReport: report._id },
      );
      pointsEarned = awarded?.points || 0;
    } catch (pointsError) {
      console.warn("⚠️ Bin report points failed (non-blocking):", pointsError.message);
    }

    // Live map clients update without polling.
    if (req.io) {
      req.io.emit("bin:reported", {
        id: report._id,
        status: report.status,
        ward: report.ward,
        location: report.location,
        createdAt: report.createdAt,
      });
    }

    return res.status(201).json({
      success: true,
      accepted: true,
      report,
      pointsEarned,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Recent accepted reports near a point
// @route   GET /api/bins/nearby?lat=&lng=&radius=&hours=
// @access  Private
const getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5, hours = 24 } = req.query;

    const coordinates = parsePoint(lat, lng);
    if (!coordinates) {
      return res.status(400).json({ success: false, message: "lat and lng are required" });
    }

    const reports = await BinReport.find({
      accepted: true,
      createdAt: { $gte: new Date(Date.now() - Number(hours) * 60 * 60 * 1000) },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates },
          $maxDistance: Number(radius) * 1000,
        },
      },
    })
      .select("status location ward weight note imageUrl createdAt resolvedAt")
      .limit(500)
      .lean();

    return res.json({ success: true, count: reports.length, reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Ward-level aggregation — the live waste map
// @route   GET /api/bins/wards?hours=
// @access  Private
const getWardSummary = async (req, res, next) => {
  try {
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Reports are weighted by reporter reputation rather than counted equally, so
    // one unreliable account cannot colour a ward red on its own.
    const wards = await BinReport.aggregate([
      { $match: { accepted: true, createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$ward",
          reports: { $sum: 1 },
          weightedTotal: { $sum: "$weight" },
          weightedNeedsCollection: {
            $sum: {
              $cond: [{ $in: ["$status", ["full", "overflowing"]] }, "$weight", 0],
            },
          },
          overflowing: {
            $sum: { $cond: [{ $eq: ["$status", "overflowing"] }, 1, 0] },
          },
          unresolved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["full", "overflowing"]] },
                    { $not: ["$resolvedAt"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lng: { $avg: { $arrayElemAt: ["$location.coordinates", 0] } },
          lat: { $avg: { $arrayElemAt: ["$location.coordinates", 1] } },
          lastReportAt: { $max: "$createdAt" },
        },
      },
      {
        $project: {
          _id: 0,
          ward: "$_id",
          reports: 1,
          overflowing: 1,
          unresolved: 1,
          centre: { lat: "$lat", lng: "$lng" },
          lastReportAt: 1,
          // 0..1. The map colours on this rather than raw counts.
          pressure: {
            $cond: [
              { $eq: ["$weightedTotal", 0] },
              0,
              { $divide: ["$weightedNeedsCollection", "$weightedTotal"] },
            ],
          },
        },
      },
      { $sort: { pressure: -1, reports: -1 } },
    ]);

    return res.json({ success: true, windowHours: hours, count: wards.length, wards });
  } catch (error) {
    next(error);
  }
};

// @desc    Reports that justify sending a truck — the routing input
// @route   GET /api/bins/actionable?hours=
// @access  Private
const getActionable = async (req, res, next) => {
  try {
    const hours = Number(req.query.hours) || 24;

    const reports = await BinReport.actionable({ hours })
      .select("status location ward weight createdAt")
      .sort({ weight: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return res.json({
      success: true,
      windowHours: hours,
      count: reports.length,
      // Shaped for services/routeOptimizer.js, which expects lat/lng objects.
      points: reports.map((report) => ({
        id: report._id,
        lat: report.location.coordinates[1],
        lng: report.location.coordinates[0],
        status: report.status,
        ward: report.ward,
        weight: report.weight,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a bin as collected
// @route   PATCH /api/bins/:id/resolve
// @access  Private
const resolveReport = async (req, res, next) => {
  try {
    const report = await BinReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    if (report.resolvedAt) {
      return res.status(409).json({ success: false, message: "Already resolved" });
    }

    report.resolvedAt = new Date();
    report.resolvedBy = req.user._id;
    await report.save();

    if (req.io) req.io.emit("bin:resolved", { id: report._id, ward: report.ward });

    return res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

// @desc    Plan a collection route over the bins that actually need emptying
// @route   POST /api/bins/route
// @access  Private
//
// This is the M2-to-routing link: the truck is sent to reported-full bins rather
// than driving a fixed circuit. The comparison figure returned here uses the same
// method as scripts/routeSimulation.js, whose baseline is a fixed circuit over
// every bin ordered with the same heuristics — not the naive per-bin round trip,
// which flatters the result and does not describe how anyone collects.
const getCollectionRoute = async (req, res, next) => {
  try {
    const { depot, hours = 24, maxPerRoute = 25 } = req.body;

    if (!depot || !Number.isFinite(Number(depot.lat)) || !Number.isFinite(Number(depot.lng ?? depot.lon))) {
      return res.status(400).json({
        success: false,
        message: "depot with lat and lng is required",
      });
    }

    const origin = {
      // routeOptimizer uses `lon`, the rest of the API uses `lng`.
      lat: Number(depot.lat),
      lon: Number(depot.lng ?? depot.lon),
      name: depot.name || "Depot",
    };

    const reports = await BinReport.actionable({ hours: Number(hours) })
      .select("location ward status weight")
      .lean();

    if (reports.length === 0) {
      return res.json({
        success: true,
        message: "No bins currently need collection.",
        stops: 0,
        routes: [],
      });
    }

    const stops = reports.map((report) => ({
      id: String(report._id),
      lat: report.location.coordinates[1],
      lon: report.location.coordinates[0],
      ward: report.ward,
      status: report.status,
    }));

    const optimizer = new RouteOptimizer();
    const result = await optimizer.optimizeRoutes(origin, stops, {
      maxPickupsPerRoute: Number(maxPerRoute),
    });

    if (!result.success) {
      return res.status(422).json({ success: false, message: result.message });
    }

    // Distance if every bin in the network were visited on one ordered circuit,
    // which is what a fixed municipal route costs whether or not bins are full.
    const allBins = await BinReport.aggregate([
      { $match: { accepted: true } },
      {
        $group: {
          _id: "$ward",
          lng: { $avg: { $arrayElemAt: ["$location.coordinates", 0] } },
          lat: { $avg: { $arrayElemAt: ["$location.coordinates", 1] } },
        },
      },
    ]);

    let circuitKm = 0;
    if (allBins.length) {
      let current = origin;
      const remaining = allBins.map((w) => ({ lat: w.lat, lon: w.lng }));
      while (remaining.length) {
        let best = 0;
        let bestDistance = Infinity;
        remaining.forEach((point, index) => {
          const distance = haversineDistance(current.lat, current.lon, point.lat, point.lon);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = index;
          }
        });
        circuitKm += bestDistance;
        current = remaining[best];
        remaining.splice(best, 1);
      }
      circuitKm += haversineDistance(current.lat, current.lon, origin.lat, origin.lon);
    }

    const optimisedKm = Number(result.summary.totalDistance);

    return res.json({
      success: true,
      stops: stops.length,
      routes: result.routes,
      summary: result.summary,
      comparison: {
        fixedCircuitKm: Number(circuitKm.toFixed(2)),
        optimisedKm,
        reductionPct:
          circuitKm > 0
            ? Number((((circuitKm - optimisedKm) / circuitKm) * 100).toFixed(1))
            : null,
        note: "Baseline is a single ordered circuit over every ward with reports, driven regardless of fill state.",
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reporter's own history and standing
// @route   GET /api/bins/my-reports
// @access  Private
const getMyReports = async (req, res, next) => {
  try {
    const [reports, weight, accepted, total] = await Promise.all([
      BinReport.find({ reporter: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("status location ward accepted rejectionReason createdAt resolvedAt")
        .lean(),
      binTrust.reporterWeight(req.user._id),
      BinReport.countDocuments({ reporter: req.user._id, accepted: true }),
      BinReport.countDocuments({ reporter: req.user._id }),
    ]);

    return res.json({
      success: true,
      reports,
      standing: {
        weight,
        accepted,
        total,
        // Earned by consistent accepted reporting, per synopsis section 5.
        sentinel: weight >= 2 && accepted >= 25,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getNearby,
  getWardSummary,
  getActionable,
  getCollectionRoute,
  resolveReport,
  getMyReports,
  wardKey,
};
