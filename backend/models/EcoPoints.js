// backend/models/EcoPoints.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  action: { type: String, required: true }, // "scan", "reuse_project", "pickup", "donate", "upcycle"
  points: { type: Number, required: true },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }, // extra info e.g. item label, kg saved
  createdAt: { type: Date, default: Date.now },
});

const ecoPointsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalPoints: { type: Number, default: 0 },
    level: { type: String, default: "Eco Beginner" },
    transactions: [transactionSchema],
    stats: {
      totalScans: { type: Number, default: 0 },
      totalReuseProjects: { type: Number, default: 0 },
      totalPickups: { type: Number, default: 0 },
      totalDonations: { type: Number, default: 0 },
      // M2 crowd-sensing. Counted separately from totalScans: a bin report and a
      // waste scan are different acts, and merging them would make both metrics
      // unusable in the thesis.
      totalBinReports: { type: Number, default: 0 },
      kgDiverted: { type: Number, default: 0 }, // kg of waste diverted from landfill
      co2Saved: { type: Number, default: 0 }, // kg CO2 equivalent saved
    },
  },
  { timestamps: true },
);

// Calculate level based on points
ecoPointsSchema.methods.calculateLevel = function () {
  const p = this.totalPoints;
  if (p >= 5000) return "Eco Champion 🏆";
  if (p >= 2000) return "Waste Warrior ⚔️";
  if (p >= 1000) return "Green Guardian 🌿";
  if (p >= 500) return "Eco Enthusiast 🌱";
  if (p >= 100) return "Eco Learner 📚";
  return "Eco Beginner 🌍";
};

// Award points helper
ecoPointsSchema.methods.awardPoints = async function (
  action,
  description,
  metadata = {},
) {
  const POINTS_MAP = {
    scan: 5,
    // Lower than a scan: a bin report is two taps and carries less information,
    // and over-rewarding it is exactly what makes the module worth gaming.
    bin_report: 3,
    reuse_project: 20,
    upcycle_project: 25,
    pickup_request: 30,
    donate: 25,
    share: 10,
    streak_bonus: 15,
    society_report: 40,
  };

  const points = POINTS_MAP[action] || 5;

  this.totalPoints += points;
  this.transactions.push({ action, points, description, metadata });
  this.level = this.calculateLevel();

  // Update stats
  if (action === "scan") this.stats.totalScans++;
  if (action === "bin_report") this.stats.totalBinReports++;
  if (action === "reuse_project") this.stats.totalReuseProjects++;
  if (action === "pickup_request") this.stats.totalPickups++;
  if (action === "donate") this.stats.totalDonations++;

  // CO2 calculation (approximate kg CO2 saved per action)
  const CO2_MAP = {
    scan: 0,
    // Reporting a bin does not itself divert waste; the collection it triggers
    // does, and that is credited to the collector.
    bin_report: 0,
    reuse_project: 0.5,
    upcycle_project: 0.8,
    pickup_request: 1.2,
    donate: 0.6,
  };
  this.stats.co2Saved += CO2_MAP[action] || 0;

  await this.save();
  return { points, totalPoints: this.totalPoints, level: this.level };
};

module.exports = mongoose.model("EcoPoints", ecoPointsSchema);
