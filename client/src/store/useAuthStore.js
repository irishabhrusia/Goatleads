import { create } from "zustand";
import { persist } from "zustand/middleware";

// Global authentication store using Zustand with localStorage persistence
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null, // JWT token string
      user: null,  // user object: { id, name, email, role, avatar }
      hasHydrated: false, // tracks whether localStorage data has finished loading

      setHasHydrated: (val) => set({ hasHydrated: val }),
      
      // Save token and user details on login
      setAuth: (token, user) => set({ token, user }),

      // Update user profile fields in store after settings save
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : updatedFields,
        })),

      // Clear token and user details on logout
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "goatleads-auth", // key name in localStorage
      // Triggered as soon as zustand finishes loading saved state from localStorage
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
