import sql, { ConnectionPool } from "mssql";

let pool: ConnectionPool | null = null;
let baselinePool: ConnectionPool | null = null;
let fdpPool: ConnectionPool | null = null;
let planInterventionPool: ConnectionPool | null = null;
let trackingSystemPool: ConnectionPool | null = null;
let peDbPool: ConnectionPool | null = null;
let peDbLivePool: ConnectionPool | null = null;

const defaultConnection =
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_Users;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Encrypt=false;Request Timeout=120000";

const baselineConnection =
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_BASELINEDB;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Encrypt=false;Request Timeout=120000";

const fdpConnection =
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_FDP;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Encrypt=false;Request Timeout=120000";

const planInterventionConnection =
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_Plan_Intervetnion;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Encrypt=false;Request Timeout=120000";

const trackingSystemConnection =
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_Tracking_System;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Encrypt=false;Request Timeout=120000";

// Connect to SJDA_Users database, but can query db_PE tables using 3-part names
const peDbLiveConnection =
	"Data Source=sql.live.sjdap.local;Initial Catalog=SJDA_Users;Integrated Security=False;User ID=_websitsjda;Password=MIS4SJDA@786;Connect Timeout=60;Max Pool Size=300;Request Timeout=120000;Encrypt=false";

// Local SQL Server Express connection - uses Windows Authentication
// Try different connection formats:
// 1. Named instance: SJDAP-MS-LT-KF\SQLEXPRESS
// 2. Local with instance: .\SQLEXPRESS or (local)\SQLEXPRESS
// 3. With explicit port: SJDAP-MS-LT-KF,1433 (if default port)
// If you need SQL Authentication, change Integrated Security=True to False and add User ID and Password
const peDbConnection =
	process.env.MSSQL_PE_DB_CONNECTION || 
	"Server=.\\SQLEXPRESS;Database=db_PE;Integrated Security=true;TrustServerCertificate=true;Connect Timeout=60;Request Timeout=120000";

export async function getDb(): Promise<ConnectionPool> {
	if (pool) return pool;

	const connectionString = process.env.MSSQL_CONNECTION || defaultConnection;
	pool = await sql.connect(connectionString);
	return pool;
}

export async function getBaselineDb(): Promise<ConnectionPool> {
	if (baselinePool) return baselinePool;

	const connectionString = process.env.MSSQL_BASELINE_CONNECTION || baselineConnection;
	baselinePool = await sql.connect(connectionString);
	return baselinePool;
}

export async function getFdpDb(): Promise<ConnectionPool> {
	if (fdpPool) return fdpPool;

	const connectionString = process.env.MSSQL_FDP_CONNECTION || fdpConnection;
	fdpPool = await sql.connect(connectionString);
	return fdpPool;
}

export async function getPlanInterventionDb(): Promise<ConnectionPool> {
	if (planInterventionPool) return planInterventionPool;

	const connectionString = process.env.MSSQL_PLAN_INTERVENTION_CONNECTION || planInterventionConnection;
	planInterventionPool = await sql.connect(connectionString);
	return planInterventionPool;
}

export async function getTrackingSystemDb(): Promise<ConnectionPool> {
	if (trackingSystemPool) return trackingSystemPool;

	const connectionString = process.env.MSSQL_TRACKING_SYSTEM_CONNECTION || trackingSystemConnection;
	trackingSystemPool = await sql.connect(connectionString);
	return trackingSystemPool;
}

export async function getPeDb(): Promise<ConnectionPool> {
	if (peDbLivePool) return peDbLivePool;

	// Connect to sql.live.sjdap.local server with db_PE database
	// If login fails, the user _websitsjda may not have access to db_PE database
	// Contact database administrator to grant access
	const connectionString = process.env.MSSQL_PE_DB_CONNECTION || peDbLiveConnection;

	try {
		console.log("Connecting to SQL Server: sql.live.sjdap.local (db_PE)");
		peDbLivePool = await sql.connect(connectionString);
		console.log("✓ Successfully connected to SQL Server");
		return peDbLivePool;
	} catch (error: any) {
		console.error("✗ Connection failed:", error.message);
		
		// Provide helpful error message
		if (error.message && error.message.includes("Login failed")) {
			throw new Error(
				`Login failed for user '_websitsjda' to database 'db_PE'.\n\n` +
				`Possible solutions:\n` +
				`1. The user '_websitsjda' may not have access to the 'db_PE' database\n` +
				`2. Contact database administrator to grant access to 'db_PE' database\n` +
				`3. Or provide different credentials via MSSQL_PE_DB_CONNECTION environment variable\n\n` +
				`Original error: ${error.message}`
			);
		}
		
		throw new Error(`Failed to connect to SQL Server (sql.live.sjdap.local): ${error.message}`);
	}
}

export type UserRow = {
	USER_ID: string;
	USER_FULL_NAME: string | null;
	PASSWORD: string | null;
	RE_PASSWORD: string | null;
	USER_TYPE: string | null;
	DESIGNATION: string | null;
	ACTIVE: boolean | number | null;
	CAN_ADD: boolean | number | null;
	CAN_UPDATE: boolean | number | null;
	CAN_DELETE: boolean | number | null;
	CAN_UPLOAD: boolean | number | null;
	SEE_REPORTS: boolean | number | null;
	UPDATE_DATE: Date | null;
	PROGRAM: string | null;
	REGION: string | null;
	AREA_CODE: string | null;
	SECTION: string | null;
	FDP: string | null;
	PLAN_INTERVENTION: string | null;
	TRACKING_SYSTEM: string | null;
	RC: string | null;
	LC: string | null;
	REPORT_TO: string | null;
	ROP_EDIT: boolean | number | null;
	access_loans: boolean | number | null;
	baseline_access: boolean | number | null;
	bank_account: boolean | number | null;
	Supper_User: boolean | number | null;
};


