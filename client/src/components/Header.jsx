"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Plus,
  LogOut,
  Shield,
  ArrowUpRight,
  Search,
  Bell,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import WorldClock from "@/components/WorldClock";

export default function Header({
  onOpenSidebar,
  onOpenQuickAdd,
  onOpenCommandPalette,
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [nowMs, setNowMs] = useState(0);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const fetchUrgentNotifications = useCallback(async () => {
    try {
      const res = await api.get("/tasks?status=pending&limit=25");
      const allPending = res.data?.tasks || [];
      const currentMs = Date.now();
      const windowEndMs = currentMs + 24 * 60 * 60 * 1000;

      const urgent = allPending.filter(
        (t) => new Date(t.dueDate).getTime() <= windowEndMs
      );
      setNowMs(currentMs);
      setUrgentTasks(urgent);
    } catch {
      // Silently ignore if user session is transitioning
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get("/tasks?status=pending&limit=25");
        if (cancelled) return;
        const allPending = res.data?.tasks || [];
        const currentMs = Date.now();
        const windowEndMs = currentMs + 24 * 60 * 60 * 1000;

        setNowMs(currentMs);
        setUrgentTasks(
          allPending.filter((t) => new Date(t.dueDate).getTime() <= windowEndMs)
        );
      } catch {
        // Ignore transient auth errors
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCompleteFromNotif = async (e, taskId) => {
    e.stopPropagation();
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: "completed" });
      await fetchUrgentNotifications();
    } catch {
      // Ignore
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "GL";

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs transition-colors">
      {/* Left side: Hamburger (mobile) + Environment pill + Command Palette trigger */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Pill Tag */}
        <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold tracking-wide uppercase shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>Live Platform</span>
        </div>

        {/* Global Search / Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 hover:bg-gray-100 border border-gray-200/80 text-xs text-gray-500 hover:text-gray-800 transition cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Search leads or jump...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-white rounded border border-gray-200">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right side: World Clock, Quick Add, Notifications Bell, User profile menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Multi-Country World Clock */}
        <WorldClock />

        {/* Quick Add Lead button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenQuickAdd}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Add Lead</span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-80 hidden sm:inline" />
        </motion.button>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              const next = !isNotifOpen;
              setIsNotifOpen(next);
              if (next) fetchUrgentNotifications();
            }}
            aria-label="Open task notifications"
            className="relative p-2 rounded-full bg-gray-100/80 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200/80 transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {urgentTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {urgentTasks.length > 9 ? "9+" : urgentTasks.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-950">
                      Follow-up Alerts
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Overdue & due within 24 hours
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-[10px] font-bold text-emerald-700">
                    {urgentTasks.length} active
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {urgentTasks.length === 0 ? (
                    <div className="py-8 px-4 text-center text-xs text-gray-400">
                      All caught up! No overdue or due-soon tasks.
                    </div>
                  ) : (
                    urgentTasks.map((task) => {
                      const isOverdue =
                        nowMs > 0 && new Date(task.dueDate).getTime() < nowMs;
                      const targetHref = task.lead?._id
                        ? `/leads/${task.lead._id}`
                        : "/tasks";

                      return (
                        <div
                          key={task._id}
                          onClick={() => {
                            setIsNotifOpen(false);
                            router.push(targetHref);
                          }}
                          className="p-3 hover:bg-emerald-50/40 transition flex items-start justify-between gap-2.5 cursor-pointer"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              {isOverdue ? (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  isOverdue
                                    ? "text-rose-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {isOverdue ? "Overdue" : "Due Soon"}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {task.title}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              {task.lead?.name || "Lead"} •{" "}
                              {new Date(task.dueDate).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleCompleteFromNotif(e, task._id)}
                            title="Mark completed"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-2 bg-gray-50/70 border-t border-gray-100">
                  <Link
                    href="/tasks"
                    onClick={() => setIsNotifOpen(false)}
                    className="block w-full text-center py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 rounded-xl hover:bg-emerald-50 transition"
                  >
                    Open Full Task Queue
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User profile dropdown container */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-0.5 rounded-full ring-2 ring-emerald-100 hover:ring-emerald-300 transition cursor-pointer"
          >
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt={user.name || "User"}
                className="w-9 h-9 rounded-full object-cover border border-emerald-100"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {userInitials}
              </div>
            )}
          </motion.button>

          {/* Profile Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2.5 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden"
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50/30">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {user?.name || "Sales User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Shield className="w-3 h-3" />
                      Role: {user?.role || "rep"}
                    </span>
                  </div>
                </div>

                {/* Dropdown Items */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl font-medium text-xs transition flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Profile & Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium text-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out of GoatLeads</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
