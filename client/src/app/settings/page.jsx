"use client";

import { useState } from "react";
import {
  User,
  Lock,
  Image as ImageIcon,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <AppLayout>
      <SettingsForm key={user?._id || "loading"} user={user} />
    </AppLayout>
  );
}

function SettingsForm({ user }) {
  const updateUser = useAuthStore((state) => state.updateUser);

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const userId = user?._id || user?.id;
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "GL";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!userId) {
      setStatusMessage({
        type: "error",
        text: "Unable to resolve your user ID. Please sign in again.",
      });
      return;
    }

    if (password && password.length < 6) {
      setStatusMessage({
        type: "error",
        text: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (password && password !== confirmPassword) {
      setStatusMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        avatar: avatar.trim(),
      };
      if (password) {
        payload.password = password;
      }

      const res = await api.put(`/team/${userId}`, payload);
      if (res.data?.member) {
        updateUser(res.data.member);
      }

      setPassword("");
      setConfirmPassword("");
      setStatusMessage({
        type: "success",
        text: "Your profile settings have been saved.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-950 tracking-tight">
          Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Manage your account identity, avatar, and workspace password.
        </p>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-100">
          {avatar.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar.trim()}
              alt={name || "Avatar preview"}
              className="w-16 h-16 rounded-2xl object-cover border border-emerald-200 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0">
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-950 truncate">
              {name || "Sales Rep"}
            </h2>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              <Shield className="w-3 h-3" />
              <span>Role: {user?.role || "rep"}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Avatar Image URL (Optional)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <ImageIcon className="w-4 h-4" />
              </span>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Password Change Section */}
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Change Password
              </h3>
              <p className="text-[11px] text-gray-500">
                Leave blank if you want to keep your current password.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/80 border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/25 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

