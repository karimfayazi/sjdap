# Permission System Fix - Summary

## Root Cause Analysis

The application was allowing UserId=60 (abbas.khan@sjdap.org) to access pages despite having only PermissionIds 1, 2, 11, 14 in `PE_Rights_UserPermission`. The root causes were:

### 1. **Hardcoded Permissions in user-profile API** ❌
- **File**: `src/app/api/user-profile/route.ts`
- **Issue**: Lines 198-216 hardcoded ALL section permissions to `true` for ALL users
- **Fix**: Now fetches real permissions from `PE_Rights_UserPermission` table

### 2. **useSectionAccess Hook Granting All Access** ❌
- **File**: `src/hooks/useSectionAccess.ts`
- **Issue**: Lines 41-44 granted access to ALL sections for ALL users
- **Fix**: Now uses actual permission values from userProfile (which come from PE_Rights_UserPermission)

### 3. **Sidebar Showing All Links** ❌
- **File**: `src/components/Sidebar.tsx`
- **Issue**: No permission checks - showed all menu items to everyone
- **Fix**: Added `useCanAccessRoute` hook to filter menu items based on permissions

### 4. **Pages Not Checking Permissions** ❌
- **Issue**: Most pages had no permission guards
- **Fix**: Created `PageGuard` component and added to pages (example: `loan-process/page.tsx`)

### 5. **API Routes Not Checking Permissions** ❌
- **Issue**: API routes only checked authentication, not permissions
- **Fix**: Created `api-permission-helper.ts` with `requireRoutePermission` function (example: `loan-authorization/route.ts`)

## Solution Implementation

### 1. Centralized Permission Service ✅
**File**: `src/lib/permission-service.ts`

- `getAllowedPermissionIds(userId)`: Gets allowed PermissionIds from `PE_Rights_UserPermission` (IsAllowed=1)
- `hasRoutePermission(userId, routePath, actionKey)`: Checks if user has permission for a route
- `getUserAllowedPermissions(userId)`: Gets detailed permission list for debugging
- `ROUTE_PERMISSION_MAP`: Maps route paths to required action keys

**Key Features**:
- ✅ ONLY uses `PE_Rights_UserPermission` table (single source of truth)
- ✅ Checks user permissions first, then role permissions
- ✅ Handles Super Admin (has all permissions)
- ✅ Debug logging in development mode

### 2. Fixed user-profile API ✅
**File**: `src/app/api/user-profile/route.ts`

**Changes**:
- Removed hardcoded `true` values for all sections
- Now calls `getAllowedPermissionIds()` and `getUserAllowedPermissions()`
- Builds section access based on actual permissions
- Only Super Admin gets `supper_user: 'Yes'`

### 3. Fixed useSectionAccess Hook ✅
**File**: `src/hooks/useSectionAccess.ts`

**Changes**:
- Removed code that granted access to all sections
- Now uses `normalizePermission()` on actual permission values from userProfile
- Permission values come from user-profile API (which uses PE_Rights_UserPermission)

### 4. Created PageGuard Component ✅
**File**: `src/components/PageGuard.tsx`

**Usage**:
```tsx
<PageGuard requiredAction="view">
  {/* Page content */}
</PageGuard>
```

**Features**:
- Checks route permission using `useRoutePermission` hook
- Shows loading state while checking
- Shows `AccessDenied` component if no permission
- Debug logging in development

### 5. Created Route Permission Hook ✅
**File**: `src/hooks/useRoutePermission.ts`

**Usage**:
```tsx
const { hasAccess, loading } = useRoutePermission("/dashboard/baseline-qol", "view");
```

### 6. Created API Permission Helper ✅
**File**: `src/lib/api-permission-helper.ts`

**Usage**:
```tsx
const permissionCheck = await requireRoutePermission(
  request,
  "/dashboard/finance/loan-process",
  "view"
);

if (!permissionCheck.hasAccess) {
  return permissionCheck.error; // Returns 403
}

const userId = permissionCheck.userId;
```

### 7. Updated Sidebar ✅
**File**: `src/components/Sidebar.tsx`

**Changes**:
- Added `useCanAccessRoute` hook
- Filters navigation items based on route permissions
- Hides menu items user doesn't have access to
- Filters subItems and subMenus

### 8. Created useCanAccessRoute Hook ✅
**File**: `src/hooks/useCanAccessRoute.ts`

**Features**:
- Maps routes to section permissions
- Uses userProfile section flags (which come from PE_Rights_UserPermission)
- Returns boolean for route access

## Route-to-Permission Mapping

The `ROUTE_PERMISSION_MAP` in `permission-service.ts` maps routes to action keys:

```typescript
{
  "/dashboard/baseline-qol": "view",
  "/dashboard/baseline-qol/add": "add",
  "/dashboard/finance/loan-process": "view",
  "/dashboard/settings": "view",
  // ... etc
}
```

## Permission Check Flow

1. **User logs in** → Auth cookie set
2. **Page loads** → `user-profile` API called
3. **user-profile API** → Queries `PE_Rights_UserPermission` for allowed PermissionIds
4. **user-profile API** → Builds section access flags based on routes user has permissions for
5. **Frontend** → `useSectionAccess` / `useRoutePermission` checks permission flags
6. **PageGuard** → Blocks page if no permission
7. **Sidebar** → Hides menu items if no permission
8. **API Routes** → `requireRoutePermission` returns 403 if no permission

## Testing with UserId=60

### Expected Behavior:
- ✅ User can ONLY access routes corresponding to PermissionIds 1, 2, 11, 14
- ✅ All other routes show "Access Denied" (403)
- ✅ Sidebar only shows allowed menu items
- ✅ API calls to unauthorized routes return 403

### How to Verify:
1. Login as UserId=60 (abbas.khan@sjdap.org)
2. Check browser console for debug logs:
   ```
   [getAllowedPermissionIds] User: 60 Allowed PermissionIds: [1, 2, 11, 14]
   [hasRoutePermission] User: 60 Route: /dashboard/settings Action: view Result: DENIED
   ```
3. Try accessing unauthorized pages → Should see "Access Denied"
4. Check Sidebar → Should only show allowed menu items
5. Try API calls directly → Should return 403 for unauthorized routes

## Files Modified

### New Files:
- `src/lib/permission-service.ts` - Centralized permission service
- `src/lib/api-permission-helper.ts` - API route permission helpers
- `src/components/PageGuard.tsx` - Page protection component
- `src/hooks/useRoutePermission.ts` - Route permission hook
- `src/hooks/useCanAccessRoute.ts` - Sidebar route access hook
- `src/app/api/check-route-permission/route.ts` - Permission check API endpoint

### Modified Files:
- `src/app/api/user-profile/route.ts` - Now fetches real permissions
- `src/hooks/useSectionAccess.ts` - Uses real permissions
- `src/components/Sidebar.tsx` - Filters menu items by permissions
- `src/components/AccessDenied.tsx` - Improved error display
- `src/app/dashboard/finance/loan-process/page.tsx` - Added PageGuard (example)
- `src/app/api/loan-authorization/route.ts` - Added permission check (example)

## Next Steps

### To Complete the Fix:

1. **Add PageGuard to ALL pages**:
   - Wrap all `page.tsx` files in `PageGuard` component
   - Example: `src/app/dashboard/baseline-qol/page.tsx`, `src/app/dashboard/settings/page.tsx`, etc.

2. **Add permission checks to ALL API routes**:
   - Use `requireRoutePermission()` in all API route handlers
   - Map each API route to its corresponding page route
   - Example: `/api/baseline-applications` → `/dashboard/baseline-qol`

3. **Update ROUTE_PERMISSION_MAP**:
   - Add any missing routes
   - Ensure action keys match database permissions

4. **Test thoroughly**:
   - Test with UserId=60 (limited permissions)
   - Test with Super Admin (should have all access)
   - Test with other user types
   - Verify API routes return 403 for unauthorized access

## Debug Logging

All permission checks include debug logging in development mode:

```typescript
// Console logs will show:
[getAllowedPermissionIds] User: 60 Allowed PermissionIds: [1, 2, 11, 14]
[hasRoutePermission] User: 60 Route: /dashboard/settings Action: view Result: DENIED
[PageGuard] Access denied for route: /dashboard/settings Action: view
```

## Important Notes

1. **Single Source of Truth**: `PE_Rights_UserPermission` table is the ONLY source for permissions
2. **Super Admin**: Users with `UserType='Super Admin'` have all permissions (bypasses checks)
3. **Default Deny**: If permission not found, access is DENIED (secure by default)
4. **Action Keys**: Routes require specific action keys (view, add, edit, delete) - check `ROUTE_PERMISSION_MAP`
5. **Role Permissions**: System checks user permissions first, then role permissions (user permissions override roles)

## Confirmation Steps

To verify the fix works for UserId=60:

1. ✅ Login as UserId=60
2. ✅ Check console logs - should show only PermissionIds [1, 2, 11, 14]
3. ✅ Try accessing `/dashboard/settings` - should show "Access Denied"
4. ✅ Check Sidebar - should only show allowed menu items
5. ✅ Try API call to unauthorized route - should return 403
6. ✅ Verify allowed routes still work correctly
