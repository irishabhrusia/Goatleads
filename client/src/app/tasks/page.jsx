"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Video,
  Users,
  User,
  Filter,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLES } from "@/constants";
import { TASK_BUCKETS, BUCKET_CONFIG } from "@/constants/tasks";

export default function TasksPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  const [tasks, setTasks] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [selectedBucket, setSelectedBucket] = useState(TASK_BUCKETS.ALL);
  const [scope, setScope] = useState("mine"); // "mine" or "team"
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newType, setNewType] = useState("follow_up");
  const [newPriority, setNewPriority] = useState("medium");
  const [newNotes, setNewNotes] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  // Notification message banner
  const [alertBanner, setAlertBanner] = useState(null);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const params = {};
      if (scope === "mine" && user?._id) {
        params.assignedTo = user._id;
      }

      const res = await api.get("/tasks", { params });
      setTasks(res.data?.tasks || []);
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load tasks. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        const params = {};
        if (scope === "mine" && user?._id) {
          params.assignedTo = user._id;
        }

        const res = await api.get("/tasks", { params });
        if (!cancelled) {
          setTasks(res.data?.tasks || []);
          setErrorMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load tasks. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [scope, user?._id]);

  useEffect(() => {
    let cancelled = false;

    async function loadDropdowns() {
      try {
        const [leadsRes, teamRes] = await Promise.all([
          api.get("/leads?limit=100").catch(() => ({ data: { leads: [] } })),
          isAdmin ? api.get("/team").catch(() => ({ data: { team: [] } })) : Promise.resolve({ data: { team: [] } }),
        ]);

        if (!cancelled) {
          setLeadsList(leadsRes.data?.leads || []);
          setTeamList(teamRes.data?.team || []);
        }
      } catch (err) {
        console.error("Dropdown fetch error:", err);
      }
    }

    loadDropdowns();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setCurrentTime(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);

  // Bucket categorization logic (calculated safely after mount)
  const now = currentTime || new Date(0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    const due = new Date(t.dueDate);
    return due < startOfToday;
  });

  const dueTodayTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    const due = new Date(t.dueDate);
    return due >= startOfToday && due <= endOfToday;
  });

  const upcomingTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    const due = new Date(t.dueDate);
    return due > endOfToday;
  });

  const completedTasks = tasks.filter((t) => t.status === "completed");

  const counts = {
    [TASK_BUCKETS.OVERDUE]: overdueTasks.length,
    [TASK_BUCKETS.TODAY]: dueTodayTasks.length,
    [TASK_BUCKETS.UPCOMING]: upcomingTasks.length,
    [TASK_BUCKETS.COMPLETED]: completedTasks.length,
  };

  // Filter tasks based on selected bucket and search
  const displayedTasks = tasks.filter((task) => {
    // 1. Bucket filter
    if (selectedBucket === TASK_BUCKETS.OVERDUE && !overdueTasks.includes(task)) return false;
    if (selectedBucket === TASK_BUCKETS.TODAY && !dueTodayTasks.includes(task)) return false;
    if (selectedBucket === TASK_BUCKETS.UPCOMING && !upcomingTasks.includes(task)) return false;
    if (selectedBucket === TASK_BUCKETS.COMPLETED && task.status !== "completed") return false;

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchLead = task.lead?.name?.toLowerCase().includes(q);
      const matchCompany = task.lead?.company?.toLowerCase().includes(q);
      const matchNotes = task.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchLead && !matchCompany && !matchNotes) return false;
    }

    return true;
  });

  // Toggle task completion status
  const handleToggleStatus = async (task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const previousTasks = [...tasks];

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === "completed" ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
    } catch (err) {
      // Rollback on failure
      setTasks(previousTasks);
      alert(err.response?.data?.message || "Failed to update task status.");
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this follow-up task?")) {
      return;
    }

    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t._id !== taskId));

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      setTasks(previousTasks);
      alert(err.response?.data?.message || "Failed to delete task.");
    }
  };

  // Submit new follow-up task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Please provide a task title.");
      return;
    }
    if (!newLeadId) {
      alert("Please select a lead for this follow-up.");
      return;
    }
    if (!newDueDate) {
      alert("Please specify a due date and time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        lead: newLeadId,
        dueDate: new Date(newDueDate).toISOString(),
        type: newType,
        priority: newPriority,
        notes: newNotes.trim(),
      };

      if (isAdmin && newAssignee) {
        payload.assignedTo = newAssignee;
      }

      const res = await api.post("/tasks", payload);
      if (res.data?.task) {
        setTasks((prev) => [res.data.task, ...prev]);
        setIsAddModalOpen(false);
        // Reset form
        setNewTitle("");
        setNewLeadId("");
        setNewDueDate("");
        setNewNotes("");
        setAlertBanner({
          type: "success",
          message: "Follow-up task created successfully!",
        });
        setTimeout(() => setAlertBanner(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger manual reminder email dispatch (admin only)
  const handleSendRemindersNow = async () => {
    if (!window.confirm("Send automated reminder emails for all due and overdue tasks right now?")) {
      return;
    }

    try {
      setAlertBanner({ type: "info", message: "Dispatching reminder emails..." });
      // Call reminder route
      const res = await api.post("/tasks/send-reminders").catch(() => null);
      setAlertBanner({
        type: "success",
        message: res?.data?.message || "Reminders checked and sent successfully!",
      });
      setTimeout(() => setAlertBanner(null), 4000);
    } catch (err) {
      setAlertBanner({
        type: "error",
        message: err.response?.data?.message || "Failed to dispatch reminders.",
      });
    }
  };

  // Format date with friendly relative label
  const formatFriendlyDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Today, ${timeFormatted}`;
    }

    const diffMs = d - now;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === -1) return `Yesterday, ${timeFormatted}`;
    if (diffDays === 1) return `Tomorrow, ${timeFormatted}`;
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue (${dateFormatted})`;

    return `${dateFormatted}, ${timeFormatted}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Hero Card */}
        <div className="rounded-3xl bg-white border border-gray-200/90 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold tracking-wide uppercase mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Follow-up Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                My Tasks & Follow-ups
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Stay on top of calls, demos, and contract reviews so no prospect deal slips through the cracks.
              </p>
            </div>

            {/* Scope Toggle & Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Admin Scope Toggle */}
              {isAdmin && (
                <div className="bg-gray-100 border border-gray-200 p-1 rounded-xl flex items-center gap-1 shadow-2xs">
                  <button
                    onClick={() => setScope("mine")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      scope === "mine"
                        ? "bg-white text-gray-950 shadow-xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Mine
                  </button>
                  <button
                    onClick={() => setScope("team")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      scope === "team"
                        ? "bg-white text-gray-950 shadow-xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Whole Team
                  </button>
                </div>
              )}

              {/* Admin Manual Reminder Button */}
              {isAdmin && (
                <button
                  onClick={handleSendRemindersNow}
                  title="Force reminder emails immediately"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 text-xs font-bold transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send Reminders</span>
                </button>
              )}

              {/* Refresh button */}
              <button
                onClick={fetchTasks}
                disabled={isLoading}
                title="Refresh tasks"
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>

              {/* New Task CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Follow-up</span>
              </motion.button>
            </div>
          </div>

          {/* Banner notification */}
          <AnimatePresence>
            {alertBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  alertBanner.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : alertBanner.type === "error"
                    ? "bg-red-50 text-red-800 border-red-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{alertBanner.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4 Clickable Summary Queue Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-gray-100">
            {/* 1. Overdue */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() =>
                setSelectedBucket(
                  selectedBucket === TASK_BUCKETS.OVERDUE
                    ? TASK_BUCKETS.ALL
                    : TASK_BUCKETS.OVERDUE
                )
              }
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedBucket === TASK_BUCKETS.OVERDUE
                  ? BUCKET_CONFIG[TASK_BUCKETS.OVERDUE].activeRing
                  : "bg-white border-gray-200/90 hover:border-rose-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Overdue
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {counts[TASK_BUCKETS.OVERDUE]}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Needs attention</p>
            </motion.div>

            {/* 2. Due Today */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() =>
                setSelectedBucket(
                  selectedBucket === TASK_BUCKETS.TODAY
                    ? TASK_BUCKETS.ALL
                    : TASK_BUCKETS.TODAY
                )
              }
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedBucket === TASK_BUCKETS.TODAY
                  ? BUCKET_CONFIG[TASK_BUCKETS.TODAY].activeRing
                  : "bg-white border-gray-200/90 hover:border-amber-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Due Today
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                {counts[TASK_BUCKETS.TODAY]}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Today&apos;s agenda</p>
            </motion.div>

            {/* 3. Upcoming */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() =>
                setSelectedBucket(
                  selectedBucket === TASK_BUCKETS.UPCOMING
                    ? TASK_BUCKETS.ALL
                    : TASK_BUCKETS.UPCOMING
                )
              }
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedBucket === TASK_BUCKETS.UPCOMING
                  ? BUCKET_CONFIG[TASK_BUCKETS.UPCOMING].activeRing
                  : "bg-white border-gray-200/90 hover:border-blue-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Upcoming
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                {counts[TASK_BUCKETS.UPCOMING]}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Future follow-ups</p>
            </motion.div>

            {/* 4. Completed */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() =>
                setSelectedBucket(
                  selectedBucket === TASK_BUCKETS.COMPLETED
                    ? TASK_BUCKETS.ALL
                    : TASK_BUCKETS.COMPLETED
                )
              }
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedBucket === TASK_BUCKETS.COMPLETED
                  ? BUCKET_CONFIG[TASK_BUCKETS.COMPLETED].activeRing
                  : "bg-white border-gray-200/90 hover:border-emerald-300 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Completed
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {counts[TASK_BUCKETS.COMPLETED]}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Resolved deals</p>
            </motion.div>
          </div>
        </div>

        {/* Filter and Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by title, lead, or company..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Filter Queue:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {selectedBucket === TASK_BUCKETS.ALL
                ? "All Tasks"
                : BUCKET_CONFIG[selectedBucket]?.label}
            </span>
            {selectedBucket !== TASK_BUCKETS.ALL && (
              <button
                onClick={() => setSelectedBucket(TASK_BUCKETS.ALL)}
                className="text-xs text-gray-400 hover:text-gray-700 underline font-semibold ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Task List Section */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600">
                <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Loading follow-up queue...</span>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
              <button
                onClick={fetchTasks}
                className="px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          ) : displayedTasks.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-950 text-sm sm:text-base">
                {selectedBucket === TASK_BUCKETS.ALL
                  ? "No follow-up tasks found."
                  : BUCKET_CONFIG[selectedBucket]?.emptyMessage}
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Schedule calls and customer check-ins to keep deals advancing smoothly.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
              >
                + Schedule Follow-up
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedTasks.map((task) => {
                const isCompleted = task.status === "completed";
                const due = new Date(task.dueDate);
                const isOverdue = !isCompleted && due < startOfToday;
                const isToday = !isCompleted && due >= startOfToday && due <= endOfToday;

                return (
                  <div
                    key={task._id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 px-3 -mx-3 rounded-2xl transition group"
                  >
                    {/* Left: Checkbox + Title + Lead Info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Completion Checkbox */}
                      <button
                        onClick={() => handleToggleStatus(task)}
                        title={isCompleted ? "Mark incomplete" : "Mark completed"}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
                          isCompleted
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                            : "border-gray-300 hover:border-emerald-500 bg-white"
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3.5 h-3.5 stroke-current stroke-3" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Content */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-sm font-bold tracking-tight ${
                              isCompleted
                                ? "text-gray-400 line-through"
                                : "text-gray-950"
                            }`}
                          >
                            {task.title}
                          </h4>

                          {/* Activity Type Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                            {task.type}
                          </span>

                          {/* Priority Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              task.priority === "high"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : task.priority === "medium"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {/* Lead / Company Details */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          {task.lead && (
                            <span className="flex items-center gap-1 font-semibold text-gray-700">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <span>{task.lead.company}</span>
                              <span className="text-gray-400 font-normal">({task.lead.name})</span>
                            </span>
                          )}

                          {task.notes && (
                            <span className="text-gray-400 truncate max-w-xs">
                              • {task.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Due Date + Owner info (in Team Scope) + Actions */}
                    <div className="flex items-center gap-4 shrink-0 sm:justify-end pl-8 sm:pl-0">
                      {/* Due Date Badge */}
                      <div className="text-left sm:text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isCompleted
                              ? "bg-gray-100 text-gray-500"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : isToday
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatFriendlyDate(task.dueDate)}</span>
                        </span>
                      </div>

                      {/* Rep info if scope is whole team */}
                      {scope === "team" && task.assignedTo && (
                        <div
                          title={`Assigned to ${task.assignedTo.name}`}
                          className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-xl border border-gray-200"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                            {task.assignedTo.name?.slice(0, 2).toUpperCase() || "GL"}
                          </div>
                          <span className="text-xs font-semibold text-gray-700 hidden sm:inline">
                            {task.assignedTo.name}
                          </span>
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        title="Delete task"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition opacity-80 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Add Follow-up Task */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-200"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <div>
                    <h3 className="text-lg font-black text-gray-950">
                      Schedule Follow-up Task
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Assign a call, demo, or follow-up note to keep deal velocity high.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTask} className="space-y-4">
                  {/* Task Title */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Call CEO to review enterprise pricing proposal"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Associated Lead Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Associated Lead / Company *
                    </label>
                    <select
                      required
                      value={newLeadId}
                      onChange={(e) => setNewLeadId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                    >
                      <option value="">Select a lead from your pipeline...</option>
                      {leadsList.map((lead) => (
                        <option key={lead._id} value={lead._id}>
                          {lead.company} — {lead.name} ({lead.stage})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date & Time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Due Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                    />
                  </div>

                  {/* Type & Priority Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Activity Type
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer"
                      >
                        <option value="follow_up">Follow-up</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting / Demo</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer"
                      >
                        <option value="high">High (Urgent)</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Admin Only: Assign to Rep Dropdown */}
                  {isAdmin && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Assign to Team Member
                      </label>
                      <select
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                      >
                        <option value="">Myself ({user?.name || "Admin"})</option>
                        {teamList.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name} ({member.email}) — {member.role}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Prep Notes & Agenda
                    </label>
                    <textarea
                      rows={2}
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Add key discussion points or next steps..."
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Scheduling..." : "Schedule Follow-up"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
