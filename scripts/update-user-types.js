/**
 * Script to update UserType for all users in PE_User table
 * Sets all users to 'Editor' except karim.fayazi@sjdap.org which is set to 'Super Admin'
 * 
 * Run with: node scripts/update-user-types.js
 */

const sql = require('mssql');

// Database connection string - update if needed
const connectionString = process.env.MSSQL_CONNECTION || 
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_Users;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Encrypt=false;Request Timeout=120000";

async function updateUserTypes() {
	let pool;
	
	try {
		console.log('Connecting to database...');
		pool = await sql.connect(connectionString);
		console.log('✓ Connected to database');

		// First, set karim.fayazi@sjdap.org to 'Super Admin'
		console.log('\nUpdating karim.fayazi@sjdap.org to Super Admin...');
		const specialUserResult = await pool.request()
			.input('email', 'karim.fayazi@sjdap.org')
			.query(`
				UPDATE [SJDA_Users].[dbo].[PE_User]
				SET [UserType] = 'Super Admin',
					[user_update_date] = GETDATE()
				WHERE [email_address] = @email
			`);
		
		console.log(`✓ Updated ${specialUserResult.rowsAffected[0]} user(s) to Super Admin`);

		// Then, set all other users to 'Editor'
		console.log('\nUpdating all other users to Editor...');
		const allUsersResult = await pool.request()
			.input('email', 'karim.fayazi@sjdap.org')
			.query(`
				UPDATE [SJDA_Users].[dbo].[PE_User]
				SET [UserType] = 'Editor',
					[user_update_date] = GETDATE()
				WHERE [email_address] IS NULL 
				   OR ([email_address] IS NOT NULL AND [email_address] != @email)
			`);
		
		console.log(`✓ Updated ${allUsersResult.rowsAffected[0]} user(s) to Editor`);

		// Verify the updates
		console.log('\nVerifying updates...');
		const verifyResult = await pool.request().query(`
			SELECT [UserId], [email_address], [UserType]
			FROM [SJDA_Users].[dbo].[PE_User]
			ORDER BY [UserType], [email_address]
		`);

		console.log('\n=== User Type Summary ===');
		const userTypes = {};
		verifyResult.recordset.forEach(user => {
			const type = user.UserType || 'NULL';
			userTypes[type] = (userTypes[type] || 0) + 1;
		});

		Object.keys(userTypes).sort().forEach(type => {
			console.log(`${type}: ${userTypes[type]} user(s)`);
		});

		console.log('\n✓ Update completed successfully!');
		
	} catch (error) {
		console.error('✗ Error updating user types:', error.message);
		process.exit(1);
	} finally {
		if (pool) {
			await pool.close();
			console.log('\nDatabase connection closed');
		}
	}
}

// Run the script
updateUserTypes();
