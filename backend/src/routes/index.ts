/*
 * Loads every route module so it registers its endpoints.
 * A module that fails to load is logged and skipped, so one broken area can't take down the whole API.
 */
const modules: Record<string, () => Promise<unknown>> = {
  auth: () => import('./auth.js'),
  metadata: () => import('./metadata.js'),
  files: () => import('./files.js'),
  admin: () => import('./admin.js'),
  projects: () => import('./projects.js'),
  'design-brief': () => import('./design-brief.js'),
  'module-workspace': () => import('./module-workspace.js'),
  'keyratio-compare': () => import('./keyratio-compare.js'),
}

export async function loadRoutes() {
  const failed: string[] = []
  for (const [name, load] of Object.entries(modules)) {
    try {
      await load()
    } catch (e) {
      failed.push(name)
      console.error(`[routes] failed to load "${name}" — its endpoints are disabled:`, e)
    }
  }
  return failed
}
