-- ============================================
-- FIX SCRIPT FOR USER 148 - Grant Feasibility Approval Permission
-- Problem: getUserAllowedPermissions returns empty array
-- Solution: Ensure permission exists and grant to user
-- ============================================

DECLARE @UserId INT = 148;
DECLARE @UserEmail NVARCHAR(255) = 'shehla.altaf@sjdap.org';
DECLARE @RoutePath NVARCHAR(500) = '/dashboard/feasibility-approval';
DECLARE @ActionKey NVARCHAR(50) = 'view';
DECLARE @PageId INT = NULL;
DECLARE @PermissionId INT = NULL;

PRINT '=== FIXING PERMISSIONS FOR USER 148 ===';
PRINT '';

-- STEP 1: Find or create the Page
PRINT 'STEP 1: Checking if page exists...';
SELECT @PageId = [PageId]
FROM [SJDA_Users].[dbo].[PE_Rights_Page]
WHERE [RoutePath] = @RoutePath
   OR [RoutePath] = @RoutePath + '/';

IF @PageId IS NULL
BEGIN
    PRINT 'Page does not exist. Creating page...';
    INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Page]
        ([PageName], [RoutePath], [IsActive])
    VALUES
        ('Feasibility Approval', @RoutePath, 1);
    
    SET @PageId = SCOPE_IDENTITY();
    PRINT 'Page created. PageId: ' + CAST(@PageId AS VARCHAR(10));
END
ELSE
BEGIN
    PRINT 'Page exists. PageId: ' + CAST(@PageId AS VARCHAR(10));
    
    -- Ensure page is active
    UPDATE [SJDA_Users].[dbo].[PE_Rights_Page]
    SET [IsActive] = 1
    WHERE [PageId] = @PageId;
    PRINT 'Page IsActive set to 1';
END
PRINT '';

-- STEP 2: Find or create the Permission
PRINT 'STEP 2: Checking if permission exists...';
SELECT @PermissionId = [PermissionId]
FROM [SJDA_Users].[dbo].[PE_Rights_Permission]
WHERE [PageId] = @PageId
  AND [ActionKey] = @ActionKey;

IF @PermissionId IS NULL
BEGIN
    PRINT 'Permission does not exist. Creating permission...';
    INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Permission]
        ([PageId], [ActionKey], [IsActive])
    VALUES
        (@PageId, @ActionKey, 1);
    
    SET @PermissionId = SCOPE_IDENTITY();
    PRINT 'Permission created. PermissionId: ' + CAST(@PermissionId AS VARCHAR(10));
END
ELSE
BEGIN
    PRINT 'Permission exists. PermissionId: ' + CAST(@PermissionId AS VARCHAR(10));
    
    -- Ensure permission is active
    UPDATE [SJDA_Users].[dbo].[PE_Rights_Permission]
    SET [IsActive] = 1
    WHERE [PermissionId] = @PermissionId;
    PRINT 'Permission IsActive set to 1';
END
PRINT '';

-- STEP 3: Grant permission to user (check if already exists)
PRINT 'STEP 3: Granting permission to user...';

-- Check if user permission already exists
IF EXISTS (
    SELECT 1 
    FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission]
    WHERE ([UserId] = @UserId OR [UserId] = @UserEmail)
      AND [PermissionId] = @PermissionId
)
BEGIN
    PRINT 'User permission already exists. Updating to allow...';
    UPDATE [SJDA_Users].[dbo].[PE_Rights_UserPermission]
    SET [IsAllowed] = 'Yes',
        [AssignedAt] = GETDATE()
    WHERE ([UserId] = @UserId OR [UserId] = @UserEmail)
      AND [PermissionId] = @PermissionId;
    PRINT 'User permission updated to IsAllowed = Yes';
END
ELSE
BEGIN
    PRINT 'User permission does not exist. Creating...';
    INSERT INTO [SJDA_Users].[dbo].[PE_Rights_UserPermission]
        ([UserId], [PermissionId], [IsAllowed], [AssignedAt])
    VALUES
        (@UserId, @PermissionId, 'Yes', GETDATE());
    PRINT 'User permission created with IsAllowed = Yes';
END
PRINT '';

-- STEP 4: Verify the fix
PRINT 'STEP 4: Verifying permission...';
SELECT 
    up.[UserId],
    up.[PermissionId],
    up.[IsAllowed],
    up.[AssignedAt],
    p.[ActionKey],
    pg.[RoutePath],
    pg.[PageName],
    p.[IsActive] AS PermissionIsActive,
    pg.[IsActive] AS PageIsActive
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = @UserId OR up.[UserId] = @UserEmail)
  AND pg.[RoutePath] = @RoutePath
  AND p.[ActionKey] = @ActionKey;

IF @@ROWCOUNT > 0
BEGIN
    PRINT '';
    PRINT '✅ SUCCESS: Permission granted and verified!';
    PRINT 'User 148 should now be able to access /dashboard/feasibility-approval';
END
ELSE
BEGIN
    PRINT '';
    PRINT '❌ ERROR: Verification failed. Permission was not created correctly.';
END
PRINT '';
PRINT '=== FIX COMPLETE ===';
