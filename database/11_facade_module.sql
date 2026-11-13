/* =====================================================================
   M3M_1.O  —  New module "Façade & Envelope" (Nov 2026)
   Residential: Module 14 (after Service Design Consideration); Commercial: Module 10.
   Later modules move down one (Contracting Strategy 14 -> 15, …).
   The app does this itself at startup; run this only if the backend log says it could not.
   Safe to run more than once.
   ===================================================================== */
USE [M3M_1O];   -- server database name; change if yours differs (local test copy: M3M_One)
GO
DECLARE @name NVARCHAR(200) = N'Façade & Envelope';
DECLARE @type NVARCHAR(30);
DECLARE types CURSOR LOCAL FAST_FORWARD FOR SELECT v FROM (VALUES (N'residential'), (N'commercial')) t(v);
OPEN types;
FETCH NEXT FROM types INTO @type;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.modules WHERE name = @name AND projectType = @type)
    BEGIN
        DECLARE @after INT = (SELECT TOP 1 moduleNumber FROM dbo.modules WHERE projectType = @type AND name = N'Service Design Consideration');
        IF @after IS NOT NULL
        BEGIN
            UPDATE dbo.modules SET moduleNumber = moduleNumber + 1, updatedAt = SYSUTCDATETIME() WHERE projectType = @type AND moduleNumber > @after;
            INSERT INTO dbo.modules (moduleNumber, name, projectType, description, status) VALUES (@after + 1, @name, @type, NULL, N'active');
        END
    END
    INSERT INTO dbo.projectModules (projectId, moduleId, allParams, deviations, benchmarkParams, flags, complianceScore, moduleStatus, completedChapters, status, data)
    SELECT p.id, m.id, 0, 0, 0, 0, 0, 0, 0, N'pending', NULL
      FROM dbo.projects p JOIN dbo.modules m ON m.name = @name AND m.projectType = @type
     WHERE p.projectType = @type AND NOT EXISTS (SELECT 1 FROM dbo.projectModules pm WHERE pm.projectId = p.id AND pm.moduleId = m.id);
    FETCH NEXT FROM types INTO @type;
END
CLOSE types; DEALLOCATE types;
GO
SELECT projectType, moduleNumber, name FROM dbo.modules ORDER BY projectType DESC, moduleNumber;
