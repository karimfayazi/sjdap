-- ============================================
-- DIAGNOSTIC SQL FOR EMPTY PERMISSIONS - USER 148
-- Problem: getUserAllowedPermissions returns empty array
-- ============================================

-- 1. Verify user exists and check UserId column type
SELECT 
    [UserId],
    [email_address],
    [UserFullName],
    [UserType],
    [Regional_Council],
    [Local_Council],
    [AccessScope],
    SQL_VARIANT_PROPERTY([UserId], 'BaseType') AS UserIdDataType
FROM [SJDA_Users].[dbo].[PE_User]
WHERE [UserId] = 148 OR [email_address] = 'shehla.altaf@sjdap.org';

-- 2. Check ALL rows in PE_Rights_UserPermission for userId=148 (no filters)
SELECT 
    up.[UserId],
    up.[PermissionId],
    up.[IsAllowed],
    up.[AssignedAt],
    SQL_VARIANT_PROPERTY(up.[UserId], 'BaseType') AS UserIdDataType,
    p.[PermissionId] AS PermissionExists,
    p.[IsActive] AS PermissionIsActive,
    p.[ActionKey],
    pg.[PageId] AS PageExists,
    pg.[IsActive] AS PageIsActive,
    pg.[RoutePath],
    pg.[PageName]
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE up.[UserId] = 148 
   OR up.[UserId] = '148'
   OR up.[UserId] = 'shehla.altaf@sjdap.org'
ORDER BY up.[AssignedAt] DESC;

-- 3. Check if query filters are too restrictive (simulate getUserAllowedPermissions query)
SELECT 
    up.[PermissionId],
    up.[IsAllowed],
    p.[IsActive] AS PermissionIsActive,
    pg.[IsActive] AS PageIsActive,
    pg.[RoutePath],
    p.[ActionKey],
    pg.[PageName],
    CASE 
        WHEN up.[IsAllowed] NOT IN (1, 'Yes', 'yes', 'YES', true) THEN 'IsAllowed filter blocks'
        WHEN p.[IsActive] != 1 THEN 'Permission IsActive filter blocks'
        WHEN pg.[IsActive] != 1 THEN 'Page IsActive filter blocks'
        ELSE 'Should be included'
    END AS FilterReason
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = 148 OR up.[UserId] = '148' OR up.[UserId] = 'shehla.altaf@sjdap.org')
ORDER BY up.[AssignedAt] DESC;

-- 4. Check if permission exists for feasibility-approval route
SELECT 
    pg.[PageId],
    pg.[PageName],
    pg.[RoutePath],
    pg.[IsActive] AS PageIsActive,
    p.[PermissionId],
    p.[ActionKey],
    p.[IsActive] AS PermissionIsActive
FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON pg.[PageId] = p.[PageId]
WHERE pg.[RoutePath] = '/dashboard/feasibility-approval'
   OR pg.[RoutePath] LIKE '/dashboard/feasibility-approval%'
ORDER BY pg.[RoutePath], p.[ActionKey];

-- 5. Check if user has ANY permissions (count)
SELECT 
    COUNT(*) AS TotalRows,
    COUNT(CASE WHEN up.[IsAllowed] IN (1, 'Yes', 'yes', 'YES', true) THEN 1 END) AS AllowedRows,
    COUNT(CASE WHEN up.[IsAllowed] NOT IN (1, 'Yes', 'yes', 'YES', true) THEN 1 END) AS DeniedRows,
    COUNT(CASE WHEN p.[IsActive] = 1 THEN 1 END) AS ActivePermissionRows,
    COUNT(CASE WHEN pg.[IsActive] = 1 THEN 1 END) AS ActivePageRows,
    COUNT(CASE 
        WHEN up.[IsAllowed] IN (1, 'Yes', 'yes', 'YES', true) 
         AND p.[IsActive] = 1 
         AND pg.[IsActive] = 1 
        THEN 1 
    END) AS ShouldBeIncludedRows
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE up.[UserId] = 148 
   OR up.[UserId] = '148'
   OR up.[UserId] = 'shehla.altaf@sjdap.org';

-- 6. Check role-based permissions for this user
SELECT 
    ur.[UserId],
    ur.[RoleId],
    r.[RoleName],
    r.[IsActive] AS RoleIsActive,
    rp.[PermissionId],
    rp.[IsAllowed] AS RolePermissionIsAllowed,
    p.[ActionKey],
    pg.[RoutePath],
    pg.[PageName]
FROM [SJDA_Users].[dbo].[PE_Rights_UserRole] ur
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Role] r ON ur.[RoleId] = r.[RoleId]
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_RolePermission] rp ON ur.[RoleId] = rp.[RoleId]
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON rp.[PermissionId] = p.[PermissionId]
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE ur.[UserId] = 148 
   OR ur.[UserId] = '148'
   OR ur.[UserId] = 'shehla.altaf@sjdap.org';

-- 7. Find the exact PermissionId needed for /dashboard/feasibility-approval:view
SELECT 
    pg.[PageId],
    pg.[PageName],
    pg.[RoutePath],
    p.[PermissionId],
    p.[ActionKey],
    p.[IsActive] AS PermissionIsActive,
    pg.[IsActive] AS PageIsActive,
    CASE 
        WHEN p.[PermissionId] IS NULL THEN 'Permission does not exist - needs to be created'
        WHEN p.[IsActive] != 1 THEN 'Permission exists but IsActive = 0'
        WHEN pg.[IsActive] != 1 THEN 'Page exists but IsActive = 0'
        ELSE 'Permission exists and is active'
    END AS Status
FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
LEFT JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
    ON pg.[PageId] = p.[PageId] 
    AND p.[ActionKey] = 'view'
WHERE pg.[RoutePath] = '/dashboard/feasibility-approval'
   OR pg.[RoutePath] LIKE '/dashboard/feasibility-approval%'
ORDER BY pg.[RoutePath], p.[ActionKey];

-- 8. Check if Settings UI writes to same table (verify table structure)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = 'PE_Rights_UserPermission'
ORDER BY ORDINAL_POSITION;

-- 9. SUMMARY: Show what's missing
SELECT 
    'User 148 has' AS CheckType,
    COUNT(*) AS Count,
    'rows in PE_Rights_UserPermission' AS Description
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission]
WHERE [UserId] = 148 OR [UserId] = '148' OR [UserId] = 'shehla.altaf@sjdap.org'

UNION ALL

SELECT 
    'User 148 has',
    COUNT(*),
    'ALLOWED rows (IsAllowed = Yes/1)'
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = 148 OR up.[UserId] = '148' OR up.[UserId] = 'shehla.altaf@sjdap.org')
  AND up.[IsAllowed] IN (1, 'Yes', 'yes', 'YES', true)
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1

UNION ALL

SELECT 
    'Permission for',
    COUNT(*),
    '/dashboard/feasibility-approval:view exists'
FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON pg.[PageId] = p.[PageId]
WHERE pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1

UNION ALL

SELECT 
    'User 148 has permission for',
    COUNT(*),
    '/dashboard/feasibility-approval:view'
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = 148 OR up.[UserId] = '148' OR up.[UserId] = 'shehla.altaf@sjdap.org')
  AND pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND up.[IsAllowed] IN (1, 'Yes', 'yes', 'YES', true)
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1;
