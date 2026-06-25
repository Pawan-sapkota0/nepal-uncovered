import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterPreset } from "@/types";

interface AppState {
  theme: "light" | "dark";
  toggleTheme: () => void;

  bookmarks: string[];
  toggleBookmark: (id: string) => void;

  filterPresets: FilterPreset[];
  savePreset: (preset: Omit<FilterPreset, "id" | "createdAt">) => void;
  deletePreset: (id: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },

      bookmarks: [],
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),

      filterPresets: [],
      savePreset: (preset) =>
        set({
          filterPresets: [
            { ...preset, id: `fp${Date.now()}`, createdAt: new Date().toISOString() },
            ...get().filterPresets,
          ],
        }),
      deletePreset: (id) =>
        set({ filterPresets: get().filterPresets.filter((p) => p.id !== id) }),
    }),
    {
      name: "hidden-nepal-store",
      version: 3,
      partialize: (s) => ({
        theme: s.theme,
        bookmarks: s.bookmarks,
        filterPresets: s.filterPresets,
      }),
      migrate: (persisted: any, _version) => {
        return {
          theme: persisted?.theme ?? "light",
          bookmarks: persisted?.bookmarks ?? [],
          filterPresets: persisted?.filterPresets ?? [],
        };
      },
    }
  )
);
