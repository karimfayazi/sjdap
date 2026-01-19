-- ============================================
-- FIX SCRIPT FOR USER 148 - Feasibility Approval Access
-- User: shehla.altaf@sjdap.org (UserId: 148)
-- Route: /dashboard/feasibility-approval
-- ============================================

-- STEP 1: Verify the page exists in PE_Rights_Page
-- If not, you may need to create it first
SELECT 
    [PageId],
    [PageName],
    [RoutePath],
    [IsActive]
FROM [SJDA_Users].[dbo].[PE_Rights_Page]
WHERE [RoutePath] = '/dashboard/feasibility-approval';

-- STEP 2: Find or create the PermissionId for feasibility-approval view action
-- Check if permission already exists
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

-- STEP 3: Grant permission to User 148
-- Replace @PermissionId with the actual PermissionId from STEP 2
-- This script assumes you have the PermissionId - if not, see STEP 4

DECLARE @UserId INT = 148;
DECLARE @UserEmail NVARCHAR(255) = 'shehla.altaf@sjdap.org';
DECLARE @PermissionId INT; -- Set this to the PermissionId from STEP 2

-- Get PermissionId for /dashboard/feasibility-approval with action 'view'
SELECT TOP(1) @PermissionId = p.[PermissionId]
FROM [SJDA_Users].[dbo].[PE_Rights_Permission] p
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view'
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1;

-- If PermissionId found, grant access
IF @PermissionId IS NOT NULL
BEGIN
    -- Check if permission already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission]
        WHERE ([UserId] = @UserId OR [UserId] = @UserEmail)
          AND [PermissionId] = @PermissionId
    )
    BEGIN
        -- Insert new permission
        INSERT INTO [SJDA_Users].[dbo].[PE_Rights_UserPermission]
            ([UserId], [PermissionId], [IsAllowed], [AssignedAt])
        VALUES
            (@UserId, @PermissionId, 'Yes', GETDATE());
        
        PRINT 'Permission granted successfully. PermissionId: ' + CAST(@PermissionId AS VARCHAR(10));
    END
    ELSE
    BEGIN
        -- Update existing permission to allow
        UPDATE [SJDA_Users].[dbo].[PE_Rights_UserPermission]
        SET [IsAllowed] = 'Yes',
            [AssignedAt] = GETDATE()
        WHERE ([UserId] = @UserId OR [UserId] = @UserEmail)
          AND [PermissionId] = @PermissionId;
        
        PRINT 'Permission updated to allowed. PermissionId: ' + CAST(@PermissionId AS VARCHAR(10));
    END
END
ELSE
BEGIN
    PRINT 'ERROR: PermissionId not found for /dashboard/feasibility-approval with action "view"';
    PRINT 'You may need to create the Page and Permission first.';
END

-- STEP 4: Verify the permission was granted
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
WHERE (up.[UserId] = @UserId OR up.[UserId] = @UserEmail)
  AND pg.[RoutePath] = '/dashboard/feasibility-approval'
  AND p.[ActionKey] = 'view';

-- ============================================
-- ALTERNATIVE: If Page/Permission doesn't exist, create them
-- ============================================

-- Only run this if the page doesn't exist
/*
DECLARE @PageId INT;
DECLARE @NewPermissionId INT;

-- Create page if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM [SJDA_Users].[dbo].[PE_Rights_Page] WHERE [RoutePath] = '/dashboard/feasibility-approval')
BEGIN
    INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Page]
        ([PageName], [RoutePath], [IsActive])
    VALUES
        ('Feasibility Approval', '/dashboard/feasibility-approval', 1);
    
    SET @PageId = SCOPE_IDENTITY();
    PRINT 'Page created. PageId: ' + CAST(@PageId AS VARCHAR(10));
END
ELSE
BEGIN
    SELECT @PageId = [PageId] 
    FROM [SJDA_Users].[dbo].[PE_Rights_Page] 
    WHERE [RoutePath] = '/dashboard/feasibility-approval';
END

-- Create permission if it doesn't exist
IF NOT EXISTS (
    SELECT 1 
    FROM [SJDA_Users].[dbo].[PE_Rights_Permission] 
    WHERE [PageId] = @PageId AND [ActionKey] = 'view'
)
BEGIN
    INSERT INTO [SJDA_Users].[dbo].[PE_Rights_Permission]
        ([PageId], [ActionKey], [IsActive])
    VALUES
        (@PageId, 'view', 1);
    
    SET @NewPermissionId = SCOPE_IDENTITY();
    PRINT 'Permission created. PermissionId: ' + CAST(@NewPermissionId AS VARCHAR(10));
    
    -- Now grant to user
    INSERT INTO [SJDA_Users].[dbo].[PE_Rights_UserPermission]
        ([UserId], [PermissionId], [IsAllowed], [AssignedAt])
    VALUES
        (148, @NewPermissionId, 'Yes', GETDATE());
    
    PRINT 'Permission granted to User 148';
END
*/
