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
const WasteAnalysis = require("../models/WasteAnalysis");
const CollectionTask = require("../models/CollectionTask");
const WorkLedgerEntry = require("../models/WorkLedgerEntry");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Schedule = require("../models/Schedule");
const Rating = require("../models/Rating");
const Transaction = require("../models/Transaction");

const PASSWORD = "Demo1234!";
const DOMAIN = "@demo.lifeloop.com";

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
  {
    title: "Glass jars with lids, set of 6",
    description: "From imported food. Labels soaked off, jars and lids are clean.",
    category: "household-items",
    quantity: 6,
    unit: "items",
    pickupLocation: "Narasapuram road",
  },
  {
    title: "Children's story books",
    description: "Aged 4-8 years. Amar Chitra Katha and Panchatantra, good condition.",
    category: "books",
    quantity: 12,
    unit: "items",
    pickupLocation: "Bhimavaram market",
  },
];

const WASTE_MATERIALS = [
  { material: "Plastic", confidence: 92, label: "Plastic bottle" },
  { material: "Metal", confidence: 88, label: "Steel tumbler" },
  { material: "Organic", confidence: 97, label: "Banana peel" },
  { material: "Paper", confidence: 79, label: "Old newspaper" },
  { material: "Glass", confidence: 85, label: "Broken glass jar" },
  { material: "Textile", confidence: 91, label: "Cotton shirt" },
  { material: "Hazardous", confidence: 94, label: "Used battery" },
  { material: "Plastic", confidence: 76, label: "Plastic bag" },
  { material: "Paper", confidence: 83, label: "Cardboard box" },
  { material: "Metal", confidence: 89, label: "Aluminium can" },
];

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
  const collections = [
    { name: "chats", model: Chat },
    { name: "messages", model: Message },
    { name: "schedules", model: Schedule },
    { name: "ratings", model: Rating },
    { name: "transactions", model: Transaction },
    { name: "workLedgerEntries", model: WorkLedgerEntry },
    { name: "collectionTasks", model: CollectionTask },
    { name: "wasteAnalyses", model: WasteAnalysis },
    { name: "listings", model: Listing },
    { name: "binReports", model: BinReport },
    { name: "ecoPoints", model: EcoPoints },
    { name: "users", model: User },
  ];

  for (const item of collections) {
    const count = await item.model.countDocuments({});
    if (count > 0) {
      await item.model.deleteMany({});
      console.log(`  🗑️  ${item.name}: ${count} removed`);
    }
  }
}

async function main() {
  await connectDB();

  if (process.argv.includes("--wipe")) {
    console.log("🧹 Wiping previous demo data...");
    await wipe();
    console.log("");
  }

  // ── Accounts ─────────────────────────────────────────────────────────────
  const users = {};
  for (const account of ACCOUNTS) {
    const email = `${account.firstName.toLowerCase()}${DOMAIN}`;
    let user = await User.findOne({ email });

    if (!user) {
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

  const donor = users.donor;
  const recipient = users.recipient;
  const both = users.both;
  const collector = users.collector;
  const admin = users.admin;

  // ── Listings ─────────────────────────────────────────────────────────────
  const donors_list = [donor, both];
  let listingsMade = 0;

  for (const [index, template] of LISTINGS.entries()) {
    const exists = await Listing.findOne({ title: template.title });
    if (exists) continue;

    const point = nearby(2);
    await Listing.create({
      ...template,
      donor: donors_list[index % donors_list.length]._id,
      location: { type: "Point", coordinates: [point.lng, point.lat] },
      status: "available",
      images: [],
    });
    listingsMade += 1;
  }
  console.log(`📦 ${listingsMade} listings created`);

  // ── Waste Analyses ───────────────────────────────────────────────────────
  let analysesMade = 0;
  const existingAnalyses = await WasteAnalysis.countDocuments({
    user: { $in: [donor._id, both._id, recipient._id] },
  });

  if (existingAnalyses < 10) {
    const scanUsers = [donor, both, recipient];
    for (let i = 0; i < 15; i++) {
      const waste = WASTE_MATERIALS[i % WASTE_MATERIALS.length];
      const daysAgo = Math.floor(Math.random() * 14);
      const created = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await WasteAnalysis.create({
        user: scanUsers[i % scanUsers.length]._id,
        tfLabel: waste.label,
        material: waste.material,
        confidence: waste.confidence + Math.floor(Math.random() * 8 - 4),
        recyclingGuidance: `${waste.material} disposal guidance here.`,
        impact: {
          carbonSaved: parseFloat((Math.random() * 0.5).toFixed(2)),
          wasteDiverted: parseFloat((Math.random() * 0.3).toFixed(2)),
          ecoScore: Math.floor(Math.random() * 10) + 1,
        },
        analysisCount: 1,
        lastAnalyzedAt: created,
        createdAt: created,
      });
      analysesMade += 1;
    }
  }
  console.log(`🔍 ${analysesMade} waste analyses created`);

  // ── Bin Reports ──────────────────────────────────────────────────────────
  const existingReports = await BinReport.countDocuments({
    reporter: { $in: Object.values(users).map((u) => u._id) },
  });
  let reportsMade = 0;

  if (existingReports < 30) {
    const reporters = [donor, recipient, both];
    const statuses = ["full", "overflowing", "ok"];

    for (let i = 0; i < 35; i++) {
      const point = nearby(4);
      const roll = Math.random();
      const status = roll < 0.4 ? "full" : roll < 0.65 ? "overflowing" : "ok";

      await BinReport.create({
        reporter: reporters[i % reporters.length]._id,
        status,
        location: { type: "Point", coordinates: [point.lng, point.lat] },
        ward: wardKey([point.lng, point.lat]),
        accuracyMetres: 8 + Math.floor(Math.random() * 40),
        weight: Number((0.8 + Math.random() * 1.4).toFixed(2)),
        accepted: true,
        createdAt: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000),
      });
      reportsMade += 1;
    }
  }
  console.log(`🗑️  ${reportsMade} bin reports created`);

  // ── Collection Tasks ─────────────────────────────────────────────────────
  let tasksMade = 0;
  const existingTasks = await CollectionTask.countDocuments({});

  if (existingTasks < 5) {
    const binReports = await BinReport.find({ accepted: true, status: { $in: ["full", "overflowing"] } })
      .limit(10)
      .lean();

    for (const report of binReports.slice(0, 6)) {
      const exists = await CollectionTask.findOne({ sourceRef: report._id });
      if (exists) continue;

      await CollectionTask.create({
        source: "bin_report",
        sourceRef: report._id,
        sourceModel: "BinReport",
        location: report.location,
        ward: report.ward,
        priority: report.status === "overflowing" ? 3 : 2,
        status: "open",
      });
      tasksMade += 1;
    }
  }
  console.log(`📋 ${tasksMade} collection tasks created`);

  // ── Work Ledger Entries ──────────────────────────────────────────────────
  let ledgerMade = 0;
  const existingLedger = await WorkLedgerEntry.countDocuments({});

  if (existingLedger < 3) {
    const tasks = await CollectionTask.find({ status: "verified" }).limit(5).lean();

    for (const task of tasks) {
      const tip = await WorkLedgerEntry.findOne({ collector: collector._id }).sort({ sequence: -1 }).lean();
      const draft = {
        collector: collector._id,
        task: task._id,
        taskType: task.source,
        ward: task.ward,
        completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        verifiedBy: admin._id,
        sequence: (tip?.sequence || 0) + 1,
        previousHash: tip?.hash || WorkLedgerEntry.GENESIS_HASH,
      };
      draft.hash = WorkLedgerEntry.computeHash(draft);
      await WorkLedgerEntry.create(draft);
      ledgerMade += 1;
    }
  }
  console.log(`📒 ${ledgerMade} ledger entries created`);

  // ── Eco Points ───────────────────────────────────────────────────────────
  for (const user of Object.values(users)) {
    let eco = await EcoPoints.findOne({ userId: user._id });
    if (!eco) eco = await EcoPoints.create({ userId: user._id });

    if (eco.totalPoints === 0) {
      for (let i = 0; i < 5; i++) await eco.awardPoints("scan", "Demo scan");
      for (let i = 0; i < 4; i++) await eco.awardPoints("bin_report", "Demo bin report");
      await eco.awardPoints("donate", "Demo donation");
    }
  }
  console.log(`🌱 eco points seeded`);

  // ── Chats & Messages ────────────────────────────────────────────────────
  let chatsMade = 0;
  const existingChats = await Chat.countDocuments({});

  if (existingChats < 2) {
    const listing = await Listing.findOne({ status: "available" });
    if (listing) {
      const chat = await Chat.create({
        participants: [donor._id, recipient._id],
        listing: listing._id,
        lastMessage: {
          content: "Hi, is this still available?",
          sender: recipient._id,
          sentAt: new Date(Date.now() - 3600000),
        },
      });

      await Message.create({
        chat: chat._id,
        sender: recipient._id,
        content: "Hi, is this still available?",
        messageType: "text",
      });
      await Message.create({
        chat: chat._id,
        sender: donor._id,
        content: "Yes, it is! When can you collect?",
        messageType: "text",
      });
      chatsMade += 1;
    }
  }
  console.log(`💬 ${chatsMade} chats created`);

  // ── Schedules ───────────────────────────────────────────────────────────
  let schedulesMade = 0;
  const existingSchedules = await Schedule.countDocuments({});

  if (existingSchedules < 2) {
    const listing = await Listing.findOne({ status: "available" });
    if (listing) {
    await Schedule.create({
      listing: listing._id,
      donor: donor._id,
      recipient: recipient._id,
      proposedDate: new Date(Date.now() + 86400000),
      proposedTime: "10:00",
      proposedDateTime: new Date(Date.now() + 86400000),
      status: "proposed",
      pickupLocation: listing.pickupLocation,
    });
      schedulesMade += 1;
    }
  }
  console.log(`📅 ${schedulesMade} schedules created`);

  // ── Ratings ─────────────────────────────────────────────────────────────
  let ratingsMade = 0;
  const existingRatings = await Rating.countDocuments({});

  if (existingRatings < 2) {
    await Rating.create({
      rater: recipient._id,
      rated: donor._id,
      rating: 5,
      comment: "Very generous, item was in great condition.",
      listing: null,
      ratingType: "donor",
    });
    ratingsMade += 1;
  }
  console.log(`⭐ ${ratingsMade} ratings created`);

  console.log("\n" + "=".repeat(58));
  console.log("  Sign in with any of these — password is the same for all");
  console.log("=".repeat(58));
  for (const account of ACCOUNTS) {
    const email = `${account.firstName.toLowerCase()}${DOMAIN}`;
    console.log(`  ${account.userType.padEnd(10)} ${email.padEnd(28)} ${PASSWORD}`);
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
