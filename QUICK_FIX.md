# Quick Fix for SQL Server Connection

## The Problem
SQL Server Express cannot be found because:
1. SQL Server Browser service is not running, OR
2. The port number is not known

## Solution Options

### Option 1: Start SQL Server Browser (Easiest)

1. Press `Win + R`, type `services.msc`, press Enter
2. Find **"SQL Server Browser"** in the list
3. Right-click → **Start**
4. Right-click → **Properties** → Set **Startup type** to **"Automatic"**
5. Restart your Next.js application

This should allow the connection using: `SJDAP-MS-LT-KF\SQLEXPRESS`

### Option 2: Find Port and Create .env.local File

1. **Open SQL Server Configuration Manager**
   - Search for it in Start menu
   - Or run: `SQLServerManager*.msc` (where * is your SQL Server version)

2. **Navigate to TCP/IP settings:**
   - SQL Server Network Configuration → Protocols for SQLEXPRESS
   - Double-click **"TCP/IP"**

3. **Find the Port:**
   - Go to **"IP Addresses"** tab
   - Scroll to the very bottom to find **"IPAll"** section
   - Look for **"TCP Dynamic Ports"** value (e.g., 1433, 49152, 49153, etc.)
   - **Write down this number!**

4. **Create .env.local file:**
   - In your project root folder: `D:\PERSONAL\NextJS\NextJS\sjdap`
   - Create a new file named: `.env.local`
   - Add this line (replace `<PORT>` with the number from step 3):
   ```
   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,<PORT>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
   ```
   
   Example if port is 49152:
   ```
   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,49152;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
   ```

5. **Restart your Next.js application:**
   - Stop it (Ctrl+C)
   - Start it again: `npm run dev`

### Option 3: Check if SQL Server is Running

Run this in PowerShell to check SQL Server services:
```powershell
Get-Service | Where-Object {$_.DisplayName -like "*SQL Server*"}
```

Make sure **SQL Server (SQLEXPRESS)** is **Running**.

### Option 4: Enable TCP/IP Protocol

If TCP/IP is disabled:

1. Open SQL Server Configuration Manager
2. SQL Server Network Configuration → Protocols for SQLEXPRESS
3. Right-click **"TCP/IP"** → **Enable**
4. Restart **SQL Server (SQLEXPRESS)** service
5. Then follow Option 1 or Option 2 above

## Still Not Working?

If none of the above works, try this connection string format in `.env.local`:

```
MSSQL_PE_DB_CONNECTION="Server=localhost,1433;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
```

Or check if you can connect using SQL Server Management Studio (SSMS) with:
- Server name: `SJDAP-MS-LT-KF\SQLEXPRESS`
- Authentication: Windows Authentication

If SSMS can connect, note the connection details and use the same format in `.env.local`.

