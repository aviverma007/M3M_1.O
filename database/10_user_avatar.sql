/* =====================================================================
   M3M_1.O  —  User avatar emoji (Nov 2026)
   Run once in SSMS. Safe to run more than once.
   (The app also tries to add this column itself; run this if its database login may not alter tables.)
   ===================================================================== */
USE [M3M_1O];   -- server database name; change if yours differs (local test copy: M3M_One)
GO
IF COL_LENGTH(N'dbo.users', N'avatar') IS NULL
    ALTER TABLE dbo.users ADD avatar NVARCHAR(32) NULL;   -- an emoji, e.g. 🦁 (empty = initials)
GO
SELECT id, name, avatar FROM dbo.users;
