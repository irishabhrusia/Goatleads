"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  UserPlus,
  ArrowRightLeft,
  Search,
  RefreshCw,
  Mail,
  Lock,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  XCircle,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLES } from "@/constants";

export default function TeamPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === ROLES.ADMIN;

  const [team, setTeam] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Notification Banner
  const [alertBanner, setAlertBanner] = useState(null);

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(ROLES.REP);
  const [invitePassword, setInvitePassword] = useState("");

  // Reassign Leads Form
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");

  // Fetch all team members
  const fetchTeam = async () => {
    try {
      const res = await api.get("/team");
      setTeam(res.data?.team || []);
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to load team roster."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      const timer = setTimeout(() => setIsLoading(false), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    async function loadTeam() {
      try {
        const res = await api.get("/team");
        if (!cancelled) {
          setTeam(res.data?.team || []);
          setErrorMessage("");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err.response?.data?.message || "Failed to load team roster."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Filter team members based on search and role
  const filteredTeam = team.filter((member) => {
    const matchesSearch =
      !searchQuery.trim() ||
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Calculate summary team metrics
  const totalMembers = team.length;
  const adminCount = team.filter((m) => m.role === ROLES.ADMIN).length;
  const repCount = team.filter((m) => m.role === ROLES.REP).length;
  const totalPipelineManaged = team.reduce(
    (sum, m) => sum + (m.stats?.openPipelineValue || 0),
    0
  );

  // Update member role (Admin only)
  const handleRoleChange = async (memberId, newRole) => {
    if (memberId === currentUser?._id) {
      alert("You cannot change your own administrator role.");
      return;
    }

    const previousTeam = [...team];
    setTeam((prev) =>
      prev.map((m) => (m._id === memberId ? { ...m, role: newRole } : m))
    );

    try {
      await api.patch(`/team/${memberId}/role`, { role: newRole });
      setAlertBanner({
        type: "success",
        message: `Member role successfully updated to ${newRole.toUpperCase()}.`,
      });
      setTimeout(() => setAlertBanner(null), 4000);
    } catch (err) {
      setTeam(previousTeam);
      alert(err.response?.data?.message || "Failed to update role.");
    }
  };

  // Submit Invite Member Form
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert("Please provide an email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      };
      if (invitePassword.trim()) {
        payload.password = invitePassword.trim();
      }

      const res = await api.post("/team/invite", payload);
      if (res.data?.member) {
        setTeam((prev) => [...prev, { ...res.data.member, stats: { totalLeads: 0, openLeads: 0, openPipelineValue: 0 } }]);
        setIsInviteOpen(false);
        setInviteName("");
        setInviteEmail("");
        setInvitePassword("");
        setInviteRole(ROLES.REP);

        setAlertBanner({
          type: "success",
          message: res.data?.message || `Invitation successfully sent to ${payload.email}.`,
        });
        setTimeout(() => setAlertBanner(null), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to invite member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reassign Leads Form
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!fromUserId || !toUserId) {
      alert("Please select both source and recipient team members.");
      return;
    }
    if (fromUserId === toUserId) {
      alert("Source and target members must be different.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/team/reassign-leads", {
        fromUserId,
        toUserId,
      });

      setIsReassignOpen(false);
      setFromUserId("");
      setToUserId("");
      fetchTeam(); // Refresh to recalculate pipeline distribution

      setAlertBanner({
        type: "success",
        message: res.data?.message || "Deals and follow-up tasks transferred successfully!",
      });
      setTimeout(() => setAlertBanner(null), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reassign leads.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate member
  const handleDeactivate = async (member) => {
    if (member._id === currentUser?._id) {
      alert("You cannot deactivate your own administrator account.");
      return;
    }

    const leadCount = member.stats?.openLeads || 0;
    const confirmMessage =
      leadCount > 0
        ? `Warning: ${member.name} currently owns ${leadCount} active leads. Are you sure you want to deactivate them? (You can reassign their leads first).`
        : `Are you sure you want to deactivate ${member.name} (${member.email})?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const previousTeam = [...team];
    setTeam((prev) => prev.filter((m) => m._id !== member._id));

    try {
      await api.delete(`/team/${member._id}`);
      setAlertBanner({
        type: "success",
        message: `${member.name} has been deactivated from the team.`,
      });
      setTimeout(() => setAlertBanner(null), 4000);
    } catch (err) {
      setTeam(previousTeam);
      alert(err.response?.data?.message || "Failed to deactivate team member.");
    }
  };

  // If user is not an administrator, show clear restricted access message
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">
            Administrator Access Required
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
            The Team Management portal is restricted to organization administrators. Sales representatives can manage deals from the Pipeline and Leads pages.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Hero Card */}
        <div className="rounded-3xl bg-white border border-gray-200/90 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold tracking-wide uppercase mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Team Governance</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                Sales Team & Permissions
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Invite representatives, update role privileges, monitor pipeline ownership, and transfer deal portfolios.
              </p>
            </div>

            {/* Actions: Transfer Deals + Invite Member */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsReassignOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                <span>Transfer Deals</span>
              </button>

              <button
                onClick={fetchTeam}
                disabled={isLoading}
                title="Refresh team"
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsInviteOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-emerald-600/30 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </motion.button>
            </div>
          </div>

          {/* Alert Notification Banner */}
          <AnimatePresence>
            {alertBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  alertBanner.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{alertBanner.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Metrics Ticker */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-5 border-t border-gray-100">
            <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total Roster
              </span>
              <p className="text-2xl font-black text-gray-950 mt-1">
                {totalMembers}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Active team members</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Sales Reps
              </span>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {repCount}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Quota-bearing seats</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Administrators
              </span>
              <p className="text-2xl font-black text-purple-600 mt-1">
                {adminCount}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Full governance rights</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Pipeline Managed
              </span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                ${totalPipelineManaged.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Under active negotiation</p>
            </div>
          </div>
        </div>

        {/* Search & Role Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team by name or email address..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value={ROLES.ADMIN}>Administrators</option>
              <option value={ROLES.REP}>Sales Reps</option>
            </select>
          </div>
        </div>

        {/* Team Members List / Table */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600">
                <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Loading team roster...</span>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs font-semibold text-red-600">{errorMessage}</p>
              <button
                onClick={fetchTeam}
                className="px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredTeam.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-900">No team members match your query</p>
              <p className="text-xs text-gray-400 mt-1">Try clearing your search or role filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Member</th>
                    <th className="py-3.5 px-4">Role Permission</th>
                    <th className="py-3.5 px-4">Total Deals</th>
                    <th className="py-3.5 px-4">Open Pipeline</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTeam.map((member) => {
                    const isSelf = member._id === currentUser?._id;
                    const initials = member.name
                      ?.slice(0, 2)
                      .toUpperCase() || "GL";

                    return (
                      <tr key={member._id} className="hover:bg-emerald-50/20 transition">
                        {/* Member Identity */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-full object-cover border border-emerald-100"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                                  {initials}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-950 text-sm">
                                  {member.name}
                                </p>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-gray-100 text-gray-700">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Selector */}
                        <td className="py-4 px-4">
                          {isSelf ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Administrator</span>
                            </span>
                          ) : (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member._id, e.target.value)}
                              className="px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                            >
                              <option value={ROLES.REP}>Sales Rep</option>
                              <option value={ROLES.ADMIN}>Administrator</option>
                            </select>
                          )}
                        </td>

                        {/* Total Leads Managed */}
                        <td className="py-4 px-4 font-bold text-gray-900">
                          {member.stats?.totalLeads || 0} leads
                        </td>

                        {/* Open Pipeline Value */}
                        <td className="py-4 px-4">
                          <p className="font-black text-gray-950 text-sm">
                            ${(member.stats?.openPipelineValue || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {member.stats?.openLeads || 0} active in pipeline
                          </p>
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setFromUserId(member._id);
                                setIsReassignOpen(true);
                              }}
                              title="Transfer this member's leads"
                              className="p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200 transition cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => handleDeactivate(member)}
                                title="Deactivate member"
                                className="p-2 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-200 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Invite New Team Member */}
        <AnimatePresence>
          {isInviteOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-200"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-950">
                        Invite Team Member
                      </h3>
                      <p className="text-xs text-gray-500">
                        Add a representative or administrator to GoatLeads.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInviteOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="s.connor@enterprise.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Role Assignment */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Role & Permissions
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      <option value={ROLES.REP}>Sales Representative (Owns deals & tasks)</option>
                      <option value={ROLES.ADMIN}>Administrator (Full team governance)</option>
                    </select>
                  </div>

                  {/* Temporary Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Initial Temporary Password (Optional)
                    </label>
                    <input
                      type="text"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsInviteOpen(false)}
                      className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !inviteEmail.trim()}
                      className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Inviting..." : "Send Invitation"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal: Transfer / Reassign Deals */}
        <AnimatePresence>
          {isReassignOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-200"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-950">
                        Transfer Lead Portfolio
                      </h3>
                      <p className="text-xs text-gray-500">
                        Reassign deals and open follow-up tasks between reps.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsReassignOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleReassignSubmit} className="space-y-4">
                  {/* From Rep */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Transfer Deals From (Current Owner) *
                    </label>
                    <select
                      required
                      value={fromUserId}
                      onChange={(e) => setFromUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="">Select source representative...</option>
                      {team.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.stats?.openLeads || 0} active leads)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Rep */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Transfer Deals To (New Owner) *
                    </label>
                    <select
                      required
                      value={toUserId}
                      onChange={(e) => setToUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs sm:text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="">Select target recipient...</option>
                      {team
                        .filter((m) => m._id !== fromUserId)
                        .map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200/70">
                    💡 All active pipeline deals and associated pending follow-up tasks owned by the source member will be transferred immediately.
                  </p>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsReassignOpen(false)}
                      className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !fromUserId || !toUserId}
                      className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Transferring..." : "Confirm Transfer"}
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
