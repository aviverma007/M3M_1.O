# M3M_1.O

In-house M3M project governance app.

## Structure

```
frontend/   React 19 + TypeScript + Vite + Tailwind v4 + React Router
```

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (also reachable on the LAN)
npm run build      # production build -> frontend/dist
```

### Auth
- `src/auth/authService.ts` calls `POST /api/auth/login` and `POST /api/auth/forgot-password`.
- Until the backend exists, `.env.development` sets `VITE_USE_MOCK_AUTH=true`: any valid email
  plus a password of 6+ characters logs in. An email starting with `superadmin` gets the `superadmin` role.
- Dev server proxies `/api` to `http://localhost:5000`.

### Branding
Put the company logo at `frontend/public/brand/m3m-logo.png`. It replaces the text placeholder automatically.

### Routes
| Path | Page |
|---|---|
| `/login` | Login |
| `/forgot-password` | Forgot password |
| `/select-portfolio` | Choose M3M Noida / M3M Gurgaon / Smartworld (after login) |
| `/dashboard` | Placeholder (needs login + portfolio) |
