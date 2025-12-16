# SQL Server Connection Setup

## Quick Fix Steps

### Step 1: Find the SQL Server Port

1. **Open SQL Server Configuration Manager**
   - Press `Win + R`
   - Type: `SQLServerManager*.msc` (or search in Start menu)
   - Press Enter

2. **Navigate to TCP/IP Settings**
   - Expand: **SQL Server Network Configuration**
   - Click: **Protocols for SQLEXPRESS**
   - Double-click: **TCP/IP**

3. **Find the Port Number**
   - Click: **IP Addresses** tab
   - Scroll to the very bottom
   - Find the **"IPAll"** section
   - Look for **"TCP Dynamic Ports"** value
   - **⚠️ Write down this number!** (e.g., 1433, 49152, 49153, etc.)

### Step 2: Create .env.local File

1. **Create the file**
   - Location: `D:\PERSONAL\NextJS\NextJS\sjdap\.env.local`
   - Create a new file named exactly: `.env.local`

2. **Add this content** (replace `<PORT>` with the number from Step 1):

```
MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,<PORT>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
```

**Example:** If your port is `49152`, the file should contain:

```
MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,49152;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
```

### Step 3: Restart Your Application

1. Stop your Next.js application (Press `Ctrl+C`)
2. Start it again: `npm run dev`
3. The connection should now work!

---

## Alternative: If You Can't Find the Port

If you can't find the port or it's not working, try this connection string format:

```
MSSQL_PE_DB_CONNECTION="Server=localhost,1433;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
```

Or check if SQL Server Browser service is running and try:

```
MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
```

