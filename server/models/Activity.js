const mongoose = require("mongoose");

const ACTIVITY_TYPES = {
  NOTE: "note",
  CALL: "call",
  EMAIL: "email",
  MEETING: "meeting",
  STAGE_CHANGE: "stage_change",
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  LEAD_CREATED: "lead_created",
};

const ACTIVITY_TYPE_LIST = Object.values(ACTIVITY_TYPES);
const MANUAL_ACTIVITY_TYPES = [
  ACTIVITY_TYPES.NOTE,
  ACTIVITY_TYPES.CALL,
  ACTIVITY_TYPES.EMAIL,
  ACTIVITY_TYPES.MEETING,
];

const activitySchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ACTIVITY_TYPE_LIST,
      default: ACTIVITY_TYPES.NOTE,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

activitySchema.index({ lead: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
module.exports.ACTIVITY_TYPE_LIST = ACTIVITY_TYPE_LIST;
module.exports.MANUAL_ACTIVITY_TYPES = MANUAL_ACTIVITY_TYPES;

