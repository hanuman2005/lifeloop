// backend/controllers/collectorController.js — M4 Collector Formalization
//
// Registered collectors receive proximity-based tasks generated from bin reports
// that need emptying and Exchange donations awaiting pickup. Completed work is
// verified by the citizen who raised it, then appended to a tamper-evident ledger.
//
// The ledger is the point of the module. A collector currently has no verifiable
// work history and therefore no way to evidence income to a bank.

const BinReport = require("../models/BinReport");
const CollectionTask = require("../models/CollectionTask");
const WorkLedgerEntry = require("../models/WorkLedgerEntry");
const { wardKey } = require("./binController");

const isCollector = (user) => user?.userType === "collector" || user?.userType === "admin";

/**
 * Turn unresolved bin reports into open tasks.
 *
 * Idempotent: CollectionTask has a unique index on sourceRef, so re-running
 * cannot duplicate work. Duplicate-key errors are counted, not thrown.
 *
 * @route POST /api/collector/tasks/generate
 * @access Private (collector or admin)
 */
const generateTasks = async (req, res, next) => {
  try {
    if (!isCollector(req.user)) {
      return res.status(403).json({ success: false, message: "Collector access required" });
    }

    const hours = Number(req.body.hours) || 24;
    const reports = await BinReport.actionable({ hours }).select("location ward status").lean();

    let created = 0;
    let existing = 0;

    for (const report of reports) {
      try {
        await CollectionTask.create({
          source: "bin_report",
          sourceRef: report._id,
          sourceModel: "BinReport",
          location: report.location,
          ward: report.ward || wardKey(report.location.coordinates),
          // Overflowing outranks merely full: it is a public health issue, not a
          // capacity one.
          priority: report.status === "overflowing" ? 3 : 2,
        });
        created += 1;
      } catch (error) {
        if (error.code === 11000) existing += 1;
        else throw error;
      }
    }

    return res.json({
      success: true,
      considered: reports.length,
      created,
      alreadyQueued: existing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Open tasks nearest the collector.
 *
 * Sorted by distance via $near, because a collector on foot or on a cycle cart
 * cares far more about what is close than about what is marginally more urgent.
 *
 * @route GET /api/collector/tasks/nearby?lat=&lng=&radius=
 */
const getNearbyTasks = async (req, res, next) => {
  try {
    if (!isCollector(req.user)) {
      return res.status(403).json({ success: false, message: "Collector access required" });
    }

    const { lat, lng, radius = 5 } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, message: "lat and lng are required" });
    }

    const tasks = await CollectionTask.find({
      status: "open",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: Number(radius) * 1000,
        },
      },
    })
      .limit(50)
      .lean();

    return res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * Claim a task.
 *
 * The status guard in the query is what makes this safe against two collectors
 * claiming the same task: whoever updates first flips it off "open", and the
 * second finds nothing to update.
 *
 * @route POST /api/collector/tasks/:id/accept
 */
const acceptTask = async (req, res, next) => {
  try {
    if (!isCollector(req.user)) {
      return res.status(403).json({ success: false, message: "Collector access required" });
    }

    const task = await CollectionTask.findOneAndUpdate(
      { _id: req.params.id, status: "open" },
      {
        status: "assigned",
        assignedTo: req.user._id,
        assignedAt: new Date(),
      },
      { new: true },
    );

    if (!task) {
      return res.status(409).json({
        success: false,
        message: "That task has already been taken",
      });
    }

    return res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a task done, with before and after photographs.
 *
 * Completion is not verification. The task sits at "completed" until the citizen
 * who raised it confirms, and only then does it reach the ledger.
 *
 * @route POST /api/collector/tasks/:id/complete
 */
const completeTask = async (req, res, next) => {
  try {
    const { beforePhotoUrl, afterPhotoUrl, notes } = req.body;

    const task = await CollectionTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (String(task.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "This task is not assigned to you" });
    }
    if (task.status === "completed" || task.status === "verified") {
      return res.status(409).json({ success: false, message: "Task is already complete" });
    }

    // Photographs are the verification evidence; without them there is nothing
    // for the citizen to confirm against.
    if (!beforePhotoUrl || !afterPhotoUrl) {
      return res.status(400).json({
        success: false,
        message: "Both a before and an after photograph are required",
      });
    }

    task.status = "completed";
    task.beforePhotoUrl = beforePhotoUrl;
    task.afterPhotoUrl = afterPhotoUrl;
    task.notes = notes;
    task.completedAt = new Date();
    await task.save();

    if (req.io) req.io.emit("task:completed", { id: task._id, ward: task.ward });

    return res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

/**
 * Citizen confirms the work, which appends it to the collector's ledger.
 *
 * A collector cannot verify their own task. Without an independent confirmation
 * the ledger records only that someone claimed to have done something, which is
 * exactly the unverifiable paper trail the module exists to replace.
 *
 * @route POST /api/collector/tasks/:id/verify
 */
const verifyTask = async (req, res, next) => {
  try {
    const task = await CollectionTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (task.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "Only a completed task can be verified",
      });
    }
    if (String(task.assignedTo) === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "A collector cannot verify their own work",
      });
    }

    task.status = "verified";
    task.verifiedBy = req.user._id;
    task.verifiedAt = new Date();
    await task.save();

    const entry = await WorkLedgerEntry.append({
      collector: task.assignedTo,
      task: task._id,
      taskType: task.source,
      ward: task.ward,
      completedAt: task.completedAt,
      verifiedBy: req.user._id,
    });

    // Close the loop: the bin that prompted the task is now serviced.
    if (task.source === "bin_report") {
      await BinReport.findByIdAndUpdate(task.sourceRef, {
        resolvedAt: new Date(),
        resolvedBy: task.assignedTo,
      });
    }

    return res.json({
      success: true,
      task,
      ledgerEntry: { sequence: entry.sequence, hash: entry.hash },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * A collector's work record, with the chain checked on read.
 *
 * Verifying on every read rather than on demand means a tampered ledger is
 * discovered the next time anyone looks, not whenever someone remembers to audit.
 *
 * @route GET /api/collector/ledger
 */
const getLedger = async (req, res, next) => {
  try {
    const collectorId = req.query.collector || req.user._id;

    // Collectors see their own record; admins can audit anyone.
    if (String(collectorId) !== String(req.user._id) && req.user.userType !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorised to view that ledger" });
    }

    const [entries, integrity] = await Promise.all([
      WorkLedgerEntry.find({ collector: collectorId })
        .sort({ sequence: -1 })
        .limit(200)
        .populate("verifiedBy", "firstName lastName")
        .lean(),
      WorkLedgerEntry.verifyChain(collectorId),
    ]);

    const byWard = entries.reduce((accumulator, entry) => {
      accumulator[entry.ward || "unknown"] = (accumulator[entry.ward || "unknown"] || 0) + 1;
      return accumulator;
    }, {});

    return res.json({
      success: true,
      totalTasks: entries.length,
      integrity,
      byWard,
      entries,
    });
  } catch (error) {
    next(error);
  }
};

/** @route GET /api/collector/tasks/mine */
const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await CollectionTask.find({ assignedTo: req.user._id })
      .sort({ assignedAt: -1 })
      .limit(100)
      .lean();

    return res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateTasks,
  getNearbyTasks,
  acceptTask,
  completeTask,
  verifyTask,
  getLedger,
  getMyTasks,
};
