// routes/logs.js - CRUD operations for carbon logs
const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const auth = require("../middleware/auth");

// Get all logs for authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const logs = await Log.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get logs filtered by date range
router.get("/range", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.id };

    if (startDate) query.date = { $gte: startDate };
    if (endDate) query.date = { ...query.date, $lte: endDate };

    const logs = await Log.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new log entry
router.post("/", auth, async (req, res) => {
  try {
    const { id, cat, name, co2, qty, total, date } = req.body;

    // Check if log with same id already exists
    const existingLog = await Log.findOne({ id });
    if (existingLog) {
      return res.status(400).json({ message: "Log already exists" });
    }

    const log = new Log({
      id,
      userId: req.user.id,
      cat,
      name,
      co2,
      qty,
      total,
      date,
    });

    await log.save();
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a log entry
router.delete("/:id", auth, async (req, res) => {
  try {
    const log = await Log.findOne({ id: req.params.id, userId: req.user.id });

    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }

    await Log.deleteOne({ id: req.params.id, userId: req.user.id });
    res.json({ message: "Log removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk import logs (for data migration)
router.post("/bulk", auth, async (req, res) => {
  try {
    const logs = req.body;

    // Add userId to each log and filter out duplicates
    const logsWithUser = logs.map((log) => ({
      ...log,
      userId: req.user.id,
    }));

    // Use bulkWrite for efficiency
    const operations = logsWithUser.map((log) => ({
      updateOne: {
        filter: { id: log.id, userId: req.user.id },
        update: { $set: log },
        upsert: true,
      },
    }));

    await Log.bulkWrite(operations);
    res.json({ message: `${logs.length} logs imported successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
