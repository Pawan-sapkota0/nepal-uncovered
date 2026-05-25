# Hidden Nepal

A community atlas of Nepal's hidden gems and iconic places, with cultural, travel and safety detail you can trust.

## Run & Operate

- `pnpm --filter @workspace/hidden-nepal run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, shadcn/ui
- State: Zustand (persisted to localStorage)
- Routing: react-router-dom v6
- Data: Local mock data in `src/data/mock.ts` (no backend yet)
- API: Express 5 (scaffold only, not used by frontend)
- DB: PostgreSQL + Drizzle ORM (scaffold only)

## Where things live

- `artifacts/hidden-nepal/` — main frontend app
- `artifacts/hidden-nepal/src/data/mock.ts` — seed data (places, users, submissions)
- `artifacts/hidden-nepal/src/store/useApp.ts` — Zustand store (auth, places, bookmarks)
- `artifacts/hidden-nepal/src/types/index.ts` — TypeScript types
- `artifacts/hidden-nepal/src/pages/` — page components
- `artifacts/hidden-nepal/src/components/` — reusable components
- `artifacts/api-server/` — backend scaffold (currently unused)

## Architecture decisions

- Pure frontend app ported from Lovable — no Supabase was used, so no backend migration needed.
- All data is stored in Zustand with localStorage persistence (version-migrated).
- Auth is mocked via Zustand (email-based login with role support).
- BrowserRouter uses `import.meta.env.BASE_URL` as basename for correct path-based routing on Replit.
- Tailwind v3 with PostCSS (not @tailwindcss/vite) due to the tailwind.config.ts the app requires.

## Product

- Browse Nepal's hidden gems and iconic places with detailed cultural, travel and safety info.
- Filter by category (lakes, mountains, villages, heritage, wildlife, trekking, spiritual, valleys).
- Community contribution flow: submit new places for admin review.
- Admin panel: review submissions, manage places, manage users.
- Light/dark mode, bookmarks, search.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` or `pnpm run dev` at the workspace root — it has no dev script.
- Tailwind v3 uses `tailwind.config.ts` + PostCSS; the frontend does NOT use `@tailwindcss/vite`.
- The `storetypes` directory in `src/` appears to be an empty artifact from Lovable — ignore it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
