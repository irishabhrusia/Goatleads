"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  ArrowUpRight,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Globe2,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, token, router]);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    setMousePos({ x: clientX, y: clientY });
  };

  const handleFillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      if (res.data?.token && res.data?.user) {
        setAuth(res.data.token, res.data.user);
        router.replace("/dashboard");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Invalid credentials. Please verify your email and password.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen relative flex items-center justify-center bg-[#FAFCFB] bg-grid-pattern px-4 sm:px-6 lg:px-8 overflow-hidden select-none"
    >
      {/* Background Interactive Radial Mint Glow following cursor */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.16), transparent 75%)`,
        }}
      />

      {/* Radiant Mint Mesh Blob (matching the screenshot's green aura) */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/6 right-1/4 w-[480px] h-[480px] bg-emerald-300/30 rounded-full blur-[110px] pointer-events-none"
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-white/90 border border-emerald-900/10 shadow-2xl backdrop-blur-xl overflow-hidden my-8">
        {/* Left Side: Brand Story & Pillars */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-gradient-to-br from-emerald-50/70 via-white/50 to-teal-50/30 border-b lg:border-b-0 lg:border-r border-emerald-900/10 flex flex-col justify-between">
          <div>
            {/* Goatlabs Brand Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 mb-8"
            >
              <div className="flex items-baseline">
                <span className="text-2xl font-black tracking-tight text-gray-950">
                  Goatleads
                </span>
                <span className="text-emerald-500 font-black text-2xl leading-none">.</span>
              </div>
            </motion.div>

            {/* Pill tag matching screenshot "• ABOUT GOATLABS" */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300/60 text-[11px] font-bold tracking-wide uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Revenue Engine</span>
            </div>

            {/* Bold Headline matching screenshot typography */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-3 mb-8"
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 leading-tight tracking-tight">
                We Engineer Sales Pipelines Like They&apos;re Our Own Product.
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                A highly integrated, data-driven CRM designed to scope, track, and close high-performance enterprise deals.
              </p>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-2.5"
            >
              <div className="flex items-center gap-3 text-xs text-gray-700 bg-white/80 p-2.5 rounded-xl border border-emerald-900/10 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Globe2 className="w-4 h-4" />
                </div>
                <span className="font-medium">Multi-Currency ($ USD, ₹ INR, £ GBP, € EUR)</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-700 bg-white/80 p-2.5 rounded-xl border border-emerald-900/10 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="font-medium">8-Stage Kanban & Automated Follow-ups</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-700 bg-white/80 p-2.5 rounded-xl border border-emerald-900/10 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-medium">Role-Based Team Permissions (Admin & Rep)</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="pt-8 text-[11px] text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bank-grade JWT Auth & Data Security</span>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white/60">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-950 tracking-tight">
                Sign in to your account
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Enter your work credentials to open your sales workspace.
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Email address
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@goatleads.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/70 border border-gray-200 text-gray-900 placeholder-gray-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-600 transition-colors">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50/70 border border-gray-200 text-gray-900 placeholder-gray-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Pill Button matching Goatlabs CTA */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="w-full mt-2 py-3 px-4 rounded-full font-semibold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign in to Platform</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Quick Demo Credentials Autofill Pill (dev/demo only) */}
            {(process.env.NODE_ENV !== "production" ||
              process.env.NEXT_PUBLIC_SHOW_DEMO === "true") && (
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-[11px] text-gray-400 mb-2">
                  Quick 1-Click Demo Credentials:
                </p>
                <button
                  type="button"
                  onClick={() => handleFillDemo("testadmin@goatleads.com", "Admin123!")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Admin: testadmin@goatleads.com</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
