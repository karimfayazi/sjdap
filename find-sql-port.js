// Helper script to find SQL Server Express port and test connection
// Run with: node find-sql-port.js

const sql = require('mssql');

async function findSQLPort() {
    console.log('='.repeat(60));
    console.log('SQL Server Express Connection Tester');
    console.log('Server: SJDAP-MS-LT-KF\\SQLEXPRESS');
    console.log('Database: db_PE');
    console.log('='.repeat(60));
    console.log('\nAttempting different connection methods...\n');
    
    const attempts = [
        { 
            name: 'Full Server Name', 
            conn: 'Server=SJDAP-MS-LT-KF\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;' 
        },
        { 
            name: 'Localhost', 
            conn: 'Server=localhost\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;' 
        },
        { 
            name: '127.0.0.1', 
            conn: 'Server=127.0.0.1\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;' 
        },
        { 
            name: '(local)', 
            conn: 'Server=(local)\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;' 
        },
        { 
            name: 'Default Port 1433', 
            conn: 'Server=localhost,1433;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;' 
        },
        { 
            name: 'Computer Name with Port 1433', 
            conn: 'Server=SJDAP-MS-LT-KF,1433;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=10;' 
        },
    ];

    let successCount = 0;
    for (const attempt of attempts) {
        try {
            process.stdout.write(`Trying ${attempt.name}... `);
            const pool = await sql.connect(attempt.conn);
            console.log(`✓ SUCCESS!`);
            
            // Test query
            const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as dbname');
            console.log(`  Database: ${result.recordset[0].dbname}`);
            console.log(`  Connection string that worked:`);
            console.log(`  ${attempt.conn}`);
            console.log(`\n  Add this to your .env.local file:`);
            console.log(`  MSSQL_PE_DB_CONNECTION="${attempt.conn}"`);
            
            await pool.close();
            successCount++;
            break; // Stop after first success
        } catch (error) {
            const errorMsg = error.message.substring(0, 80);
            console.log(`✗ Failed: ${errorMsg}`);
        }
    }
    
    if (successCount === 0) {
        console.log('\n' + '='.repeat(60));
        console.log('ALL CONNECTION ATTEMPTS FAILED');
        console.log('='.repeat(60));
        console.log('\nPlease follow these steps:\n');
        console.log('1. START SQL SERVER BROWSER SERVICE:');
        console.log('   - Press Win+R, type: services.msc');
        console.log('   - Find "SQL Server Browser"');
        console.log('   - Right-click → Start');
        console.log('   - Right-click → Properties → Set Startup type to "Automatic"');
        console.log('\n2. ENABLE TCP/IP PROTOCOL:');
        console.log('   - Open "SQL Server Configuration Manager"');
        console.log('   - Go to: SQL Server Network Configuration → Protocols for SQLEXPRESS');
        console.log('   - Right-click "TCP/IP" → Enable');
        console.log('   - Restart SQL Server (SQLEXPRESS) service');
        console.log('\n3. FIND THE PORT NUMBER:');
        console.log('   - In SQL Server Configuration Manager');
        console.log('   - Go to: SQL Server Network Configuration → Protocols for SQLEXPRESS');
        console.log('   - Double-click "TCP/IP" → IP Addresses tab');
        console.log('   - Scroll to bottom → Find "IPAll" section');
        console.log('   - Note the "TCP Dynamic Ports" value (e.g., 1433, 49152, etc.)');
        console.log('\n4. USE THE PORT IN CONNECTION STRING:');
        console.log('   - Create .env.local file in project root');
        console.log('   - Add: MSSQL_PE_DB_CONNECTION="Server=SJDAP-MS-LT-KF,<PORT>;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=60;Request Timeout=120000;Encrypt=false"');
        console.log('   - Replace <PORT> with the port number from step 3');
        console.log('\n5. RESTART YOUR APPLICATION');
        console.log('\n' + '='.repeat(60));
    }
}

findSQLPort().catch(console.error);
