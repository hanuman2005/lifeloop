/**
 * Populate the database with enough data to exercise every screen.
 *
 *   node scripts/seedDemo.js
 *   node scripts/seedDemo.js --wipe     # remove previously seeded data first
 *
 * Without this most screens render their empty state, which tells you the query
 * works but nothing about the layout, the sorting, or whether the numbers read
 * sensibly. Testing against one account also cannot reach the donation loop at
 * all, since a donor cannot express interest in their own listing.
 *
 * Every account uses a @demo.lifeloop.com address, so --wipe can
 * remove exactly what this script added and nothing a human created.
 *
 * Passwords are identical and weak on purpose: this is local demo data and being
 * able to read the password off the terminal matters more than protecting it.
 */

const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");
const Listing = require("../models/Listing");
const BinReport = require("../models/BinReport");
const EcoPoints = require("../models/EcoPoints");

const PASSWORD = "Demo1234!";
// The User model validates the address, and it rejects made-up TLDs like
// ".demo", so this uses a real one on a subdomain nobody will confuse for a
// person's account.
const DOMAIN = "@demo.lifeloop.com";

// Bhimavaram — the pilot area.
const CENTRE = { lat: 16.5449, lng: 81.5212 };

const ACCOUNTS = [
  { firstName: "Asha", lastName: "Reddy", userType: "donor", phoneNumber: "9000000001" },
  { firstName: "Ravi", lastName: "Kumar", userType: "recipient", phoneNumber: "9000000002" },
  { firstName: "Priya", lastName: "Nair", userType: "both", phoneNumber: "9000000003" },
  { firstName: "Suresh", lastName: "Rao", userType: "collector", phoneNumber: "9000000004" },
  { firstName: "Meena", lastName: "Iyer", userType: "admin", phoneNumber: "9000000005" },
];

const LISTINGS = [
  {
    title: "Steel water bottles, set of 3",
    description: "Used but in good condition. Slight dents on one, all seal properly.",
    category: "household-items",
    quantity: 3,
    unit: "items",
    pickupLocation: "Near Bhimavaram bus stand",
  },
  {
    title: "Engineering textbooks, second year",
    description: "Mechanical and electrical subjects. Some pencil underlining, no missing pages.",
    category: "books",
    quantity: 8,
    unit: "items",
    pickupLocation: "SRKR college gate",
  },
  {
    title: "Cotton shirts, mens medium",
    description: "Six shirts, washed and folded. Two have small collar marks, rest are fine.",
    category: "clothing",
    quantity: 6,
    unit: "items",
    pickupLocation: "Juvvalapalem road",
  },
  {
    title: "Old laptop charger and cables",
    description: "Assorted chargers and USB cables. Untested, taking them for parts is fine.",
    category: "electronics",
    quantity: 5,
    unit: "items",
    pickupLocation: "Near Gunupudi temple",
  },
  {
    title: "Wooden study chair",
    description: "Sturdy, one loose armrest that needs a screw. Free to collect.",
    category: "furniture",
    quantity: 1,
    unit: "items",
    pickupLocation: "Vidya Nagar",
  },
];

/** A point scattered up to `spreadKm` from the pilot centre. */
function nearby(spreadKm = 3) {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * spreadKm;
  return {
    lat: CENTRE.lat + (distance * Math.cos(angle)) / 111,
    lng: CENTRE.lng + (distance * Math.sin(angle)) / (111 * Math.cos((CENTRE.lat * Math.PI) / 180)),
  };
}

const wardKey = ([lng, lat]) => `W${lat.toFixed(2)}_${lng.toFixed(2)}`;

async function wipe() {
  const users = await User.find({ email: new RegExp(`${DOMAIN}$`) }).select("_id").lean();
  const ids = users.map((u) => u._id);

  const removed = {
    listings: (await Listing.deleteMany({ donor: { $in: ids } })).deletedCount,
    binReports: (await BinReport.deleteMany({ reporter: { $in: ids } })).deletedCount,
    ecoPoints: (await EcoPoints.deleteMany({ userId: { $in: ids } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: ids } })).deletedCount,
  };

  console.log("🧹 removed previous demo data:", removed);
}

async function main() {
  await connectDB();

  if (process.argv.includes("--wipe")) await wipe();

  // ── Accounts ─────────────────────────────────────────────────────────────
  const users = {};
  for (const account of ACCOUNTS) {
    const email = `${account.firstName.toLowerCase()}${DOMAIN}`;
    let user = await User.findOne({ email });

    if (!user) {
      // Assigned via the document rather than an update, so the pre-save hook
      // hashes the password. A direct updateOne would store it in clear.
      user = await User.create({
        ...account,
        email,
        password: PASSWORD,
        location: { type: "Point", coordinates: [CENTRE.lng, CENTRE.lat] },
      });
    }
    users[account.userType] = user;
  }
  console.log(`👤 ${Object.keys(users).length} accounts ready`);

  // ── Listings ─────────────────────────────────────────────────────────────
  const donors = [users.donor, users.both];
  let listingsMade = 0;

  for (const [index, template] of LISTINGS.entries()) {
    const exists = await Listing.findOne({ title: template.title });
    if (exists) continue;

    const point = nearby(2);
    await Listing.create({
      ...template,
      donor: donors[index % donors.length]._id,
      location: { type: "Point", coordinates: [point.lng, point.lat] },
      status: "available",
      images: [],
    });
    listingsMade += 1;
  }
  console.log(`📦 ${listingsMade} listings created (${LISTINGS.length - listingsMade} already present)`);

  // ── Bin reports ──────────────────────────────────────────────────────────
  // Spread over several wards and weighted towards needing collection, so the
  // ward map shows a range of pressure rather than a uniform colour.
  const existingReports = await BinReport.countDocuments({ reporter: { $in: Object.values(users).map((u) => u._id) } });
  let reportsMade = 0;

  if (existingReports < 10) {
    const reporters = [users.donor, users.recipient, users.both];

    for (let i = 0; i < 24; i += 1) {
      const point = nearby(3.5);
      const roll = Math.random();
      const status = roll < 0.45 ? "full" : roll < 0.7 ? "overflowing" : "ok";

      await BinReport.create({
        reporter: reporters[i % reporters.length]._id,
        status,
        location: { type: "Point", coordinates: [point.lng, point.lat] },
        ward: wardKey([point.lng, point.lat]),
        accuracyMetres: 8 + Math.floor(Math.random() * 40),
        // Varied so the map's weighted pressure differs from a raw count, which
        // is the whole reason reputation weighting exists.
        weight: Number((0.8 + Math.random() * 1.4).toFixed(2)),
        accepted: true,
        // Spread across the last two days so the 6h/24h/3d filters differ.
        createdAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
      });
      reportsMade += 1;
    }
  }
  console.log(`🗑️  ${reportsMade} bin reports created (${existingReports} already present)`);

  // ── Eco points ───────────────────────────────────────────────────────────
  for (const user of Object.values(users)) {
    let eco = await EcoPoints.findOne({ userId: user._id });
    if (!eco) eco = await EcoPoints.create({ userId: user._id });

    if (eco.totalPoints === 0) {
      for (let i = 0; i < 4; i += 1) await eco.awardPoints("scan", "Demo scan");
      for (let i = 0; i < 3; i += 1) await eco.awardPoints("bin_report", "Demo bin report");
      await eco.awardPoints("donate", "Demo donation");
    }
  }
  console.log("🌱 eco points seeded");

  console.log("\n" + "=".repeat(58));
  console.log("  Sign in with any of these — password is the same for all");
  console.log("=".repeat(58));
  for (const account of ACCOUNTS) {
    const email = `${account.firstName.toLowerCase()}${DOMAIN}`;
    console.log(`  ${account.userType.padEnd(10)} ${email.padEnd(26)} ${PASSWORD}`);
  }
  console.log("=".repeat(58));
  console.log("\n  admin      sees Admin and Municipal in the sidebar");
  console.log("  collector  sees Collect");
  console.log("  donor      has listings; sign in as recipient to claim one\n");

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("❌ seed failed:", error.message);
  await mongoose.connection.close();
  process.exit(1);
});
