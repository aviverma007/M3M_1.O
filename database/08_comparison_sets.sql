/* =====================================================================
   M3M_1.O  —  Saved comparison sets (Module 21 "Comparison", Nov 2026)
   Run once in SSMS. Safe to run more than once.
   (The app also tries to create this table itself; run this if its database login may not create tables.)
   ===================================================================== */
USE [M3M_1O];   -- server database name; change if yours differs (local test copy: M3M_One)
GO
IF OBJECT_ID(N'dbo.comparisonSets') IS NULL
CREATE TABLE dbo.comparisonSets (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    name         NVARCHAR(200) NOT NULL,
    projectIds   NVARCHAR(MAX) NOT NULL CONSTRAINT CK_comparisonSets_ids CHECK (ISJSON(projectIds) = 1),  -- [12, 15, 31]
    createdBy    INT           NULL,
    creatorName  NVARCHAR(200) NULL,
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_comparisonSets_created DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2     NOT NULL CONSTRAINT DF_comparisonSets_updated DEFAULT SYSUTCDATETIME()
);
GO
SELECT name, projectIds, creatorName FROM dbo.comparisonSets;
