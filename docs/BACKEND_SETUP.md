# M3M_1.O — Backend & SQL Server setup (step by step)

This sets up the real backend on your Windows server (e.g. `192.168.66.28`):

```
Browser (LAN) ──► http://192.168.66.28:5000 ──► Node.js server (backend/)
                                                ├─ serves the React app (frontend/dist)
                                                ├─ /api/v1/...  (the 70 endpoints in docs/API.md)
                                                └─ SQL Server database  M3M_One   +  uploads folder
```

Everything is in the repo:

| Folder | What |
|---|---|
| `database/` | SQL scripts you run in SSMS (create DB + login, tables, reference data, first admin, optional sample data) |
| `backend/` | Node.js + Express API (TypeScript) talking to SQL Server |
| `frontend/` | React app; built once and served by the backend |

---

## 1. Install the prerequisites (once)

On the server:

1. **SQL Server 2019 or 2022** — Express (free) is fine for this app; Standard/Developer also work.
   During setup choose **Mixed Mode authentication** (SQL Server + Windows) and note the `sa` password.
2. **SSMS** (SQL Server Management Studio) 20 or newer.
3. **Node.js 20 LTS or 22 LTS** — <https://nodejs.org> (tick "Add to PATH"). Check in PowerShell: `node -v`
4. **Git** — to pull the repo (`git clone https://github.com/aviverma007/M3M_1.O.git`).

### 1a. Let the app connect to SQL Server

1. Open **SQL Server Configuration Manager** → *SQL Server Network Configuration* → *Protocols for <INSTANCE>* →
   **TCP/IP = Enabled**. Under TCP/IP → *IP Addresses* → *IPAll*: set **TCP Port = 1433** (clear *TCP Dynamic Ports*).
2. Restart the **SQL Server (<INSTANCE>)** service.
3. In SSMS: right-click the server → *Properties* → *Security* → **SQL Server and Windows Authentication mode** → OK →
   restart the service if you changed it.

> If SQL Server and the Node app run on the **same** machine you don't need a firewall rule for 1433.

---

## 2. Create the database in SSMS

Open SSMS, connect to the server as an administrator (Windows auth or `sa`).
Open each file from `database/` (*File → Open → File…*), check the database dropdown, and press **Execute (F5)** — in this order:

| # | Script | What it does | Notes |
|---|---|---|---|
| 1 | `01_create_database.sql` | Creates database **M3M_One**, login **m3m_app** (read/write only to this DB) | **Edit the password on line 22 first.** Use the same password in `backend/.env` |
| 2 | `02_schema.sql` | Creates all 25 tables, keys, indexes | Safe to re-run |
| 3 | `03_reference_data.sql` | Modules, chapter catalogue (sections, fields, options, benchmark answers), benchmarks, key-ratio definitions, roles | Runs only once (skips if loaded). All-or-nothing transaction |
| 4 | `04_first_admin.sql` | First login: **admin@m3m.com / ChangeMe@123** | Change this password right after first login |
| 5 | `05_sample_data_optional.sql` | **Optional, test only** — fictional users & 11 sample projects | Don't run on the live database |

Check it worked (new query window on M3M_One):

```sql
USE M3M_One;
SELECT name FROM sys.tables ORDER BY name;                 -- 25 tables
SELECT COUNT(*) AS modules FROM dbo.modules;               -- 36
SELECT email, role FROM dbo.users;                         -- admin@m3m.com, super_admin
```

> The database holds confidential project data. Keep it on its own (don't put other apps' tables in it) and
> only give the `m3m_app` login access to it — that's exactly what script 01 does.

---

## 3. Configure the backend

In PowerShell on the server:

```powershell
cd C:\apps            # any folder you like
git clone https://github.com/aviverma007/M3M_1.O.git
cd M3M_1.O\backend
copy .env.example .env
notepad .env
```

Set at least these values in `.env`:

```ini
PORT=5000
DB_SERVER=localhost          # or the SQL Server machine name / IP
DB_INSTANCE=                 # e.g. SQLEXPRESS for a named instance (then DB_PORT is ignored)
DB_NAME=M3M_One
DB_USER=m3m_app
DB_PASSWORD=<the password you put in 01_create_database.sql>
JWT_SECRET=<long random string>          # see below
UPLOAD_DIR=D:\M3M_uploads                 # where uploaded documents are stored — back this up
APP_URL=http://192.168.66.28:5000         # used in password-reset emails
# optional e-mail for "Forgot password" (otherwise the reset link is written to the server log):
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=no-reply@yourcompany.com
SMTP_PASSWORD=...
MAIL_FROM=M3M_1.O <no-reply@yourcompany.com>
```

Generate the JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Build and start

```powershell
# 1) frontend (once per update)
cd C:\apps\M3M_1.O\frontend
npm ci
npm run build            # uses .env.production -> VITE_API_MODE=http (real API)

# 2) backend
cd ..\backend
npm ci
npm run build            # creates dist\server.js
npm start                # -> "[http] M3M_1.O API listening on http://0.0.0.0:5000/api/v1"
```

Open **http://192.168.66.28:5000** from any PC on the LAN → log in with `admin@m3m.com` / `ChangeMe@123`
→ *Role and Access Control* → add the real users → change the admin password.

Health check: <http://192.168.66.28:5000/api/v1/health> → `{"ok":true}`

### Open the port on the server firewall (once, PowerShell as Administrator)

```powershell
New-NetFirewallRule -DisplayName "M3M_1.O web" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Profile Domain,Private
```

---

## 5. Run it as a Windows service (starts with the server, restarts on crash)

Using **NSSM** (<https://nssm.cc>, unzip `nssm.exe` to `C:\tools\nssm`), PowerShell as Administrator:

```powershell
C:\tools\nssm\nssm.exe install M3M_One "C:\Program Files\nodejs\node.exe" "dist\server.js"
C:\tools\nssm\nssm.exe set M3M_One AppDirectory "C:\apps\M3M_1.O\backend"
C:\tools\nssm\nssm.exe set M3M_One AppStdout "C:\apps\M3M_1.O\backend\logs\out.log"
C:\tools\nssm\nssm.exe set M3M_One AppStderr "C:\apps\M3M_1.O\backend\logs\err.log"
C:\tools\nssm\nssm.exe set M3M_One AppRotateFiles 1
C:\tools\nssm\nssm.exe set M3M_One Start SERVICE_AUTO_START
mkdir C:\apps\M3M_1.O\backend\logs
C:\tools\nssm\nssm.exe start M3M_One
```

Manage it from *services.msc* (service **M3M_One**) or `nssm restart M3M_One`.

### Updating to a new version

```powershell
cd C:\apps\M3M_1.O
git pull
cd frontend; npm ci; npm run build
cd ..\backend; npm ci; npm run build
C:\tools\nssm\nssm.exe restart M3M_One
```

If a release adds database changes they come as new numbered scripts in `database/` — run them in SSMS before restarting.

---

## 6. Backups

Back up **both** the database and the uploads folder. Script `database/06_backup.sql` makes a dated, verified full backup.
Run it by hand in SSMS (*Query → SQLCMD Mode*, add `:setvar BackupDir "D:\SQLBackups"` at the top, Execute), or schedule it:

Schedule it daily with **Task Scheduler** (works with SQL Express, which has no SQL Agent):

```powershell
$action  = New-ScheduledTaskAction -Execute "sqlcmd.exe" -Argument '-S localhost -E -i "C:\apps\M3M_1.O\database\06_backup.sql" -v BackupDir="D:\SQLBackups"'
$trigger = New-ScheduledTaskTrigger -Daily -At 1am
Register-ScheduledTask -TaskName "M3M_One backup" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest
```

Also copy `UPLOAD_DIR` (e.g. `D:\M3M_uploads`) with your normal file backup.

**Restore**: SSMS → *Databases* → right-click → *Restore Database…* → pick the `.bak` file; put the uploads folder back.

---

## 7. Everyday admin in SSMS

```sql
USE M3M_One;

-- who can log in
SELECT id, name, email, role, department, status, lockUntil FROM dbo.users ORDER BY name;

-- unlock a user locked after 5 wrong passwords
UPDATE dbo.users SET failedAttempts = 0, lockUntil = NULL WHERE email = N'person@m3m.com';

-- deactivate a user (they can no longer log in)
UPDATE dbo.users SET status = N'inactive' WHERE email = N'person@m3m.com';

-- latest activity
SELECT TOP 50 createdAt, creatorName, taskType, description FROM dbo.auditLogs ORDER BY createdAt DESC;

-- projects per portfolio
SELECT locationCategory, projectType, COUNT(*) AS projects FROM dbo.projects GROUP BY locationCategory, projectType;

-- edit a benchmark (key = normalised field label, see frontend/src/lib/benchmark.ts)
UPDATE dbo.benchmarks SET benchmarkValue = N'3 to 3.5' WHERE [key] = N'speed of lift';

-- add an option to a chapter field (Apartment / Common Design)
SELECT f.id, c.title AS chapter, s.title AS section, f.fieldName, f.options
FROM dbo.sectionFields f JOIN dbo.chapterSections s ON s.id = f.sectionId JOIN dbo.chapters c ON c.id = s.chapterId
WHERE f.fieldName LIKE N'%Tile%';
UPDATE dbo.sectionFields SET options = JSON_MODIFY(options, 'append $', N'Italian Marble') WHERE id = 123;
```

Users and roles are normally managed in the app (*Role and Access Control*); use SQL for the cases above.

---

## 8. Development on your PC (optional)

```powershell
cd backend;  copy .env.example .env   # point DB_* at a dev copy of the database
npm install; npm run dev              # API on http://localhost:5000 (auto-restarts on save)
cd ..\frontend
# .env.development: VITE_API_MODE=http  (or mock to work without a database)
npm install; npm run dev              # http://localhost:5173, /api is proxied to :5000
```

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `startup failed … Login failed for user 'm3m_app'` | Password in `.env` ≠ script 01; or SQL auth not enabled (step 1a.3) |
| `Failed to connect to localhost:1433` | TCP/IP disabled or dynamic port (step 1a.1); for a named instance set `DB_INSTANCE` and start the *SQL Server Browser* service |
| `The DB login cannot read column constraints` | Run in SSMS: `USE M3M_One; GRANT VIEW DEFINITION TO [m3m_app];` |
| `self-signed certificate` / TLS error | Keep `DB_TRUST_SERVER_CERTIFICATE=true` on a LAN server |
| Site opens but login says *Unauthorized* everywhere | `JWT_SECRET` changed → everyone just logs in again |
| Page loads but shows sample data / no API calls | Frontend was built in mock mode — check `frontend/.env.production` has `VITE_API_MODE=http`, rebuild |
| Uploads fail with *File is larger than 25 MB* | Raise `MAX_UPLOAD_MB` in `.env`, restart |
| Can't reach the site from other PCs | Firewall rule (section 4) and use the server IP, not `localhost` |
