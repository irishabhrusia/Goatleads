const mongoose = require("mongoose");
const {
  TASK_TYPE_LIST,
  TASK_TYPES,
  TASK_PRIORITY_LIST,
  TASK_PRIORITIES,
  TASK_STATUS_LIST,
  TASK_STATUSES,
} = require("../constants/Tasks");

const taskSchema = new mongoose.Schema(
  {
    // Task summary e.g. "Call Alice to discuss Q4 discount"
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Type of follow-up activity
    type: {
      type: String,
      enum: TASK_TYPE_LIST,
      default: TASK_TYPES.FOLLOW_UP,
    },

    // The Lead this task belongs to
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },

    // The sales rep responsible for completing this task
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // When the task must be completed by
    dueDate: {
      type: Date,
      required: true,
    },

    // Urgency level
    priority: {
      type: String,
      enum: TASK_PRIORITY_LIST,
      default: TASK_PRIORITIES.MEDIUM,
    },

    // Current state of the task
    status: {
      type: String,
      enum: TASK_STATUS_LIST,
      default: TASK_STATUSES.PENDING,
    },

    // Extra details or conversation prep notes
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Track whether the automated background reminder email was sent
    reminderSent: {
      type: Boolean,
      default: false,
    },

    // Timestamp when task was marked completed
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast filtering and reminder checks
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ status: 1, dueDate: 1, reminderSent: 1 });
taskSchema.index({ lead: 1, dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
