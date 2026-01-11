# PowerShell Deployment Script for Network Server
# Deploys Next.js application to \\mis.sjdap.local\website-nextjs

param(
    [string]$NetworkPath = "\\mis.sjdap.local\website-nextjs",
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next.js Network Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if network path is accessible
Write-Host "Checking network path accessibility..." -ForegroundColor Yellow
if (-not (Test-Path $NetworkPath)) {
    Write-Host "ERROR: Network path '$NetworkPath' is not accessible!" -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. The network path exists" -ForegroundColor Yellow
    Write-Host "  2. You have write permissions" -ForegroundColor Yellow
    Write-Host "  3. The network drive is mapped or accessible" -ForegroundColor Yellow
    exit 1
}
Write-Host "Network path is accessible: $NetworkPath" -ForegroundColor Green
Write-Host ""

# Step 1: Build the application
if (-not $SkipBuild) {
    Write-Host "Step 1: Building Next.js application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping build (using existing build)..." -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Check if .next/standalone exists
Write-Host "Step 2: Checking build output..." -ForegroundColor Yellow
if (-not (Test-Path ".next\standalone")) {
    Write-Host "ERROR: Standalone build not found!" -ForegroundColor Red
    Write-Host "Please ensure next.config.js has 'output: standalone' configured" -ForegroundColor Yellow
    exit 1
}
Write-Host "Standalone build found!" -ForegroundColor Green
Write-Host ""

# Step 3: Create deployment directory structure
Write-Host "Step 3: Preparing deployment directory..." -ForegroundColor Yellow
$DeployPath = $NetworkPath
if (-not (Test-Path $DeployPath)) {
    New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null
}
Write-Host "Deployment directory ready: $DeployPath" -ForegroundColor Green
Write-Host ""

# Step 4: Copy standalone build
Write-Host "Step 4: Copying standalone build files..." -ForegroundColor Yellow
$StandaloneSource = ".next\standalone"
$StandaloneDest = Join-Path $DeployPath "standalone"

# Remove existing standalone folder if it exists
if (Test-Path $StandaloneDest) {
    Remove-Item -Path $StandaloneDest -Recurse -Force
}

# Copy standalone files
Copy-Item -Path $StandaloneSource -Destination $StandaloneDest -Recurse -Force
Write-Host "Standalone files copied!" -ForegroundColor Green
Write-Host ""

# Step 5: Copy static files
Write-Host "Step 5: Copying static files..." -ForegroundColor Yellow
$StaticSource = ".next\static"
$StaticDest = Join-Path $DeployPath "standalone\.next\static"

if (Test-Path $StaticSource) {
    if (Test-Path $StaticDest) {
        Remove-Item -Path $StaticDest -Recurse -Force
    }
    Copy-Item -Path $StaticSource -Destination $StaticDest -Recurse -Force
    Write-Host "Static files copied!" -ForegroundColor Green
} else {
    Write-Host "Warning: Static files not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Copy public folder
Write-Host "Step 6: Copying public folder..." -ForegroundColor Yellow
$PublicSource = "public"
$PublicDest = Join-Path $DeployPath "standalone\public"

if (Test-Path $PublicSource) {
    if (Test-Path $PublicDest) {
        Remove-Item -Path $PublicDest -Recurse -Force
    }
    Copy-Item -Path $PublicSource -Destination $PublicDest -Recurse -Force
    Write-Host "Public files copied!" -ForegroundColor Green
} else {
    Write-Host "Warning: Public folder not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Copy node_modules (production only)
Write-Host "Step 7: Copying production node_modules..." -ForegroundColor Yellow
$NodeModulesSource = "node_modules"
$NodeModulesDest = Join-Path $DeployPath "standalone\node_modules"

# Note: This copies all node_modules. For production, you might want to use npm ci --production
# For now, we'll copy the existing node_modules
if (Test-Path $NodeModulesSource) {
    Write-Host "Copying node_modules (this may take a while)..." -ForegroundColor Yellow
    if (Test-Path $NodeModulesDest) {
        Remove-Item -Path $NodeModulesDest -Recurse -Force
    }
    Copy-Item -Path $NodeModulesSource -Destination $NodeModulesDest -Recurse -Force
    Write-Host "node_modules copied!" -ForegroundColor Green
} else {
    Write-Host "Warning: node_modules not found. Run 'npm install' first." -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Copy package.json and package-lock.json
Write-Host "Step 8: Copying package files..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Copy-Item -Path "package.json" -Destination (Join-Path $DeployPath "standalone\package.json") -Force
}
if (Test-Path "package-lock.json") {
    Copy-Item -Path "package-lock.json" -Destination (Join-Path $DeployPath "standalone\package-lock.json") -Force
}
Write-Host "Package files copied!" -ForegroundColor Green
Write-Host ""

# Step 9: Create server.js if it doesn't exist in standalone
Write-Host "Step 9: Setting up server configuration..." -ForegroundColor Yellow
$ServerJsPath = Join-Path $DeployPath "standalone\server.js"
if (-not (Test-Path $ServerJsPath)) {
    $ServerJsContent = @"
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
"@
    Set-Content -Path $ServerJsPath -Value $ServerJsContent
    Write-Host "server.js created!" -ForegroundColor Green
} else {
    Write-Host "server.js already exists, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 10: Create .env file template if needed
Write-Host "Step 10: Checking environment configuration..." -ForegroundColor Yellow
$EnvTemplatePath = Join-Path $DeployPath "standalone\.env.example"
if (-not (Test-Path $EnvTemplatePath)) {
    $EnvTemplate = @"
# Environment Variables
# Copy this file to .env and update with your values

NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Add your environment variables here
# DATABASE_URL=...
# API_KEY=...
"@
    Set-Content -Path $EnvTemplatePath -Value $EnvTemplate
    Write-Host ".env.example created!" -ForegroundColor Green
}
Write-Host ""

# Step 11: Create start script
Write-Host "Step 11: Creating start scripts..." -ForegroundColor Yellow
$StartScriptPath = Join-Path $DeployPath "start-server.ps1"
$StartScriptContent = @"
# Start Next.js Server on Network Location
# Run this script from the network server

`$env:NODE_ENV = "production"
`$env:PORT = if (`$env:PORT) { `$env:PORT } else { 3000 }
`$env:HOSTNAME = if (`$env:HOSTNAME) { `$env:HOSTNAME } else { "0.0.0.0" }

Write-Host "Starting Next.js server..." -ForegroundColor Cyan
Write-Host "Port: `$env:PORT" -ForegroundColor Yellow
Write-Host "Hostname: `$env:HOSTNAME" -ForegroundColor Yellow
Write-Host ""

# Change to standalone directory
Set-Location `$PSScriptRoot\standalone

# Start the server
node server.js
"@
Set-Content -Path $StartScriptPath -Value $StartScriptContent
Write-Host "start-server.ps1 created!" -ForegroundColor Green

$StartBatPath = Join-Path $DeployPath "start-server.bat"
$StartBatContent = @"
@echo off
echo Starting Next.js server...
cd /d "%~dp0standalone"
set NODE_ENV=production
set PORT=3000
set HOSTNAME=0.0.0.0
node server.js
pause
"@
Set-Content -Path $StartBatPath -Value $StartBatContent
Write-Host "start-server.bat created!" -ForegroundColor Green
Write-Host ""

# Step 12: Create README for deployment
Write-Host "Step 12: Creating deployment README..." -ForegroundColor Yellow
$ReadmePath = Join-Path $DeployPath "DEPLOYMENT_README.md"
$ReadmeContent = @"
# Next.js Application Deployment

This application has been deployed to the network server.

## Running the Application

### Option 1: Using PowerShell (Recommended)
```powershell
.\start-server.ps1
```

### Option 2: Using Batch File
```cmd
start-server.bat
```

### Option 3: Manual Start
```cmd
cd standalone
set NODE_ENV=production
set PORT=3000
set HOSTNAME=0.0.0.0
node server.js
```

## Configuration

1. **Environment Variables**: Copy `.env.example` to `.env` and configure your environment variables
2. **Port**: Default port is 3000. Change by setting `PORT` environment variable
3. **Hostname**: Default is 0.0.0.0 (listens on all interfaces). Change by setting `HOSTNAME` environment variable

## Accessing the Application

Once started, the application will be available at:
- http://localhost:3000 (local access)
- http://[server-ip]:3000 (network access)

## Requirements

- Node.js installed on the server
- Network access to the deployment location
- Required environment variables configured

## Troubleshooting

1. **Port already in use**: Change the PORT environment variable
2. **Cannot access from network**: Ensure firewall allows port 3000
3. **Module not found**: Run `npm install` in the standalone directory
"@
Set-Content -Path $ReadmePath -Value $ReadmeContent
Write-Host "DEPLOYMENT_README.md created!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Navigate to: $DeployPath" -ForegroundColor White
Write-Host "2. Configure .env file if needed" -ForegroundColor White
Write-Host "3. Run: .\start-server.ps1" -ForegroundColor White
Write-Host ""
Write-Host "The application will be available at http://[server-ip]:3000" -ForegroundColor Cyan
Write-Host ""








