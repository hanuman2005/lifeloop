// backend/services/binTrust.js — anti-gaming for M2 crowd-sensing.
//
// Bin reports earn points and are unverified, which makes them the most gameable
// surface in the platform. Synopsis section 11 commits to rate limits, image-hash
// duplicate detection, geofence checks and reputation-weighted reporting; this is
// where those live, kept together so the rules are testable in isolation and can
// be quoted as a set in the thesis.
//
// Design decision: rejected reports are stored with `accepted: false` rather than
// discarded. Deleting them would make the rejection rate unmeasurable, and
// "how do you know your anti-gaming works" is a question that needs a number.

const crypto = require("crypto");

const BinReport = require("../models/BinReport");

// A citizen genuinely passing bins might file a handful an hour. Twenty is far
// above honest use and far below what farming points would need.
const MAX_REPORTS_PER_HOUR = 20;

// Two reports of the same bin minutes apart carry no new information.
const SAME_PLACE_METRES = 25;
const SAME_PLACE_COOLDOWN_MINUTES = 30;

// How far back a repeated photograph still counts as a duplicate.
const DUPLICATE_WINDOW_HOURS = 24;

// Service area. Defaults to a box around India so development and testing are not
// blocked; narrow it per deployment via env rather than hardcoding a ward.
const GEOFENCE = {
  minLng: Number(process.env.GEOFENCE_MIN_LNG ?? 68.0),
  maxLng: Number(process.env.GEOFENCE_MAX_LNG ?? 97.5),
  minLat: Number(process.env.GEOFENCE_MIN_LAT ?? 6.5),
  maxLat: Number(process.env.GEOFENCE_MAX_LAT ?? 37.5),
};

/** SHA-256 of the image bytes. Same photo, same hash, regardless of filename. */
const hashImage = (base64OrBuffer) => {
  if (!base64OrBuffer) return null;
  const buffer = Buffer.isBuffer(base64OrBuffer)
    ? base64OrBuffer
    : Buffer.from(String(base64OrBuffer), "base64");
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

/** Metres between two [lng, lat] pairs. Haversine — the same formula routeOptimizer uses. */
const distanceMetres = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const withinGeofence = ([lng, lat]) =>
  lng >= GEOFENCE.minLng && lng <= GEOFENCE.maxLng &&
  lat >= GEOFENCE.minLat && lat <= GEOFENCE.maxLat;

/**
 * Reporter reputation, derived from their track record.
 *
 * Weighting rather than blocking is deliberate: a new reporter is not a bad
 * reporter, and a single rejected report should reduce influence, not remove it.
 * The map aggregates by summed weight, so an unreliable account fades instead of
 * vanishing — which also makes the system harder to probe for a ban threshold.
 *
 * @returns {Promise<number>} between 0.2 and 3
 */
const reporterWeight = async (userId) => {
  const [total, accepted] = await Promise.all([
    BinReport.countDocuments({ reporter: userId }),
    BinReport.countDocuments({ reporter: userId, accepted: true }),
  ]);

  // No history: trusted enough to count once, not enough to count for more.
  if (total === 0) return 1;

  const acceptRate = accepted / total;

  // Volume earns influence slowly, and only for reporters who are mostly accepted.
  const experience = Math.min(1, accepted / 50);
  const weight = acceptRate * (1 + experience * 2);

  return Math.max(0.2, Math.min(3, Number(weight.toFixed(2))));
};

/**
 * Apply every rule to a candidate report.
 *
 * @returns {Promise<{accepted: boolean, reason?: string, weight: number, imageHash: string|null}>}
 */
const screenReport = async ({ userId, coordinates, imageBase64, accuracyMetres }) => {
  const imageHash = hashImage(imageBase64);
  const weight = await reporterWeight(userId);

  if (!withinGeofence(coordinates)) {
    return { accepted: false, reason: "implausible_location", weight, imageHash };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await BinReport.countDocuments({
    reporter: userId,
    createdAt: { $gte: hourAgo },
  });
  if (recentCount >= MAX_REPORTS_PER_HOUR) {
    return { accepted: false, reason: "rate_limited", weight, imageHash };
  }

  if (imageHash) {
    const duplicate = await BinReport.findOne({
      reporter: userId,
      imageHash,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000) },
    }).lean();
    if (duplicate) {
      return { accepted: false, reason: "duplicate_image", weight, imageHash };
    }
  }

  // Same person, same spot, minutes apart: no new information, and the cheapest
  // way to farm points if left unchecked.
  const cooldown = new Date(Date.now() - SAME_PLACE_COOLDOWN_MINUTES * 60 * 1000);
  const nearbyRecent = await BinReport.find({
    reporter: userId,
    createdAt: { $gte: cooldown },
  })
    .select("location")
    .lean();

  const tooClose = nearbyRecent.some(
    (report) => distanceMetres(report.location.coordinates, coordinates) < SAME_PLACE_METRES,
  );
  if (tooClose) {
    return { accepted: false, reason: "spam_pattern", weight, imageHash };
  }

  // A very poor GPS fix still maps, but should not carry full influence.
  const adjusted = accuracyMetres > 200 ? Math.max(0.2, weight * 0.5) : weight;

  return { accepted: true, weight: adjusted, imageHash };
};

module.exports = {
  screenReport,
  reporterWeight,
  hashImage,
  distanceMetres,
  withinGeofence,
  MAX_REPORTS_PER_HOUR,
  SAME_PLACE_METRES,
  SAME_PLACE_COOLDOWN_MINUTES,
  GEOFENCE,
};
