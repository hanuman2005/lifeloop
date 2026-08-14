// ============================================
// models/WorkLedgerEntry.js — M4 collector work record
// ============================================
//
// The point of this module: a waste collector currently has no verifiable work
// history, so no way to evidence income to a bank. Every verified task appends an
// entry here, and the entries are chained so the record cannot be quietly edited
// after the fact.
//
// The chain is per collector, not global. A global chain would serialise every
// write in the system, and a collector only ever needs to prove their own history.
//
// This is deliberately the same hash-chain technique the descoped M5 EPR ledger
// specified (PROJECT-PLAN.md 6.5). Applying it here recovers most of the idea at a
// fraction of the cost, and gives the tamper-evidence argument somewhere real to
// live rather than existing only on paper.

const crypto = require("crypto");
const mongoose = require("mongoose");

const GENESIS_HASH = "0".repeat(64);

const workLedgerEntrySchema = new mongoose.Schema(
  {
    collector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectionTask",
      required: true,
      unique: true, // one entry per task; a task cannot be banked twice
    },

    taskType: {
      type: String,
      enum: ["bin_report", "listing", "pickup_request"],
      required: true,
    },

    ward: String,

    // Position in this collector's chain, starting at 1.
    sequence: {
      type: Number,
      required: true,
    },

    completedAt: {
      type: Date,
      required: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Tamper evidence ──────────────────────────────────────────────────────
    previousHash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

workLedgerEntrySchema.index({ collector: 1, sequence: 1 }, { unique: true });

/**
 * The hash covers every field that matters plus the previous hash, so editing any
 * earlier entry invalidates every entry after it.
 */
workLedgerEntrySchema.statics.computeHash = function (entry) {
  const payload = [
    String(entry.collector),
    String(entry.task),
    entry.taskType,
    entry.ward || "",
    String(entry.sequence),
    new Date(entry.completedAt).toISOString(),
    String(entry.verifiedBy),
    entry.previousHash,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
};

/**
 * Append a verified task to a collector's chain.
 *
 * Reads the current tip and links to it. Concurrent appends for the same
 * collector would race, which the unique index on (collector, sequence) turns
 * into a duplicate-key error rather than a silently forked chain — a caller
 * seeing E11000 should retry.
 */
workLedgerEntrySchema.statics.append = async function ({
  collector,
  task,
  taskType,
  ward,
  completedAt,
  verifiedBy,
}) {
  const tip = await this.findOne({ collector }).sort({ sequence: -1 }).lean();

  const draft = {
    collector,
    task,
    taskType,
    ward,
    sequence: (tip?.sequence || 0) + 1,
    completedAt,
    verifiedBy,
    previousHash: tip?.hash || GENESIS_HASH,
  };

  draft.hash = this.computeHash(draft);
  return this.create(draft);
};

/**
 * Recompute the chain and report the first entry that does not match.
 *
 * This is what makes the ledger evidence rather than a claim: anyone can run it
 * and see whether the history has been altered.
 */
workLedgerEntrySchema.statics.verifyChain = async function (collector) {
  const entries = await this.find({ collector }).sort({ sequence: 1 }).lean();

  let expectedPrevious = GENESIS_HASH;

  for (const entry of entries) {
    if (entry.previousHash !== expectedPrevious) {
      return { valid: false, brokenAt: entry.sequence, reason: "previousHash does not match the prior entry" };
    }
    if (this.computeHash(entry) !== entry.hash) {
      return { valid: false, brokenAt: entry.sequence, reason: "entry contents do not match its hash" };
    }
    expectedPrevious = entry.hash;
  }

  return { valid: true, entries: entries.length, tip: expectedPrevious };
};

// Append-only. Mongoose cannot prevent a direct driver write, but it can stop the
// application from editing history by accident, which is the realistic risk.
const blockMutation = function (next) {
  next(new Error("Work ledger entries are append-only and cannot be modified"));
};
workLedgerEntrySchema.pre("findOneAndUpdate", blockMutation);
workLedgerEntrySchema.pre("updateOne", blockMutation);
workLedgerEntrySchema.pre("updateMany", blockMutation);
workLedgerEntrySchema.pre("deleteOne", blockMutation);
workLedgerEntrySchema.pre("findOneAndDelete", blockMutation);

workLedgerEntrySchema.statics.GENESIS_HASH = GENESIS_HASH;

module.exports = mongoose.model("WorkLedgerEntry", workLedgerEntrySchema);
