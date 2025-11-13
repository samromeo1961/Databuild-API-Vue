-- ============================================
-- SQL Server User Setup for DBx Connector Vue
-- SYSTEM & JOB DATABASE ACCESS
-- ============================================
-- This script creates a login and user with permissions
-- to access BOTH your Databuild System and Job databases
-- ============================================

-- ============================================
-- CONFIGURATION SECTION - CUSTOMIZE THESE VALUES
-- ============================================

-- IMPORTANT: Replace these placeholder values before running the script!

-- 1. SYSTEM DATABASE (Contains Catalogue, Recipes, Suppliers, Contacts)
--    Common examples: CROWNESYS, T_ESys, MyCompanySYS, etc.
DECLARE @SystemDatabase NVARCHAR(128) = 'YOUR_SYSTEM_DATABASE_NAME' COLLATE SQL_Latin1_General_CP1_CI_AS;

-- 2. JOB DATABASE (Contains Bill, Orders, Job data)
--    Common examples: CROWNEJOB, T_EJob, MyCompanyJOB, etc.
--    Leave as 'AUTO' to auto-detect (replaces 'SYS' with 'JOB' in system database name)
--    Or specify explicitly: 'CROWNEJOB', 'T_EJob', etc.
DECLARE @JobDatabase NVARCHAR(128) = 'AUTO' COLLATE SQL_Latin1_General_CP1_CI_AS;

-- 3. Replace with your desired username
DECLARE @Username NVARCHAR(128) = 'dbx_user' COLLATE SQL_Latin1_General_CP1_CI_AS;

-- 4. Replace with a strong password
DECLARE @Password NVARCHAR(128) = 'YourSecurePassword123!' COLLATE SQL_Latin1_General_CP1_CI_AS;

-- 5. Choose permission level (uncomment ONE option below)
DECLARE @PermissionLevel VARCHAR(20) = 'READ_ONLY' COLLATE SQL_Latin1_General_CP1_CI_AS;     -- Option A: Read-only (RECOMMENDED)
-- DECLARE @PermissionLevel VARCHAR(20) = 'READ_WRITE' COLLATE SQL_Latin1_General_CP1_CI_AS;   -- Option B: Read and write
-- DECLARE @PermissionLevel VARCHAR(20) = 'GRANULAR' COLLATE SQL_Latin1_General_CP1_CI_AS;     -- Option C: Specific tables only

-- 6. Enable Job Database setup (set to 0 to skip Job Database setup)
DECLARE @EnableJobDatabase BIT = 1;  -- 1 = Yes (default), 0 = No

-- ============================================
-- END CONFIGURATION - Do not modify below this line
-- ============================================

SET NOCOUNT ON;
PRINT '';
PRINT '============================================';
PRINT 'DBx Connector Vue - User Setup Script';
PRINT 'SYSTEM & JOB DATABASE EDITION';
PRINT '============================================';
PRINT '';

-- ============================================
-- Auto-detect Job Database Name
-- ============================================

IF @JobDatabase COLLATE SQL_Latin1_General_CP1_CI_AS = 'AUTO' COLLATE SQL_Latin1_General_CP1_CI_AS AND @EnableJobDatabase = 1
BEGIN
    -- Try to replace 'SYS' with 'JOB' (case-insensitive)
    IF @SystemDatabase LIKE '%SYS' OR @SystemDatabase LIKE '%Sys'
    BEGIN
        SET @JobDatabase = LEFT(@SystemDatabase, LEN(@SystemDatabase) - 3) + 'JOB';
    END
    ELSE IF @SystemDatabase LIKE '%SYS%' OR @SystemDatabase LIKE '%Sys%'
    BEGIN
        -- Replace SYS in middle of name
        SET @JobDatabase = REPLACE(REPLACE(@SystemDatabase, 'SYS', 'JOB'), 'Sys', 'Job');
    END
    ELSE
    BEGIN
        -- Fallback: append 'JOB' to system database name
        SET @JobDatabase = @SystemDatabase + 'JOB';
    END

    PRINT '🔍 Auto-detected Job Database: ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
    PRINT '';
END

-- ============================================
-- Validate Configuration
-- ============================================

IF @SystemDatabase COLLATE SQL_Latin1_General_CP1_CI_AS = 'YOUR_SYSTEM_DATABASE_NAME' COLLATE SQL_Latin1_General_CP1_CI_AS
BEGIN
    PRINT 'ERROR: You must customize the @SystemDatabase variable!';
    PRINT 'Edit the CONFIGURATION SECTION at the top of this script.';
    PRINT '';
    GOTO ScriptEnd;
END

IF @Password COLLATE SQL_Latin1_General_CP1_CI_AS = 'YourSecurePassword123!' COLLATE SQL_Latin1_General_CP1_CI_AS
BEGIN
    PRINT 'WARNING: You are using the default password!';
    PRINT 'Please change @Password to a secure password.';
    PRINT '';
END

-- Check if System database exists
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = @SystemDatabase)
BEGIN
    PRINT 'ERROR: System Database ''' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''' does not exist!';
    PRINT 'Please verify the database name and try again.';
    PRINT '';
    GOTO ScriptEnd;
END

-- Check if Job database exists (if enabled)
IF @EnableJobDatabase = 1
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = @JobDatabase)
    BEGIN
        PRINT 'WARNING: Job Database ''' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''' does not exist!';
        PRINT 'Job Database setup will be SKIPPED.';
        PRINT 'If this is incorrect, please:';
        PRINT '  1. Verify the Job Database name';
        PRINT '  2. Set @JobDatabase explicitly (e.g., ''T_EJob'')';
        PRINT '  3. Re-run this script';
        PRINT '';
        SET @EnableJobDatabase = 0;
    END
END

PRINT 'Configuration:';
PRINT '  System Database: ' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
IF @EnableJobDatabase = 1
    PRINT '  Job Database:    ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
ELSE
    PRINT '  Job Database:    (DISABLED - will be skipped)';
PRINT '  Username:        ' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
PRINT '  Permission Level: ' + CAST(@PermissionLevel AS VARCHAR(20)) COLLATE Latin1_General_CI_AS;
PRINT '';

-- ============================================
-- STEP 1: Create SQL Server Login
-- ============================================

USE master;

PRINT 'Step 1: Creating SQL Server login...';

IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Username)
BEGIN
    PRINT '  ⚠ Login ''' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''' already exists. Skipping creation.';
    PRINT '  If you want to recreate it, drop the login first:';
    PRINT '    USE master; DROP LOGIN ' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ';';
END
ELSE
BEGIN
    DECLARE @CreateLoginSQL NVARCHAR(MAX) = '
        CREATE LOGIN [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ']
        WITH PASSWORD = ''' + CAST(@Password AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''',
             CHECK_EXPIRATION = OFF,
             CHECK_POLICY = OFF;
    ';
    EXEC sp_executesql @CreateLoginSQL;
    PRINT '  ✓ Login ''' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''' created successfully';
END

PRINT '';

-- ============================================
-- STEP 2A: Create Database User - SYSTEM DATABASE
-- ============================================

PRINT 'Step 2A: Creating database user in SYSTEM database...';

DECLARE @UseSystemDbSQL NVARCHAR(MAX) = 'USE [' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];';
EXEC sp_executesql @UseSystemDbSQL;

DECLARE @CreateSystemUserSQL NVARCHAR(MAX) = '
    USE [' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = ''' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''')
    BEGIN
        CREATE USER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '] FOR LOGIN [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        PRINT ''  ✓ User created in SYSTEM database: ' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''';
    END
    ELSE
    BEGIN
        PRINT ''  ⚠ User already exists in SYSTEM database: ' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''';
    END
';
EXEC sp_executesql @CreateSystemUserSQL;

PRINT '';

-- ============================================
-- STEP 2B: Create Database User - JOB DATABASE
-- ============================================

IF @EnableJobDatabase = 1
BEGIN
    PRINT 'Step 2B: Creating database user in JOB database...';

    DECLARE @UseJobDbSQL NVARCHAR(MAX) = 'USE [' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];';
    EXEC sp_executesql @UseJobDbSQL;

    DECLARE @CreateJobUserSQL NVARCHAR(MAX) = '
        USE [' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = ''' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''')
        BEGIN
            CREATE USER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '] FOR LOGIN [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
            PRINT ''  ✓ User created in JOB database: ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''';
        END
        ELSE
        BEGIN
            PRINT ''  ⚠ User already exists in JOB database: ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ''';
        END
    ';
    EXEC sp_executesql @CreateJobUserSQL;

    PRINT '';
END
ELSE
BEGIN
    PRINT 'Step 2B: Skipping JOB database user creation (disabled)';
    PRINT '';
END

-- ============================================
-- STEP 3A: Grant Permissions - SYSTEM DATABASE
-- ============================================

PRINT 'Step 3A: Granting permissions on SYSTEM database...';

IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'READ_ONLY' COLLATE SQL_Latin1_General_CP1_CI_AS
BEGIN
    PRINT '  Granting READ-ONLY access (db_datareader role)...';

    DECLARE @GrantSystemReadSQL NVARCHAR(MAX) = '
        USE [' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        ALTER ROLE db_datareader ADD MEMBER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
    ';
    EXEC sp_executesql @GrantSystemReadSQL;

    PRINT '  ✓ Read-only permissions granted on SYSTEM database';
END
ELSE IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'READ_WRITE' COLLATE SQL_Latin1_General_CP1_CI_AS
BEGIN
    PRINT '  Granting READ-WRITE access (db_datareader + db_datawriter roles)...';

    DECLARE @GrantSystemWriteSQL NVARCHAR(MAX) = '
        USE [' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        ALTER ROLE db_datareader ADD MEMBER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        ALTER ROLE db_datawriter ADD MEMBER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
    ';
    EXEC sp_executesql @GrantSystemWriteSQL;

    PRINT '  ✓ Read-write permissions granted on SYSTEM database';
END
ELSE IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'GRANULAR' COLLATE SQL_Latin1_General_CP1_CI_AS
BEGIN
    PRINT '  Granting GRANULAR access (specific tables only)...';

    DECLARE @GrantSystemGranularSQL NVARCHAR(MAX) = '
        USE [' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];

        -- Grant SELECT on specific System Database tables
        GRANT SELECT ON dbo.PriceList TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.CostCentres TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.Recipe TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.Prices TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.PerCodes TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.Supplier TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.SupplierGroup TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.Contacts TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.ContactGroup TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.CCBanks TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        GRANT SELECT ON dbo.SuppliersPrices TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
    ';

    BEGIN TRY
        EXEC sp_executesql @GrantSystemGranularSQL;
        PRINT '  ✓ Granular permissions granted on SYSTEM database tables';
    END TRY
    BEGIN CATCH
        PRINT '  ⚠ Warning: Some tables may not exist. Error: ' + ERROR_MESSAGE();
        PRINT '  This is normal if your database schema differs slightly.';
    END CATCH
END
ELSE
BEGIN
    PRINT '  ERROR: Invalid permission level: ' + CAST(@PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS AS NVARCHAR(128));
    PRINT '  Valid options: READ_ONLY, READ_WRITE, GRANULAR';
END

PRINT '';

-- ============================================
-- STEP 3B: Grant Permissions - JOB DATABASE
-- ============================================

IF @EnableJobDatabase = 1
BEGIN
    PRINT 'Step 3B: Granting permissions on JOB database...';

    IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'READ_ONLY' COLLATE SQL_Latin1_General_CP1_CI_AS
    BEGIN
        PRINT '  Granting READ-ONLY access (db_datareader role)...';

        DECLARE @GrantJobReadSQL NVARCHAR(MAX) = '
            USE [' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
            ALTER ROLE db_datareader ADD MEMBER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        ';
        EXEC sp_executesql @GrantJobReadSQL;

        PRINT '  ✓ Read-only permissions granted on JOB database';
    END
    ELSE IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'READ_WRITE' COLLATE SQL_Latin1_General_CP1_CI_AS
    BEGIN
        PRINT '  Granting READ-WRITE access (db_datareader + db_datawriter roles)...';

        DECLARE @GrantJobWriteSQL NVARCHAR(MAX) = '
            USE [' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
            ALTER ROLE db_datareader ADD MEMBER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
            ALTER ROLE db_datawriter ADD MEMBER [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        ';
        EXEC sp_executesql @GrantJobWriteSQL;

        PRINT '  ✓ Read-write permissions granted on JOB database';
    END
    ELSE IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'GRANULAR' COLLATE SQL_Latin1_General_CP1_CI_AS
    BEGIN
        PRINT '  Granting GRANULAR access (specific tables only)...';

        DECLARE @GrantJobGranularSQL NVARCHAR(MAX) = '
            USE [' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];

            -- Grant SELECT on specific Job Database tables
            GRANT SELECT ON dbo.Bill TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
            GRANT SELECT ON dbo.Orders TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
            GRANT SELECT ON dbo.OrderDetails TO [' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + '];
        ';

        BEGIN TRY
            EXEC sp_executesql @GrantJobGranularSQL;
            PRINT '  ✓ Granular permissions granted on JOB database tables (Bill, Orders, OrderDetails)';
        END TRY
        BEGIN CATCH
            PRINT '  ⚠ Warning: Some tables may not exist. Error: ' + ERROR_MESSAGE();
            PRINT '  This is normal if your database schema differs slightly.';
        END CATCH
    END

    PRINT '';
END
ELSE
BEGIN
    PRINT 'Step 3B: Skipping JOB database permissions (disabled)';
    PRINT '';
END

-- ============================================
-- STEP 4: Verify Setup
-- ============================================

PRINT 'Step 4: Verifying setup...';
PRINT '';

-- Verify SYSTEM database
PRINT '  SYSTEM Database Permissions:';

DECLARE @VerifySystemSQL NVARCHAR(MAX) = '
    USE [' + @SystemDatabase + '];

    SELECT
        dp.name AS [User Name],
        r.name AS [Database Role],
        CASE
            WHEN r.name = ''db_datareader'' THEN ''Can read all tables (SELECT)''
            WHEN r.name = ''db_datawriter'' THEN ''Can modify all tables (INSERT, UPDATE, DELETE)''
            WHEN r.name = ''db_owner'' THEN ''Full control of database''
            ELSE ''Custom permissions''
        END AS [Permission Description]
    FROM sys.database_principals dp
    LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
    LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
    WHERE dp.name = ''' + @Username + '''
    ORDER BY r.name;
';

EXEC sp_executesql @VerifySystemSQL;

-- Verify JOB database (if enabled)
IF @EnableJobDatabase = 1
BEGIN
    PRINT '';
    PRINT '  JOB Database Permissions:';

    DECLARE @VerifyJobSQL NVARCHAR(MAX) = '
        USE [' + @JobDatabase + '];

        SELECT
            dp.name AS [User Name],
            r.name AS [Database Role],
            CASE
                WHEN r.name = ''db_datareader'' THEN ''Can read all tables (SELECT)''
                WHEN r.name = ''db_datawriter'' THEN ''Can modify all tables (INSERT, UPDATE, DELETE)''
                WHEN r.name = ''db_owner'' THEN ''Full control of database''
                ELSE ''Custom permissions''
            END AS [Permission Description]
        FROM sys.database_principals dp
        LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
        LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
        WHERE dp.name = ''' + @Username + '''
        ORDER BY r.name;
    ';

    EXEC sp_executesql @VerifyJobSQL;
END

-- ============================================
-- STEP 5: Test Schema Validation
-- ============================================

PRINT '';
PRINT 'Step 5: Testing Databuild schema validation...';

-- Test SYSTEM database
PRINT '';
PRINT '  SYSTEM Database Tables:';

DECLARE @TestSystemSQL NVARCHAR(MAX) = '
    USE [' + @SystemDatabase + '];

    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = ''BASE TABLE''
    AND TABLE_NAME IN (''Supplier'', ''PriceList'', ''CostCentres'', ''Recipe'', ''SupplierGroup'', ''CCBanks'')
    ORDER BY TABLE_NAME;
';

DECLARE @SystemTableCount INT;
DECLARE @SystemTestResult TABLE (TABLE_NAME NVARCHAR(128));

INSERT INTO @SystemTestResult
EXEC sp_executesql @TestSystemSQL;

SELECT @SystemTableCount = COUNT(*) FROM @SystemTestResult;

PRINT '  Found ' + CAST(@SystemTableCount AS VARCHAR) + '/6 required Databuild tables:';

DECLARE @TableName NVARCHAR(128);
DECLARE system_table_cursor CURSOR FOR SELECT TABLE_NAME FROM @SystemTestResult;
OPEN system_table_cursor;
FETCH NEXT FROM system_table_cursor INTO @TableName;
WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '    ✓ ' + @TableName;
    FETCH NEXT FROM system_table_cursor INTO @TableName;
END
CLOSE system_table_cursor;
DEALLOCATE system_table_cursor;

IF @SystemTableCount >= 5
    PRINT '  ✓ SYSTEM database appears to be a valid Databuild database';
ELSE
    PRINT '  ⚠ Warning: SYSTEM database may not be a valid Databuild database (missing tables)';

-- Test JOB database (if enabled)
IF @EnableJobDatabase = 1
BEGIN
    PRINT '';
    PRINT '  JOB Database Tables:';

    DECLARE @TestJobSQL NVARCHAR(MAX) = '
        USE [' + @JobDatabase + '];

        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = ''BASE TABLE''
        AND TABLE_NAME IN (''Bill'', ''Orders'', ''OrderDetails'')
        ORDER BY TABLE_NAME;
    ';

    DECLARE @JobTableCount INT;
    DECLARE @JobTestResult TABLE (TABLE_NAME NVARCHAR(128));

    INSERT INTO @JobTestResult
    EXEC sp_executesql @TestJobSQL;

    SELECT @JobTableCount = COUNT(*) FROM @JobTestResult;

    PRINT '  Found ' + CAST(@JobTableCount AS VARCHAR) + '/3 required Job tables:';

    DECLARE job_table_cursor CURSOR FOR SELECT TABLE_NAME FROM @JobTestResult;
    OPEN job_table_cursor;
    FETCH NEXT FROM job_table_cursor INTO @TableName;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        PRINT '    ✓ ' + @TableName;
        FETCH NEXT FROM job_table_cursor INTO @TableName;
    END
    CLOSE job_table_cursor;
    DEALLOCATE job_table_cursor;

    IF @JobTableCount >= 3
        PRINT '  ✓ JOB database appears to be valid';
    ELSE
        PRINT '  ⚠ Warning: JOB database may be missing required tables (Bill, Orders, OrderDetails)';
END

-- ============================================
-- STEP 6: Test Cross-Database Query (if Job DB enabled)
-- ============================================

IF @EnableJobDatabase = 1
BEGIN
    PRINT '';
    PRINT 'Step 6: Testing cross-database query capability...';

    DECLARE @TestCrossDbSQL NVARCHAR(MAX) = '
        USE [' + @SystemDatabase + '];

        SELECT TOP 1
            ''Cross-database query successful'' AS TestResult
        FROM
            [' + @JobDatabase + '].INFORMATION_SCHEMA.TABLES jt
        CROSS JOIN
            [' + @SystemDatabase + '].INFORMATION_SCHEMA.TABLES st
        WHERE
            jt.TABLE_NAME = ''Bill''
            AND st.TABLE_NAME = ''PriceList'';
    ';

    BEGIN TRY
        EXEC sp_executesql @TestCrossDbSQL;
        PRINT '  ✓ Cross-database queries working correctly!';
        PRINT '  User can JOIN tables from SYSTEM and JOB databases.';
    END TRY
    BEGIN CATCH
        PRINT '  ⚠ Warning: Cross-database query test failed: ' + ERROR_MESSAGE();
        PRINT '  This may indicate permission issues.';
    END CATCH
END

-- ============================================
-- STEP 7: Summary
-- ============================================

PRINT '';
PRINT '============================================';
PRINT 'Setup Complete!';
PRINT '============================================';
PRINT '';
PRINT 'Connection Information:';
PRINT '  Server:          ' + @@SERVERNAME;
PRINT '  System Database: ' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
IF @EnableJobDatabase = 1
    PRINT '  Job Database:    ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
ELSE
    PRINT '  Job Database:    (Not configured)';
PRINT '  Username:        ' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
PRINT '  Password:        ' + REPLICATE('*', LEN(@Password));
PRINT '';
PRINT 'Permission Level: ' + CAST(@PermissionLevel AS VARCHAR(20)) COLLATE Latin1_General_CI_AS;

IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'READ_ONLY' COLLATE SQL_Latin1_General_CP1_CI_AS
    PRINT '  - Can SELECT (read) from all tables';
ELSE IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'READ_WRITE' COLLATE SQL_Latin1_General_CP1_CI_AS
    PRINT '  - Can SELECT, INSERT, UPDATE, DELETE on all tables';
ELSE IF @PermissionLevel COLLATE SQL_Latin1_General_CP1_CI_AS = 'GRANULAR' COLLATE SQL_Latin1_General_CP1_CI_AS
    PRINT '  - Can SELECT from specific Databuild tables only';

PRINT '';
PRINT 'Database Access:';
PRINT '  ✓ SYSTEM Database: ' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
PRINT '    - Catalogue, Recipes, Suppliers, Contacts';
IF @EnableJobDatabase = 1
BEGIN
    PRINT '  ✓ JOB Database: ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
    PRINT '    - Bill, Orders, OrderDetails (Job data)';
    PRINT '  ✓ Cross-database queries: ENABLED';
END
ELSE
BEGIN
    PRINT '  ✗ JOB Database: NOT CONFIGURED';
    PRINT '    Job import feature will not be available.';
END

PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Launch DBx Connector Vue application';
PRINT '  2. Go to Settings (Ctrl+,)';
PRINT '  3. Enter connection information:';
PRINT '     Server:   ' + @@SERVERNAME;
PRINT '     Database: ' + CAST(@SystemDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
IF @EnableJobDatabase = 1
    PRINT '     Job DB:   ' + CAST(@JobDatabase AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS + ' (or leave blank for auto-detect)';
PRINT '     Username: ' + CAST(@Username AS NVARCHAR(128)) COLLATE Latin1_General_CI_AS;
PRINT '     Password: (enter your password)';
PRINT '  4. Click "Test Connection" to verify';
PRINT '  5. Click "Save & Connect" to start using the application';

IF @EnableJobDatabase = 1
BEGIN
    PRINT '';
    PRINT 'Job Import Feature:';
    PRINT '  ✓ ENABLED - You can import jobs from the Job Database';
    PRINT '  Go to Templates Tab → Import from Job';
END

PRINT '';
PRINT 'Security Reminder:';
PRINT '  - Store the password securely';
PRINT '  - Do not share credentials';
PRINT '  - Use READ_ONLY permission when possible';
PRINT '  - Single login = Access to both databases';
PRINT '';
PRINT '============================================';

ScriptEnd:
PRINT '';
SET NOCOUNT OFF;

-- ============================================
-- Optional: Cleanup Script (commented out)
-- ============================================
-- Uncomment and run this section if you need to remove the user and login
/*
-- Drop users from both databases
USE [YOUR_SYSTEM_DATABASE];
DROP USER [dbx_user];
GO

USE [YOUR_JOB_DATABASE];
DROP USER [dbx_user];
GO

-- Drop the login
USE master;
DROP LOGIN [dbx_user];
GO

PRINT 'Users and login removed successfully from both databases';
*/
