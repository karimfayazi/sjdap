-- ============================================
-- DIAGNOSTIC SQL QUERIES FOR USER 148
-- User: shehla.altaf@sjdap.org
-- Route: /dashboard/feasibility-approval
-- ============================================

-- 1. Check user basic info
SELECT 
    [UserId],
    [email_address],
    [UserFullName],
    [UserType],
    [Regional_Council],
    [Local_Council],
    [AccessScope]
FROM [SJDA_Users].[dbo].[PE_User]
WHERE [UserId] = 148 OR [email_address] = 'shehla.altaf@sjdap.org';

-- 2. Find the PageId for /dashboard/feasibility-approval
SELECT 
    [PageId],
    [PageName],
    [RoutePath],
    [IsActive]
FROM [SJDA_Users].[dbo].[PE_Rights_Page]
WHERE [RoutePath] = '/dashboard/feasibility-approval'
   OR [RoutePath] LIKE '/dashboard/feasibility-approval%'
ORDER BY [RoutePath];

-- 3. Find all PermissionIds for feasibility-approval page (view action)
SELECT 
    p.[PermissionId],
    p.[PageId],
    p.[ActionKey],
    p.[IsActive],
    pg.[PageName],
    pg.[RoutePath]
FROM [SJDA_Users].[dbo].[PE_Rights_Permission] p
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1;

-- 4. Check user's assigned PermissionIds
SELECT 
    up.[UserId],
    up.[PermissionId],
    up.[IsAllowed],
    up.[AssignedAt],
    p.[ActionKey],
    pg.[PageName],
    pg.[RoutePath]
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = 148 OR up.[UserId] = 'shehla.altaf@sjdap.org')
ORDER BY pg.[RoutePath], p.[ActionKey];

-- 5. Check if user has the specific permission for feasibility-approval
SELECT 
    up.[UserId],
    up.[PermissionId],
    up.[IsAllowed],
    p.[ActionKey],
    pg.[PageName],
    pg.[RoutePath],
    CASE 
        WHEN up.[IsAllowed] = 1 OR up.[IsAllowed] = 'Yes' OR up.[IsAllowed] = 'yes' OR up.[IsAllowed] = 'YES' OR up.[IsAllowed] = 1 THEN 'ALLOWED'
        ELSE 'DENIED'
    END AS AccessStatus
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = 148 OR up.[UserId] = 'shehla.altaf@sjdap.org')
  AND pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1;

-- 6. Check role-based permissions for this user
SELECT 
    ur.[UserId],
    ur.[RoleId],
    r.[RoleName],
    rp.[PermissionId],
    rp.[IsAllowed],
    p.[ActionKey],
    pg.[PageName],
    pg.[RoutePath]
FROM [SJDA_Users].[dbo].[PE_Rights_UserRole] ur
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r ON ur.[RoleId] = r.[RoleId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_RolePermission] rp ON ur.[RoleId] = rp.[RoleId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON rp.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (ur.[UserId] = 148 OR ur.[UserId] = 'shehla.altaf@sjdap.org')
  AND pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND r.[IsActive] = 1
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1;

-- 7. Check if there's a route mismatch (trailing slash, case sensitivity, etc.)
SELECT 
    [PageId],
    [PageName],
    [RoutePath],
    LEN([RoutePath]) AS RouteLength
FROM [SJDA_Users].[dbo].[PE_Rights_Page]
WHERE [RoutePath] LIKE '%feasibility%'
ORDER BY [RoutePath];

-- 8. Check user's regional council access (for data filtering)
SELECT 
    ura.[UserId],
    ura.[RegionalCouncilId],
    rc.[RegionalCouncilName]
FROM [SJDA_Users].[dbo].[PE_User_RegionalCouncilAccess] ura
INNER JOIN [SJDA_Users].[dbo].[LU_RegionalCouncil] rc ON ura.[RegionalCouncilId] = rc.[RegionalCouncilId]
WHERE ura.[UserId] = 148 OR ura.[UserId] = 'shehla.altaf@sjdap.org';

-- 9. SUMMARY: What permission is needed and what does user have?
-- This query shows the gap
SELECT 
    'REQUIRED' AS Type,
    pg.[RoutePath],
    p.[ActionKey],
    p.[PermissionId],
    NULL AS UserHasPermission
FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON pg.[PageId] = p.[PageId]
WHERE pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1

UNION ALL

SELECT 
    'USER_HAS' AS Type,
    pg.[RoutePath],
    p.[ActionKey],
    up.[PermissionId],
    CASE 
        WHEN up.[IsAllowed] = 1 OR up.[IsAllowed] = 'Yes' OR up.[IsAllowed] = 'yes' OR up.[IsAllowed] = 'YES' OR up.[IsAllowed] = 1 THEN 'YES'
        ELSE 'NO'
    END AS UserHasPermission
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = 148 OR up.[UserId] = 'shehla.altaf@sjdap.org')
  AND pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view';
