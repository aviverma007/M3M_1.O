# API contract (for the SQL Server backend)

The frontend calls these endpoints exactly as the original app did. They are implemented in
`backend/src/routes/<area>.ts` (SQL Server) and mirrored by the in-browser mock in `frontend/src/mock/handlers/<file>.ts`.

Base URL: `VITE_API_BASE_URL` (default `/api/v1`). Auth: `Authorization: Bearer <accessToken>`.
Envelope: `{ "success": true, "message": "...", "data": ... }`; errors: `{ "success": false, "message", "errorCode", "statusCode" }`.
`401` logs the user out. Login lockout returns `errorCode: "LOCKED"` with `data.lockUntil`.

## Auth & users — `auth.ts`, `admin.ts`
| Method | Path | Notes |
|---|---|---|
| POST | /auth/login | `{email,password}` → `{accessToken (JWT with exp), user, role}`; 5 failures → 423 LOCKED |
| GET | /auth/me | current user |
| POST | /auth/logout | |
| POST | /auth/forgot-password | `{email}` → emails reset link `/reset-password?token=` |
| POST | /auth/reset-password | `{token,password}` |
| GET | /auth/users | all users (assignee pickers, Users tab); `?assigneesFor=<dept>` filters |
| POST / PUT / DELETE | /auth/users[/:id] | user admin (Roles page) |
| GET/POST/PUT/DELETE | /roles[/:id] | roles + module access (`<company>:<department>` roles hold module access levels) |
| GET / PUT | /notifications, /notifications/:id/read, /notifications/mark-all-read | `?limit` |
| GET | /audit-logs | `page, limit, search, type, fromDate, toDate` → `{logs[{…, Creator{name}}], totalLogs, totalPages, currentPage}` |
| GET | /audit-logs/export | CSV (`text/csv`) with the same filters |

## Projects & modules — `project.ts`, `projects-extra.ts`
| Method | Path | Notes |
|---|---|---|
| GET | /project | `search, projectType, projectCategory, fromDate, toDate, page, limit, locationCategory, lc, fields` → `{count,totalPages,currentPage,rows}` |
| GET / POST / PUT / DELETE | /project[/:id] | project record (see `types/index.ts` `Project`) |
| GET | /project/:id/module | `?projectType` → modules with `projectModule` progress (`allParams, deviations, benchmarkParams, flags, complianceScore, moduleStatus, completedChapters, status, moApprovedDocUrl`), `moduleChapters`, `firstChapterId` |
| GET | /module/:id | module |
| PUT | /project/:id/save-project-module | |
| GET | /project/:id/export, /project/:id/exportCommercial | `format, allParams, flags, deviations, benchmark` |
| POST | /project/:id/import | multipart |
| POST | /project/:id/export-dpr-pdf | `{selectedModules[]}` → PDF |
| GET | /project/contributor/tasks | contributor "My Tasks" (by user department) |

## Chapters (Modules 2–3, commercial design) — `module-workspace.ts`
| Method | Path | Notes |
|---|---|---|
| GET | /project/:p/module/:m/chapter | `?chapterId` → chapters → `chapterSections` → `sectionFields` (benchmark answers per category `midEndAns/premiumAns/affluentAns/hiStreetAns/enclosedMallAns`, options, saved `fieldValue`), per-project chapter `status`, `isLastChapter` |
| PUT | /project/:p/module/:m/chapter/:c | save + complete chapter, recompute module progress |
| PUT | /project/:p/module/:m/chapter/saveAndDraft/:c | save without completing |
| POST | /project/:p/module/:m/import | CSV. Chapters: `Chapter,Section,Field,Answer[,Remark]`; Key Ratio: `Parameter,Value` |
| POST | /module/sample/:id | sample CSV template |

## Key ratio & compare — `keyratio-compare.ts`
| Method | Path | Notes |
|---|---|---|
| GET | /keyRatio | `?project_id` → `keyRatioFields, keyCalFields (Design/Structure/MEP sections), projectOwners, calculatedFields` |
| POST / PUT | /keyRatio, /keyRatio/?project_id | save; server recomputes ratios/deviations (logic in `components/keyratio/calc.ts`) |
| POST | /keyRatio/saveAsDraft | |
| GET / POST / PUT | /commercial/create-key-ratio | commercial key ratio (`?project_id`) |
| POST / PUT | /commercial/save-as-draft | |
| POST | /compare/get-projects | `{currentProjectId, compareProjectIds[], moduleId, chapterId}` → `comparedProjects`, `navigation{prevModule,nextModule}`; 400 "Failed to compare incomplete projects" |

## Design brief (Module 4) — `design-brief.ts`
| Method | Path | Notes |
|---|---|---|
| GET | /project/:id/design-brief | all department records for the landing page |
| GET / POST | /project/:id/design-brief-summary | per-project summary record (also stores the design-chapter page data, each page under its own key); JSON or multipart (`inHouseDoc`, `moApprovedDoc`) |
| DELETE | /project/:id/design-brief-summary/document | `{docType: inHouseDocUrl | moApprovedDocUrl}` |
| GET | /project/:id/design-brief/download | `?type=mo` → PDF |
| GET | /project/:id/design-brief/:dept/download | PDF |
| GET / POST | /design-brief-comment | `?projectId&department` |
| GET / GET :id / POST / PATCH :id | /liaison, /business-development, /land, /structure, /mep, /anarock | department inputs (`?projectId`), assignment (`assignedTo, deadline, instructions`), submit/approve/reject |
| GET | /<dept>/:id/download-design-brief-inputs | PDF |
| POST | /upload | multipart file → `{ s3Url }` |

## Reference data — `metadata.ts`
| Method | Path | Notes |
|---|---|---|
| GET | /benchmark | map `normalizedFieldLabel → {benchmarkValue, validOptions[]}` (normalisation: `lib/benchmark.ts normalizeKey`) |
| GET | /metadata/dropdown-options/:fieldKey | user-added dropdown options |
| POST / DELETE | /metadata/dropdown-options[/:id] | `{fieldKey, optionValue}` |

## SQL Server tables (database/02_schema.sql)
`users, passwordResets, accessRoles, notifications, auditLogs, projects, modules, projectModules, chapters, chapterSections,
sectionFields, projectChapters, chapterFieldValues, benchmarks, dropdownOptions, keyRatioCalFields, keyRatios,
comKeyRatioInputs, comKeyRatioOutputs, comKeyRatios, designBriefInputs (all departments), designBriefSummaries,
designBriefComments, contributorTasks, uploads`

Keep this database separate from all other databases.
