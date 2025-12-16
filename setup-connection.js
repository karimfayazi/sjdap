// Script to help setup SQL Server connection
// Run with: node setup-connection.js

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('SQL Server Connection Setup Helper');
console.log('='.repeat(70));
console.log('\nTo fix the connection error, you need to find the SQL Server port.\n');

console.log('STEP 1: Find the Port Number');
console.log('--------------------------------');
console.log('1. Open SQL Server Configuration Manager');
console.log('   (Search for it in Start menu or run: SQLServerManager*.msc)');
console.log('');
console.log('2. Navigate to:');
console.log('   SQL Server Network Configuration → Protocols for SQLEXPRESS');
console.log('');
console.log('3. Double-click "TCP/IP"');
console.log('');
console.log('4. Go to "IP Addresses" tab');
console.log('');
console.log('5. Scroll to the very bottom to find "IPAll" section');
console.log('');
console.log('6. Look for "TCP Dynamic Ports" value');
console.log('   (It will be a number like: 1433, 49152, 49153, etc.)');
console.log('   ⚠️  WRITE DOWN THIS NUMBER!');
console.log('');

console.log('STEP 2: Create .env.local File');
console.log('--------------------------------');
console.log('After you find the port number, I will create the file for you.');
console.log('');

// Ask for port number
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the TCP Dynamic Ports number you found (or press Enter to skip): ', (port) => {
  if (port && port.trim()) {
    const portNumber = port.trim();
    const connectionString = `Server=SJDAP-MS-LT-KF,${portNumber};Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false`;
    
    const envContent = `# SQL Server PE Database Connection
# Server: SJDAP-MS-LT-KF\\SQLEXPRESS
# Database: db_PE
# Port: ${portNumber}
MSSQL_PE_DB_CONNECTION="${connectionString}"
`;

    const envPath = path.join(process.cwd(), '.env.local');
    
    try {
      fs.writeFileSync(envPath, envContent);
      console.log('\n✓ .env.local file created successfully!');
      console.log(`\nFile location: ${envPath}`);
      console.log(`\nConnection string: ${connectionString}`);
      console.log('\nNext steps:');
      console.log('1. Restart your Next.js application (stop with Ctrl+C, then run: npm run dev)');
      console.log('2. The connection should now work!\n');
    } catch (error) {
      console.error('\n✗ Error creating file:', error.message);
      console.log('\nPlease create .env.local manually with this content:');
      console.log(envContent);
    }
  } else {
    console.log('\nNo port entered. Please create .env.local manually:');
    console.log('\n1. Create a file named: .env.local');
    console.log('2. In your project root: D:\\PERSONAL\\NextJS\\NextJS\\sjdap\\.env.local');
    console.log('3. Add this line (replace <PORT> with the port number):');
    console.log('   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,<PORT>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"');
    console.log('\nExample if port is 49152:');
    console.log('   MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,49152;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"');
  }
  
  rl.close();
});

