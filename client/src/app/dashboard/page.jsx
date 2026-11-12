"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Trophy,
  Target,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Globe,
  Award,
  AlertCircle,
  XCircle,
  X,
  Filter,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { CURRENCIES } from "@/constants";
import { FALLBACK_CURRENCY_RATES, formatCurrencyFromUsd } from "@/lib/currency";

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [rates, setRates] = useState(FALLBACK_CURRENCY_RATES);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");

  // Live analytics data from backend
  const [summary, setSummary] = useState(null);
  const [stages, setStages] = useState([]);
  const [countries, setCountries] = useState([]);
  const [lostReasons, setLostReasons] = useState([]);
  const [repLeaderboard, setRepLeaderboard] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const ownerQuery = selectedOwner ? `?owner=${selectedOwner}` : "";
      const [sumRes, stageRes, countryRes, lostRes, repRes, ratesRes] =
        await Promise.all([
          api.get(`/dashboard/summary${ownerQuery}`),
          api.get(`/dashboard/by-stage${ownerQuery}`),
          api.get(`/dashboard/by-country${ownerQuery}`),
          api.get(`/dashboard/lost-reasons${ownerQuery}`),
          api.get("/dashboard/rep-performance"),
          api.get("/dashboard/rates").catch(() => null),
        ]);

      setSummary(sumRes.data?.summary || null);
      setStages(stageRes.data?.stages || []);
      setCountries(countryRes.data?.countries || []);
      setLostReasons(lostRes.data?.lostReasons || []);
      setRepLeaderboard(repRes.data?.performance || []);
      if (ratesRes?.data?.rates) {
        setRates(ratesRes.data.rates);
      }
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load dashboard metrics."
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedOwner]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const ownerQuery = selectedOwner ? `?owner=${selectedOwner}` : "";
      try {
        const [sumRes, stageRes, countryRes, lostRes, repRes, ratesRes] =
          await Promise.all([
            api.get(`/dashboard/summary${ownerQuery}`),
            api.get(`/dashboard/by-stage${ownerQuery}`),
            api.get(`/dashboard/by-country${ownerQuery}`),
            api.get(`/dashboard/lost-reasons${ownerQuery}`),
            api.get("/dashboard/rep-performance"),
            api.get("/dashboard/rates").catch(() => null),
          ]);

        if (!cancelled) {
          setSummary(sumRes.data?.summary || null);
          setStages(stageRes.data?.stages || []);
          setCountries(countryRes.data?.countries || []);
          setLostReasons(lostRes.data?.lostReasons || []);
          setRepLeaderboard(repRes.data?.performance || []);
          if (ratesRes?.data?.rates) {
            setRates(ratesRes.data.rates);
          }
          setGreeting(getTimeGreeting());
          setErrorMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load dashboard metrics."
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
  }, [selectedOwner]);

  const formatMoney = (usdAmount = 0) =>
    formatCurrencyFromUsd(usdAmount, selectedCurrency, rates);

  const activeRep = repLeaderboard.find((r) => r.repId === selectedOwner);

  const buildLeadsHref = (paramsObj = {}) => {
    const params = new URLSearchParams();
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (selectedOwner && !params.has("owner")) {
      params.set("owner", selectedOwner);
    }
    const qs = params.toString();
    return qs ? `/leads?${qs}` : "/leads";
  };

  return (
    <AppLayout onLeadAdded={fetchDashboardData}>
      <div className="space-y-6">
        {/* Top Hero Banner in Lighter Goatlabs Forest-Emerald Palette */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#173e2e] via-[#1d4c39] to-[#14392a] p-6 sm:p-8 text-white border border-emerald-600/35 shadow-lg shadow-emerald-950/15"
        >
          {/* Subtle luminous mint aura */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              {/* Pill badge matching screenshot */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-400/40 text-emerald-200 text-xs font-semibold mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Goatleads Command Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {greeting}, {user?.name?.split(" ")[0] || "Leader"}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl leading-relaxed">
                Live revenue platform snapshot. Track deal velocity, Kanban volumes, and team performance.
              </p>
              {activeRep && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-xs font-semibold text-emerald-100">
                  <Filter className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Viewing metrics for {activeRep.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedOwner("")}
                    aria-label="Clear rep filter"
                    className="ml-1 p-0.5 rounded-full hover:bg-emerald-700/60 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Rep Filter, Currency Switcher & Refresh Button */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {repLeaderboard.length > 0 && (
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  aria-label="Filter dashboard by sales rep"
                  className="bg-[#0e271d] border border-emerald-700/50 text-emerald-100 text-xs font-semibold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50 cursor-pointer"
                >
                  <option value="">All Sales Reps</option>
                  {repLeaderboard.map((rep) => (
                    <option key={rep.repId} value={rep.repId}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="bg-[#0e271d] border border-emerald-700/50 p-1 rounded-xl flex items-center gap-1 shadow-inner">
                {CURRENCIES.map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setSelectedCurrency(cur)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedCurrency === cur
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-200/75 hover:text-white"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchDashboardData}
                disabled={isLoading}
                title="Refresh metrics"
                className="p-2 rounded-xl bg-emerald-800/50 hover:bg-emerald-700/60 border border-emerald-600/50 text-emerald-200 hover:text-white transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-300" : ""}`} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 Animated KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Pipeline Value */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => router.push("/pipeline")}
            className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Open Pipeline
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-28 animate-pulse" />
              ) : (
                formatMoney(summary?.openPipelineValue || 0)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
              <span className="font-bold text-emerald-600">
                {summary?.openLeads || 0}
              </span>{" "}
              active deals in pipeline
            </p>
          </motion.div>

          {/* Card 2: Total Active Leads */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => router.push(buildLeadsHref())}
            className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total Leads
              </span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
              ) : (
                summary?.totalLeads || 0
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Across all 8 sales pipeline stages
            </p>
          </motion.div>

          {/* Card 3: Closed Won Deals */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => router.push(buildLeadsHref({ stage: "Closed Won" }))}
            className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Closed Won Revenue
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-28 animate-pulse" />
              ) : (
                formatMoney(summary?.wonValue || 0)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
              <span className="font-bold text-emerald-600">
                {summary?.wonCount || 0} deals
              </span>{" "}
              successfully closed
            </p>
          </motion.div>

          {/* Card 4: Pipeline Win Rate */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => router.push(buildLeadsHref({ stage: "Closed Won" }))}
            className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pipeline Win Rate
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              {isLoading ? (
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
              ) : (
                `${summary?.winRate || 0}%`
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, summary?.winRate || 0)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-emerald-500 h-2 rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Middle Section: Kanban Stage Volumes + Country Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 8-Stage Pipeline Volume Bar Chart */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-extrabold text-gray-950 text-base">
                  Pipeline Stage Breakdown
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Deal count and volume across all 8 Kanban stages
                </p>
              </div>
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80 hover:bg-emerald-100 transition"
              >
                <span>Open Kanban</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Stages Grid with Animated Bars */}
            <div className="space-y-3">
              {stages.map((st, i) => {
                const maxVal = Math.max(...stages.map((s) => s.totalValue || 1), 1);
                const percent = Math.max(8, (st.totalValue / maxVal) * 100);

                return (
                  <button
                    key={st.stage}
                    type="button"
                    onClick={() => router.push(buildLeadsHref({ stage: st.stage }))}
                    className="w-full text-left space-y-1 p-1.5 -mx-1.5 rounded-xl hover:bg-emerald-50/50 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 group-hover:text-emerald-700 flex items-center gap-2 transition-colors">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {st.stage}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-[11px]">
                          {st.count} lead{st.count !== 1 ? "s" : ""}
                        </span>
                        <span className="font-extrabold text-gray-900">
                          {formatMoney(st.totalValue)}
                        </span>
                      </div>
                    </div>

                    {/* Animated Progress Track */}
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        className={`h-full rounded-full ${
                          st.stage === "Closed Won"
                            ? "bg-emerald-500"
                            : st.stage === "Closed Lost"
                            ? "bg-red-400"
                            : "bg-emerald-600"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Geographic Distribution */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm flex flex-col justify-between hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-gray-950 text-base">
                  By Country
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Distribution of pipeline value by territory
              </p>

              <div className="space-y-3">
                {countries.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    No country data yet
                  </p>
                ) : (
                  countries.map((c) => (
                    <button
                      key={c.country}
                      type="button"
                      onClick={() =>
                        router.push(buildLeadsHref({ country: c.country }))
                      }
                      className="w-full p-3 rounded-xl bg-gray-50/80 hover:bg-emerald-50/60 border border-gray-200/70 transition-all flex items-center justify-between text-xs cursor-pointer text-left"
                    >
                      <span className="font-bold text-gray-800">
                        {c.country}
                      </span>
                      <div className="text-right">
                        <p className="font-black text-gray-950">
                          {formatMoney(c.totalValue)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {c.count} lead{c.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Quick Link to Leads */}
            <div className="pt-6 border-t border-gray-100 mt-6">
              <Link
                href={buildLeadsHref()}
                className="w-full py-2.5 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>View All Leads Table</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Lost Reasons Post-Mortem Card */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm hover:shadow-xl hover:border-rose-300/60 transition-all duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <div>
                <h3 className="font-extrabold text-gray-950 text-base">
                  Lost Deal Reasons
                </h3>
                <p className="text-xs text-gray-500">
                  Post-mortem breakdown of Closed Lost opportunities
                </p>
              </div>
            </div>
            <Link
              href={buildLeadsHref({ stage: "Closed Lost" })}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200/80 hover:bg-rose-100 transition"
            >
              <span>Inspect Closed Lost</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lostReasons.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No Closed Lost reasons recorded yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lostReasons.map((item) => {
                const maxCount = Math.max(...lostReasons.map((r) => r.count || 1), 1);
                const pct = Math.max(10, Math.round((item.count / maxCount) * 100));

                return (
                  <button
                    key={item.reason}
                    type="button"
                    onClick={() =>
                      router.push(buildLeadsHref({ stage: "Closed Lost" }))
                    }
                    className="p-3.5 rounded-xl bg-rose-50/30 hover:bg-rose-50/70 border border-rose-100 transition text-left space-y-2 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-bold text-gray-900 line-clamp-1">
                        {item.reason}
                      </span>
                      <span className="font-extrabold text-rose-700 shrink-0">
                        {formatMoney(item.totalValue)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-rose-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-rose-500 rounded-full"
                      />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {item.count} lost deal{item.count !== 1 ? "s" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales Rep Leaderboard Section */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-extrabold text-gray-950 text-base">
                  Sales Rep Leaderboard
                </h3>
                <p className="text-xs text-gray-500">
                  Click a rep to filter dashboard metrics, ranked by won revenue
                </p>
              </div>
            </div>

            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-bold">
              Ranked by Closed Won
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/90 text-gray-600 uppercase tracking-wider font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Total Leads</th>
                  <th className="py-3 px-4">Open Pipeline</th>
                  <th className="py-3 px-4">Deals Won</th>
                  <th className="py-3 px-4">Won Revenue</th>
                  <th className="py-3 px-4">Win Rate</th>
                  <th className="py-3 px-4 text-right">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {repLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400">
                      No sales activity logged yet.
                    </td>
                  </tr>
                ) : (
                  repLeaderboard.map((rep, idx) => {
                    const isSelected = selectedOwner === rep.repId;
                    return (
                      <tr
                        key={rep.repId || rep.email || idx}
                        onClick={() =>
                          setSelectedOwner((prev) =>
                            prev === rep.repId ? "" : rep.repId
                          )
                        }
                        className={`transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50/90 ring-1 ring-inset ring-emerald-300"
                            : "hover:bg-emerald-50/50"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-gray-700">
                          {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                              {rep.name?.slice(0, 2).toUpperCase() || "GL"}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-gray-900">{rep.name}</p>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase">
                                    Filtered
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">{rep.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">{rep.totalLeads}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {formatMoney(rep.openValue)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {rep.wonCount} won
                        </td>
                        <td className="py-3.5 px-4 font-black text-gray-900">
                          {formatMoney(rep.wonValue)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {rep.winRate}%
                          </span>
                        </td>
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/leads?owner=${rep.repId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
