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
- Integration with zzTakeoff API

This guide will walk you through the complete setup process, from creating database permissions to connecting the application.

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

### Step 1.1: Identify Your Database

Before proceeding, you need to know your Databuild database name.

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server instance
3. In the Object Explorer, expand **Databases**
4. Look for your Databuild database - common names include:
   - `CROWNESYS`
   - `T_Esys`
   - `Databuild_Production`
   - Or your company-specific name

**Write down your database name:** `_______________________`

### Step 1.2: Create Database User

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
