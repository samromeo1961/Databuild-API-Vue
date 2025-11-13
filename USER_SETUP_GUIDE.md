# DBx Connector Vue - User Setup Guide

## Complete Installation and Configuration Guide

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Part 1: SQL Server User Setup](#part-1-sql-server-user-setup)
4. [Part 2: Application Installation](#part-2-application-installation)
5. [Part 3: Database Connection Setup](#part-3-database-connection-setup)
6. [Troubleshooting](#troubleshooting)
7. [FAQs](#faqs)

---

## Overview

**DBx Connector Vue** is a desktop application that connects to your Databuild SQL Server database, providing a modern interface for managing:
- Catalogue items
- Recipes
- Suppliers and contacts
- Templates
- **Job imports** (NEW - requires Job Database)
- Integration with zzTakeoff API

This guide will walk you through the complete setup process, from creating database permissions to connecting the application.

### What's New: Job Database Support

DBx Connector Vue now supports **TWO databases**:
1. **System Database** (e.g., CROWNESYS, T_ESys) - Contains Catalogue, Recipes, Suppliers, Contacts
2. **Job Database** (e.g., CROWNEJOB, T_EJob) - Contains Job data (Bill, Orders, OrderDetails)

**NEW FEATURE:** Import jobs directly into Templates Tab!
- Search for jobs by number
- Preview job items before import
- Automatic zzType assignment based on quantity
- Cross-database queries for rich job data

→ **Note:** Job Database is OPTIONAL. If you only need Catalogue/Recipes/Suppliers, you can skip the Job Database setup.

---

## System Requirements

### Minimum Requirements
- **Operating System:** Windows 10 or Windows 11
- **SQL Server:** SQL Server 2012 or later (any edition: Express, Standard, Enterprise)
- **Database:** Existing Databuild database
- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 200MB for application installation

### Required Access
- Access to SQL Server Management Studio (SSMS) or equivalent SQL client
- Login credentials with permission to create SQL Server logins (typically sysadmin role)
- Network access to the SQL Server instance

---

## Part 1: SQL Server User Setup

### Step 1.1: Identify Your Databases

Before proceeding, you need to know your Databuild database names.

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server instance
3. In the Object Explorer, expand **Databases**
4. Look for your Databuild databases:

#### System Database (REQUIRED)
Common names:
   - `CROWNESYS`, `T_ESys`, `MyCompanySYS`
   - Contains: Catalogue, Recipes, Suppliers, Contacts

**Write down your SYSTEM database name:** `_______________________`

#### Job Database (OPTIONAL - for Job Import feature)
Common names:
   - `CROWNEJOB`, `T_EJob`, `MyCompanyJOB`
   - Usually has 'JOB' instead of 'SYS' in the name
   - Contains: Bill, Orders, OrderDetails (Job data)

**Write down your JOB database name (if applicable):** `_______________________`

→ **Tip:** If your System database is named `CROWNESYS`, your Job database is likely named `CROWNEJOB`.

---

### Step 1.2: Create Database User

**⚡ RECOMMENDED: Use the Automated Setup Script**

We provide an automated SQL script that handles BOTH databases with a single execution:

📄 **File:** `SQL_USER_SETUP.sql`

**Features:**
- ✅ Configures BOTH System and Job databases
- ✅ Auto-detects Job database name (replaces 'SYS' with 'JOB')
- ✅ Tests cross-database queries
- ✅ Validates Databuild schema
- ✅ Comprehensive error checking

**To use the automated script:**
1. Open `SQL_USER_SETUP.sql` in SQL Server Management Studio
2. Edit the CONFIGURATION SECTION at the top:
   ```sql
   DECLARE @SystemDatabase NVARCHAR(128) = 'CROWNESYS';  -- Your System DB name
   DECLARE @JobDatabase NVARCHAR(128) = 'AUTO';          -- Auto-detect or specify explicitly
   DECLARE @Username NVARCHAR(128) = 'dbx_user';
   DECLARE @Password NVARCHAR(128) = 'YourSecurePassword123!';
   DECLARE @PermissionLevel VARCHAR(20) = 'READ_ONLY';   -- RECOMMENDED
   ```
3. Execute the entire script (F5)
4. Review the output for success messages
5. **Skip to [Part 2: Application Installation](#part-2-application-installation)**

---

**📋 Alternative: Manual Setup (if you prefer manual SQL commands)**

You have **three options** for user setup, ordered from most secure to least restrictive:

---

#### **OPTION A: Read-Only Access (RECOMMENDED)**
*Best for users who only need to view data*

```sql
-- ============================================
-- Create Read-Only User for DBx Connector Vue
-- ============================================

USE master;
GO

-- Create SQL Server Login
-- IMPORTANT: Replace 'YourSecurePassword123!' with a strong password
CREATE LOGIN dbx_user
WITH PASSWORD = 'YourSecurePassword123!',
     CHECK_EXPIRATION = OFF,
     CHECK_POLICY = OFF;
GO

-- Switch to your Databuild database
-- IMPORTANT: Replace 'YOUR_DATABASE_NAME' with your actual database name
USE [YOUR_DATABASE_NAME];
GO

-- Create database user mapped to the login
CREATE USER dbx_user FOR LOGIN dbx_user;
GO

-- Grant read-only permissions
ALTER ROLE db_datareader ADD MEMBER dbx_user;
GO

-- Verify setup
SELECT
    dp.name AS UserName,
    r.name AS RoleName
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'dbx_user';
GO

PRINT '✓ Read-only user created successfully';
PRINT 'Username: dbx_user';
PRINT 'Permissions: Read-only (SELECT)';
```

---

#### **OPTION B: Read-Write Access**
*For users who need to modify data*

```sql
-- ============================================
-- Create Read-Write User for DBx Connector Vue
-- ============================================

USE master;
GO

-- Create SQL Server Login
CREATE LOGIN dbx_user
WITH PASSWORD = 'YourSecurePassword123!',
     CHECK_EXPIRATION = OFF,
     CHECK_POLICY = OFF;
GO

-- Switch to your Databuild database
USE [YOUR_DATABASE_NAME];
GO

-- Create database user
CREATE USER dbx_user FOR LOGIN dbx_user;
GO

-- Grant read and write permissions
ALTER ROLE db_datareader ADD MEMBER dbx_user;
ALTER ROLE db_datawriter ADD MEMBER dbx_user;
GO

PRINT '✓ Read-write user created successfully';
PRINT 'Username: dbx_user';
PRINT 'Permissions: Read and Write (SELECT, INSERT, UPDATE, DELETE)';
```

---

#### **OPTION C: Granular Table-Level Permissions (MOST SECURE)**
*Grant access only to specific tables*

```sql
-- ============================================
-- Create User with Granular Permissions
-- ============================================

USE master;
GO

-- Create SQL Server Login
CREATE LOGIN dbx_user
WITH PASSWORD = 'YourSecurePassword123!',
     CHECK_EXPIRATION = OFF,
     CHECK_POLICY = OFF;
GO

-- Switch to your Databuild database
USE [YOUR_DATABASE_NAME];
GO

-- Create database user
CREATE USER dbx_user FOR LOGIN dbx_user;
GO

-- Grant SELECT permission on specific tables
GRANT SELECT ON dbo.PriceList TO dbx_user;
GRANT SELECT ON dbo.CostCentres TO dbx_user;
GRANT SELECT ON dbo.Recipe TO dbx_user;
GRANT SELECT ON dbo.Prices TO dbx_user;
GRANT SELECT ON dbo.PerCodes TO dbx_user;
GRANT SELECT ON dbo.Supplier TO dbx_user;
GRANT SELECT ON dbo.SupplierGroup TO dbx_user;
GRANT SELECT ON dbo.Contacts TO dbx_user;
GRANT SELECT ON dbo.ContactGroup TO dbx_user;
GRANT SELECT ON dbo.CCBanks TO dbx_user;
GRANT SELECT ON dbo.SuppliersPrices TO dbx_user;
GO

-- Optional: Grant UPDATE on specific tables if needed
-- Uncomment these lines if users need to modify data:
-- GRANT INSERT, UPDATE, DELETE ON dbo.PriceList TO dbx_user;
-- GRANT INSERT, UPDATE, DELETE ON dbo.Recipe TO dbx_user;
-- GRANT INSERT, UPDATE, DELETE ON dbo.Supplier TO dbx_user;

PRINT '✓ Granular permissions granted successfully';
PRINT 'Username: dbx_user';
PRINT 'Permissions: SELECT on specific tables only';
```

---

### Step 1.3: Customization Notes

**Before running the script, customize these values:**

1. **Password:** Replace `'YourSecurePassword123!'` with a strong password
   - Use a mix of uppercase, lowercase, numbers, and special characters
   - Minimum 12 characters recommended
   - Example: `P@ssw0rd!2024DBx`

2. **Database Name:** Replace `[YOUR_DATABASE_NAME]` with your actual database name
   - Example: `[CROWNESYS]` or `[T_Esys]`
   - Keep the square brackets around the name

3. **Username (Optional):** Replace `dbx_user` with your preferred username
   - Must change in all places if you customize this
   - Keep it simple and descriptive (e.g., `databuild_app`, `dbx_readonly`)

### Step 1.4: Execute the Script

1. Open **SQL Server Management Studio (SSMS)**
2. Connect as a user with **sysadmin** or **securityadmin** permissions
3. Copy the appropriate script from Step 1.2
4. Paste into a new query window
5. **IMPORTANT:** Make the customizations from Step 1.3
6. Click **Execute** (or press F5)
7. Verify you see the success message

### Step 1.5: Record Your Credentials

**Write down these details for Part 3:**

- **SQL Server Instance:** `_______________________`
  - Example: `localhost\SQLEXPRESS` or `SERVER-NAME\DATABUILD`
- **Database Name:** `_______________________`
- **Username:** `dbx_user` (or your custom username)
- **Password:** `_______________________` (keep secure!)

---

## Part 2: Application Installation

### Step 2.1: Download the Application

1. Navigate to the application release page or shared folder
2. Download the latest version:
   - `DBx-Connector-Vue-Setup-[version].exe` (Windows installer)

### Step 2.2: Install the Application

1. **Run the installer**
   - Double-click the downloaded `.exe` file
   - If Windows SmartScreen appears, click "More info" → "Run anyway"

2. **Follow installation wizard**
   - Accept the license agreement
   - Choose installation location (default: `C:\Program Files\DBx Connector Vue`)
   - Select whether to create desktop shortcut
   - Click "Install"

3. **Wait for installation to complete**
   - The installer will extract files and create shortcuts
   - Typical installation takes 30-60 seconds

4. **Launch the application**
   - Check "Launch DBx Connector Vue" box
   - Click "Finish"

### Step 2.3: First Launch

When you first launch the application, you'll see the **Database Connection** window. This is normal - proceed to Part 3.

---

## Part 3: Database Connection Setup

### Step 3.1: Enter Connection Details

On the Database Connection screen, enter the credentials you recorded in Step 1.5:

1. **SQL Server**
   - Enter your SQL Server instance name
   - Examples:
     - `localhost\SQLEXPRESS` (local SQL Express)
     - `.\SQLEXPRESS` (alternative local SQL Express format)
     - `SERVER-NAME` (remote server)
     - `SERVER-NAME\INSTANCE` (remote named instance)
     - `192.168.1.100` (IP address)

2. **Username**
   - Enter: `dbx_user` (or your custom username)

3. **Password**
   - Enter the password you created in Step 1.2

### Step 3.2: Load Database List (Method 1 - Recommended)

1. Click the **"Load DBs"** button
2. Wait while the application connects to the server
3. A dropdown menu will appear with available databases
4. Select your Databuild database from the list
5. The application will automatically validate that it's a Databuild database
6. Look for the green ✓ "Valid Databuild Database!" message

### Step 3.3: Manual Database Entry (Method 2 - Alternative)

If the "Load DBs" button doesn't work or you prefer manual entry:

1. In the **Database** field, type your database name
   - Example: `CROWNESYS` or `T_Esys`
2. Click **"Test Connection"** to verify

### Step 3.4: Test and Save

1. Click **"Test Connection"**
   - Should show: ✓ "Connection successful! Databuild schema validated."
   - If error appears, see [Troubleshooting](#troubleshooting)

2. Click **"Save & Connect"**
   - Settings are saved securely to your local computer
   - Main application window will open

### Step 3.5: Verify Successful Connection

Once connected, you should see:
- Main application window with multiple tabs:
  - Catalogue
  - Recipes
  - Suppliers
  - Contacts
  - Templates
  - Favourites
  - Recents
  - zzTakeoff
  - Preferences
- Data should load in the Catalogue tab

**Congratulations! Setup is complete.** 🎉

---

## Troubleshooting

### Issue: "Cannot connect to server"

**Possible Causes:**
- SQL Server instance name is incorrect
- SQL Server is not running
- Network connectivity issue
- SQL Server not configured for remote connections

**Solutions:**
1. **Verify SQL Server is running:**
   - Open **SQL Server Configuration Manager**
   - Check that SQL Server service is running

2. **Verify instance name:**
   - In SSMS, the server name you connect to is your instance name
   - Copy exactly as shown in SSMS

3. **Check SQL Server network configuration:**
   - Open **SQL Server Configuration Manager**
   - Expand **SQL Server Network Configuration**
   - Click **Protocols for [INSTANCE_NAME]**
   - Ensure **TCP/IP** is **Enabled**
   - Restart SQL Server service after enabling

4. **Check Windows Firewall:**
   - SQL Server default port: 1433
   - May need to add firewall exception

### Issue: "Login failed for user"

**Possible Causes:**
- Username or password incorrect
- User not created properly
- User not mapped to database

**Solutions:**
1. **Verify credentials:**
   - Double-check username and password
   - SQL Server usernames are case-insensitive
   - Passwords ARE case-sensitive

2. **Re-run user creation script:**
   - Connect to SSMS as admin
   - If user already exists, drop first:
     ```sql
     USE [YOUR_DATABASE_NAME];
     DROP USER dbx_user;
     GO
     USE master;
     DROP LOGIN dbx_user;
     GO
     ```
   - Then re-run the creation script from Part 1

### Issue: "Connected but missing required Databuild tables"

**Possible Causes:**
- Connected to wrong database
- Database is not a Databuild database
- Database schema is incomplete

**Solutions:**
1. **Verify database name:**
   - In SSMS, expand **Databases**
   - Find the database that contains Databuild tables
   - Required tables: `PriceList`, `Supplier`, `CostCentres`, `Recipe`, `SupplierGroup`, `CCBanks`

2. **Check database contents:**
   ```sql
   USE [YOUR_DATABASE_NAME];
   GO
   SELECT TABLE_NAME
   FROM INFORMATION_SCHEMA.TABLES
   WHERE TABLE_TYPE = 'BASE TABLE'
   AND TABLE_NAME IN ('Supplier', 'PriceList', 'CostCentres', 'Recipe', 'SupplierGroup', 'CCBanks');
   ```
   - Should return at least 5-6 tables

### Issue: "Load DBs" button doesn't work

**Solutions:**
1. Use **Manual Database Entry** method instead (Step 3.3)
2. Verify you've entered Server, Username, and Password before clicking "Load DBs"
3. Check SQL Server permissions - user needs VIEW ANY DATABASE permission to list databases

### Issue: Application won't open after installation

**Solutions:**
1. **Check Windows Defender/Antivirus:**
   - Some antivirus programs block Electron apps
   - Add exception for `DBx Connector Vue.exe`

2. **Run as Administrator:**
   - Right-click application shortcut
   - Select "Run as administrator"

3. **Check installation location:**
   - Navigate to installation folder
   - Look for crash logs or error messages

### Issue: Data not loading in tabs

**Solutions:**
1. **Check database permissions:**
   - User needs SELECT permission on tables
   - Re-run Option A, B, or C from Part 1.2

2. **Check database connection:**
   - Click **Preferences** tab
   - Verify connected database name
   - Try disconnecting and reconnecting

3. **Check database schema:**
   - Some tables may be empty in new Databuild installations
   - Verify tables have data:
     ```sql
     SELECT COUNT(*) FROM PriceList;
     SELECT COUNT(*) FROM Supplier;
     ```

---

## Part 4: Using Job Import Feature (NEW)

**Prerequisites:**
- Job Database configured and accessible (see Part 1)
- Application connected to System Database
- Job data exists in Job Database (Bill, Orders, OrderDetails tables)

### What is the Job Import Feature?

The Job Import feature allows you to **import jobs directly into the Templates Tab** from your Databuild Job Database. This saves time by:
- Automatically retrieving all job items
- Calculating zzType based on quantity (Qty=1 → 'part', else → your default)
- Preserving cost centre, pricing, and description information
- Creating reusable templates from existing jobs

### How to Import a Job

#### Step 1: Open Templates Tab
1. Launch DBx Connector Vue
2. Click the **Templates** tab in the main navigation

#### Step 2: Start Job Import
1. Look for the **"Import from Job"** button
2. Click it to open the Job Lookup Modal

#### Step 3: Search for Job
1. Enter the **Job Number** (e.g., `1447`)
2. Select **Default zzType** for items with quantity ≠ 1:
   - **Count** (default) - For countable items
   - **Area** - For area-based measurements (m²)
   - **Linear** - For linear measurements (m)
   - **Segment** - For segmented items
3. Click **"Search"**

#### Step 4: Preview Job Items
The application will display all job items in a grid with:
- **ItemCode** - Item code from PriceList
- **Description** - Item description
- **CostCentre** - Cost centre code and name
- **Quantity** - Job quantity
- **Unit** - Unit of measure (m, m², each, etc.)
- **UnitPrice** - Price per unit
- **zzType** - Automatically assigned:
  - Quantity = 1 → `part`
  - Quantity = 0 or > 1 → Your selected default

#### Step 5: Review and Adjust
- ✅ All items are selected by default
- You can **deselect** items you don't want to import
- You can **edit zzType** inline for individual items (double-click the zzType column)

#### Step 6: Import as Template
1. Click **"Import as Template"** button
2. The job will be saved to your Templates store
3. Success message will confirm the import
4. The template will appear in your Templates Tab grid

#### Step 7: Use the Template
Once imported, you can:
- View all items in the Templates Tab
- Edit item details
- Send items to zzTakeoff
- Modify zzType assignments
- Export to Excel

---

### Quantity-Based zzType Logic

**Important:** The zzType is automatically assigned based on job quantity:

| Quantity | zzType | Reasoning |
|----------|--------|-----------|
| **1** | `part` | Single-use item, treated as a part/component |
| **0** | Default | No quantity, uses your selected default |
| **> 1** | Default | Multiple units, uses your selected default |

**Example:**
- Job has Item ABC123 with Quantity = 1 → zzType = `part`
- Job has Item XYZ456 with Quantity = 12 → zzType = `count` (if default is 'count')
- Job has Item DEF789 with Quantity = 0 → zzType = `count` (if default is 'count')

You can override this logic by manually editing the zzType for any item before importing.

---

### Troubleshooting Job Import

#### "Job Database not found"
**Cause:** Job Database name is incorrect or database doesn't exist

**Solutions:**
1. Go to Settings (Ctrl+,)
2. Verify the Job Database name
3. Check that the database exists in SQL Server:
   ```sql
   SELECT name FROM sys.databases WHERE name LIKE '%JOB%'
   ```
4. Update the Job Database field in Settings if needed
5. Restart the application

#### "No permissions to access Job Database"
**Cause:** User doesn't have db_datareader role on Job Database

**Solutions:**
1. Re-run the `SQL_USER_SETUP.sql` script
2. Ensure `@EnableJobDatabase = 1` in the script
3. Verify permissions:
   ```sql
   USE [YOUR_JOB_DATABASE];
   SELECT
       dp.name AS UserName,
       r.name AS RoleName
   FROM sys.database_principals dp
   LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
   LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
   WHERE dp.name = 'dbx_user';
   ```

#### "Job 1447 not found"
**Cause:** Job number doesn't exist in the Job Database

**Solutions:**
1. Verify the job number is correct
2. Check jobs exist in the database:
   ```sql
   USE [YOUR_JOB_DATABASE];
   SELECT DISTINCT JobNo
   FROM Bill
   ORDER BY JobNo DESC;
   ```
3. Ensure the job has items in the Bill table:
   ```sql
   SELECT COUNT(*) FROM Bill WHERE JobNo = '1447';
   ```

#### "No items in job"
**Cause:** Job exists but has no items in the Bill table

**Solutions:**
1. Verify the job has been populated with items
2. Check the job status in Databuild application
3. Try a different job number

#### "Cross-database query failed"
**Cause:** SQL Server configuration or permissions issue

**Solutions:**
1. Verify both databases are on the same SQL Server instance
2. Test cross-database query manually:
   ```sql
   USE [YOUR_SYSTEM_DATABASE];
   SELECT TOP 1
       b.ItemCode,
       cc.Name
   FROM
       [YOUR_JOB_DATABASE].dbo.Bill b
   LEFT JOIN
       [YOUR_SYSTEM_DATABASE].dbo.CostCentres cc ON b.CostCentre = cc.Code
   WHERE
       b.JobNo = '1447';
   ```
3. If this fails, check database permissions and SQL Server configuration

---

### Best Practices

**1. Verify Job Number Before Import**
- Check the job number in Databuild application first
- Use recent jobs for most up-to-date pricing

**2. Choose Appropriate Default zzType**
- **Count** - Most common, for general items
- **Area** - For jobs with mostly area-based items (flooring, painting)
- **Linear** - For jobs with linear items (piping, cabling)
- Consider the job type when selecting default

**3. Review Before Importing**
- Preview all items to ensure correct data
- Check cost centres are valid
- Verify pricing looks correct
- Deselect any unwanted items

**4. Test with Small Jobs First**
- Try importing a small job (< 50 items) first
- Verify the process works correctly
- Then proceed with larger jobs

**5. Organize Imported Templates**
- Name templates clearly (e.g., "Job 1447 - Office Fit-out")
- Add notes about the job in template metadata
- Keep templates organized by project type

---

## FAQs

### Can I use Windows Authentication instead of SQL Authentication?

Currently, DBx Connector Vue supports **SQL Server Authentication only**. Windows Authentication support may be added in future versions.

### How do I change the database connection later?

1. Press **Ctrl + ,** (Control + Comma) to open settings
2. Or click the settings icon in the application toolbar
3. Update connection details and click "Save & Connect"

### Can multiple users connect to the same database?

Yes! Each user should have their own SQL Server login created using the scripts in Part 1. You can run the script multiple times with different usernames:
- `dbx_user1`, `dbx_user2`, etc.

### Where are my connection settings stored?

Connection settings are stored securely on your local computer:
- Location: `C:\Users\[YourUsername]\AppData\Roaming\dbx-connector-vue\config.json`
- Password is stored encrypted
- Settings are per-user, not shared

### Can I connect to multiple databases?

Yes! You can switch databases in the **Preferences** tab:
1. Open the **Preferences** tab
2. Use the database selector dropdown
3. Select a different database
4. Application will reconnect automatically

Note: All databases must be on the same SQL Server instance with the same credentials.

### Is my data secure?

Yes:
- All connections use encrypted SQL Server connections (TLS)
- Passwords are stored encrypted locally
- No data is sent to external servers (except zzTakeoff integration if used)
- Application runs entirely on your local network

### What if I forget my database password?

1. Contact your SQL Server administrator to reset the password
2. Or, if you have admin access, reset it yourself:
   ```sql
   USE master;
   ALTER LOGIN dbx_user WITH PASSWORD = 'NewPassword123!';
   ```
3. Update the password in the application settings

### How do I uninstall the application?

1. Open **Windows Settings** → **Apps** → **Installed Apps**
2. Find **DBx Connector Vue**
3. Click **Uninstall**
4. Follow the uninstallation wizard

Note: Your database user will remain - remove it manually if needed:
```sql
USE [YOUR_DATABASE_NAME];
DROP USER dbx_user;
GO
USE master;
DROP LOGIN dbx_user;
GO
```

### Can I use this with SQL Server Express?

Yes! DBx Connector Vue works with all editions of SQL Server:
- SQL Server Express (free edition)
- SQL Server Standard
- SQL Server Enterprise
- SQL Server Developer

### What version of SQL Server is required?

Minimum: **SQL Server 2012** or later

Recommended: **SQL Server 2016** or later for best performance

### How do I get support?

For issues or questions:
1. Check this guide and the [Troubleshooting](#troubleshooting) section
2. Contact your Databuild system administrator
3. Contact the application developer or support team

---

## Quick Reference Card

### Connection Information Template

```
Server:   _______________________
Database: _______________________
Username: dbx_user
Password: _______________________
```

### Common SQL Server Instance Names
- `localhost\SQLEXPRESS` - Local SQL Express
- `.\SQLEXPRESS` - Alternative local SQL Express
- `(local)\SQLEXPRESS` - Another local SQL Express format
- `SERVER-NAME` - Remote server with default instance
- `SERVER-NAME\INSTANCE` - Remote server with named instance

### Keyboard Shortcuts
- `Ctrl + ,` - Open Settings
- `Ctrl + R` - Reload/Refresh
- `F12` - Developer Tools (for debugging)

---

## Appendix: Security Best Practices

### Password Guidelines
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Don't use common words or personal information
- Change regularly (every 90 days recommended)

### Access Control
- Use **Option A (Read-Only)** for most users
- Only grant **Option B (Read-Write)** to authorized personnel
- Use **Option C (Granular)** for maximum security
- Regularly review who has access

### Network Security
- Keep SQL Server behind firewall
- Only allow connections from trusted IPs
- Use VPN for remote access
- Keep SQL Server patched and updated

### Monitoring
- Review SQL Server logs regularly
- Monitor for suspicious login attempts
- Track database changes if using read-write access

---

## Version History

- **v1.0** - Initial release (January 2025)
  - Database connection management
  - Catalogue, Recipes, Suppliers, Contacts tabs
  - zzTakeoff integration
  - Column management and preferences

---

**End of Setup Guide**

For additional help, contact your system administrator or application support team.
