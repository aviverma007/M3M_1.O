/* =====================================================================
   M3M_1.O  —  Step 4: first super admin login
   Run in SSMS against M3M_One after 02_schema.sql.
   Creates admin@m3m.com / ChangeMe@123 (bcrypt hash). Log in once and change the password / create real users in Role and Access Control.
   ===================================================================== */
USE [M3M_One];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = N'admin@m3m.com')
    INSERT INTO dbo.users (name, email, phone, role, department, company, status, passwordHash)
    VALUES (N'Super Admin', N'admin@m3m.com', N'', N'super_admin', NULL, NULL, N'active', N'$2b$10$58m72ygGQffNZLWUPW1T2Ol10hy3/A/HRgBuup.Pan7ZUkljCkopq');
GO
PRINT 'First admin ready: admin@m3m.com / ChangeMe@123  (change it after first login)';
GO
