const mongoose = require("mongoose");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { ROLES } = require("../constants/Roles");
const { ACTIVITY_TYPES } = require("../models/Activity");
const { logActivity } = require("../utils/LogActivity");
const {
  TASK_TYPES,
  TASK_TYPE_LIST,
  TASK_PRIORITIES,
  TASK_PRIORITY_LIST,
  TASK_STATUSES,
  TASK_STATUS_LIST,
} = require("../constants/Tasks");

// -----------------------------------------------------------------------------
// 1. POST /api/tasks - Create a new follow-up task
// -----------------------------------------------------------------------------
const createTask = async (req, res) => {
  try {
    const { title, type, lead, assignedTo, dueDate, priority, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }
    if (!lead || !mongoose.isValidObjectId(lead)) {
      return res.status(400).json({ success: false, message: "A valid lead ID is required." });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: "Due date is required." });
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid due date format." });
    }

    // Verify lead actually exists
    const leadDoc = await Lead.findById(lead);
    if (!leadDoc) {
      return res.status(404).json({ success: false, message: "Lead not found." });
    }

    // Admins can assign to anyone; Reps assign to themselves
    let targetAssignee = req.user._id;
    if (req.user.role === ROLES.ADMIN && assignedTo) {
      if (!mongoose.isValidObjectId(assignedTo)) {
        return res.status(400).json({ success: false, message: "Invalid assignedTo user ID." });
      }
      const userExists = await User.findById(assignedTo);
      if (!userExists) {
        return res.status(404).json({ success: false, message: "Assigned user not found." });
      }
      targetAssignee = assignedTo;
    }

    const task = await Task.create({
      title: title.trim(),
      type: type && TASK_TYPE_LIST.includes(type) ? type : TASK_TYPES.FOLLOW_UP,
      lead,
      assignedTo: targetAssignee,
      dueDate: parsedDueDate,
      priority: priority && TASK_PRIORITY_LIST.includes(priority) ? priority : TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.PENDING,
      notes: notes ? notes.trim() : "",
      reminderSent: false,
    });

    await task.populate([
      { path: "lead", select: "name company email phone stage" },
      { path: "assignedTo", select: "name email avatar role" },
    ]);

    await logActivity({
      lead: task.lead._id || task.lead,
      user: req.user._id,
      type: ACTIVITY_TYPES.TASK_CREATED,
      content: `Scheduled ${task.type.replace("_", " ")} task: "${task.title}"`,
      metadata: { taskId: task._id, dueDate: task.dueDate, priority: task.priority },
    });

    res.status(201).json({ success: true, message: "Task created.", task });
  } catch (err) {
    console.error("createTask error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 2. GET /api/tasks - List tasks with filtering, sorting and pagination
// -----------------------------------------------------------------------------
const getTasks = async (req, res) => {
  try {
    const { lead, assignedTo, status, priority, type, overdue, today } = req.query;
    const filter = {};

    // Filter by specific lead (e.g. on lead details page)
    if (lead && mongoose.isValidObjectId(lead)) {
      filter.lead = lead;
    }

    // Role-based scoping: Reps see their own tasks by default unless viewing a specific lead
    if (req.user.role === ROLES.REP && !lead) {
      filter.assignedTo = req.user._id;
    } else if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
      filter.assignedTo = assignedTo;
    }

    // Filter by task status
    if (status && TASK_STATUS_LIST.includes(status)) {
      filter.status = status;
    }

    // Filter by priority
    if (priority && TASK_PRIORITY_LIST.includes(priority)) {
      filter.priority = priority;
    }

    // Filter by task type
    if (type && TASK_TYPE_LIST.includes(type)) {
      filter.type = type;
    }

    const now = new Date();

    // Quick filter: overdue pending tasks
    if (overdue === "true") {
      filter.status = TASK_STATUSES.PENDING;
      filter.dueDate = { $lt: now };
    }

    // Quick filter: tasks due today
    if (today === "true") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    // Urgent tasks first (earliest due date)
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("lead", "name company email phone stage")
        .populate("assignedTo", "name email avatar role")
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getTasks error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 3. GET /api/tasks/:id - Get a single task by ID
// -----------------------------------------------------------------------------
const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID." });
    }

    const task = await Task.findById(id)
      .populate("lead", "name company email phone stage")
      .populate("assignedTo", "name email avatar role");

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error("getTask error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 4. PUT /api/tasks/:id - Update task details
// -----------------------------------------------------------------------------
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID." });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Reps can only update tasks assigned to them
    if (req.user.role === ROLES.REP && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not own this task." });
    }

    const { title, type, dueDate, priority, notes, assignedTo, status } = req.body;

    if (title && title.trim()) task.title = title.trim();
    if (type && TASK_TYPE_LIST.includes(type)) task.type = type;
    if (priority && TASK_PRIORITY_LIST.includes(priority)) task.priority = priority;
    if (notes !== undefined) task.notes = notes.trim();

    // If dueDate changes, reset reminderSent so the user gets notified for the new time
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) {
        task.dueDate = parsed;
        task.reminderSent = false;
      }
    }

    // Only Admin can reassign task to another rep
    if (req.user.role === ROLES.ADMIN && assignedTo && mongoose.isValidObjectId(assignedTo)) {
      task.assignedTo = assignedTo;
    }

    // Status update handling
    const previousStatus = task.status;
    if (status && TASK_STATUS_LIST.includes(status)) {
      task.status = status;
      if (status === TASK_STATUSES.COMPLETED) {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }

    await task.save();
    await task.populate([
      { path: "lead", select: "name company email phone stage" },
      { path: "assignedTo", select: "name email avatar role" },
    ]);

    if (previousStatus !== TASK_STATUSES.COMPLETED && task.status === TASK_STATUSES.COMPLETED) {
      await logActivity({
        lead: task.lead._id || task.lead,
        user: req.user._id,
        type: ACTIVITY_TYPES.TASK_COMPLETED,
        content: `Completed task: "${task.title}"`,
        metadata: { taskId: task._id },
      });
    }

    res.json({ success: true, message: "Task updated.", task });
  } catch (err) {
    console.error("updateTask error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 5. PATCH /api/tasks/:id/status - Quick status toggle (pending/completed/cancelled)
// -----------------------------------------------------------------------------
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID." });
    }
    if (!status || !TASK_STATUS_LIST.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${TASK_STATUS_LIST.join(", ")}`,
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Reps can only change status of their own tasks
    if (req.user.role === ROLES.REP && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not own this task." });
    }

    const previousStatus = task.status;
    task.status = status;
    task.completedAt = status === TASK_STATUSES.COMPLETED ? new Date() : null;

    await task.save();
    await task.populate([
      { path: "lead", select: "name company email phone stage" },
      { path: "assignedTo", select: "name email avatar role" },
    ]);

    if (previousStatus !== TASK_STATUSES.COMPLETED && status === TASK_STATUSES.COMPLETED) {
      await logActivity({
        lead: task.lead._id || task.lead,
        user: req.user._id,
        type: ACTIVITY_TYPES.TASK_COMPLETED,
        content: `Completed task: "${task.title}"`,
        metadata: { taskId: task._id },
      });
    }

    res.json({ success: true, message: `Task marked as ${status}.`, task });
  } catch (err) {
    console.error("updateTaskStatus error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 6. DELETE /api/tasks/:id - Delete a task
// -----------------------------------------------------------------------------
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid task ID." });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Reps can only delete their own tasks
    if (req.user.role === ROLES.REP && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not own this task." });
    }

    await task.deleteOne();
    res.json({ success: true, message: "Task deleted." });
  } catch (err) {
    console.error("deleteTask error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
