const mongoose = require("mongoose");
const Activity = require("../models/Activity");
const { ACTIVITY_TYPES, MANUAL_ACTIVITY_TYPES } = require("../models/Activity");
const Lead = require("../models/Lead");
const { ROLES } = require("../constants/Roles");

/**
 * GET /api/leads/:id/activities
 * Returns chronological activity timeline (newest first) for a lead.
 */
const getLeadActivities = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID." });
    }

    const leadExists = await Lead.exists({ _id: id });
    if (!leadExists) {
      return res.status(404).json({ success: false, message: "Lead not found." });
    }

    const activities = await Activity.find({ lead: id })
      .populate("user", "name email role avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, activities });
  } catch (err) {
    console.error("getLeadActivities error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * POST /api/leads/:id/activities
 * Logs a manual note, call, email, or meeting on a lead's timeline.
 */
const createLeadActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID." });
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: "Activity content is required." });
    }

    const activityType = type || ACTIVITY_TYPES.NOTE;
    if (!MANUAL_ACTIVITY_TYPES.includes(activityType)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${MANUAL_ACTIVITY_TYPES.join(", ")}.`,
      });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found." });
    }

    if (
      req.user.role === ROLES.REP &&
      lead.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only log activities on your own leads.",
      });
    }

    const activity = await Activity.create({
      lead: id,
      user: req.user._id,
      type: activityType,
      content: String(content).trim(),
    });

    await activity.populate("user", "name email role avatar");

    res.status(201).json({
      success: true,
      message: "Activity logged.",
      activity,
    });
  } catch (err) {
    console.error("createLeadActivity error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * DELETE /api/leads/:id/activities/:activityId
 * Deletes a manual activity entry (creator or Admin only).
 */
const deleteLeadActivity = async (req, res) => {
  try {
    const { id, activityId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(activityId)) {
      return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    const activity = await Activity.findOne({ _id: activityId, lead: id });
    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity not found." });
    }

    if (!MANUAL_ACTIVITY_TYPES.includes(activity.type)) {
      return res.status(400).json({
        success: false,
        message: "System audit entries cannot be deleted.",
      });
    }

    const isCreator = activity.user.toString() === req.user._id.toString();
    if (req.user.role !== ROLES.ADMIN && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only delete your own notes.",
      });
    }

    await activity.deleteOne();
    res.json({ success: true, message: "Activity deleted." });
  } catch (err) {
    console.error("deleteLeadActivity error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  getLeadActivities,
  createLeadActivity,
  deleteLeadActivity,
};

