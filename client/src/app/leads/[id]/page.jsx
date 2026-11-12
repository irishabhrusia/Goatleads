"use client";

import { Suspense, useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Calendar,
  MessageSquare,
  PhoneCall,
  Video,
  ArrowRightLeft,
  Sparkles,
  Send,
  Copy,
  Check,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import EditLeadModal from "@/components/EditLeadModal";
import api from "@/lib/api";
import { STAGES } from "@/constants";

const COUNTRY_BADGES = {
  India: { flag: "🇮🇳" },
  USA: { flag: "🇺🇸" },
  UK: { flag: "🇬🇧" },
  Canada: { flag: "🇨🇦" },
  UAE: { flag: "🇦🇪" },
};

const STAGE_BADGES = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Contacted: "bg-blue-50 text-blue-700 border-blue-200",
  Qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Proposal Sent": "bg-purple-50 text-purple-700 border-purple-200",
  Negotiation: "bg-amber-50 text-amber-700 border-amber-200",
  "In Contract Review": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Closed Won": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed Lost": "bg-rose-50 text-rose-700 border-rose-200",
};

const PRESET_LOST_REASONS = [
  "Price too high / Budget constraints",
  "Competitor chosen",
  "Feature gaps / Technical requirements",
  "Timing not right / Postponed to next quarter",
  "No response / Ghosted",
];

const ACTIVITY_META = {
  note: {
    label: "Note",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
    manual: true,
  },
  call: {
    label: "Call",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    manual: true,
  },
  email: {
    label: "Email",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    manual: true,
  },
  meeting: {
    label: "Meeting",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
    manual: true,
  },
  stage_change: {
    label: "Stage Move",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    manual: false,
  },
  task_created: {
    label: "Task Scheduled",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
    manual: false,
  },
  task_completed: {
    label: "Task Completed",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    manual: false,
  },
  lead_created: {
    label: "Lead Created",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
    manual: false,
  },
};

function LeadDetailFallback() {
  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-emerald-300 text-sm font-semibold text-emerald-800 shadow-sm">
          <svg
            className="animate-spin h-5 w-5 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Loading lead profile...
        </div>
      </div>
    </AppLayout>
  );
}

export default function LeadDetailPage({ params }) {
  return (
    <Suspense fallback={<LeadDetailFallback />}>
      <LeadDetailContent params={params} />
    </Suspense>
  );
}

function LeadDetailContent({ params }) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;
  const router = useRouter();

  const [lead, setLead] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Edit Lead Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Quick Add Task Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskType, setTaskType] = useState("follow_up");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Activity / Note Form state
  const [activityType, setActivityType] = useState("note");
  const [activityContent, setActivityContent] = useState("");
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  // Lost Reason Modal for Closed Lost
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState("");
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  // Deal Health & Copilot state
  const [health, setHealth] = useState(null);
  const [copilotMode, setCopilotMode] = useState("email");
  const [copilotDraft, setCopilotDraft] = useState(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const loadLeadData = useCallback(async () => {
    try {
      const [leadRes, tasksRes, activitiesRes, healthRes] = await Promise.all([
        api.get(`/leads/${leadId}`),
        api.get(`/tasks?lead=${leadId}`),
        api.get(`/leads/${leadId}/activities`).catch(() => ({ data: { activities: [] } })),
        api.get(`/leads/${leadId}/health`).catch(() => ({ data: { health: null } })),
      ]);

      setLead(leadRes.data?.lead || null);
      setTasks(tasksRes.data?.tasks || []);
      setActivities(activitiesRes.data?.activities || []);
      setHealth(healthRes.data?.health || null);
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load lead details."
      );
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      try {
        const [leadRes, tasksRes, activitiesRes, healthRes] = await Promise.all([
          api.get(`/leads/${leadId}`),
          api.get(`/tasks?lead=${leadId}`),
          api.get(`/leads/${leadId}/activities`).catch(() => ({ data: { activities: [] } })),
          api.get(`/leads/${leadId}/health`).catch(() => ({ data: { health: null } })),
        ]);

        if (!cancelled) {
          setLead(leadRes.data?.lead || null);
          setTasks(tasksRes.data?.tasks || []);
          setActivities(activitiesRes.data?.activities || []);
          setHealth(healthRes.data?.health || null);
          setErrorMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load lead details."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const handleGenerateDraft = async (mode = copilotMode) => {
    setCopilotMode(mode);
    setIsGeneratingDraft(true);
    setCopiedDraft(false);
    try {
      const res = await api.post(`/leads/${leadId}/copilot`, { mode });
      setCopilotDraft(res.data?.draft || null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate draft.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCopyDraft = async () => {
    if (!copilotDraft) return;
    const text = `${copilotDraft.subject}\n\n${copilotDraft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!activityContent.trim()) return;

    setIsLoggingActivity(true);
    try {
      await api.post(`/leads/${leadId}/activities`, {
        type: activityType,
        content: activityContent.trim(),
      });
      setActivityContent("");
      await loadLeadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to log activity.");
    } finally {
      setIsLoggingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity note?")) return;
    try {
      await api.delete(`/leads/${leadId}/activities/${activityId}`);
      await loadLeadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete activity.");
    }
  };

  const handleStageChange = async (newStage, reason = "") => {
    if (!lead || lead.stage === newStage) return;

    if (newStage === "Closed Lost" && !reason.trim()) {
      setIsLostModalOpen(true);
      return;
    }

    setIsUpdatingStage(true);
    try {
      await api.patch(`/leads/${leadId}/stage`, {
        stage: newStage,
        lostReason: reason.trim(),
      });
      setIsLostModalOpen(false);
      setLostReasonInput("");
      await loadLeadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update stage.");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!lead) return;
    if (!window.confirm(`Are you sure you want to delete "${lead.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/leads/${leadId}`);
      router.replace("/leads");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete lead.");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) return;

    setIsAddingTask(true);
    try {
      await api.post("/tasks", {
        title: taskTitle.trim(),
        dueDate: taskDueDate,
        type: taskType,
        priority: taskPriority,
        lead: leadId,
      });

      setTaskTitle("");
      setTaskDueDate("");
      await loadLeadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create task.");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      await loadLeadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task status.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this follow-up task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      await loadLeadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task.");
    }
  };

  if (isLoading) {
    return <LeadDetailFallback />;
  }

  if (errorMessage || !lead) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-3xl border border-red-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Lead Not Found</h2>
          <p className="text-xs text-gray-500 mt-1 mb-6">
            {errorMessage ||
              "The lead you are looking for does not exist or was deleted."}
          </p>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </Link>
        </div>
      </AppLayout>
    );
  }

  const currentStageIndex = STAGES.indexOf(lead.stage);
  const stageBadgeStyle =
    STAGE_BADGES[lead.stage] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <AppLayout onLeadAdded={loadLeadData}>
      <div className="space-y-6 pb-12">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Leads
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Details
            </button>
            <button
              type="button"
              onClick={handleDeleteLead}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Hero Profile & Stage Progress Card */}
        <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-2xl">
                  {COUNTRY_BADGES[lead.country]?.flag || "🌐"}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                  {lead.name}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${stageBadgeStyle}`}
                >
                  {lead.stage}
                </span>
              </div>

              {lead.company && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{lead.company}</span>
                </div>
              )}
            </div>

            {/* Deal Value Badge */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:min-w-[200px] md:text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                Deal Amount
              </span>
              <div className="text-2xl font-black text-gray-950 mt-0.5">
                {lead.currency} {Number(lead.amount || 0).toLocaleString("en-US")}
              </div>
              {lead.currency !== "USD" && (
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  ≈ ${Number(lead.amountBase || 0).toLocaleString("en-US")} USD
                </span>
              )}
            </div>
          </div>

          {/* 8-Stage Pipeline Stepper */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Pipeline Stage Progress {isUpdatingStage && "• Updating..."}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {STAGES.map((stg, idx) => {
                const isCurrent = lead.stage === stg;
                const isPassed =
                  lead.stage !== "Closed Lost" && currentStageIndex > idx;
                const isLost =
                  lead.stage === "Closed Lost" && stg === "Closed Lost";

                return (
                  <button
                    key={stg}
                    type="button"
                    disabled={isUpdatingStage}
                    onClick={() => handleStageChange(stg)}
                    className={`px-3 py-2 rounded-xl text-left transition border text-xs font-semibold cursor-pointer disabled:opacity-60 ${
                      isCurrent
                        ? isLost
                          ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                          : "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                        : isPassed
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75">
                      <span>Step {idx + 1}</span>
                      {isPassed && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                    <div className="truncate mt-0.5 font-bold">{stg}</div>
                  </button>
                );
              })}
            </div>

            {lead.stage === "Closed Lost" && lead.lostReason && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Closed Lost Reason: </span>
                  {lead.lostReason}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Follow-up Tasks (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-950">
                    Follow-up Tasks
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {tasks.length}
                  </span>
                </div>
              </div>

              {/* Quick Task Creation Form */}
              <form
                onSubmit={handleCreateTask}
                className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3"
              >
                <div className="text-xs font-bold text-gray-700">
                  Schedule Next Touchpoint
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call to review proposal terms..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="datetime-local"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-600"
                  />
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="follow_up">Follow Up</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="demo">Demo</option>
                  </select>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isAddingTask || !taskTitle.trim() || !taskDueDate}
                  className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:bg-gray-300 transition cursor-pointer"
                >
                  {isAddingTask ? "Scheduling..." : "+ Schedule Task"}
                </button>
              </form>

              {/* Task List */}
              <div className="space-y-2.5">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No follow-up tasks scheduled for this lead yet. Add one above!
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isOverdue =
                      task.status !== "completed" &&
                      new Date(task.dueDate) < new Date();

                    return (
                      <div
                        key={task._id}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          task.status === "completed"
                            ? "bg-gray-50/70 border-gray-200 opacity-65"
                            : isOverdue
                            ? "bg-rose-50/30 border-rose-200"
                            : "bg-white border-gray-200 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleTaskStatus(task._id, task.status)
                            }
                            aria-label="Toggle task status"
                            className="text-gray-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-md border-2 border-gray-300 hover:border-emerald-500" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate ${
                                task.status === "completed"
                                  ? "line-through text-gray-500"
                                  : "text-gray-900"
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                              <span className="capitalize">
                                {task.type.replace("_", " ")}
                              </span>
                              <span>•</span>
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isOverdue ? "text-rose-600 font-semibold" : ""
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              task.priority === "high"
                                ? "bg-red-50 text-red-700"
                                : task.priority === "medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task._id)}
                            aria-label="Delete task"
                            className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Activity Timeline & Notes Card */}
            <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-950">
                    Activity Timeline & Notes
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {activities.length}
                  </span>
                </div>
              </div>

              {/* Log Note / Call / Email / Meeting Form */}
              <form
                onSubmit={handleLogActivity}
                className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-700">
                    Log Interaction
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { value: "note", label: "Note" },
                      { value: "call", label: "Call" },
                      { value: "email", label: "Email" },
                      { value: "meeting", label: "Meeting" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setActivityType(opt.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                          activityType === opt.value
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  required
                  value={activityContent}
                  onChange={(e) => setActivityContent(e.target.value)}
                  placeholder={`Write a ${activityType} log or customer update...`}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />

                <button
                  type="submit"
                  disabled={isLoggingActivity || !activityContent.trim()}
                  className="w-full py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-emerald-700 disabled:bg-gray-300 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isLoggingActivity ? "Saving..." : "Log to Timeline"}
                  </span>
                </button>
              </form>

              {/* Chronological Timeline */}
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No timeline events yet. Log a note, call, or move stages to build history.
                </div>
              ) : (
                <div className="relative pl-5 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {activities.map((item) => {
                    const meta = ACTIVITY_META[item.type] || ACTIVITY_META.note;
                    const IconComponent =
                      item.type === "call"
                        ? PhoneCall
                        : item.type === "email"
                        ? Mail
                        : item.type === "meeting"
                        ? Video
                        : item.type === "stage_change"
                        ? ArrowRightLeft
                        : item.type === "task_created"
                        ? Calendar
                        : item.type === "task_completed"
                        ? CheckCircle2
                        : item.type === "lead_created"
                        ? Sparkles
                        : MessageSquare;

                    return (
                      <div key={item._id} className="relative">
                        <span
                          className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${meta.dot}`}
                        />
                        <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badge}`}
                              >
                                <IconComponent className="w-3 h-3" />
                                <span>{meta.label}</span>
                              </span>
                              <span className="text-[11px] font-semibold text-gray-800">
                                {item.user?.name || "System"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-gray-400">
                                {new Date(item.createdAt).toLocaleString([], {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                              {meta.manual && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(item._id)}
                                  aria-label="Delete activity"
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {item.content}
                          </p>
                          {item.metadata?.lostReason && (
                            <p className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                              Reason: {item.metadata.lostReason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Deal Health & Copilot, Contact Details & Assignment (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Deal Health & AI Copilot Card */}
            {health && (
              <div className="bg-gradient-to-br from-[#162721] to-[#111f19] text-white rounded-3xl border border-emerald-700/40 p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">
                        Deal Health & Copilot
                      </h3>
                      <p className="text-[11px] text-emerald-200/75">
                        Live velocity & risk telemetry
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-white leading-none">
                      {health.score}
                      <span className="text-xs font-semibold text-emerald-300/75">
                        /100
                      </span>
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        health.score >= 75
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                          : health.score >= 45
                          ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                          : "bg-rose-500/20 text-rose-200 border border-rose-400/40"
                      }`}
                    >
                      {health.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-emerald-950/80 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${health.score}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      health.score >= 75
                        ? "bg-emerald-400"
                        : health.score >= 45
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    }`}
                  />
                </div>

                {/* Signals */}
                <div className="space-y-1.5">
                  {health.signals.map((sig, i) => (
                    <div
                      key={i}
                      className="text-[11px] flex items-start gap-2 text-emerald-50/90"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          sig.type === "positive"
                            ? "bg-emerald-400"
                            : sig.type === "risk"
                            ? "bg-rose-400"
                            : "bg-amber-300"
                        }`}
                      />
                      <span>{sig.text}</span>
                    </div>
                  ))}
                </div>

                {/* Next Best Action */}
                <div className="p-3 rounded-2xl bg-emerald-900/40 border border-emerald-600/30 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block mb-0.5">
                    Next Best Action
                  </span>
                  <p className="text-emerald-50 font-medium leading-relaxed">
                    {health.nextBestAction}
                  </p>
                </div>

                {/* Copilot Draft Controls */}
                <div className="pt-2 border-t border-emerald-800/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-emerald-950/60 p-1 rounded-xl border border-emerald-800/50">
                      <button
                        type="button"
                        onClick={() => handleGenerateDraft("email")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          copilotMode === "email"
                            ? "bg-emerald-600 text-white"
                            : "text-emerald-200/80 hover:text-white"
                        }`}
                      >
                        Email Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateDraft("call")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          copilotMode === "call"
                            ? "bg-emerald-600 text-white"
                            : "text-emerald-200/80 hover:text-white"
                        }`}
                      >
                        Call Script
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingDraft}
                      onClick={() => handleGenerateDraft(copilotMode)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-60 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>
                        {isGeneratingDraft ? "Drafting..." : "Generate"}
                      </span>
                    </button>
                  </div>

                  {copilotDraft && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-700/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-emerald-300 truncate">
                          {copilotDraft.subject}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyDraft}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800/70 hover:bg-emerald-700 text-emerald-100 shrink-0 cursor-pointer"
                        >
                          {copiedDraft ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-[11px] text-emerald-50/90 whitespace-pre-wrap font-sans leading-relaxed">
                        {copilotDraft.body}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Card */}
            <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-950">
                Contact Information
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 gap-2">
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">
                      {lead.email || "No email added"}
                    </span>
                  </div>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-xs font-semibold text-emerald-600 hover:underline shrink-0"
                    >
                      Email
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 gap-2">
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">
                      {lead.phone || "No phone added"}
                    </span>
                  </div>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-xs font-semibold text-emerald-600 hover:underline shrink-0"
                    >
                      Call
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2.5 text-xs text-gray-600">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium">Country</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    {lead.country}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Owner Card */}
            <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-950">Lead Owner</h3>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {lead.owner?.name?.slice(0, 2).toUpperCase() || "GL"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {lead.owner?.name || "Unassigned"}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {lead.owner?.email || "No email available"}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 pt-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Created on {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Last updated {new Date(lead.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Lead Modal */}
        <EditLeadModal
          lead={lead}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={loadLeadData}
        />

        {/* Closed Lost Reason Modal */}
        {isLostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
              <h3 className="text-base font-bold text-gray-950">
                Reason for Closed Lost
              </h3>
              <p className="text-xs text-gray-500">
                Please provide why this opportunity was lost to help improve
                team metrics.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LOST_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLostReasonInput(preset)}
                    className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-[11px] font-medium text-gray-700 transition cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                required
                value={lostReasonInput}
                onChange={(e) => setLostReasonInput(e.target.value)}
                placeholder="e.g. Budget constraints, picked competitor..."
                className="w-full p-3 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLostModalOpen(false);
                    setLostReasonInput("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!lostReasonInput.trim() || isUpdatingStage}
                  onClick={() =>
                    handleStageChange("Closed Lost", lostReasonInput)
                  }
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:bg-gray-300 cursor-pointer"
                >
                  Confirm Closed Lost
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
