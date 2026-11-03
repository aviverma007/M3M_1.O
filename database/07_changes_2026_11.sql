/* =====================================================================
   M3M_1.O  —  Change set Nov 2026: benchmark updates
   Run once in SSMS against the application database (M3M_1O on the server).
   Safe to run more than once.
   ===================================================================== */
SET NOCOUNT ON;

-- Change 4: Surface Driveway Width benchmark "Min 6 m" -> "Max 6 m"
IF EXISTS (SELECT 1 FROM dbo.benchmarks WHERE [key] = N'surface driveway width')
  UPDATE dbo.benchmarks SET benchmarkValue = N'Max 6 m', updatedAt = SYSDATETIME() WHERE [key] = N'surface driveway width';
ELSE
  INSERT INTO dbo.benchmarks ([key], benchmarkValue, validOptions, createdAt, updatedAt)
  VALUES (N'surface driveway width', N'Max 6 m', N'[]', SYSDATETIME(), SYSDATETIME());

-- Change 6: remove the "Units on Ground Floor" benchmark (Req: Yes)
DELETE FROM dbo.benchmarks WHERE [key] = N'units on ground floor';

-- Change 10: No. Of Lifts per Tower (passenger) benchmark Min 4 -> Min 2
IF EXISTS (SELECT 1 FROM dbo.benchmarks WHERE [key] = N'passenger elevators no of lifts')
  UPDATE dbo.benchmarks SET benchmarkValue = N'2', updatedAt = SYSDATETIME() WHERE [key] = N'passenger elevators no of lifts';
ELSE
  INSERT INTO dbo.benchmarks ([key], benchmarkValue, validOptions, createdAt, updatedAt)
  VALUES (N'passenger elevators no of lifts', N'2', N'[]', SYSDATETIME(), SYSDATETIME());

SELECT [key], benchmarkValue FROM dbo.benchmarks
WHERE [key] IN (N'surface driveway width', N'units on ground floor', N'passenger elevators no of lifts');
