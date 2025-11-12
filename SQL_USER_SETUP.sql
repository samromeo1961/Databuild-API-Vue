-- ============================================
-- SQL Server User Setup for DBx Connector Vue
-- ============================================
-- This script creates a login and user with permissions
-- to access your Databuild database
-- ============================================

-- ============================================
-- CONFIGURATION SECTION - CUSTOMIZE THESE VALUES
-- ============================================

-- IMPORTANT: Replace these placeholder values before running the script!

-- 1. Replace 'YOUR_DATABASE_NAME' with your actual Databuild database name
--    Common examples: CROWNESYS, T_Esys, Databuild_Production, etc.
DECLARE @DatabaseName NVARCHAR(128) = 'YOUR_DATABASE_NAME';

-- 2. Replace with your desired username
DECLARE @Username NVARCHAR(128) = 'dbx_user';

-- 3. Replace with a strong password
DECLARE @Password NVARCHAR(128) = 'YourSecurePassword123!';

-- 4. Choose permission level (uncomment ONE option below)
DECLARE @PermissionLevel VARCHAR(20) = 'READ_ONLY';     -- Option A: Read-only (recommended)
-- DECLARE @PermissionLevel VARCHAR(20) = 'READ_WRITE';   -- Option B: Read and write
-- DECLARE @PermissionLevel VARCHAR(20) = 'GRANULAR';     -- Option C: Specific tables only

-- ============================================
-- END CONFIGURATION - Do not modify below this line
-- ============================================

SET NOCOUNT ON;
PRINT '';
PRINT '============================================';
PRINT 'DBx Connector Vue - User Setup Script';
PRINT '============================================';
PRINT '';

-- Validate configuration
IF @DatabaseName = 'YOUR_DATABASE_NAME'
BEGIN
    PRINT 'ERROR: You must customize the @DatabaseName variable!';
    PRINT 'Edit the CONFIGURATION SECTION at the top of this script.';
    PRINT '';
    GOTO ScriptEnd;
END

IF @Password = 'YourSecurePassword123!'
BEGIN
    PRINT 'WARNING: You are using the default password!';
    PRINT 'Please change @Password to a secure password.';
    PRINT '';
END

-- Check if database exists
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = @DatabaseName)
BEGIN
    PRINT 'ERROR: Database ''' + @DatabaseName + ''' does not exist!';
    PRINT 'Please verify the database name and try again.';
    PRINT '';
    GOTO ScriptEnd;
END

PRINT 'Configuration:';
PRINT '  Database: ' + @DatabaseName;
PRINT '  Username: ' + @Username;
PRINT '  Permission Level: ' + @PermissionLevel;
PRINT '';

-- ============================================
-- STEP 1: Create SQL Server Login
-- ============================================

USE master;

PRINT 'Step 1: Creating SQL Server login...';

IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Username)
BEGIN
    PRINT '  ⚠ Login ''' + @Username + ''' already exists. Skipping creation.';
    PRINT '  If you want to recreate it, drop the login first:';
    PRINT '    USE master; DROP LOGIN ' + @Username + ';';
END
ELSE
BEGIN
    DECLARE @CreateLoginSQL NVARCHAR(MAX) = '
        CREATE LOGIN [' + @Username + ']
        WITH PASSWORD = ''' + @Password + ''',
             CHECK_EXPIRATION = OFF,
             CHECK_POLICY = OFF;
    ';
    EXEC sp_executesql @CreateLoginSQL;
    PRINT '  ✓ Login ''' + @Username + ''' created successfully';
END

PRINT '';

-- ============================================
-- STEP 2: Create Database User
-- ============================================

PRINT 'Step 2: Creating database user...';

DECLARE @UseDbSQL NVARCHAR(MAX) = 'USE [' + @DatabaseName + '];';
EXEC sp_executesql @UseDbSQL;

DECLARE @CreateUserSQL NVARCHAR(MAX) = '
    USE [' + @DatabaseName + '];
    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = ''' + @Username + ''')
    BEGIN
        CREATE USER [' + @Username + '] FOR LOGIN [' + @Username + '];
        PRINT ''  ✓ User created in database: ' + @DatabaseName + ''';
    END
    ELSE
    BEGIN
        PRINT ''  ⚠ User already exists in database: ' + @DatabaseName + ''';
    END
';
EXEC sp_executesql @CreateUserSQL;

PRINT '';

-- ============================================
-- STEP 3: Grant Permissions Based on Permission Level
-- ============================================

PRINT 'Step 3: Granting permissions...';

IF @PermissionLevel = 'READ_ONLY'
BEGIN
    PRINT '  Granting READ-ONLY access (db_datareader role)...';

    DECLARE @GrantReadSQL NVARCHAR(MAX) = '
        USE [' + @DatabaseName + '];
        ALTER ROLE db_datareader ADD MEMBER [' + @Username + '];
    ';
    EXEC sp_executesql @GrantReadSQL;

    PRINT '  ✓ Read-only permissions granted (SELECT on all tables)';
END
ELSE IF @PermissionLevel = 'READ_WRITE'
BEGIN
    PRINT '  Granting READ-WRITE access (db_datareader + db_datawriter roles)...';

    DECLARE @GrantWriteSQL NVARCHAR(MAX) = '
        USE [' + @DatabaseName + '];
        ALTER ROLE db_datareader ADD MEMBER [' + @Username + '];
        ALTER ROLE db_datawriter ADD MEMBER [' + @Username + '];
    ';
    EXEC sp_executesql @GrantWriteSQL;

    PRINT '  ✓ Read-write permissions granted (SELECT, INSERT, UPDATE, DELETE)';
END
ELSE IF @PermissionLevel = 'GRANULAR'
BEGIN
    PRINT '  Granting GRANULAR access (specific tables only)...';

    DECLARE @GrantGranularSQL NVARCHAR(MAX) = '
        USE [' + @DatabaseName + '];

        -- Grant SELECT on specific tables
        GRANT SELECT ON dbo.PriceList TO [' + @Username + '];
        GRANT SELECT ON dbo.CostCentres TO [' + @Username + '];
        GRANT SELECT ON dbo.Recipe TO [' + @Username + '];
        GRANT SELECT ON dbo.Prices TO [' + @Username + '];
        GRANT SELECT ON dbo.PerCodes TO [' + @Username + '];
        GRANT SELECT ON dbo.Supplier TO [' + @Username + '];
        GRANT SELECT ON dbo.SupplierGroup TO [' + @Username + '];
        GRANT SELECT ON dbo.Contacts TO [' + @Username + '];
        GRANT SELECT ON dbo.ContactGroup TO [' + @Username + '];
        GRANT SELECT ON dbo.CCBanks TO [' + @Username + '];
        GRANT SELECT ON dbo.SuppliersPrices TO [' + @Username + '];
    ';

    BEGIN TRY
        EXEC sp_executesql @GrantGranularSQL;
        PRINT '  ✓ Granular permissions granted on specific tables';
    END TRY
    BEGIN CATCH
        PRINT '  ⚠ Warning: Some tables may not exist. Error: ' + ERROR_MESSAGE();
        PRINT '  This is normal if your database schema differs slightly.';
    END CATCH
END
ELSE
BEGIN
    PRINT '  ERROR: Invalid permission level: ' + @PermissionLevel;
    PRINT '  Valid options: READ_ONLY, READ_WRITE, GRANULAR';
END

PRINT '';

-- ============================================
-- STEP 4: Verify Setup
-- ============================================

PRINT 'Step 4: Verifying setup...';

DECLARE @VerifySQL NVARCHAR(MAX) = '
    USE [' + @DatabaseName + '];

    SELECT
        dp.name AS [User Name],
        dp.type_desc AS [User Type],
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

EXEC sp_executesql @VerifySQL;

-- ============================================
-- STEP 5: Test Connection
-- ============================================

PRINT '';
PRINT 'Step 5: Testing Databuild schema validation...';

DECLARE @TestSQL NVARCHAR(MAX) = '
    USE [' + @DatabaseName + '];

    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = ''BASE TABLE''
    AND TABLE_NAME IN (''Supplier'', ''PriceList'', ''CostCentres'', ''Recipe'', ''SupplierGroup'', ''CCBanks'')
    ORDER BY TABLE_NAME;
';

DECLARE @TableCount INT;
DECLARE @TestResult TABLE (TABLE_NAME NVARCHAR(128));

INSERT INTO @TestResult
EXEC sp_executesql @TestSQL;

SELECT @TableCount = COUNT(*) FROM @TestResult;

PRINT '  Found ' + CAST(@TableCount AS VARCHAR) + '/6 required Databuild tables:';

DECLARE @TableName NVARCHAR(128);
DECLARE table_cursor CURSOR FOR SELECT TABLE_NAME FROM @TestResult;
OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @TableName;
WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '    ✓ ' + @TableName;
    FETCH NEXT FROM table_cursor INTO @TableName;
END
CLOSE table_cursor;
DEALLOCATE table_cursor;

IF @TableCount >= 5
    PRINT '  ✓ Database appears to be a valid Databuild database';
ELSE
    PRINT '  ⚠ Warning: Database may not be a valid Databuild database (missing tables)';

-- ============================================
-- STEP 6: Summary
-- ============================================

PRINT '';
PRINT '============================================';
PRINT 'Setup Complete!';
PRINT '============================================';
PRINT '';
PRINT 'Connection Information:';
PRINT '  Server:   ' + @@SERVERNAME;
PRINT '  Database: ' + @DatabaseName;
PRINT '  Username: ' + @Username;
PRINT '  Password: ' + REPLICATE('*', LEN(@Password));
PRINT '';
PRINT 'Permission Level: ' + @PermissionLevel;

IF @PermissionLevel = 'READ_ONLY'
    PRINT '  - Can SELECT (read) from all tables';
ELSE IF @PermissionLevel = 'READ_WRITE'
    PRINT '  - Can SELECT, INSERT, UPDATE, DELETE on all tables';
ELSE IF @PermissionLevel = 'GRANULAR'
    PRINT '  - Can SELECT from specific Databuild tables only';

PRINT '';
PRINT 'Next Steps:';
PRINT '  1. Launch DBx Connector Vue application';
PRINT '  2. Enter the connection information shown above';
PRINT '  3. Click "Test Connection" to verify';
PRINT '  4. Click "Save & Connect" to start using the application';
PRINT '';
PRINT 'Security Reminder:';
PRINT '  - Store the password securely';
PRINT '  - Do not share credentials';
PRINT '  - Use READ_ONLY permission when possible';
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
USE [YOUR_DATABASE_NAME];
DROP USER [dbx_user];
GO

USE master;
DROP LOGIN [dbx_user];
GO

PRINT 'User and login removed successfully';
*/
