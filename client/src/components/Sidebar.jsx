"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Kanban,
  Users,
  CheckSquare,
  Shield,
  Settings,
  Sparkles,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ROLES } from "@/constants";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: Kanban,
  },
  {
    name: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    name: "My Tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    name: "Team",
    href: "/team",
    adminOnly: true,
    icon: Shield,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container (Lighter refined forest slate with emerald accents) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 h-screen bg-gradient-to-b from-[#162721] to-[#111f19] border-r border-emerald-900/40 text-white flex flex-col transition-transform duration-300 ease-in-out shrink-0 lg:sticky lg:top-0 lg:translate-x-0 shadow-lg shadow-emerald-950/20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header matching Goatlabs aesthetic */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-emerald-800/30">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.05 }}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-emerald-500/25"
            >
              GL
            </motion.div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Goatleads
              </span>
              <span className="text-emerald-400 font-black text-xl leading-none">.</span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
            Platform
          </p>

          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) {
              return null;
            }

            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className="relative block"
              >
                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 font-semibold"
                      : "text-emerald-100/75 hover:text-white hover:bg-emerald-800/30"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-emerald-400 group-hover:text-emerald-300"
                    }`}
                  />
                  <span>{item.name}</span>

                  {item.adminOnly && (
                    <span className="ml-auto text-[9px] font-bold uppercase bg-emerald-800/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                      Admin
                    </span>
                  )}

                  {isActive && !item.adminOnly && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-200 opacity-90" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Current User Card & Log Out */}
        <div className="p-3.5 border-t border-emerald-800/30 bg-[#0e1b15] space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-900/30 border border-emerald-700/40">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
              {user?.name?.slice(0, 2).toUpperCase() || "GL"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || "Sales User"}
              </p>
              <p className="text-[11px] text-emerald-300/80 truncate">
                {user?.email || "user@goatleads.com"}
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              title="Sign out"
              className="p-1.5 rounded-lg text-emerald-300 hover:text-red-300 hover:bg-red-500/20 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Full Sign Out button */}
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-medium text-emerald-300/70 hover:text-red-300 hover:bg-red-500/15 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
