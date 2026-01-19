# RBAC Mismatch Fix Summary

## Root Cause
The permission check was failing due to:
1. **Case-sensitive action key comparison**: DB stores `ActionKey='VIEW'` (uppercase) but code compared with lowercase `'view'`
2. **Non-canonical permission lookup**: Code was building permission strings like `${routePath}:${actionKey}` instead of using database relations (PageId → PermissionId)

## Database Schema
- `PE_Rights_Page`: `PageId=3`, `RoutePath='/dashboard/feasibility-approval'`
- `PE_Rights_Permission`: `PermissionId=9`, `PageId=3`, `ActionKey='VIEW'`
- `PE_Rights_UserPermission`: `UserId=148`, `PermissionId=9`, `IsAllowed=1`

## Fixes Applied

### 1. `src/lib/permission-service.ts` - `hasRoutePermission()`

**Before:**
```typescript
const requiredActionKey = actionKey || getActionKeyForRoute(routePath);
// ... query used: AND p.[ActionKey] = @action_key (case-sensitive)
```

**After:**
```typescript
// Normalize to uppercase (DB stores ActionKey as uppercase)
const requiredActionKey = (actionKey || getActionKeyForRoute(routePath)).toUpperCase();

// Canonical permission check using DB relations:
// 1. Resolve PageId by RoutePath from PE_Rights_Page
// 2. Resolve PermissionId by PageId + ActionKey (uppercase)
// 3. Check if user has that PermissionId in PE_Rights_UserPermission
const userPermResult = await request.query(`
  SELECT TOP(1) 
    up.[IsAllowed],
    up.[PermissionId],
    pg.[PageId],
    pg.[RoutePath],
    pg.[PageName],
    p.[ActionKey],
    p.[PermissionId] AS RequiredPermissionId
  FROM [SJDA_Users].[dbo].[PE_Rights_Page] pg
  INNER JOIN [SJDA_Users].[dbo].[PE_Rights_Permission] p 
    ON pg.[PageId] = p.[PageId] 
    AND UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key
  INNER JOIN [SJDA_Users].[dbo].[PE_Rights_UserPermission] up 
    ON p.[PermissionId] = up.[PermissionId]
  WHERE (
      LTRIM(RTRIM(LOWER(pg.[RoutePath]))) = LOWER(@normalized_route_path)
      OR LTRIM(RTRIM(LOWER(pg.[RoutePath]))) LIKE LOWER(@normalized_route_path_prefix) + '%'
    )
    AND (up.[UserId] = @user_id OR up.[UserId] = @email_address)
    AND (up.[IsAllowed] = 1 OR up.[IsAllowed] = 'Yes' ...)
    AND p.[IsActive] = 1
    AND pg.[IsActive] = 1
  ORDER BY LEN(pg.[RoutePath]) DESC
`);
```

### 2. `src/lib/api-permission-helper.ts` - `requireRoutePermission()`

**Enhanced 403 error response:**
```typescript
const errorPayload = { 
  success: false, 
  message: "Access denied...",
  route: routePath,
  pageId: requiredPageId,              // NEW: PageId from DB
  requiredAction: normalizedActionKey,  // NEW: Uppercase action (e.g., "VIEW")
  requiredPermissionId: requiredPermissionId, // NEW: PermissionId from DB
  requiredPermission: `${routePath}:${actionKey}`, // For backward compatibility only
  userId: userId,
  userPermissionIds: userPermissionIds, // Array of user's PermissionIds
  userPermissions: [...],
  diagnostics: {
    permissionExistsInDb: permissionExists,
    hasRequiredPermissionId: hasRequiredPermissionId, // NEW: Boolean check
    permissionDetails: {
      pageId: ...,
      permissionId: ...,
      actionKey: ...,
      ...
    }
  }
};
```

### 3. `src/lib/rbac-utils.ts` - `hasPermission()`

**Fixed to use canonical DB relations and uppercase action:**
```typescript
const normalizedActionKey = actionKey.toUpperCase();
// ... uses same canonical join pattern
```

## How It Works Now

1. **Route**: `/dashboard/feasibility-approval`
2. **Action**: `"view"` → normalized to `"VIEW"`
3. **DB Lookup**:
   - Find `PageId=3` where `RoutePath='/dashboard/feasibility-approval'`
   - Find `PermissionId=9` where `PageId=3` AND `ActionKey='VIEW'`
4. **Permission Check**:
   - Check if user has `PermissionId=9` in `PE_Rights_UserPermission`
   - If yes → allow access ✅
   - If no → return 403 with detailed debug info

## Key Changes

✅ **Action key always uppercase**: `actionKey.toUpperCase()` before DB comparison  
✅ **Canonical DB relations**: PageId → PermissionId → UserPermission (not string matching)  
✅ **Case-insensitive SQL**: `UPPER(LTRIM(RTRIM(p.[ActionKey]))) = @action_key`  
✅ **Enhanced 403 errors**: Include `pageId`, `requiredPermissionId`, `requiredAction`  
✅ **PermissionId-based matching**: Check `userPermissionIds.includes(requiredPermissionId)`

## Testing

User 148 with `PermissionId=9` should now:
- ✅ Have access to `/dashboard/feasibility-approval`
- ✅ See correct permission details in 403 errors (if denied)
- ✅ Have `userPermissionIds` array populated correctly

## Files Modified

1. `src/lib/permission-service.ts` - `hasRoutePermission()`
2. `src/lib/api-permission-helper.ts` - `requireRoutePermission()`
3. `src/lib/rbac-utils.ts` - `hasPermission()`

## Notes

- `requiredPermission` string (`${routePath}:${actionKey}`) is kept for backward compatibility but **NOT used for matching**
- All permission checks now use **PermissionId** from database relations
- Action key comparison is **always case-insensitive** (normalized to uppercase)
