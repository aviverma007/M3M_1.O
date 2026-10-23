/**
 * Mock endpoints for the "chapters-a" design-chapter pages.
 *
 * Every endpoint these pages call is already served by another handler file and is reused as-is,
 * so this file registers nothing (kept as the documented index for the group):
 *   GET/POST /project/:id/design-brief-summary, POST /upload,
 *   GET/POST/PATCH /structure, /mep, GET /mep/:id/download-design-brief-inputs   -> handlers/design-brief.ts
 *   GET/PUT /project/:id, GET /project?limit=1000&fields=id,name,location         -> handlers/project.ts
 *   GET /project/:projectId/module/:moduleId/chapter[?chapterId]                   -> handlers/module-workspace.ts
 *       (catalogue for modules 2/3 is seeded by seed/chapters-a-catalogue.ts; ID Specifications and
 *        Common Area read chapterSections -> sectionFields with midEndAns/premiumAns/affluentAns and
 *        sectionFieldOptions[{ fieldOption }])
 *   GET /keyRatio?project_id   (MEP average-waiting-time prefill; optional — the page ignores a failure)
 *   GET /auth/users?assigneesFor=mep                                              -> handlers/auth.ts
 */
export {}
