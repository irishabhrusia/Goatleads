"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Root landing page: redirects to /dashboard if logged in, otherwise to /login.
 * Waits for Zustand hydration from localStorage before deciding.
 */
export default function RootPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    // Wait until Zustand finishes loading from localStorage
    if (!hasHydrated) {
      if (useAuthStore.persist?.hasHydrated?.()) {
        useAuthStore.getState().setHasHydrated(true);
      }
      return;
    }

    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [hasHydrated, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
        <svg
          className="animate-spin h-5 w-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        Loading session...
      </div>
    </div>
  );
}
