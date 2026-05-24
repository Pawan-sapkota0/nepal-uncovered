import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterPreset, Place, Submission, User, UserRole } from "@/types";
import { places as seedPlaces, submissions as seedSubmissions, users as seedUsers } from "@/data/mock";

interface AppState {
  // Auth (mock)
  currentUser: User | null;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;

  // Theme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // Data
  places: Place[];
  submissions: Submission[];
  users: User[];

  // Bookmarks
  bookmarks: string[];
  toggleBookmark: (id: string) => void;

  // Actions
  addSubmission: (place: Omit<Place, "id" | "status" | "views" | "createdAt">) => void;
  reviewSubmission: (placeId: string, action: "approve" | "reject", feedback?: string) => void;
  deletePlace: (placeId: string) => void;
  toggleFeatured: (placeId: string) => void;
  setUserRole: (userId: string, role: UserRole) => void;

  // Filter presets
  filterPresets: FilterPreset[];
  savePreset: (preset: Omit<FilterPreset, "id" | "createdAt">) => void;
  deletePreset: (id: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      login: (email, role = "contributor") => {
        const existing = get().users.find((u) => u.email === email);
        if (existing) {
          set({ currentUser: existing });
          return;
        }
        const newUser: User = {
          id: `u${Date.now()}`,
          name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          email,
          role,
          joinedAt: new Date().toISOString().slice(0, 10),
          contributions: 0,
        };
        set({ currentUser: newUser, users: [...get().users, newUser] });
      },
      logout: () => set({ currentUser: null }),

      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },

      places: seedPlaces,
      submissions: seedSubmissions,
      users: seedUsers,

      bookmarks: [],
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),

      addSubmission: (place) => {
        const user = get().currentUser;
        const id = `p${Date.now()}`;
        const newPlace: Place = {
          ...place,
          id,
          status: "pending",
          views: 0,
          createdAt: new Date().toISOString().slice(0, 10),
          submittedBy: user?.id,
        };
        const submission: Submission = {
          id: `s${Date.now()}`,
          placeId: id,
          userId: user?.id ?? "anonymous",
          status: "pending",
          submittedAt: new Date().toISOString().slice(0, 10),
        };
        set({
          places: [newPlace, ...get().places],
          submissions: [submission, ...get().submissions],
        });
      },

      reviewSubmission: (placeId, action, feedback) => {
        set({
          places: get().places.map((p) =>
            p.id === placeId ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p
          ),
          submissions: get().submissions.map((s) =>
            s.placeId === placeId
              ? {
                  ...s,
                  status: action === "approve" ? "approved" : "rejected",
                  feedback,
                  reviewedAt: new Date().toISOString().slice(0, 10),
                }
              : s
          ),
        });
      },

      deletePlace: (placeId) =>
        set({
          places: get().places.filter((p) => p.id !== placeId),
          submissions: get().submissions.filter((s) => s.placeId !== placeId),
        }),

      toggleFeatured: (placeId) =>
        set({
          places: get().places.map((p) =>
            p.id === placeId ? { ...p, featured: !p.featured } : p
          ),
        }),

      setUserRole: (userId, role) =>
        set({
          users: get().users.map((u) => (u.id === userId ? { ...u, role } : u)),
          currentUser:
            get().currentUser?.id === userId ? { ...get().currentUser!, role } : get().currentUser,
        }),

      filterPresets: [],
      savePreset: (preset) =>
        set({
          filterPresets: [
            {
              ...preset,
              id: `fp${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
            ...get().filterPresets,
          ],
        }),
      deletePreset: (id) =>
        set({ filterPresets: get().filterPresets.filter((p) => p.id !== id) }),
    }),
    {
      name: "hidden-nepal-store",
      version: 2,
      partialize: (s) => ({
        currentUser: s.currentUser,
        theme: s.theme,
        bookmarks: s.bookmarks,
        places: s.places,
        submissions: s.submissions,
        users: s.users,
        filterPresets: s.filterPresets,
      }),
      // Reseed places when coordinates / mock data change so accurate
      // geocoding reaches users with an existing persisted store.
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        if (version < 2) {
          return { ...persisted, places: seedPlaces, submissions: seedSubmissions };
        }
        return persisted;
      },
    }
  )
);
