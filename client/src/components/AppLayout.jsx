"use client";

import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import QuickAddLeadModal from "@/components/QuickAddLeadModal";
import CommandPalette from "@/components/CommandPalette";

/**
 * Main application shell layout.
 * Features the signature Goatlabs mint architectural grid pattern
 * and an interactive dynamic cursor glow effect that shifts colors on hover
 * anywhere across the background and white content surfaces.
 */
export default function AppLayout({ children, onLeadAdded }) {
  const isAuthorized = useRequireAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse position and dynamic hue for the interactive cursor lighting
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [cursorHue, setCursorHue] = useState(155);

  useEffect(() => {
    const handlePointerMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      setMousePos({ x, y });

      const w = window.innerWidth || 1200;
      const h = window.innerHeight || 800;
      // Shifts hue dynamically from 140 (emerald green) to 190 (seafoam / aquamarine cyan)
      const dynamicHue = Math.round(140 + (x / w) * 40 + (y / h) * 15);
      setCursorHue(dynamicHue);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-emerald-300 shadow-md text-sm font-semibold text-emerald-800">
          <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#f8faf9] text-gray-900 relative overflow-hidden">
      {/* 1. Static ambient mint grid gradient matching the Goatlabs reference screenshot */}
      <div className="pointer-events-none fixed top-0 right-0 w-[72vw] h-[80vh] max-w-[1150px] z-0 overflow-hidden">
        {/* Soft mint radiant glow */}
        <div className="absolute inset-0 bg-gradient-to-bl from-emerald-200/40 via-teal-100/20 to-transparent blur-3xl" />
        
        {/* Architectural grid fading out smoothly towards left and bottom */}
        <div 
          className="absolute inset-0 architectural-grid opacity-70"
          style={{
            maskImage: "radial-gradient(ellipse 75% 65% at 80% 20%, black 20%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 80% 20%, black 20%, transparent 80%)",
          }}
        />
      </div>

      {/* 2. Interactive Cursor Lighting: Follows cursor anywhere in white background with color shifts */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-150"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, hsla(${cursorHue}, 85%, 62%, 0.32), hsla(${(cursorHue + 25) % 360}, 80%, 55%, 0.12) 35%, transparent 70%)`,
        }}
      />

      {/* 3. Interactive Cursor Grid: Softly reveals and illuminates architectural grid under cursor on hover */}
      <div
        className="pointer-events-none fixed inset-0 z-0 architectural-grid opacity-50 transition-opacity duration-150"
        style={{
          maskImage: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, black 25%, transparent 75%)`,
          WebkitMaskImage: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, black 25%, transparent 75%)`,
        }}
      />

      {/* Left Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        {/* Top Header */}
        <Header
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenCommandPalette={() => setIsCommandOpen(true)}
        />

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Global Quick Add Lead Modal */}
      <QuickAddLeadModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onLeadAdded={onLeadAdded}
      />

      {/* Global Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />
    </div>
  );
}
