/* =====================================================================
   M3M_1.O  —  Step 2: tables
   Run in SSMS against the M3M_One database (after 01_create_database.sql).
   Safe to re-run: it only creates tables that don't exist yet.

   Conventions
   - Table/column names match the API field names the frontend uses (camelCase, a few snake_case
     key-ratio columns), so the backend maps rows 1:1 to JSON.
   - Columns ending in JSON hold JSON text (NVARCHAR(MAX) + ISJSON check) for flexible form data.
   - Dates entered by users (deadline, receivedDate, date, ...) are stored as text exactly as the
     app sends them (yyyy-mm-dd or ISO). createdAt / updatedAt are DATETIME2 (UTC).
   ===================================================================== */
USE [M3M_One];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------------------------------------------------------------- users & access */
IF OBJECT_ID(N'dbo.users') IS NULL
CREATE TABLE dbo.users (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200)  NOT NULL,
    email           NVARCHAR(256)  NOT NULL CONSTRAINT UQ_users_email UNIQUE,
    phone           NVARCHAR(30)   NULL,
    role            NVARCHAR(50)   NOT NULL,          -- super_admin | design_admin | general_admin | design_contributor | general_contributor
    department      NVARCHAR(100)  NULL,
    company         NVARCHAR(100)  NULL,
    status          NVARCHAR(20)   NOT NULL CONSTRAINT DF_users_status DEFAULT N'active',
    passwordHash    NVARCHAR(200)  NOT NULL,          -- bcrypt
    failedAttempts  INT            NOT NULL CONSTRAINT DF_users_failed DEFAULT 0,
    lockUntil       DATETIME2      NULL,
    createdAt       DATETIME2      NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    updatedAt       DATETIME2      NOT NULL CONSTRAINT DF_users_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.passwordResets') IS NULL
CREATE TABLE dbo.passwordResets (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    userId      INT           NOT NULL CONSTRAINT FK_pwreset_user REFERENCES dbo.users(id) ON DELETE CASCADE,
    token       NVARCHAR(100) NOT NULL CONSTRAINT UQ_pwreset_token UNIQUE,
    expiresAt   DATETIME2     NOT NULL,
    usedAt      DATETIME2     NULL,
    createdAt   DATETIME2     NOT NULL CONSTRAINT DF_pwreset_created DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2     NOT NULL CONSTRAINT DF_pwreset_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.accessRoles') IS NULL
CREATE TABLE dbo.accessRoles (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    roleName     NVARCHAR(200) NOT NULL CONSTRAINT UQ_accessRoles_name UNIQUE,   -- e.g. 'PMO ACCESS' or '<company>:<department>' for module access
    description  NVARCHAR(500) NULL,
    permissions  NVARCHAR(MAX) NOT NULL CONSTRAINT DF_accessRoles_perm DEFAULT N'[]' CONSTRAINT CK_accessRoles_perm CHECK (ISJSON(permissions) = 1),
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_accessRoles_created DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2     NOT NULL CONSTRAINT DF_accessRoles_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.notifications') IS NULL
CREATE TABLE dbo.notifications (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    userId     INT            NOT NULL CONSTRAINT FK_notifications_user REFERENCES dbo.users(id) ON DELETE CASCADE,
    type       NVARCHAR(100)  NOT NULL,
    message    NVARCHAR(1000) NOT NULL,
    isRead     BIT            NOT NULL CONSTRAINT DF_notifications_read DEFAULT 0,
    metadata   NVARCHAR(MAX)  NULL CONSTRAINT CK_notifications_meta CHECK (metadata IS NULL OR ISJSON(metadata) = 1),
    createdAt  DATETIME2      NOT NULL CONSTRAINT DF_notifications_created DEFAULT SYSUTCDATETIME(),
    updatedAt  DATETIME2      NOT NULL CONSTRAINT DF_notifications_updated DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_notifications_user') CREATE INDEX IX_notifications_user ON dbo.notifications(userId, createdAt DESC);
GO

IF OBJECT_ID(N'dbo.auditLogs') IS NULL
CREATE TABLE dbo.auditLogs (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    userId       INT            NULL,           -- no FK: logs survive user deletion
    projectId    INT            NULL,
    taskType     NVARCHAR(100)  NOT NULL,
    description  NVARCHAR(2000) NOT NULL,
    creatorName  NVARCHAR(200)  NULL,
    createdAt    DATETIME2      NOT NULL CONSTRAINT DF_auditLogs_created DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2      NOT NULL CONSTRAINT DF_auditLogs_updated DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_auditLogs_created') CREATE INDEX IX_auditLogs_created ON dbo.auditLogs(createdAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_auditLogs_type') CREATE INDEX IX_auditLogs_type ON dbo.auditLogs(taskType);
GO

/* ---------------------------------------------------------------- projects & modules */
IF OBJECT_ID(N'dbo.projects') IS NULL
CREATE TABLE dbo.projects (
    id                     INT IDENTITY(1,1) PRIMARY KEY,
    name                   NVARCHAR(300) NOT NULL,
    description            NVARCHAR(MAX) NULL,
    projectType            NVARCHAR(30)  NOT NULL,      -- residential | commercial | mixed
    category               NVARCHAR(30)  NULL,          -- mid-end | premium | affluent | hi_street | enclosed_mall
    status                 NVARCHAR(30)  NOT NULL CONSTRAINT DF_projects_status DEFAULT N'pending',
    projectOwner           NVARCHAR(300) NULL,
    location               NVARCHAR(500) NULL,
    userId                 INT           NULL,
    userName               NVARCHAR(200) NULL,
    userEmail              NVARCHAR(256) NULL,
    userNumber             NVARCHAR(30)  NULL,
    date                   NVARCHAR(40)  NULL,
    userDesignation        NVARCHAR(200) NULL,
    projectClassification  NVARCHAR(100) NULL,
    designOwner            NVARCHAR(300) NULL,
    structureOwner         NVARCHAR(300) NULL,
    mepOwner               NVARCHAR(300) NULL,
    interiorDesignOwner    NVARCHAR(300) NULL,
    far_permissible        NVARCHAR(50)  NULL,
    site_area              NVARCHAR(50)  NULL,
    site_area_acres        NVARCHAR(50)  NULL,
    locationCategory       NVARCHAR(50)  NULL,          -- M3M Noida | M3M Gurgaon | Smartworld
    createdAt              DATETIME2     NOT NULL CONSTRAINT DF_projects_created DEFAULT SYSUTCDATETIME(),
    updatedAt              DATETIME2     NOT NULL CONSTRAINT DF_projects_updated DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_projects_lc') CREATE INDEX IX_projects_lc ON dbo.projects(locationCategory, projectType);
GO

IF OBJECT_ID(N'dbo.modules') IS NULL
CREATE TABLE dbo.modules (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    moduleNumber  INT           NOT NULL,
    name          NVARCHAR(200) NOT NULL,
    projectType   NVARCHAR(30)  NOT NULL,
    description   NVARCHAR(MAX) NULL,
    status        NVARCHAR(30)  NOT NULL CONSTRAINT DF_modules_status DEFAULT N'active',
    createdAt     DATETIME2     NOT NULL CONSTRAINT DF_modules_created DEFAULT SYSUTCDATETIME(),
    updatedAt     DATETIME2     NOT NULL CONSTRAINT DF_modules_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.projectModules') IS NULL
CREATE TABLE dbo.projectModules (
    id                 INT IDENTITY(1,1) PRIMARY KEY,
    projectId          INT          NOT NULL CONSTRAINT FK_projectModules_project REFERENCES dbo.projects(id) ON DELETE CASCADE,
    moduleId           INT          NOT NULL CONSTRAINT FK_projectModules_module REFERENCES dbo.modules(id),
    allParams          INT          NOT NULL CONSTRAINT DF_pm_all DEFAULT 0,
    deviations         INT          NOT NULL CONSTRAINT DF_pm_dev DEFAULT 0,
    benchmarkParams    INT          NOT NULL CONSTRAINT DF_pm_bench DEFAULT 0,
    flags              INT          NOT NULL CONSTRAINT DF_pm_flags DEFAULT 0,
    complianceScore    INT          NOT NULL CONSTRAINT DF_pm_score DEFAULT 0,
    moduleStatus       INT          NOT NULL CONSTRAINT DF_pm_mstatus DEFAULT 0,
    completedChapters  INT          NOT NULL CONSTRAINT DF_pm_done DEFAULT 0,
    status             NVARCHAR(30) NOT NULL CONSTRAINT DF_pm_status DEFAULT N'pending',
    data               NVARCHAR(MAX) NULL CONSTRAINT CK_pm_data CHECK (data IS NULL OR ISJSON(data) = 1),
    createdAt          DATETIME2    NOT NULL CONSTRAINT DF_pm_created DEFAULT SYSUTCDATETIME(),
    updatedAt          DATETIME2    NOT NULL CONSTRAINT DF_pm_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_projectModules UNIQUE (projectId, moduleId)
);
GO

/* ---------------------------------------------------------------- chapter catalogue (Modules 2-3, commercial design) */
IF OBJECT_ID(N'dbo.chapters') IS NULL
CREATE TABLE dbo.chapters (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    moduleId       INT           NOT NULL CONSTRAINT FK_chapters_module REFERENCES dbo.modules(id),
    chapterNumber  INT           NOT NULL,
    title          NVARCHAR(300) NOT NULL,
    status         NVARCHAR(30)  NOT NULL CONSTRAINT DF_chapters_status DEFAULT N'active',
    createdAt      DATETIME2     NOT NULL CONSTRAINT DF_chapters_created DEFAULT SYSUTCDATETIME(),
    updatedAt      DATETIME2     NOT NULL CONSTRAINT DF_chapters_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.chapterSections') IS NULL
CREATE TABLE dbo.chapterSections (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    chapterId  INT           NOT NULL CONSTRAINT FK_sections_chapter REFERENCES dbo.chapters(id),
    title      NVARCHAR(300) NOT NULL,
    [order]    INT           NOT NULL CONSTRAINT DF_sections_order DEFAULT 0,
    createdAt  DATETIME2     NOT NULL CONSTRAINT DF_sections_created DEFAULT SYSUTCDATETIME(),
    updatedAt  DATETIME2     NOT NULL CONSTRAINT DF_sections_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.sectionFields') IS NULL
CREATE TABLE dbo.sectionFields (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    sectionId        INT           NOT NULL CONSTRAINT FK_fields_section REFERENCES dbo.chapterSections(id),
    chapterId        INT           NOT NULL,
    fieldName        NVARCHAR(500) NOT NULL,
    fieldType        NVARCHAR(30)  NOT NULL,             -- select | multiselect | text
    [order]          INT           NOT NULL CONSTRAINT DF_fields_order DEFAULT 0,
    midEndAns        NVARCHAR(MAX) NULL CONSTRAINT CK_fields_mid  CHECK (midEndAns IS NULL OR ISJSON(midEndAns) = 1),
    premiumAns       NVARCHAR(MAX) NULL CONSTRAINT CK_fields_prem CHECK (premiumAns IS NULL OR ISJSON(premiumAns) = 1),
    affluentAns      NVARCHAR(MAX) NULL CONSTRAINT CK_fields_aff  CHECK (affluentAns IS NULL OR ISJSON(affluentAns) = 1),
    hiStreetAns      NVARCHAR(MAX) NULL CONSTRAINT CK_fields_hs   CHECK (hiStreetAns IS NULL OR ISJSON(hiStreetAns) = 1),
    enclosedMallAns  NVARCHAR(MAX) NULL CONSTRAINT CK_fields_em   CHECK (enclosedMallAns IS NULL OR ISJSON(enclosedMallAns) = 1),
    options          NVARCHAR(MAX) NULL CONSTRAINT CK_fields_opt  CHECK (options IS NULL OR ISJSON(options) = 1),
    createdAt        DATETIME2     NOT NULL CONSTRAINT DF_fields_created DEFAULT SYSUTCDATETIME(),
    updatedAt        DATETIME2     NOT NULL CONSTRAINT DF_fields_updated DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_sectionFields_section') CREATE INDEX IX_sectionFields_section ON dbo.sectionFields(sectionId);
GO

IF OBJECT_ID(N'dbo.projectChapters') IS NULL
CREATE TABLE dbo.projectChapters (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    projectId  INT          NOT NULL CONSTRAINT FK_projectChapters_project REFERENCES dbo.projects(id) ON DELETE CASCADE,
    moduleId   INT          NOT NULL,
    chapterId  INT          NOT NULL,
    status     NVARCHAR(30) NOT NULL,
    createdAt  DATETIME2    NOT NULL CONSTRAINT DF_pc_created DEFAULT SYSUTCDATETIME(),
    updatedAt  DATETIME2    NOT NULL CONSTRAINT DF_pc_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_projectChapters UNIQUE (projectId, chapterId)
);
GO

IF OBJECT_ID(N'dbo.chapterFieldValues') IS NULL
CREATE TABLE dbo.chapterFieldValues (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    projectId       INT           NOT NULL CONSTRAINT FK_cfv_project REFERENCES dbo.projects(id) ON DELETE CASCADE,
    moduleId        INT           NOT NULL,
    chapterId       INT           NOT NULL,
    sectionId       INT           NOT NULL,
    sectionFieldId  INT           NOT NULL,
    answer          NVARCHAR(MAX) NULL CONSTRAINT CK_cfv_answer CHECK (answer IS NULL OR ISJSON(answer) = 1),  -- {answer, remark, isFlaged, anyOtherAnswer, benchmarkAnswer}
    createdAt       DATETIME2     NOT NULL CONSTRAINT DF_cfv_created DEFAULT SYSUTCDATETIME(),
    updatedAt       DATETIME2     NOT NULL CONSTRAINT DF_cfv_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_chapterFieldValues UNIQUE (projectId, sectionFieldId)
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_cfv_project_module') CREATE INDEX IX_cfv_project_module ON dbo.chapterFieldValues(projectId, moduleId, chapterId);
GO

/* ---------------------------------------------------------------- reference data */
IF OBJECT_ID(N'dbo.benchmarks') IS NULL
CREATE TABLE dbo.benchmarks (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    [key]           NVARCHAR(500) NOT NULL CONSTRAINT UQ_benchmarks_key UNIQUE,   -- normalised field label (see frontend lib/benchmark.ts normalizeKey)
    benchmarkValue  NVARCHAR(500) NULL,
    validOptions    NVARCHAR(MAX) NULL CONSTRAINT CK_benchmarks_opts CHECK (validOptions IS NULL OR ISJSON(validOptions) = 1),
    createdAt       DATETIME2     NOT NULL CONSTRAINT DF_benchmarks_created DEFAULT SYSUTCDATETIME(),
    updatedAt       DATETIME2     NOT NULL CONSTRAINT DF_benchmarks_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.dropdownOptions') IS NULL
CREATE TABLE dbo.dropdownOptions (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    fieldKey     NVARCHAR(200) NOT NULL,
    optionValue  NVARCHAR(500) NOT NULL,
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_ddo_created DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2     NOT NULL CONSTRAINT DF_ddo_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_dropdownOptions UNIQUE (fieldKey, optionValue)
);
GO

/* ---------------------------------------------------------------- key ratio (Module 1) */
IF OBJECT_ID(N'dbo.keyRatioCalFields') IS NULL
CREATE TABLE dbo.keyRatioCalFields (
    id                 INT IDENTITY(1,1) PRIMARY KEY,
    field_name         NVARCHAR(300) NOT NULL,
    tab                NVARCHAR(100) NULL,
    section            NVARCHAR(200) NULL,
    section_id         INT           NULL,
    order_id           INT           NULL,
    rupee_value        DECIMAL(18,2) NULL,
    dependecy_fields   NVARCHAR(MAX) NULL CONSTRAINT CK_krcf_dep1 CHECK (dependecy_fields IS NULL OR ISJSON(dependecy_fields) = 1),
    dependency_fields  NVARCHAR(MAX) NULL CONSTRAINT CK_krcf_dep2 CHECK (dependency_fields IS NULL OR ISJSON(dependency_fields) = 1),
    mid_end            NVARCHAR(100) NULL,
    premium            NVARCHAR(100) NULL,
    affluent           NVARCHAR(100) NULL,
    mid_end_range      NVARCHAR(100) NULL,
    premium_range      NVARCHAR(100) NULL,
    affluent_range     NVARCHAR(100) NULL,
    createdAt          DATETIME2     NOT NULL CONSTRAINT DF_krcf_created DEFAULT SYSUTCDATETIME(),
    updatedAt          DATETIME2     NOT NULL CONSTRAINT DF_krcf_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.keyRatios') IS NULL
CREATE TABLE dbo.keyRatios (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    projectId     INT           NOT NULL CONSTRAINT FK_keyRatios_project REFERENCES dbo.projects(id) ON DELETE CASCADE CONSTRAINT UQ_keyRatios_project UNIQUE,
    moduleId      INT           NOT NULL,
    fields        NVARCHAR(MAX) NULL CONSTRAINT CK_kr_fields CHECK (fields IS NULL OR ISJSON(fields) = 1),
    outputs       NVARCHAR(MAX) NULL CONSTRAINT CK_kr_outputs CHECK (outputs IS NULL OR ISJSON(outputs) = 1),
    sectionCosts  NVARCHAR(MAX) NULL CONSTRAINT CK_kr_costs CHECK (sectionCosts IS NULL OR ISJSON(sectionCosts) = 1),
    isDraft       BIT           NOT NULL CONSTRAINT DF_kr_draft DEFAULT 0,
    createdAt     DATETIME2     NOT NULL CONSTRAINT DF_kr_created DEFAULT SYSUTCDATETIME(),
    updatedAt     DATETIME2     NOT NULL CONSTRAINT DF_kr_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.comKeyRatioInputs') IS NULL
CREATE TABLE dbo.comKeyRatioInputs (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    field_name  NVARCHAR(300) NOT NULL,
    units       NVARCHAR(50)  NULL,
    tab         NVARCHAR(100) NULL,
    section     NVARCHAR(200) NULL,
    is_visible  BIT           NOT NULL CONSTRAINT DF_cki_visible DEFAULT 1,
    [order]     INT           NOT NULL CONSTRAINT DF_cki_order DEFAULT 0,
    createdAt   DATETIME2     NOT NULL CONSTRAINT DF_cki_created DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2     NOT NULL CONSTRAINT DF_cki_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.comKeyRatioOutputs') IS NULL
CREATE TABLE dbo.comKeyRatioOutputs (
    id                   INT IDENTITY(1,1) PRIMARY KEY,
    field_name           NVARCHAR(300) NOT NULL,
    units                NVARCHAR(50)  NULL,
    tab                  NVARCHAR(100) NULL,
    section              NVARCHAR(200) NULL,
    dependency           NVARCHAR(MAX) NULL CONSTRAINT CK_cko_dep CHECK (dependency IS NULL OR ISJSON(dependency) = 1),
    is_visible           BIT           NOT NULL CONSTRAINT DF_cko_visible DEFAULT 1,
    [order]              INT           NOT NULL CONSTRAINT DF_cko_order DEFAULT 0,
    hi_street            NVARCHAR(100) NULL,
    high_street          NVARCHAR(100) NULL,
    enclosed_mall        NVARCHAR(100) NULL,
    mid_end              NVARCHAR(100) NULL,
    premium              NVARCHAR(100) NULL,
    affluent             NVARCHAR(100) NULL,
    hi_street_range      NVARCHAR(100) NULL,
    high_street_range    NVARCHAR(100) NULL,
    enclosed_mall_range  NVARCHAR(100) NULL,
    createdAt            DATETIME2     NOT NULL CONSTRAINT DF_cko_created DEFAULT SYSUTCDATETIME(),
    updatedAt            DATETIME2     NOT NULL CONSTRAINT DF_cko_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.comKeyRatios') IS NULL
CREATE TABLE dbo.comKeyRatios (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    projectId    INT           NOT NULL CONSTRAINT FK_comKeyRatios_project REFERENCES dbo.projects(id) ON DELETE CASCADE CONSTRAINT UQ_comKeyRatios_project UNIQUE,
    moduleId     INT           NOT NULL,
    inputs       NVARCHAR(MAX) NULL CONSTRAINT CK_ckr_inputs CHECK (inputs IS NULL OR ISJSON(inputs) = 1),
    outputs      NVARCHAR(MAX) NULL CONSTRAINT CK_ckr_outputs CHECK (outputs IS NULL OR ISJSON(outputs) = 1),
    sectionCost  NVARCHAR(MAX) NULL CONSTRAINT CK_ckr_cost CHECK (sectionCost IS NULL OR ISJSON(sectionCost) = 1),
    isDraft      BIT           NOT NULL CONSTRAINT DF_ckr_draft DEFAULT 0,
    createdAt    DATETIME2     NOT NULL CONSTRAINT DF_ckr_created DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2     NOT NULL CONSTRAINT DF_ckr_updated DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------- design brief (Module 4) & design chapters */
IF OBJECT_ID(N'dbo.designBriefInputs') IS NULL
CREATE TABLE dbo.designBriefInputs (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    projectId        INT           NOT NULL CONSTRAINT FK_dbi_project REFERENCES dbo.projects(id) ON DELETE CASCADE,
    department       NVARCHAR(50)  NOT NULL,     -- liaison | business-development | land | structure | mep | anarock
    assignedTo       INT           NULL,
    deadline         NVARCHAR(40)  NULL,
    receivedDate     NVARCHAR(40)  NULL,
    status           NVARCHAR(50)  NULL,
    instructions     NVARCHAR(MAX) NULL,
    revisionReasons  NVARCHAR(MAX) NULL,
    createdBy        INT           NULL,
    customFields     NVARCHAR(MAX) NULL CONSTRAINT CK_dbi_custom CHECK (customFields IS NULL OR ISJSON(customFields) = 1),
    fields           NVARCHAR(MAX) NULL CONSTRAINT CK_dbi_fields CHECK (fields IS NULL OR ISJSON(fields) = 1),  -- department inputs (value + Note per item)
    createdAt        DATETIME2     NOT NULL CONSTRAINT DF_dbi_created DEFAULT SYSUTCDATETIME(),
    updatedAt        DATETIME2     NOT NULL CONSTRAINT DF_dbi_updated DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dbi_project_dept') CREATE INDEX IX_dbi_project_dept ON dbo.designBriefInputs(projectId, department);
GO

IF OBJECT_ID(N'dbo.designBriefSummaries') IS NULL
CREATE TABLE dbo.designBriefSummaries (
    id                            INT IDENTITY(1,1) PRIMARY KEY,
    projectId                     INT           NOT NULL CONSTRAINT FK_dbs_project REFERENCES dbo.projects(id) ON DELETE CASCADE CONSTRAINT UQ_dbs_project UNIQUE,
    remarks                       NVARCHAR(MAX) NULL,
    sentToDesignTeam              BIT           NOT NULL CONSTRAINT DF_dbs_sent DEFAULT 0,
    sentAt                        DATETIME2     NULL,
    inHouseDocUrl                 NVARCHAR(1000) NULL,
    moApprovedDocUrl              NVARCHAR(1000) NULL,
    projectDetailsLayoutData      NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_1  CHECK (projectDetailsLayoutData IS NULL OR ISJSON(projectDetailsLayoutData) = 1),
    projectLevelDesignData        NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_2  CHECK (projectLevelDesignData IS NULL OR ISJSON(projectLevelDesignData) = 1),
    unitLevelDesignData           NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_3  CHECK (unitLevelDesignData IS NULL OR ISJSON(unitLevelDesignData) = 1),
    idSpecificationsData          NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_4  CHECK (idSpecificationsData IS NULL OR ISJSON(idSpecificationsData) = 1),
    commonAreaData                NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_5  CHECK (commonAreaData IS NULL OR ISJSON(commonAreaData) = 1),
    landscapeAmenitiesData        NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_6  CHECK (landscapeAmenitiesData IS NULL OR ISJSON(landscapeAmenitiesData) = 1),
    serviceDesignData             NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_7  CHECK (serviceDesignData IS NULL OR ISJSON(serviceDesignData) = 1),
    contractingStrategyData       NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_8  CHECK (contractingStrategyData IS NULL OR ISJSON(contractingStrategyData) = 1),
    consultantStrategyData        NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_9  CHECK (consultantStrategyData IS NULL OR ISJSON(consultantStrategyData) = 1),
    phasingPlanData               NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_10 CHECK (phasingPlanData IS NULL OR ISJSON(phasingPlanData) = 1),
    projectScheduleData           NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_11 CHECK (projectScheduleData IS NULL OR ISJSON(projectScheduleData) = 1),
    approvalsData                 NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_12 CHECK (approvalsData IS NULL OR ISJSON(approvalsData) = 1),
    additionalProjectDetailsData  NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_13 CHECK (additionalProjectDetailsData IS NULL OR ISJSON(additionalProjectDetailsData) = 1),
    extra                         NVARCHAR(MAX) NULL CONSTRAINT CK_dbs_extra CHECK (extra IS NULL OR ISJSON(extra) = 1),     -- any other page keys
    createdAt                     DATETIME2     NOT NULL CONSTRAINT DF_dbs_created DEFAULT SYSUTCDATETIME(),
    updatedAt                     DATETIME2     NOT NULL CONSTRAINT DF_dbs_updated DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.designBriefComments') IS NULL
CREATE TABLE dbo.designBriefComments (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    projectId   INT           NOT NULL CONSTRAINT FK_dbc_project REFERENCES dbo.projects(id) ON DELETE CASCADE,
    department  NVARCHAR(50)  NULL,
    comment     NVARCHAR(MAX) NOT NULL,
    status      NVARCHAR(50)  NULL,
    createdBy   INT           NULL,
    createdAt   DATETIME2     NOT NULL CONSTRAINT DF_dbc_created DEFAULT SYSUTCDATETIME(),
    updatedAt   DATETIME2     NOT NULL CONSTRAINT DF_dbc_updated DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_dbc_project') CREATE INDEX IX_dbc_project ON dbo.designBriefComments(projectId, department);
GO

IF OBJECT_ID(N'dbo.contributorTasks') IS NULL
CREATE TABLE dbo.contributorTasks (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    projectId      INT           NOT NULL CONSTRAINT FK_ct_project REFERENCES dbo.projects(id) ON DELETE CASCADE,
    department     NVARCHAR(100) NULL,
    departmentKey  NVARCHAR(50)  NULL,
    status         NVARCHAR(50)  NULL,
    assignedBy     NVARCHAR(200) NULL,
    deadline       NVARCHAR(40)  NULL,
    date           NVARCHAR(40)  NULL,
    createdAt      DATETIME2     NOT NULL CONSTRAINT DF_ct_created DEFAULT SYSUTCDATETIME(),
    updatedAt      DATETIME2     NOT NULL CONSTRAINT DF_ct_updated DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------- uploaded files (stored on disk by the backend) */
IF OBJECT_ID(N'dbo.uploads') IS NULL
CREATE TABLE dbo.uploads (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    name         NVARCHAR(500)  NOT NULL,
    size         BIGINT         NOT NULL,
    type         NVARCHAR(200)  NULL,
    storagePath  NVARCHAR(1000) NOT NULL,      -- relative to UPLOAD_DIR
    s3Url        NVARCHAR(1000) NULL,          -- URL the app uses to fetch the file
    uploadedBy   INT            NULL,
    createdAt    DATETIME2      NOT NULL CONSTRAINT DF_uploads_created DEFAULT SYSUTCDATETIME(),
    updatedAt    DATETIME2      NOT NULL CONSTRAINT DF_uploads_updated DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------- supporting indexes (chapter tree / progress queries) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_chapters_module' AND object_id = OBJECT_ID(N'dbo.chapters'))
    CREATE INDEX IX_chapters_module ON dbo.chapters(moduleId, chapterNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_chapterSections_chapter' AND object_id = OBJECT_ID(N'dbo.chapterSections'))
    CREATE INDEX IX_chapterSections_chapter ON dbo.chapterSections(chapterId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_projectChapters_project_module' AND object_id = OBJECT_ID(N'dbo.projectChapters'))
    CREATE INDEX IX_projectChapters_project_module ON dbo.projectChapters(projectId, moduleId) INCLUDE (chapterId, status);
GO

PRINT 'M3M_One schema ready.';
GO
