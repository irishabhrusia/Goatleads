"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Search,
  RefreshCw,
  Plus,
  AlertCircle,
  Building2,
  User,
  Clock,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import QuickAddLeadModal from "@/components/QuickAddLeadModal";
import api from "@/lib/api";
import { STAGES, COUNTRIES, CURRENCIES } from "@/constants";
import { FALLBACK_CURRENCY_RATES, formatCurrencyFromUsd } from "@/lib/currency";

// Stage visual metadata & colors
const STAGE_THEMES = {
  "New": {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    headerBg: "from-blue-50/60 to-transparent",
  },
  "Contacted": {
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    headerBg: "from-indigo-50/60 to-transparent",
  },
  "Qualified": {
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    headerBg: "from-purple-50/60 to-transparent",
  },
  "Proposal Sent": {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    headerBg: "from-amber-50/60 to-transparent",
  },
  "Negotiation": {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    headerBg: "from-orange-50/60 to-transparent",
  },
  "In Contract Review": {
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    headerBg: "from-teal-50/60 to-transparent",
  },
  "Closed Won": {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    headerBg: "from-emerald-50/60 to-transparent",
  },
  "Closed Lost": {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    headerBg: "from-rose-50/60 to-transparent",
  },
};

const PRESET_LOST_REASONS = [
  "Price too high / Budget constraints",
  "Competitor chosen",
  "Feature gaps / Technical requirements",
  "Timing not right / Postponed to next quarter",
  "Champion left / Lost internal sponsor",
  "No response / Ghosted",
];

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Filters & Currency
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [rates, setRates] = useState(FALLBACK_CURRENCY_RATES);

  // Drag and Drop state
  const [draggedLead, setDraggedLead] = useState(null);
  const [activeDropStage, setActiveDropStage] = useState(null);

  // Lost Reason Modal State
  const [lostModalData, setLostModalData] = useState(null); // { lead, targetStage }
  const [lostReasonInput, setLostReasonInput] = useState("");
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  // Fetch leads & live rates
  const fetchLeads = async () => {
    try {
      const [leadsRes, ratesRes] = await Promise.all([
        api.get("/leads?limit=100"),
        api.get("/dashboard/rates").catch(() => null),
      ]);
      setLeads(leadsRes.data?.leads || []);
      if (ratesRes?.data?.rates) {
        setRates(ratesRes.data.rates);
      }
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load pipeline leads."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const [leadsRes, ratesRes] = await Promise.all([
          api.get("/leads?limit=100"),
          api.get("/dashboard/rates").catch(() => null),
        ]);
        if (!cancelled) {
          setLeads(leadsRes.data?.leads || []);
          if (ratesRes?.data?.rates) {
            setRates(ratesRes.data.rates);
          }
          setErrorMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load pipeline leads."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  // Currency Converter helper
  const formatMoney = (usdAmount = 0) =>
    formatCurrencyFromUsd(usdAmount, selectedCurrency, rates);

  // Filter leads based on search & country
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery.trim() ||
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry =
      selectedCountry === "All" || lead.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  // Calculate Pipeline high-level stats
  const totalOpenValue = filteredLeads
    .filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost")
    .reduce((acc, curr) => acc + (curr.amountBase || 0), 0);

  const totalWonValue = filteredLeads
    .filter((l) => l.stage === "Closed Won")
    .reduce((acc, curr) => acc + (curr.amountBase || 0), 0);

  const wonDealsCount = filteredLeads.filter((l) => l.stage === "Closed Won").length;

  // Execute stage update API call
  const performStageUpdate = async (leadId, targetStage, lostReason = "") => {
    setIsUpdatingStage(true);

    // Optimistically update frontend state
    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((item) =>
        item._id === leadId
          ? {
              ...item,
              stage: targetStage,
              lostReason: targetStage === "Closed Lost" ? lostReason : "",
            }
          : item
      )
    );

    try {
      const payload = { stage: targetStage };
      if (targetStage === "Closed Lost") {
        payload.lostReason = lostReason;
      }

      await api.patch(`/leads/${leadId}/stage`, payload);
    } catch (err) {
      // Revert optimistic update on failure
      setLeads(previousLeads);
      alert(
        err.response?.data?.message ||
          "Failed to update lead stage. Please try again."
      );
    } finally {
      setIsUpdatingStage(false);
      setLostModalData(null);
      setLostReasonInput("");
      setActiveDropStage(null);
    }
  };

  // Drag handlers
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData("text/plain", lead._id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropStage !== stage) {
      setActiveDropStage(stage);
    }
  };

  const handleDragLeave = (e, stage) => {
    e.preventDefault();
    if (activeDropStage === stage) {
      setActiveDropStage(null);
    }
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setActiveDropStage(null);

    if (!draggedLead) return;

    if (draggedLead.stage === targetStage) {
      setDraggedLead(null);
      return;
    }

    if (targetStage === "Closed Lost") {
      // Prompt modal for required lost reason
      setLostModalData({ lead: draggedLead, targetStage });
      setDraggedLead(null);
      return;
    }

    // Direct stage update
    performStageUpdate(draggedLead._id, targetStage);
    setDraggedLead(null);
  };

  const handleConfirmLost = (e) => {
    e.preventDefault();
    if (!lostReasonInput.trim()) {
      alert("Please provide a reason why this deal was marked as Closed Lost.");
      return;
    }
    if (lostModalData?.lead?._id) {
      performStageUpdate(
        lostModalData.lead._id,
        "Closed Lost",
        lostReasonInput.trim()
      );
    }
  };

  return (
    <AppLayout onLeadAdded={fetchLeads}>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="rounded-3xl bg-white border border-gray-200/90 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold tracking-wide uppercase mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Interactive Kanban</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                Sales Pipeline
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Drag and drop deals across stages to update velocity and status in real-time.
              </p>
            </div>

            {/* Actions: Currency Switcher + Quick Add Button */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Currency Switcher */}
              <div className="bg-gray-100/90 border border-gray-200 p-1 rounded-xl flex items-center gap-1">
                {CURRENCIES.map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setSelectedCurrency(cur)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedCurrency === cur
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchLeads}
                disabled={isLoading}
                title="Refresh board"
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>

              {/* Add Deal CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsQuickAddOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Deal</span>
              </motion.button>
            </div>
          </div>

          {/* Search & Country Filter Bar */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals by contact, company, or email..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              />
            </div>

            {/* Country Filter Pill */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50/80 border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer"
              >
                <option value="All">All Countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
            <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total Deals
              </span>
              <p className="text-xl font-black text-gray-950 mt-0.5">
                {filteredLeads.length}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Open Pipeline
              </span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">
                {formatMoney(totalOpenValue)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Closed Won
              </span>
              <p className="text-xl font-black text-teal-700 mt-0.5">
                {formatMoney(totalWonValue)} ({wonDealsCount})
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Win Rate
              </span>
              <p className="text-xl font-black text-gray-950 mt-0.5">
                {filteredLeads.length > 0
                  ? `${Math.round((wonDealsCount / filteredLeads.length) * 100)}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={fetchLeads}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* 8-Stage Kanban Columns Board */}
        <div className="overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1750px]">
            {STAGES.map((stage) => {
              const stageTheme = STAGE_THEMES[stage] || STAGE_THEMES["New"];
              const stageLeads = filteredLeads.filter((l) => l.stage === stage);
              const stageTotalValue = stageLeads.reduce(
                (sum, l) => sum + (l.amountBase || 0),
                0
              );
              const isDropTarget = activeDropStage === stage;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={(e) => handleDragLeave(e, stage)}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`w-72 shrink-0 rounded-2xl transition-all duration-200 flex flex-col max-h-[calc(100vh-270px)] ${
                    isDropTarget
                      ? "ring-2 ring-emerald-500 bg-emerald-50/70 shadow-lg scale-[1.01]"
                      : "bg-gray-100/60 border border-gray-200/80"
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-gray-200/80 bg-white/90 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${stageTheme.dot}`} />
                        <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm tracking-tight truncate">
                          {stage}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Total Value</span>
                      <span className="font-bold text-gray-900">
                        {formatMoney(stageTotalValue)}
                      </span>
                    </div>
                  </div>

                  {/* Cards Scrollable Container */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 min-h-[350px]">
                    {stageLeads.length === 0 ? (
                      <div
                        className={`h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center transition ${
                          isDropTarget
                            ? "border-emerald-400 bg-emerald-50/50 text-emerald-700"
                            : "border-gray-200/80 text-gray-400"
                        }`}
                      >
                        <p className="text-xs font-semibold">
                          {isDropTarget ? "Release to drop deal here" : "No deals in stage"}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Drag deals here to advance
                        </p>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          className="group relative p-3.5 rounded-xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
                        >
                          {/* Top Row: Company & Country */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-bold text-gray-950 text-xs truncate">
                                {lead.company}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 shrink-0">
                              {lead.country}
                            </span>
                          </div>

                          {/* Contact Person */}
                          <Link
                            href={`/leads/${lead._id}`}
                            className="block text-xs text-gray-700 font-semibold hover:text-emerald-700 hover:underline truncate mb-2 transition"
                          >
                            {lead.name}
                          </Link>

                          {/* Deal Value */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-sm font-black text-gray-950">
                              {lead.currency} {lead.amount?.toLocaleString() || 0}
                            </span>

                            {/* Owner Avatar */}
                            <div
                              title={`Owner: ${lead.owner?.name || "Unassigned"}`}
                              className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center"
                            >
                              {lead.owner?.name?.slice(0, 2).toUpperCase() || "GL"}
                            </div>
                          </div>

                          {/* Closed Lost Reason Tag */}
                          {lead.stage === "Closed Lost" && lead.lostReason && (
                            <div className="mt-2 p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-[10px] text-rose-700">
                              <span className="font-bold">Reason:</span> {lead.lostReason}
                            </div>
                          )}

                          {/* Quick Stage Move Dropdown (Accessible 1-click alternative to dragging) */}
                          <div className="mt-2.5 pt-2 border-t border-gray-100/70 flex items-center justify-between text-[10px] text-gray-400">
                            <span>Move to:</span>
                            <select
                              value={lead.stage}
                              onChange={(e) => {
                                const newStage = e.target.value;
                                if (newStage === "Closed Lost") {
                                  setLostModalData({ lead, targetStage: newStage });
                                } else {
                                  performStageUpdate(lead._id, newStage);
                                }
                              }}
                              className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Lost Reason prompt when moving to Closed Lost */}
        <AnimatePresence>
          {lostModalData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-950">
                      Why was this deal lost?
                    </h3>
                    <p className="text-xs text-gray-500">
                      {lostModalData.lead?.company} ({lostModalData.lead?.name})
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  A lost reason is required to maintain analytics accuracy in win-rate reports.
                </p>

                {/* Preset quick buttons */}
                <div className="space-y-1.5 mb-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Quick Select:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_LOST_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setLostReasonInput(reason)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer text-left ${
                          lostReasonInput === reason
                            ? "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom text input */}
                <form onSubmit={handleConfirmLost} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Lost Reason Details *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={lostReasonInput}
                      onChange={(e) => setLostReasonInput(e.target.value)}
                      placeholder="Explain what went wrong or why the prospect declined..."
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLostModalData(null);
                        setLostReasonInput("");
                      }}
                      className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingStage || !lostReasonInput.trim()}
                      className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
                    >
                      {isUpdatingStage ? "Saving..." : "Confirm Closed Lost"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Quick Add Deal Modal */}
        <QuickAddLeadModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onLeadAdded={fetchLeads}
        />
      </div>
    </AppLayout>
  );
}
