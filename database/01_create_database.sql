/* =====================================================================
   M3M_1.O  —  Step 1: create the database and the application login
   Run in SSMS connected to your SQL Server instance as an administrator.
   This database holds confidential project data: keep it separate from
   every other database and only give the app login access to it.
   ===================================================================== */

-- 1) Database
IF DB_ID(N'M3M_One') IS NULL
BEGIN
    CREATE DATABASE [M3M_One];
END
GO

ALTER DATABASE [M3M_One] SET RECOVERY FULL;   -- point-in-time restore for confidential data
GO

-- 2) SQL login used only by the M3M_1.O backend
--    >>> CHANGE THE PASSWORD before running, and put the same value in backend/.env (DB_PASSWORD) <<<
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'm3m_app')
BEGIN
    CREATE LOGIN [m3m_app] WITH PASSWORD = N'Change_This_Str0ng_Password!', CHECK_POLICY = ON, DEFAULT_DATABASE = [M3M_One];
END
GO

-- 3) Database user with read/write + execute + view-definition only (no schema changes, no access to other databases)
USE [M3M_One];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'm3m_app')
BEGIN
    CREATE USER [m3m_app] FOR LOGIN [m3m_app];
END
ALTER ROLE db_datareader ADD MEMBER [m3m_app];
ALTER ROLE db_datawriter ADD MEMBER [m3m_app];
GRANT EXECUTE TO [m3m_app];
GRANT VIEW DEFINITION TO [m3m_app];   -- the backend reads column metadata (JSON columns) at startup
GO
