# M3M_1.O backend

Express 5 + TypeScript API over SQL Server. Serves the 70 endpoints in `../docs/API.md` under `/api/v1`
and (optionally) the built React app from `../frontend/dist`.

Setup and deployment: **[../docs/BACKEND_SETUP.md](../docs/BACKEND_SETUP.md)**.

```bash
cp .env.example .env     # fill DB_* and JWT_SECRET
npm install
npm run dev              # tsx watch, http://localhost:5000/api/v1
npm run build && npm start   # production (dist/server.js)
npm run typecheck
```

## Layout

```
src/
  config.ts            environment (.env)
  server.ts            connect DB -> load routes -> listen
  app.ts               express setup: security headers, JSON + multipart parsing, static frontend, error envelope
  db/pool.ts           mssql connection pool + parameterised query()
  db/table.ts          db.table(name): async table helper (JSON/bit/date conversion from column metadata)
  http/router.ts       route(method, path, handler) + ok/created/fail/file/paginate (same contract as the frontend mock)
  http/auth.ts         JWT + bcrypt, current user
  http/helpers.ts      audit(), notify(), UploadedFile
  http/files.ts        file storage on disk (UPLOAD_DIR) + public unguessable /files/:key URLs
  services/mail.ts     SMTP (password reset)
  routes/*.ts          one file per area: auth, metadata, files, admin, projects, design-brief, module-workspace, keyratio-compare
```

Pure business logic shared with the frontend (key-ratio calculations, benchmark rules, design-brief field
catalogue, PDF builder) is imported from `../frontend/src` via the `@/` alias, so both sides use the same code.

Responses use the original envelope `{ success, message, data }`; errors `{ success:false, statusCode, errorCode, message }`.
