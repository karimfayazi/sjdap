# API 403 Forbidden Debug Fix - Summary

## Problem
`/api/feasibility-approval` returns 403 Forbidden even for authorized users.

## Root Cause Analysis

### Current Flow
1. **API Route** (`src/app/api/feasibility-approval/route.ts`):
   - Calls `requireRoutePermission(request, "/dashboard/feasibility-approval", "view")`
   - Returns 403 if `permissionCheck.hasAccess === false`

2. **Permission Helper** (`src/lib/api-permission-helper.ts`):
   - Extracts `userId` from auth cookie
   - Calls `hasRoutePermission(userId, routePath, actionKey)`
   - Returns 403 with minimal error message

3. **Permission Service** (`src/lib/permission-service.ts`):
   - Checks `PE_Rights_UserPermission` table for user permissions
   - Checks `PE_Rights_RolePermission` via user roles
   - Uses normalized route path matching

### Issues Found
1. **Insufficient Debug Logging**: No visibility into why permission check fails
2. **Poor Error Messages**: 403 response doesn't include required permission details
3. **Frontend Error Handling**: Doesn't distinguish between 401/403 or show permission details

## Fixes Applied

### 1. Enhanced Debug Logging in `api-permission-helper.ts`

**Added comprehensive logging:**
- Request URL and pathname
- Raw cookies and auth cookie value
- Extracted userId
- Required route and action
- User's PermissionIds and permissions
- Final denial reason

**Log Format:**
```
[requireRoutePermission] === PERMISSION CHECK START ===
[requireRoutePermission] Request URL: /api/feasibility-approval
[requireRoutePermission] Route Path: /dashboard/feasibility-approval
[requireRoutePermission] Action Key: view
[requireRoutePermission] Raw Cookies: auth=authenticated:148; ...
[requireRoutePermission] Auth Cookie: authenticated:148
[requireRoutePermission] Extracted UserId: 148
[requireRoutePermission] Checking permission for userId: 148 route: /dashboard/feasibility-approval action: view
[requireRoutePermission] Permission check result: false
[requireRoutePermission] ❌ DENIED: No permission found
[requireRoutePermission] User PermissionIds: [1, 2, 5, 10]
[requireRoutePermission] User Permissions: ["/dashboard/baseline-qol:view", "/dashboard/family-income:view"]
[requireRoutePermission] Required: /dashboard/feasibility-approval:view
[requireRoutePermission] === PERMISSION CHECK END ===
```

### 2. Enhanced Debug Logging in `permission-service.ts`

**Added detailed SQL query logging:**
- What route/action is being checked
- Normalized route path
- User permission query results (matched route, permissionId, pageName)
- Role permission query results (matched route, roleName, permissionId)
- Final denial reason

**Log Format:**
```
[hasRoutePermission] Checking permission: { userId: '148', routePath: '/dashboard/feasibility-approval', normalizedRoutePath: '/dashboard/feasibility-approval', requiredActionKey: 'view' }
[hasRoutePermission] ⚠️ No user permission found for: { userId: '148', routePath: '/dashboard/feasibility-approval', ... }
[hasRoutePermission] ⚠️ No role permission found for: { userId: '148', routePath: '/dashboard/feasibility-approval', ... }
[hasRoutePermission] ❌ DENIED: No user or role permission found
```

### 3. Improved Error Response Format

**Before:**
```json
{
  "success": false,
  "message": "Access denied. You don't have permission to access this resource."
}
```

**After:**
```json
{
  "success": false,
  "message": "Access denied. You don't have permission to access this resource.",
  "error": "Forbidden",
  "route": "/dashboard/feasibility-approval",
  "requiredPermission": "/dashboard/feasibility-approval:view",
  "userId": "148",
  "userPermissionIds": [1, 2, 5, 10],
  "userPermissions": [
    {
      "routePath": "/dashboard/baseline-qol",
      "actionKey": "view",
      "pageName": "Baseline QOL"
    }
  ]
}
```

### 4. Enhanced Frontend Error Handling

**Updated `feasibility-approval/page.tsx`:**
- Distinguishes between 401 (Unauthorized) and 403 (Forbidden)
- Shows required permission in error message
- Logs full response body for debugging
- Shows user's permission count

**Error Messages:**
- **401**: "Not Authenticated. Please log in again."
- **403**: "Access Denied. Required Permission: /dashboard/feasibility-approval:view. You have 4 permission(s) assigned. Please contact your system administrator..."

### 5. Route Normalization

**Already implemented in previous fix:**
- `normalizeRoutePath()` handles trailing slashes, query strings, case differences
- SQL queries use normalized routes with case-insensitive matching
- Supports sub-route matching (e.g., `/dashboard/feasibility-approval/view` matches `/dashboard/feasibility-approval`)

## How to Debug 403 Errors

### Step 1: Check Server Console Logs

When a 403 occurs, you'll see detailed logs like:

```
[requireRoutePermission] === PERMISSION CHECK START ===
[requireRoutePermission] Request URL: /api/feasibility-approval
[requireRoutePermission] Route Path: /dashboard/feasibility-approval
[requireRoutePermission] Action Key: view
[requireRoutePermission] Raw Cookies: auth=authenticated:148
[requireRoutePermission] Auth Cookie: authenticated:148
[requireRoutePermission] Extracted UserId: 148
[hasRoutePermission] Checking permission: { userId: '148', routePath: '/dashboard/feasibility-approval', ... }
[hasRoutePermission] ⚠️ No user permission found
[hasRoutePermission] ⚠️ No role permission found
[hasRoutePermission] ❌ DENIED: No user or role permission found
[requireRoutePermission] ❌ DENIED: No permission found
[requireRoutePermission] User PermissionIds: [1, 2, 5]
[requireRoutePermission] User Permissions: ["/dashboard/baseline-qol:view", ...]
[requireRoutePermission] Required: /dashboard/feasibility-approval:view
```

### Step 2: Check Browser Console

Frontend will log:
```javascript
[feasibility-approval] API Response: {
  status: 403,
  statusText: "Forbidden",
  url: "http://localhost:3000/api/feasibility-approval",
  body: {
    success: false,
    message: "Access denied...",
    error: "Forbidden",
    route: "/dashboard/feasibility-approval",
    requiredPermission: "/dashboard/feasibility-approval:view",
    userId: "148",
    userPermissionIds: [1, 2, 5],
    userPermissions: [...]
  }
}
```

### Step 3: Verify Database

Run diagnostic SQL (from `diagnose_user_148_permissions.sql`):
```sql
-- Check if user has permission
SELECT up.*, p.ActionKey, pg.RoutePath, pg.PageName
FROM PE_Rights_UserPermission up
INNER JOIN PE_Rights_Permission p ON up.PermissionId = p.PermissionId
INNER JOIN PE_Rights_Page pg ON p.PageId = pg.PageId
WHERE up.UserId = 148
  AND pg.RoutePath = '/dashboard/feasibility-approval'
  AND p.ActionKey = 'view';
```

## Common Issues and Solutions

### Issue 1: User Missing PermissionId
**Symptom**: Logs show "No user permission found" and "No role permission found"
**Solution**: Run `fix_user_148_permissions.sql` to grant the permission

### Issue 2: Route Path Mismatch
**Symptom**: User has permission but route doesn't match
**Check**: 
- Database `RoutePath` must match exactly (case-insensitive, normalized)
- Check for trailing slashes: `/dashboard/feasibility-approval` vs `/dashboard/feasibility-approval/`
**Solution**: Route normalization should handle this, but verify DB has correct path

### Issue 3: Action Key Mismatch
**Symptom**: User has permission but different action key
**Check**: Permission must have `ActionKey = 'view'` for GET requests
**Solution**: Verify `PE_Rights_Permission.ActionKey` matches required action

### Issue 4: Permission Not Active
**Symptom**: Permission exists but `IsActive = 0`
**Check**: `p.IsActive = 1 AND pg.IsActive = 1`
**Solution**: Update permission/page to `IsActive = 1`

### Issue 5: IsAllowed = 'No' or 0
**Symptom**: Permission exists but explicitly denied
**Check**: `up.IsAllowed` must be `1`, `'Yes'`, `'yes'`, `'YES'`, or `true`
**Solution**: Update `PE_Rights_UserPermission.IsAllowed = 'Yes'`

## Files Modified

1. ✅ `src/lib/api-permission-helper.ts` - Added comprehensive debug logging and improved error response
2. ✅ `src/lib/permission-service.ts` - Added detailed SQL query result logging
3. ✅ `src/app/dashboard/feasibility-approval/page.tsx` - Enhanced error handling for GET and PUT
4. ✅ `src/app/dashboard/feasibility-approval/view/page.tsx` - Enhanced error handling for PUT

## Testing

1. **Test with authorized user:**
   - Should see ✅ ALLOWED logs
   - API returns 200 with data

2. **Test with unauthorized user:**
   - Should see ❌ DENIED logs with detailed reason
   - API returns 403 with permission details
   - Frontend shows clear error message

3. **Test with missing auth:**
   - Should see 401 Unauthorized
   - Frontend shows "Not Authenticated" message

## Next Steps

1. **Run the API** and check server console for detailed logs
2. **Check browser console** for frontend error details
3. **Run diagnostic SQL** to verify database state
4. **Grant missing permissions** using `fix_user_148_permissions.sql` if needed

The debug logs will now show EXACTLY why the 403 is occurring, making it easy to identify and fix the root cause.
