"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Custom hook to guard protected pages.
 * Returns true only when Zustand hydration is complete and a JWT token is present.
 * If hydration finished without a token, redirects the user to /login.
 */
export function useRequireAuth() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      if (useAuthStore.persist?.hasHydrated?.()) {
        useAuthStore.getState().setHasHydrated(true);
      }
      return;
    }

    if (!token) {
      router.replace("/login");
    }
  }, [hasHydrated, token, router]);

  return Boolean(hasHydrated && token);
}
