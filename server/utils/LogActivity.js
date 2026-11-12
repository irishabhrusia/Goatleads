const Activity = require("../models/Activity");

/**
 * Safely appends an entry to a lead's activity timeline without blocking the main request.
 */
async function logActivity({ lead, user, type, content, metadata = {} }) {
  try {
    if (!lead || !user || !content) return null;
    return await Activity.create({
      lead,
      user,
      type,
      content: String(content).trim(),
      metadata,
    });
  } catch (err) {
    console.error("logActivity error:", err.message);
    return null;
  }
}

module.exports = { logActivity };

