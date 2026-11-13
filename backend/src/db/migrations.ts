/*
 * Data migrations the app applies itself at startup. They only add/update ROWS (no table changes), so the app's
 * own database login can run them. Each is idempotent; a failure is logged and the app starts anyway.
 * (Same steps as database/11_facade_module.sql, for servers where an admin prefers to run it by hand.)
 */
import { query } from './pool.js'

export const FACADE_MODULE = 'Façade & Envelope'

/** Façade & Envelope module: right after Service Design Consideration (residential 14, commercial 10); later modules move down one */
async function facadeModule() {
  for (const type of ['residential', 'commercial']) {
    await query(
      `IF NOT EXISTS (SELECT 1 FROM dbo.modules WHERE name = @name AND projectType = @type)
       BEGIN
         DECLARE @after INT = (SELECT TOP 1 moduleNumber FROM dbo.modules WHERE projectType = @type AND name = N'Service Design Consideration');
         IF @after IS NOT NULL
         BEGIN
           UPDATE dbo.modules SET moduleNumber = moduleNumber + 1, updatedAt = SYSUTCDATETIME() WHERE projectType = @type AND moduleNumber > @after;
           INSERT INTO dbo.modules (moduleNumber, name, projectType, description, status) VALUES (@after + 1, @name, @type, NULL, N'active');
         END
       END
       -- every existing project of this type gets its (empty) module row, as new projects do
       INSERT INTO dbo.projectModules (projectId, moduleId, allParams, deviations, benchmarkParams, flags, complianceScore, moduleStatus, completedChapters, status, data)
       SELECT p.id, m.id, 0, 0, 0, 0, 0, 0, 0, N'pending', NULL
         FROM dbo.projects p JOIN dbo.modules m ON m.name = @name AND m.projectType = @type
        WHERE p.projectType = @type AND NOT EXISTS (SELECT 1 FROM dbo.projectModules pm WHERE pm.projectId = p.id AND pm.moduleId = m.id);`,
      { name: FACADE_MODULE, type },
    )
  }
}

export async function runDataMigrations() {
  try {
    await facadeModule()
  } catch (e) {
    console.error(`[migrations] could not add the "${FACADE_MODULE}" module — run database/11_facade_module.sql`, (e as Error)?.message ?? e)
  }
}
