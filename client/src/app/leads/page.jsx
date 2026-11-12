"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import CsvImportModal from "@/components/CsvImportModal";
import EditLeadModal from "@/components/EditLeadModal";
import QuickAddLeadModal from "@/components/QuickAddLeadModal";
import api from "@/lib/api";
import { COUNTRIES, CURRENCIES, STAGES } from "@/constants";

// Country badge configurations
const COUNTRY_BADGES = {
  India: { flag: "🇮🇳", label: "India", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  USA: { flag: "🇺🇸", label: "USA", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  UK: { flag: "🇬🇧", label: "UK", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Canada: { flag: "🇨🇦", label: "Canada", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  UAE: { flag: "🇦🇪", label: "UAE", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

// Stage badge styling
const STAGE_BADGES = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Contacted: "bg-blue-50 text-blue-700 border-blue-200",
  Qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Proposal Sent": "bg-purple-50 text-purple-700 border-purple-200",
  Negotiation: "bg-amber-50 text-amber-700 border-amber-200",
  "In Contract Review": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Closed Won": "bg-green-50 text-green-700 border-green-200",
  "Closed Lost": "bg-red-50 text-red-700 border-red-200",
};

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="min-h-[60vh] flex items-center justify-center text-xs text-gray-500">
            Loading leads...
          </div>
        </AppLayout>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stage") || "";
  const initialCountry = searchParams.get("country") || "";
  const initialOwner = searchParams.get("owner") || "";

  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState(initialStage);
  const [country, setCountry] = useState(initialCountry);
  const [currency, setCurrency] = useState("");
  const [owner, setOwner] = useState(initialOwner);
  const [page, setPage] = useState(1);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const buildFilterQuery = useCallback(
    (includePagination = true) => {
      const params = new URLSearchParams();
      if (includePagination) {
        params.append("page", page.toString());
        params.append("limit", "20");
      }
      if (search.trim()) params.append("search", search.trim());
      if (stage) params.append("stage", stage);
      if (country) params.append("country", country);
      if (currency) params.append("currency", currency);
      if (owner) params.append("owner", owner);
      return params.toString();
    },
    [page, search, stage, country, currency, owner]
  );

  // Fetch leads from GET /api/leads with current filters
  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.get(`/leads?${buildFilterQuery(true)}`);
      setLeads(res.data?.leads || []);
      setPagination(res.data?.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load leads. Please check connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, [buildFilterQuery]);

  // Load leads on mount and whenever search/filter/page changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get(`/leads?${buildFilterQuery(true)}`);
        if (!cancelled) {
          setLeads(res.data?.leads || []);
          setPagination(res.data?.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
          setErrorMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load leads. Please check connection."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [buildFilterQuery]);

  // Handle lead deletion
  const handleDeleteLead = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete lead "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/leads/${id}`);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete lead.");
    }
  };

  // Export leads to CSV via GET /api/leads/export
  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/leads/export?${buildFilterQuery(false)}`, {
        responseType: "blob",
      });

      // Create download trigger in browser
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goatleads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export leads CSV.");
    }
  };

  const hasActiveFilters = Boolean(search || stage || country || currency || owner);

  const clearFilters = () => {
    setSearch("");
    setStage("");
    setCountry("");
    setCurrency("");
    setOwner("");
    setPage(1);
  };

  return (
    <AppLayout onLeadAdded={fetchLeads}>
      <div className="space-y-6">
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {pagination.total} Total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Manage your prospects, contacts, deal values, and pipeline stages.
            </p>
          </div>

          {/* Action buttons: Import, Export, Add Lead */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition shadow-sm shadow-emerald-600/30 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, company, email..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Stage Filter */}
            <div>
              <select
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency Filter */}
            <div>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Currencies</option>
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-500">Filters applied</span>
              <button
                onClick={clearFilters}
                className="text-emerald-600 hover:text-emerald-800 font-semibold cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={fetchLeads}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Master Table Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              {/* Table Header */}
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Contact & Company</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Country</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Deal Value</th>
                  <th className="py-3.5 px-4">Sales Rep</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {/* 1. Loading Skeleton */}
                {isLoading && (
                  <>
                    {[...Array(6)].map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4">
                          <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5" />
                          <div className="h-3 bg-gray-100 rounded w-20" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
                          <div className="h-2.5 bg-gray-100 rounded w-16" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-5 bg-gray-100 rounded-full w-16" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-5 bg-gray-100 rounded-full w-20" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-3.5 bg-gray-200 rounded w-16 mb-1" />
                          <div className="h-2.5 bg-gray-100 rounded w-12" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-6 w-6 bg-gray-200 rounded-full" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-3 bg-gray-100 rounded w-16" />
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="h-6 bg-gray-100 rounded w-12 ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* 2. Empty State */}
                {!isLoading && leads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">No leads found</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        {hasActiveFilters
                          ? "No leads matched your search or filters. Try resetting the filters."
                          : "Your pipeline is empty. Add your first lead or import from a CSV."}
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-2">
                        {hasActiveFilters ? (
                          <button
                            onClick={clearFilters}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                          >
                            Clear Filters
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                          >
                            + Create First Lead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {/* 3. Populated Data Rows */}
                {!isLoading &&
                  leads.map((lead) => {
                    const countryInfo = COUNTRY_BADGES[lead.country] || {
                      flag: "🌐",
                      label: lead.country,
                      bg: "bg-gray-50",
                      text: "text-gray-700",
                      border: "border-gray-200",
                    };

                    const stageBadge = STAGE_BADGES[lead.stage] || "bg-gray-50 text-gray-700 border-gray-200";

                    return (
                      <tr key={lead._id} className="hover:bg-gray-50/80 transition group">
                        {/* Name & Company */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/leads/${lead._id}`}
                            className="font-semibold text-gray-900 hover:text-emerald-700 hover:underline transition block"
                          >
                            {lead.name}
                          </Link>
                          <p className="text-[11px] text-gray-500">{lead.company || "Individual"}</p>
                        </td>

                        {/* Contact Info */}
                        <td className="py-3 px-4">
                          <p className="text-gray-700">{lead.email || "—"}</p>
                          <p className="text-[11px] text-gray-400">{lead.phone || "—"}</p>
                        </td>

                        {/* Country Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${countryInfo.bg} ${countryInfo.text} ${countryInfo.border}`}
                          >
                            <span>{countryInfo.flag}</span>
                            <span>{countryInfo.label}</span>
                          </span>
                        </td>

                        {/* Stage Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stageBadge}`}
                          >
                            {lead.stage}
                          </span>
                        </td>

                        {/* Deal Value */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">
                            {lead.currency}{" "}
                            {lead.amount?.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                          </p>
                          {lead.currency !== "USD" && lead.amountBase > 0 && (
                            <p className="text-[10px] text-gray-400">
                              ≈ ${lead.amountBase?.toLocaleString("en-US")} USD
                            </p>
                          )}
                        </td>

                        {/* Owner / Rep */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {lead.owner?.name?.slice(0, 2).toUpperCase() || "GL"}
                            </div>
                            <span className="text-gray-700 truncate max-w-[100px]">
                              {lead.owner?.name || "Rep"}
                            </span>
                          </div>
                        </td>

                        {/* Last Updated */}
                        <td className="py-3 px-4 text-gray-500 text-[11px]">
                          {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : "—"}
                        </td>

                        {/* Actions (Edit / Delete) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingLead(lead)}
                              title="Edit lead"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleDeleteLead(lead._id, lead.name)}
                              title="Delete lead"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
              <p>
                Showing{" "}
                <strong className="text-gray-900">
                  {(pagination.page - 1) * pagination.limit + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-gray-900">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{" "}
                of <strong className="text-gray-900">{pagination.total}</strong> leads
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(pagination.pages)].map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = pageNum === pagination.page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Lead Modal */}
      <QuickAddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadAdded={fetchLeads}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchLeads}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        isOpen={Boolean(editingLead)}
        lead={editingLead}
        onClose={() => setEditingLead(null)}
        onUpdated={fetchLeads}
      />
    </AppLayout>
  );
}
