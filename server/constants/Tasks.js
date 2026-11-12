// Constants for CRM Follow-up Tasks

const TASK_TYPES = {
  CALL: "call",
  EMAIL: "email",
  MEETING: "meeting",
  FOLLOW_UP: "follow_up",
  OTHER: "other",
};

const TASK_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

const TASK_STATUSES = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

module.exports = {
  TASK_TYPES,
  TASK_TYPE_LIST: Object.values(TASK_TYPES),
  TASK_PRIORITIES,
  TASK_PRIORITY_LIST: Object.values(TASK_PRIORITIES),
  TASK_STATUSES,
  TASK_STATUS_LIST: Object.values(TASK_STATUSES),
};
