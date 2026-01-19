# Empty Permissions Fix - User 148

## Problem
API returns 403 with empty `userPermissionIds: []` and `userPermissions: []`, meaning `getUserAllowedPermissions(userId=148)` returns an empty array.

## Root Cause Analysis

### Current Implementation

**Function**: `getUserAllowedPermissions(userId)` in `src/lib/permission-service.ts`

**Query Logic**:
```sql
SELECT DISTINCT
    up.[PermissionId],
    pg.[RoutePath],
    p.[ActionKey],
    pg.[PageName]
FROM [SJDA_Users].[dbo].[PE_Rights_UserPermission] up
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p ON up.[PermissionId] = p.[PermissionId]
INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Page] pg ON p.[PageId] = pg.[PageId]
WHERE (up.[UserId] = @user_id OR up.[UserId] = @email_address)
  AND up.[IsAllowed] IN (1, 'Yes', 'yes', 'YES', true)
  AND p.[IsActive] = 1
  AND pg.[IsActive] = 1
```

**Possible Causes for Empty Result**:

1. **No rows exist** for userId=148 in `PE_Rights_UserPermission`
   - User was never assigned any permissions
   - Permissions were deleted
   - UserId column type mismatch (string vs int)

2. **Rows exist but IsAllowed filter blocks them**
   - `IsAllowed = 'No'` or `0` or `false`
   - All permissions are explicitly denied

3. **Rows exist but Permission is inactive**
   - `PE_Rights_Permission.IsActive = 0`
   - Permission was deactivated

4. **Rows exist but Page is inactive**
   - `PE_Rights_Page.IsActive = 0`
   - Page was deactivated

5. **UserId column type mismatch**
   - Database has `UserId` as INT but code passes string "148"
   - Or vice versa

## Enhanced Diagnostics

### 1. SQL Diagnostics Script

**File**: `diagnose_empty_permissions_user_148.sql`

**Queries**:
1. Verify user exists and check UserId data type
2. Show ALL rows in PE_Rights_UserPermission for userId=148 (no filters)
3. Show which filters block rows (IsAllowed, IsActive)
4. Check if permission exists for `/dashboard/feasibility-approval:view`
5. Count statistics (total rows, allowed rows, active rows)
6. Check role-based permissions
7. Find exact PermissionId needed
8. Check table structure
9. Summary of what's missing

### 2. Code Enhancements

**Added to `getUserAllowedPermissions`**:
- Diagnostic query to count rows before filtering
- Logs showing why query returns empty:
  - Total rows in table
  - Allowed rows count
  - Denied rows count
  - Active permission rows count
  - Active page rows count

**Added to `requireRoutePermission`**:
- Checks if required permission exists in database
- Checks if user has ANY rows in PE_Rights_UserPermission
- Returns diagnostic info in 403 response:
  ```json
  {
    "diagnostics": {
      "permissionExistsInDb": true/false,
      "permissionDetails": { ... },
      "totalUserRowsInTable": 0,
      "userHasAnyPermissions": false
    }
  }
  ```

## Fix Script

**File**: `fix_empty_permissions_user_148.sql`

**Steps**:
1. Find or create Page for `/dashboard/feasibility-approval`
2. Find or create Permission with `ActionKey = 'view'`
3. Grant permission to userId=148 with `IsAllowed = 'Yes'`
4. Verify the fix

**Usage**:
```sql
-- Run the script
-- It will:
-- 1. Create page if missing
-- 2. Create permission if missing
-- 3. Grant to user 148
-- 4. Verify success
```

## How to Debug

### Step 1: Run Diagnostic SQL

```sql
-- Run diagnose_empty_permissions_user_148.sql
-- This will show:
-- - If user exists
-- - If user has any rows in PE_Rights_UserPermission
-- - Why rows are filtered out
-- - If required permission exists
```

### Step 2: Check Server Logs

When API is called, you'll see:
```
[getUserAllowedPermissions] Diagnostic for userId: 148 {
  totalRows: 0,           // ← If 0, user has NO rows in table
  allowedRows: 0,        // ← If 0, all rows have IsAllowed != Yes
  deniedRows: 0,
  activePermissionRows: 0, // ← If 0, all permissions are inactive
  activePageRows: 0       // ← If 0, all pages are inactive
}
```

### Step 3: Check API Response

403 response now includes:
```json
{
  "diagnostics": {
    "permissionExistsInDb": true,
    "permissionDetails": {
      "pageId": 10,
      "permissionId": 25,
      "pageIsActive": 1,
      "permissionIsActive": 1
    },
    "totalUserRowsInTable": 0,  // ← This shows if user has ANY rows
    "userHasAnyPermissions": false
  }
}
```

## Common Scenarios

### Scenario 1: User Has No Rows
**Symptom**: `totalUserRowsInTable: 0`
**Solution**: Run `fix_empty_permissions_user_148.sql` to create permission

### Scenario 2: User Has Rows But All Denied
**Symptom**: `totalRows > 0` but `allowedRows = 0`
**Solution**: Update `IsAllowed = 'Yes'` for existing rows

### Scenario 3: Permission Doesn't Exist
**Symptom**: `permissionExistsInDb: false`
**Solution**: Script will create it automatically

### Scenario 4: UserId Type Mismatch
**Symptom**: User exists but query finds no rows
**Check**: Run diagnostic query #1 to see UserId data type
**Solution**: Ensure query uses correct type (INT vs VARCHAR)

## Files Modified

1. ✅ `src/lib/permission-service.ts` - Added diagnostic logging to `getUserAllowedPermissions`
2. ✅ `src/lib/api-permission-helper.ts` - Added permission existence check and diagnostics to 403 response
3. ✅ `diagnose_empty_permissions_user_148.sql` - Comprehensive diagnostic queries
4. ✅ `fix_empty_permissions_user_148.sql` - Fix script to grant permission

## Next Steps

1. **Run diagnostic SQL** to identify exact issue
2. **Check server logs** when API is called to see diagnostic output
3. **Run fix script** to grant permission
4. **Verify** by calling API again - should return 200 with data

The enhanced diagnostics will now show EXACTLY why permissions are empty, making it easy to fix the root cause.
