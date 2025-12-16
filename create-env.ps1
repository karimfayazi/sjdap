# PowerShell script to create .env.local file
# Run with: .\create-env.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SQL Server Connection Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To create .env.local file, you need the SQL Server port number." -ForegroundColor Yellow
Write-Host ""

Write-Host "STEP 1: Find the Port Number" -ForegroundColor Green
Write-Host "1. Open SQL Server Configuration Manager" -ForegroundColor White
Write-Host "2. Go to: SQL Server Network Configuration → Protocols for SQLEXPRESS" -ForegroundColor White
Write-Host "3. Double-click 'TCP/IP' → IP Addresses tab" -ForegroundColor White
Write-Host "4. Scroll to 'IPAll' section → Find 'TCP Dynamic Ports' value" -ForegroundColor White
Write-Host ""

$port = Read-Host "Enter the TCP Dynamic Ports number (e.g., 1433, 49152, etc.)"

if ($port -and $port.Trim()) {
    $portNumber = $port.Trim()
    $connectionString = "Server=SJDAP-MS-LT-KF,$portNumber;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"
    
    $envContent = @"
# SQL Server PE Database Connection
# Server: SJDAP-MS-LT-KF\SQLEXPRESS
# Database: db_PE
# Port: $portNumber
MSSQL_PE_DB_CONNECTION="$connectionString"
"@
    
    $envPath = Join-Path $PSScriptRoot ".env.local"
    
    try {
        $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
        Write-Host ""
        Write-Host "✓ .env.local file created successfully!" -ForegroundColor Green
        Write-Host "File location: $envPath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Connection string:" -ForegroundColor Yellow
        Write-Host $connectionString -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Green
        Write-Host "1. Restart your Next.js application (Ctrl+C, then: npm run dev)" -ForegroundColor White
        Write-Host "2. The connection should now work!" -ForegroundColor White
    } catch {
        Write-Host ""
        Write-Host "✗ Error creating file: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please create .env.local manually with this content:" -ForegroundColor Yellow
        Write-Host $envContent -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "No port entered. Please create .env.local manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Create file: .env.local in project root" -ForegroundColor White
    Write-Host "2. Add this line (replace <PORT> with port number):" -ForegroundColor White
    Write-Host '   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,<PORT>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"' -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

