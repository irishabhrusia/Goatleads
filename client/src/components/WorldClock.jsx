"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown } from "lucide-react";

const COUNTRY_TIMEZONES = [
  {
    code: "IND",
    country: "India",
    flag: "🇮🇳",
    timeZone: "Asia/Kolkata",
    tzLabel: "IST",
  },
  {
    code: "USA",
    country: "USA (NY)",
    flag: "🇺🇸",
    timeZone: "America/New_York",
    tzLabel: "ET",
  },
  {
    code: "UK",
    country: "UK",
    flag: "🇬🇧",
    timeZone: "Europe/London",
    tzLabel: "UK",
  },
  {
    code: "CAN",
    country: "Canada",
    flag: "🇨🇦",
    timeZone: "America/Toronto",
    tzLabel: "ET",
  },
  {
    code: "UAE",
    country: "UAE",
    flag: "🇦🇪",
    timeZone: "Asia/Dubai",
    tzLabel: "GST",
  },
];

function getTimeDetails(date, timeZone) {
  if (!date) {
    return {
      shortTime: "--:--",
      fullTime: "--:--:--",
      dayLabel: "---",
      isBusinessHours: false,
    };
  }

  const shortTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  const fullTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

  const hour24 = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(date)
  );

  const isBusinessHours = hour24 >= 9 && hour24 < 18;

  return { shortTime, fullTime, dayLabel, isBusinessHours };
}

export default function WorldClock() {
  const [now, setNow] = useState(null);
  const [pinnedCode, setPinnedCode] = useState("IND");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const initialTimer = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pinned =
    COUNTRY_TIMEZONES.find((c) => c.code === pinnedCode) ||
    COUNTRY_TIMEZONES[0];
  const pinnedDetails = getTimeDetails(now, pinned.timeZone);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="World Clock across sales territories"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/90 hover:bg-emerald-50 border border-gray-200/80 hover:border-emerald-200 text-xs font-semibold text-gray-800 transition cursor-pointer"
      >
        <span className="text-sm leading-none">{pinned.flag}</span>
        <span className="hidden xl:inline text-[11px] font-bold text-gray-500">
          {pinned.code}
        </span>
        <span className="font-mono font-bold text-gray-950 tabular-nums">
          {pinnedDetails.shortTime}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            !now
              ? "bg-gray-300"
              : pinnedDetails.isBusinessHours
              ? "bg-emerald-500"
              : "bg-amber-400"
          }`}
        />
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-emerald-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-gray-950">
                    Global Territory Clocks
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Click a country to pin it to navbar
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2 space-y-1">
              {COUNTRY_TIMEZONES.map((zone) => {
                const details = getTimeDetails(now, zone.timeZone);
                const isPinned = zone.code === pinned.code;

                return (
                  <button
                    key={zone.code}
                    type="button"
                    onClick={() => {
                      setPinnedCode(zone.code);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                      isPinned
                        ? "bg-emerald-50 border border-emerald-200/80"
                        : "border border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none">{zone.flag}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">
                            {zone.country}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {zone.tzLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span>{details.dayLabel}</span>
                          <span>•</span>
                          <span
                            className={
                              details.isBusinessHours
                                ? "text-emerald-600 font-semibold"
                                : "text-amber-600 font-medium"
                            }
                          >
                            {details.isBusinessHours
                              ? "Business Hours"
                              : "After Hours"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-extrabold text-gray-950 tabular-nums shrink-0">
                      {details.fullTime}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

