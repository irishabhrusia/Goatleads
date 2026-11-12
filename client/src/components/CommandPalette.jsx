"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Kanban,
  Users,
  CheckSquare,
  Shield,
  Settings,
  Plus,
  ArrowUpRight,
  Building2,
  X,
  Trophy,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLES } from "@/constants";

export default function CommandPalette({ isOpen, onClose, onOpenQuickAdd }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <CommandPaletteDialog
          onClose={onClose}
          onOpenQuickAdd={onOpenQuickAdd}
        />
      )}
    </AnimatePresence>
  );
}

function CommandPaletteDialog({ onClose, onOpenQuickAdd }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  const [query, setQuery] = useState("");
  const [leadResults, setLeadResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(focusTimer);
  }, []);

  // Debounced lead search against GET /api/leads?search=...
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(
          `/leads?search=${encodeURIComponent(trimmed)}&limit=6`
        );
        if (!cancelled) {
          setLeadResults(res.data?.leads || []);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          setLeadResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const staticCommands = [
    {
      id: "action-quick-add",
      label: "Quick Add New Lead",
      subtext: "Create a new prospect anywhere",
      category: "Actions",
      icon: Plus,
      run: () => {
        onClose();
        onOpenQuickAdd?.();
      },
    },
    {
      id: "nav-dashboard",
      label: "Dashboard",
      subtext: "Revenue snapshot, stage volumes, leaderboard",
      category: "Navigate",
      icon: LayoutDashboard,
      run: () => {
        onClose();
        router.push("/dashboard");
      },
    },
    {
      id: "nav-pipeline",
      label: "Kanban Pipeline",
      subtext: "8-stage drag-and-drop deal board",
      category: "Navigate",
      icon: Kanban,
      run: () => {
        onClose();
        router.push("/pipeline");
      },
    },
    {
      id: "nav-leads",
      label: "All Leads Table",
      subtext: "Search, filter, import & export CSV",
      category: "Navigate",
      icon: Users,
      run: () => {
        onClose();
        router.push("/leads");
      },
    },
    {
      id: "nav-tasks",
      label: "My Follow-up Tasks",
      subtext: "Overdue, today & upcoming tasks",
      category: "Navigate",
      icon: CheckSquare,
      run: () => {
        onClose();
        router.push("/tasks");
      },
    },
    ...(isAdmin
      ? [
          {
            id: "nav-team",
            label: "Team & Permissions",
            subtext: "Invite reps, change roles, reassign leads",
            category: "Navigate",
            icon: Shield,
            run: () => {
              onClose();
              router.push("/team");
            },
          },
        ]
      : []),
    {
      id: "nav-settings",
      label: "Profile & Settings",
      subtext: "Update name, avatar, or password",
      category: "Navigate",
      icon: Settings,
      run: () => {
        onClose();
        router.push("/settings");
      },
    },
    {
      id: "filter-won",
      label: "View Closed Won Deals",
      subtext: "Filter leads by Closed Won stage",
      category: "Filters",
      icon: Trophy,
      run: () => {
        onClose();
        router.push("/leads?stage=Closed+Won");
      },
    },
    {
      id: "filter-lost",
      label: "Inspect Closed Lost Deals",
      subtext: "Filter leads by Closed Lost stage",
      category: "Filters",
      icon: XCircle,
      run: () => {
        onClose();
        router.push("/leads?stage=Closed+Lost");
      },
    },
  ];

  const q = query.trim().toLowerCase();
  const filteredStatic = q
    ? staticCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(q) ||
          cmd.subtext.toLowerCase().includes(q)
      )
    : staticCommands;

  const visibleLeadResults = q ? leadResults : [];
  const leadCommands = visibleLeadResults.map((lead) => ({
    id: `lead-${lead._id}`,
    label: lead.name,
    subtext: `${lead.company || "Individual"} • ${lead.stage} • ${lead.currency} ${Number(
      lead.amount || 0
    ).toLocaleString()}`,
    category: "Leads",
    icon: Building2,
    run: () => {
      onClose();
      router.push(`/leads/${lead._id}`);
    },
  }));

  const combinedItems = [...leadCommands, ...filteredStatic];

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        combinedItems.length ? (prev + 1) % combinedItems.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        combinedItems.length
          ? (prev - 1 + combinedItems.length) % combinedItems.length
          : 0
      );
    } else if (e.key === "Enter" && combinedItems[activeIndex]) {
      e.preventDefault();
      combinedItems[activeIndex].run();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-slate-950/50 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -12 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-emerald-900/15 overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search className="w-5 h-5 text-emerald-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search leads by name, company, email, or jump to a page..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {isSearching && q && (
            <span className="text-[11px] font-semibold text-emerald-600 animate-pulse">
              Searching...
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[55vh] overflow-y-auto p-2.5 space-y-1">
          {combinedItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">
              No matching leads or commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            combinedItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.run}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition cursor-pointer ${
                    isActive
                      ? "bg-emerald-50 border border-emerald-200/80"
                      : "border border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-950 truncate">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {item.subtext}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {item.category}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Key Hints */}
        <div className="px-5 py-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <span>Use ↑↓ to navigate, Enter to open</span>
          <span>ESC to close</span>
        </div>
      </motion.div>
    </div>
  );
}
