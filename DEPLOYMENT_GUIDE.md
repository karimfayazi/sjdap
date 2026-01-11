# Network Server Deployment Guide

This guide explains how to deploy your Next.js application to the network server at `\\mis.sjdap.local\website-nextjs` and run it there.

## Prerequisites

1. **Network Access**: Ensure you have write access to `\\mis.sjdap.local\website-nextjs`
2. **Node.js**: Node.js should be installed on the network server (or accessible from there)
3. **Build Tools**: Ensure npm is available on your local machine

## Deployment Steps

### Step 1: Run the Deployment Script

Open PowerShell in the project root directory and run:

```powershell
.\deploy-to-network.ps1
```

Or with custom network path:

```powershell
.\deploy-to-network.ps1 -NetworkPath "\\mis.sjdap.local\website-nextjs"
```

To skip build and use existing build:

```powershell
.\deploy-to-network.ps1 -SkipBuild
```

### What the Script Does

1. **Builds the application** using `npm run build`
2. **Copies standalone build** to the network location
3. **Copies static files** (.next/static)
4. **Copies public folder** (uploads, images, etc.)
5. **Copies node_modules** (production dependencies)
6. **Creates server.js** for running the application
7. **Creates start scripts** (PowerShell and Batch)
8. **Creates deployment documentation**

## Running on the Network Server

### Option 1: Using PowerShell (Recommended)

1. Navigate to the network location:
   ```powershell
   cd \\mis.sjdap.local\website-nextjs
   ```

2. Run the start script:
   ```powershell
   .\start-server.ps1
   ```

### Option 2: Using Batch File

1. Navigate to the network location:
   ```cmd
   cd \\mis.sjdap.local\website-nextjs
   ```

2. Run the batch file:
   ```cmd
   start-server.bat
   ```

### Option 3: Manual Start

1. Navigate to the standalone directory:
   ```cmd
   cd \\mis.sjdap.local\website-nextjs\standalone
   ```

2. Set environment variables:
   ```cmd
   set NODE_ENV=production
   set PORT=3000
   set HOSTNAME=0.0.0.0
   ```

3. Start the server:
   ```cmd
   node server.js
   ```

## Configuration

### Environment Variables

1. Copy `.env.example` to `.env` in the `standalone` directory:
   ```cmd
   cd \\mis.sjdap.local\website-nextjs\standalone
   copy .env.example .env
   ```

2. Edit `.env` with your configuration:
   ```
   NODE_ENV=production
   PORT=3000
   HOSTNAME=0.0.0.0
   # Add your other environment variables here
   ```

### Port Configuration

- Default port: **3000**
- To change: Set `PORT` environment variable
- Example: `set PORT=8080`

### Hostname Configuration

- Default: **0.0.0.0** (listens on all network interfaces)
- To change: Set `HOSTNAME` environment variable
- Example: `set HOSTNAME=192.168.1.100`

## Accessing the Application

Once the server is running:

- **Local access**: http://localhost:3000
- **Network access**: http://[server-ip]:3000
- **From other machines**: http://mis.sjdap.local:3000 (if DNS is configured)

## Running as a Windows Service (Optional)

To run the application as a Windows service, you can use tools like:

1. **NSSM (Non-Sucking Service Manager)**
   - Download from: https://nssm.cc/
   - Install as service pointing to `node.exe` and the `server.js` path

2. **PM2** (if Node.js is installed on server)
   ```cmd
   npm install -g pm2
   cd \\mis.sjdap.local\website-nextjs\standalone
   pm2 start server.js --name nextjs-app
   pm2 save
   pm2 startup
   ```

## Troubleshooting

### Network Path Not Accessible

**Problem**: Cannot access `\\mis.sjdap.local\website-nextjs`

**Solutions**:
1. Check network connectivity
2. Verify you have write permissions
3. Try mapping the network drive first:
   ```cmd
   net use Z: \\mis.sjdap.local\website-nextjs
   ```
   Then use `Z:\` instead of the UNC path

### Port Already in Use

**Problem**: Error "Port 3000 is already in use"

**Solutions**:
1. Change the port:
   ```cmd
   set PORT=3001
   ```
2. Find and stop the process using port 3000:
   ```cmd
   netstat -ano | findstr :3000
   taskkill /PID [process-id] /F
   ```

### Cannot Access from Network

**Problem**: Application runs but not accessible from other machines

**Solutions**:
1. Check Windows Firewall settings
2. Ensure port 3000 is allowed in firewall
3. Verify HOSTNAME is set to 0.0.0.0 (not localhost)
4. Check if server IP is correct

### Module Not Found Errors

**Problem**: "Cannot find module" errors when starting

**Solutions**:
1. Navigate to standalone directory:
   ```cmd
   cd \\mis.sjdap.local\website-nextjs\standalone
   ```
2. Install dependencies:
   ```cmd
   npm install --production
   ```

### Build Errors

**Problem**: Build fails during deployment

**Solutions**:
1. Check Node.js version (should match production)
2. Clear .next folder and rebuild:
   ```cmd
   rmdir /s /q .next
   npm run build
   ```
3. Check for TypeScript/ESLint errors

## Updating the Deployment

To update the application:

1. Make your changes locally
2. Run the deployment script again:
   ```powershell
   .\deploy-to-network.ps1
   ```
3. Restart the server on the network location

## File Structure on Network Server

After deployment, the structure will be:

```
\\mis.sjdap.local\website-nextjs\
├── standalone\
│   ├── .next\
│   ├── node_modules\
│   ├── public\
│   ├── server.js
│   ├── package.json
│   └── .env (create from .env.example)
├── start-server.ps1
├── start-server.bat
└── DEPLOYMENT_README.md
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files with sensitive data
2. **Firewall**: Configure Windows Firewall to only allow necessary ports
3. **Permissions**: Limit write access to the deployment directory
4. **HTTPS**: Consider setting up reverse proxy (IIS, nginx) with SSL certificate

## Support

For issues or questions:
1. Check the deployment logs
2. Review server console output
3. Check Windows Event Viewer for system errors








