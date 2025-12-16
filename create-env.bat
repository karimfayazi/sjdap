@echo off
echo ========================================
echo SQL Server Connection Setup
echo ========================================
echo.
echo To create .env.local file, you need the SQL Server port number.
echo.
echo STEP 1: Find the Port Number
echo 1. Open SQL Server Configuration Manager
echo 2. Go to: SQL Server Network Configuration -^> Protocols for SQLEXPRESS
echo 3. Double-click "TCP/IP" -^> IP Addresses tab
echo 4. Scroll to "IPAll" section -^> Find "TCP Dynamic Ports" value
echo.
set /p PORT="Enter the TCP Dynamic Ports number (e.g., 1433, 49152): "

if "%PORT%"=="" (
    echo.
    echo No port entered. Please create .env.local manually.
    echo.
    echo Create file: .env.local
    echo Add this line (replace ^<PORT^> with port number):
    echo MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,^<PORT^>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
    pause
    exit /b
)

echo.
echo Creating .env.local file...
echo MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,%PORT%;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false" > .env.local

echo.
echo ✓ .env.local file created successfully!
echo.
echo File location: %CD%\.env.local
echo.
echo Connection string:
type .env.local
echo.
echo Next steps:
echo 1. Restart your Next.js application (Ctrl+C, then: npm run dev)
echo 2. The connection should now work!
echo.
pause

