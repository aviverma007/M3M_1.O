/* =====================================================================
   M3M_1.O  —  full backup of the M3M_One database (see docs/BACKEND_SETUP.md section 6)

   Needs the sqlcmd variable BackupDir (a folder SQL Server's service account can write to):
     - Task Scheduler / command line:  sqlcmd -S localhost -E -i 06_backup.sql -v BackupDir="D:\SQLBackups"
     - SSMS: Query > SQLCMD Mode, add the line   :setvar BackupDir "D:\SQLBackups"   at the top, Execute.
   Each run writes a new dated .bak file; delete old ones with your normal file cleanup.
   ===================================================================== */
DECLARE @file NVARCHAR(400) = N'$(BackupDir)\M3M_One_' + FORMAT(SYSDATETIME(), 'yyyyMMdd_HHmm') + N'.bak';

BACKUP DATABASE [M3M_One]
TO DISK = @file
WITH INIT, CHECKSUM, STATS = 25, NAME = N'M3M_One full backup';

RESTORE VERIFYONLY FROM DISK = @file WITH CHECKSUM;
PRINT 'Backup written to ' + @file;
GO
