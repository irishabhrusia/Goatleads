// Task Queue Buckets
export const TASK_BUCKETS = {
  ALL: "all",
  OVERDUE: "overdue",
  TODAY: "today",
  UPCOMING: "upcoming",
  COMPLETED: "completed",
};

// Queue Metadata (Colors, Icons, Labels)
export const BUCKET_CONFIG = {
  [TASK_BUCKETS.OVERDUE]: {
    label: "Overdue",
    subtext: "Needs immediate action",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    cardBorder: "border-rose-200 hover:border-rose-400",
    activeRing: "ring-2 ring-rose-500 bg-rose-50/40",
    dotColor: "bg-rose-500",
    emptyMessage: "Zero overdue tasks! Your sales velocity is exceptional. 🎉",
  },
  [TASK_BUCKETS.TODAY]: {
    label: "Due Today",
    subtext: "Scheduled for today",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    cardBorder: "border-amber-200 hover:border-amber-400",
    activeRing: "ring-2 ring-amber-500 bg-amber-50/40",
    dotColor: "bg-amber-500",
    emptyMessage: "No tasks due today. Enjoy your focus time or prospect new leads! ☕",
  },
  [TASK_BUCKETS.UPCOMING]: {
    label: "Upcoming",
    subtext: "Planned future follow-ups",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    cardBorder: "border-blue-200 hover:border-blue-400",
    activeRing: "ring-2 ring-blue-500 bg-blue-50/40",
    dotColor: "bg-blue-500",
    emptyMessage: "No upcoming tasks scheduled yet. Plan your next customer touchpoints.",
  },
  [TASK_BUCKETS.COMPLETED]: {
    label: "Completed",
    subtext: "Successfully executed",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cardBorder: "border-emerald-200 hover:border-emerald-400",
    activeRing: "ring-2 ring-emerald-500 bg-emerald-50/40",
    dotColor: "bg-emerald-500",
    emptyMessage: "No completed tasks yet in this view.",
  },
};
