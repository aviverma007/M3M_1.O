/**
 * Module-specific CSV importers for POST /project/:p/module/:m/import, keyed by module name.
 * module-workspace.ts handles chapter modules itself; other modules (e.g. Key Ratio) register here.
 */
import type { AuthUser } from '../../http/auth.js'

export type ModuleImporter = (args: { projectId: number; moduleId: number; text: string; user: AuthUser | null }) => Promise<unknown>
export const moduleImporters = new Map<string, ModuleImporter>()
