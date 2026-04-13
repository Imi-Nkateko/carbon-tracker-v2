// models/Log.js - Carbon activity log schema
const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  id: {
    type: String,
    required: true,
    unique: true,
  },
  cat: {
    type: String,
    enum: ["transport", "food", "energy", "other"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  co2: {
    type: Number,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
LogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model("Log", LogSchema);
