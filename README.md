# M3M_1.O

In-house rebuild of the M3M project governance application (the "BCG - M3M" admin app).

| Folder | What |
|---|---|
| `frontend/` | React app reproducing every screen and workflow of the original |
| `backend/` | Node.js + Express API on **SQL Server** (same endpoints and response format as the original API) |
| `database/` | SQL scripts to run in SSMS: database + login, tables, reference data, first admin, sample data, backup |
| `docs/` | **[BACKEND_SETUP.md](docs/BACKEND_SETUP.md)** (step-by-step install on the server) · [API.md](docs/API.md) (endpoint contract) |

**To install on the server, follow [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).**

The frontend can also run without any backend against an in-browser **mock API** (development / demos).

## Quick start (frontend only, mock data)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (mock mode: no database needed)
```

Production (`npm run build`) uses the real API (`frontend/.env.production`), served by `backend/`.

### Demo logins (mock mode, and the optional SQL sample data)
All passwords: `Password@123`

| Email | Role | Notes |
|---|---|---|
| superadmin@m3m.com | super_admin | everything; lands on portfolio picker |
| design.admin@m3m.com | design_admin | design department |
| general.admin@m3m.com | general_admin | goes straight to dashboard after portfolio |
| design.contributor@m3m.com | design_contributor | |
| liaison@m3m.com, bd@m3m.com, land@m3m.com, structure@m3m.com, mep@m3m.com | general_contributor | department users ("My Tasks" view, design-brief inputs) |

5 wrong passwords lock an account for 15 minutes (account-locked page with countdown), as in the original.

## API mode

`frontend/.env.development` (mock by default) / `.env.production` (http):

```
VITE_API_MODE=mock        # mock = in-browser data, http = real backend
VITE_API_BASE_URL=/api/v1 # used when VITE_API_MODE=http
```

- In `http` mode every call goes to `VITE_API_BASE_URL + <path>` with `Authorization: Bearer <token>`
  (token from `POST /auth/login` -> `data.accessToken`). The dev server proxies `/api` to `http://localhost:5000`.
- All responses use the original envelope: `{ success, message, data }` (errors: `{ success:false, message, errorCode, statusCode }`).
- The complete endpoint contract for the backend is in **[docs/API.md](docs/API.md)**.

### Mock data
- Stored in the browser (`localStorage` key `m3m.mockdb`), seeded with fictional sample projects/users.
- Reset from the browser console: `resetMockData()`.
- Bumping `DB_VERSION` in `src/mock/db.ts` reseeds every browser on next load.

## Structure (frontend/src)

```
api/            http client (http.ts: mock/http switch, view-only write block) + per-domain query hooks
auth/           AuthContext (login, /auth/me session restore, roles)
components/
  ui/           shadcn/ui components with the original's classes/variants
  common/       LoadingButton, NotFound, PageLoader, NewProjectDialog
  layout/       DashboardLayout, Header (portfolio switcher, notifications, user menu), PageHeading
  shared/       SelectWithOther
  <domain>/     page-specific components (projects, design-brief, design-chapters, module-workspace, keyratio, admin)
lib/            utils, benchmark checker (port of original rules), downloads
mock/           in-browser API: router.ts, db.ts, handlers/*.ts (endpoints), seed/*.ts (sample data)
pages/          route pages (route tree in App.tsx mirrors the original)
state/          portfolio + view-only mode
types/          shared + per-domain types
```

## Screens
Login · Forgot / Reset password · Account locked · Portfolio picker · Existing/New projects ·
Dashboard (project list / contributor "My Tasks") · New/Update project · Module grid ·
Module 1 Key Ratio (residential + commercial) · Modules 2–3 Apartment/Common Design chapters ·
Compare projects · Design Brief (landing, Liaison, Business Development, Land, Structure, MEP, All inputs, Final submission) ·
Design chapters (Project details, Project level, Unit level, ID specs, Common area, Landscape, Service design,
Contracting, Consultant, Phasing, Schedule, Approvals, Additional details, Export, Structure, MEP) ·
Roles & access control · Audit logs · Notifications.
