/* =====================================================================
   M3M_1.O  —  Field-level change history (Nov 2026)
   Who changed which value, the old value and the new value, for every save.
   Run once in SSMS. Safe to run more than once.
   (The app also tries to create this table itself; run this if its database login may not create tables.)
   ===================================================================== */
USE [M3M_1O];   -- server database name; change if yours differs (local test copy: M3M_One)
GO
IF OBJECT_ID(N'dbo.fieldChanges') IS NULL
BEGIN
    CREATE TABLE dbo.fieldChanges (
        id         BIGINT IDENTITY(1,1) PRIMARY KEY,
        projectId  INT            NULL,           -- no FK: history survives project deletion
        entity     NVARCHAR(64)   NOT NULL,       -- source table (designBriefSummaries, projects, chapterFieldValues …)
        entityId   INT            NULL,
        module     NVARCHAR(100)  NOT NULL,       -- Project Level Design, Approvals, Structure …
        path       NVARCHAR(400)  NOT NULL,       -- stable field key, e.g. projectLevelDesignData.keyRatioInputs.saleableArea
        label      NVARCHAR(600)  NOT NULL,       -- readable field name
        oldValue   NVARCHAR(MAX)  NULL,
        newValue   NVARCHAR(MAX)  NULL,
        action     NVARCHAR(10)   NOT NULL,       -- create | update | delete
        userId     INT            NULL,
        userName   NVARCHAR(200)  NULL,
        createdAt  DATETIME2      NOT NULL CONSTRAINT DF_fieldChanges_created DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_fieldChanges_project ON dbo.fieldChanges(projectId, createdAt DESC);
    CREATE INDEX IX_fieldChanges_created ON dbo.fieldChanges(createdAt DESC);
END
GO
-- the app's login needs to read and add rows (change the login name if yours differs)
GRANT SELECT, INSERT ON dbo.fieldChanges TO [m3m_app];
GO
SELECT COUNT(*) AS changesRecorded FROM dbo.fieldChanges;
