/**
 * RBAC Helper Functions
 * Functions to check permissions and access rights
 */

import { getDb } from "./db";

/**
 * Allowed email for settings access (in addition to Super Admin)
 */
const ALLOWED_SETTINGS_EMAIL = "karim.fayazi@sjdap.org";

/**
 * Check if user is Super Admin (handles both 'Super Admin' and 'Supper Admin' typo)
 * Also allows access for the specific authorized email
 */
export async function isSuperAdmin(userId: string | number): Promise<boolean> {
	try {
		const pool = await getDb();
		const request = pool.request();
		
		// Handle both numeric UserId and string email_address
		const userIdNum = !isNaN(Number(userId)) ? parseInt(String(userId), 10) : null;
		
		if (userIdNum !== null) {
			request.input("user_id", userIdNum);
		} else {
			request.input("user_id", userId);
		}
		request.input("email_address", userId);

		const result = await request.query(`
			SELECT TOP(1) [UserType], [UserId], [email_address]
			FROM [SJDA_Users].[dbo].[PE_User]
			WHERE ([UserId] = @user_id OR [email_address] = @email_address)
		`);

		const user = result.recordset?.[0];
		if (!user) {
			console.log('[isSuperAdmin] User not found:', { userId, userIdNum });
			return false;
		}

		const userType = user.UserType && typeof user.UserType === 'string' 
			? user.UserType.trim() 
			: '';

		// Handle both 'Super Admin' and 'Supper Admin' typo (case-insensitive)
		const userTypeLower = userType.toLowerCase();
		const isSuperAdminByType = userType === 'Super Admin' 
			|| userType === 'Supper Admin'
			|| userTypeLower === 'super admin'
			|| userTypeLower === 'supper admin';
		
		// Check if email matches the allowed email (case-insensitive)
		const userEmail = user.email_address && typeof user.email_address === 'string'
			? user.email_address.trim().toLowerCase()
			: '';
		const isAllowedEmail = userEmail === ALLOWED_SETTINGS_EMAIL.toLowerCase();
		
		const hasAccess = isSuperAdminByType || isAllowedEmail;
		
		console.log('[isSuperAdmin] Check result:', {
			userId: userId,
			userIdNum: userIdNum,
			userType: userType,
			userTypeLower: userTypeLower,
			isSuperAdminByType: isSuperAdminByType,
			userEmail: user.email_address,
			isAllowedEmail: isAllowedEmail,
			hasAccess: hasAccess,
			foundUserId: user.UserId,
			foundEmail: user.email_address
		});
		
		return hasAccess;
	} catch (error) {
		console.error('[isSuperAdmin] Error checking user:', error);
		return false;
	}
}

/**
 * Check if user has permission for a specific route and action
 * Checks: User roles -> Role permissions -> User permission overrides
 */
export async function hasPermission(
	userId: string | number,
	routePath: string,
	actionKey: string
): Promise<boolean> {
	// RBAC DISABLED: Allow all authenticated users
	const { isRBACDisabled } = await import("./rbac-config");
	if (isRBACDisabled()) {
		return true;
	}

	try {
		// Super Admin has all permissions
		if (await isSuperAdmin(userId)) {
			return true;
		}

		const pool = await getDb();
		const request = pool.request();
		request.input("user_id", userId);
		request.input("email_address", userId);
		request.input("route_path", routePath);
		// Normalize action key to uppercase (DB stores ActionKey as uppercase)
		const normalizedActionKey = actionKey.toUpperCase();
		request.input("action_key", normalizedActionKey);

		// Check user permission overrides first (most specific)
		// Use canonical permission check: PageId -> PermissionId -> UserPermission
		const userPermResult = await request.query(`
			SELECT TOP(1) up.[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
				ON pg.[PageId] = p.[PageId] 
				AND UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_UserPermission] up 
				ON p.[PermissionId] = up.[PermissionId]
			WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
				AND pg.[RoutePath] = @route_path
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
		`);

		if (userPermResult.recordset.length > 0) {
			const isAllowed = userPermResult.recordset[0].IsAllowed;
			return isAllowed === true || isAllowed === 1 || isAllowed === 'Yes';
		}

		// Check role permissions
		// Use canonical permission check: PageId -> PermissionId -> RolePermission
		const rolePermResult = await request.query(`
			SELECT TOP(1) rp.[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
				ON pg.[PageId] = p.[PageId] 
				AND UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_RolePermission] rp 
				ON p.[PermissionId] = rp.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_UserRole] ur 
				ON rp.[RoleId] = ur.[RoleId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r 
				ON ur.[RoleId] = r.[RoleId]
			WHERE (ur.[UserId] = @user_id OR ur.[UserId] = @email_address)
				AND pg.[RoutePath] = @route_path
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
				AND r.[IsActive] = 1
			ORDER BY rp.[IsAllowed] DESC
		`);

		if (rolePermResult.recordset.length > 0) {
			const isAllowed = rolePermResult.recordset[0].IsAllowed;
			return isAllowed === true || isAllowed === 1 || isAllowed === 'Yes';
		}

		return false;
	} catch (error) {
		console.error('[hasPermission] Error checking permission:', error);
		return false;
	}
}

/**
 * Get all permissions for a user (for debugging/admin purposes)
 */
export async function getUserPermissions(userId: string | number): Promise<{
	roles: Array<{ RoleId: number; RoleName: string }>;
	rolePermissions: Array<{
		PermissionId: number;
		PermKey: string;
		ActionKey: string;
		RoutePath: string;
		IsAllowed: boolean;
	}>;
	userPermissions: Array<{
		PermissionId: number;
		PermKey: string;
		ActionKey: string;
		RoutePath: string;
		IsAllowed: boolean;
	}>;
}> {
	try {
		const pool = await getDb();
		const request = pool.request();
		request.input("user_id", userId);
		request.input("email_address", userId);

		// Get user roles
		const rolesResult = await request.query(`
			SELECT r.[RoleId], r.[RoleName]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserRole] ur
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r ON ur.[RoleId] = r.[RoleId]
			WHERE (ur.[UserId] = @user_id OR ur.[UserId] = @email_address)
				AND r.[IsActive] = 1
		`);

		// Get role permissions
		const rolePermsResult = await request.query(`
			SELECT 
				p.[PermissionId],
				p.[PermKey],
				p.[ActionKey],
				pg.[RoutePath],
				rp.[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserRole] ur
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_RolePermission] rp ON ur.[RoleId] = rp.[RoleId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON rp.[PermissionId] = p.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			WHERE (ur.[UserId] = @user_id OR ur.[UserId] = @email_address)
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
		`);

		// Get user permission overrides
		const userPermsResult = await request.query(`
			SELECT 
				p.[PermissionId],
				p.[PermKey],
				p.[ActionKey],
				pg.[RoutePath],
				up.[IsAllowed]
			FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
			INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
			WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
				AND p.[IsActive] = 1
				AND pg.[IsActive] = 1
		`);

		return {
			roles: rolesResult.recordset.map((r: any) => ({
				RoleId: r.RoleId,
				RoleName: r.RoleName
			})),
			rolePermissions: rolePermsResult.recordset.map((rp: any) => ({
				PermissionId: rp.PermissionId,
				PermKey: rp.PermKey,
				ActionKey: rp.ActionKey,
				RoutePath: rp.RoutePath,
				IsAllowed: rp.IsAllowed === true || rp.IsAllowed === 1 || rp.IsAllowed === 'Yes'
			})),
			userPermissions: userPermsResult.recordset.map((up: any) => ({
				PermissionId: up.PermissionId,
				PermKey: up.PermKey,
				ActionKey: up.ActionKey,
				RoutePath: up.RoutePath,
				IsAllowed: up.IsAllowed === true || up.IsAllowed === 1 || up.IsAllowed === 'Yes'
			}))
		};
	} catch (error) {
		console.error('[getUserPermissions] Error fetching permissions:', error);
		return { roles: [], rolePermissions: [], userPermissions: [] };
	}
}
