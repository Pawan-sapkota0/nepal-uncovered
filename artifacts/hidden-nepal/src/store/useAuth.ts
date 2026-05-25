import { create } from "zustand";
import { persist } from "zustand/middleware";
import { auth, setAccessToken, type MeResponse } from "@/lib/api";

interface AuthState {
  user: MeResponse | null;
  accessToken: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  setUser: (user: MeResponse | null) => void;
  setAccessToken: (token: string | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => {
        setAccessToken(accessToken);
        set({ accessToken });
      },

      login: async (email, password) => {
        const data = await auth.login(email, password);
        setAccessToken(data.accessToken);
        set({ user: data.user, accessToken: data.accessToken });
      },

      signup: async (email, password, name) => {
        const data = await auth.signup(email, password, name);
        setAccessToken(data.accessToken);
        set({ user: data.user, accessToken: data.accessToken });
      },

      logout: async () => {
        try { await auth.logout(); } catch { /* ignore */ }
        setAccessToken(null);
        set({ user: null, accessToken: null });
      },

      loadMe: async () => {
        const { accessToken } = get();
        if (accessToken) setAccessToken(accessToken);
        set({ isLoading: true });
        try {
          const user = await auth.me();
          set({ user, isLoading: false });
        } catch {
          setAccessToken(null);
          set({ user: null, accessToken: null, isLoading: false });
        }
      },
    }),
    {
      name: "hidden-nepal-auth",
      version: 1,
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
      },
    }
  )
);

export function useIsStaff() {
  const roles = useAuth((s) => s.user?.roles ?? []);
  return roles.includes("moderator") || roles.includes("admin");
}

export function useIsAdmin() {
  return useAuth((s) => s.user?.roles?.includes("admin") ?? false);
}
