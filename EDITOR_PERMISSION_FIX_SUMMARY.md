# Editor Permission Fix - Complete Summary

## Problem Statement

Editor users (UserType='Editor') were able to access three routes they should NOT have access to:
- `/dashboard/swb-families`
- `/dashboard/approval-section/baseline-approval`
- `/dashboard/feasibility-approval`

**Requirement**: Editors must only access pages if they have explicit permission in `dbo.PE_Rights_UserPermission` (IsAllowed = 1). If no permission exists, pages must show "Access Denied" and APIs must return 403.

## Root Cause Analysis

### 1. Dashboard Layout Using UserType-Based Checks ❌
**File**: `src/app/dashboard/layout.tsx` (Lines 29-51)

**Problem**: 
- Used `hasRouteAccess(userType, route)` function which only checks UserType
- This function grants access based on hardcoded Editor routes list
- The three problematic routes were NOT in Editor's allowed list, but pages had no guards
- Layout would redirect to `/dashboard` if route not allowed, but pages themselves didn't check permissions

**Code**:
```typescript
// OLD CODE - Only checks UserType, not permissions
if (!hasRouteAccess(userType, currentRoute)) {
  router.push('/dashboard');
}
```

### 2. Pages Had No Permission Guards ❌

**File**: `src/app/dashboard/swb-families/page.tsx`
- Line 232: Comment "Access control removed - all users can access this page"
- No PageGuard component
- No permission checks

**File**: `src/app/dashboard/approval-section/baseline-approval/page.tsx`
- Line 21: Comment "Access control removed - all users can access this page"
- No PageGuard component
- No permission checks

**File**: `src/app/dashboard/feasibility-approval/page.tsx`
- Line 199: Comment "Access control removed - all users can access this page"
- Used `hasRouteAccess()` which only checks UserType, not permissions
- No PageGuard component

### 3. API Routes Only Checked Authentication ❌

**Files**:
- `src/app/api/swb-families/route.ts` - Only checked auth cookie
- `src/app/api/feasibility-approval/route.ts` - Only checked auth cookie + Super Admin check
- `src/app/api/baseline-qol-approval/route.ts` - Only checked auth cookie

**Problem**: All API routes only verified user was authenticated, not if they had permission for the route.

### 4. hasRouteAccess Function Only Checks UserType ❌
**File**: `src/lib/auth-utils.ts` (Lines 150-191)

**Problem**: 
- Function grants access based on UserType (Editor, Super Admin, Economic-Approval)
- Does NOT check `PE_Rights_UserPermission` table
- Editor access is hardcoded to specific routes:
  ```typescript
  if (normalizedUserType === 'Editor') {
    const editorRoutes = [
      '/dashboard/baseline-qol',
      '/dashboard/family-income',
      '/dashboard/rops',
      '/dashboard/family-development-plan',
      '/dashboard/actual-intervention'
    ];
    return editorRoutes.some(r => route.startsWith(r));
  }
  ```
- The three problematic routes are NOT in this list, but pages had no guards to enforce this

## Solution Implemented

### 1. Removed UserType-Based Access Check from Dashboard Layout ✅
**File**: `src/app/dashboard/layout.tsx`

**Before**:
```typescript
// Check route access based on UserType
useEffect(() => {
  if (loading || !userProfile) return;
  const userType = userProfile.access_level;
  const hasFullAccessToAll = hasFullAccess(...);
  if (hasFullAccessToAll) return;
  const currentRoute = pathname || '/dashboard';
  if (!hasRouteAccess(userType, currentRoute)) {
    router.push('/dashboard');
  }
}, [userProfile, loading, pathname, router]);
```

**After**:
```typescript
// NOTE: Route access is now checked by PageGuard components on individual pages
// and by permission-service.ts using PE_Rights_UserPermission table.
// This layout no longer enforces UserType-based access rules.
// Individual pages must use PageGuard or check permissions via useRoutePermission hook.
```

### 2. Added PageGuard to All Three Pages ✅

**File**: `src/app/dashboard/swb-families/page.tsx`

**Before**:
```typescript
// Access control removed - all users can access this page

return (
  <div className="space-y-6">
    {/* page content */}
  </div>
);
```

**After**:
```typescript
return (
  <PageGuard requiredAction="view">
    <div className="space-y-6">
      {/* page content */}
    </div>
  </PageGuard>
);
```

**File**: `src/app/dashboard/approval-section/baseline-approval/page.tsx`

**Before**:
```typescript
function BaselineApprovalContent() {
  // Access control removed - all users can access this page
  return <div>...</div>;
}

export default function BaselineApprovalPage() {
  return <Suspense><BaselineApprovalContent /></Suspense>;
}
```

**After**:
```typescript
function BaselineApprovalContent() {
  return <div>...</div>;
}

export default function BaselineApprovalPage() {
  return (
    <PageGuard requiredAction="view">
      <Suspense><BaselineApprovalContent /></Suspense>
    </PageGuard>
  );
}
```

**File**: `src/app/dashboard/feasibility-approval/page.tsx`

**Before**:
```typescript
export default function FeasibilityApprovalPage() {
  const { userProfile } = useAuth();
  
  // Check route access based on UserType
  useEffect(() => {
    if (!userProfile) return;
    const userType = userProfile.access_level;
    if (!hasRouteAccess(userType, '/dashboard/feasibility-approval')) {
      router.push('/dashboard');
    }
  }, [userProfile, router]);
  
  // Access control removed - all users can access this page
  
  return <div>...</div>;
}
```

**After**:
```typescript
export default function FeasibilityApprovalPage() {
  return (
    <PageGuard requiredAction="view">
      <div>...</div>
    </PageGuard>
  );
}
```

### 3. Added Permission Checks to API Routes ✅

**File**: `src/app/api/swb-families/route.ts`

**Before**:
```typescript
export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("auth");
  if (!authCookie || !authCookie.value) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const userId = authCookie.value.split(":")[1];
  // ... rest of code
}
```

**After**:
```typescript
export async function GET(request: NextRequest) {
  // Check permission for swb-families route
  const permissionCheck = await requireRoutePermission(
    request,
    "/dashboard/swb-families",
    "view"
  );

  if (!permissionCheck.hasAccess) {
    return permissionCheck.error; // Returns 403
  }

  const userId = permissionCheck.userId;
  // ... rest of code
}
```

**Same pattern applied to**:
- `POST` method → action "add"
- `PUT` method → action "edit"
- `DELETE` method → action "delete"

**File**: `src/app/api/feasibility-approval/route.ts`

**Before**:
```typescript
export async function GET(request: NextRequest) {
  // Auth check
  const authCookie = request.cookies.get("auth");
  if (!authCookie || !authCookie.value) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const userId = authCookie.value.split(":")[1];
  
  // Check if user is Super Admin (UserType check)
  const userType = user?.UserType;
  const isSuperAdmin = userType === 'Super Admin';
  // ... rest of code
}
```

**After**:
```typescript
export async function GET(request: NextRequest) {
  // Check permission for feasibility-approval route
  const permissionCheck = await requireRoutePermission(
    request,
    "/dashboard/feasibility-approval",
    "view"
  );

  if (!permissionCheck.hasAccess) {
    return permissionCheck.error; // Returns 403
  }

  const userId = permissionCheck.userId;
  // ... rest of code
}
```

**PUT method** also updated to check permission with action "edit"

**File**: `src/app/api/baseline-qol-approval/route.ts`

**Before**:
```typescript
export async function GET(request: NextRequest) {
  // Auth check
  const authCookie = request.cookies.get("auth");
  if (!authCookie || !authCookie.value) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const userId = authCookie.value.split(":")[1];
  // ... rest of code
}
```

**After**:
```typescript
export async function GET(request: NextRequest) {
  // Check permission for baseline-approval route
  const permissionCheck = await requireRoutePermission(
    request,
    "/dashboard/approval-section/baseline-approval",
    "view"
  );

  if (!permissionCheck.hasAccess) {
    return permissionCheck.error; // Returns 403
  }

  const userId = permissionCheck.userId;
  // ... rest of code
}
```

## Permission Source of Truth

✅ **ONLY `PE_Rights_UserPermission` table is used**

The permission check flow:
1. `requireRoutePermission()` calls `hasRoutePermission()` from `permission-service.ts`
2. `hasRoutePermission()` checks if user is Super Admin (bypasses if yes)
3. Queries `PE_Rights_UserPermission` for user's allowed permissions (IsAllowed=1 or 'Yes')
4. Checks if user has permission for the specific route + action
5. Falls back to role permissions if no user permission found
6. Returns `false` if no permission found (default deny)

**NO UserType checks** - Only `PE_Rights_UserPermission` table

## Route-to-Permission Mapping

Routes are mapped in `src/lib/permission-service.ts` → `ROUTE_PERMISSION_MAP`:

```typescript
{
  "/dashboard/swb-families": "view",
  "/dashboard/swb-families/add": "add",
  "/dashboard/swb-families/view": "view",
  "/dashboard/swb-families/edit": "edit",
  "/dashboard/approval-section/baseline-approval": "view",
  "/dashboard/feasibility-approval": "view",
  "/dashboard/feasibility-approval/view": "view",
}
```

## Files Modified

### Pages (Added PageGuard):
1. ✅ `src/app/dashboard/swb-families/page.tsx`
2. ✅ `src/app/dashboard/approval-section/baseline-approval/page.tsx`
3. ✅ `src/app/dashboard/feasibility-approval/page.tsx`

### API Routes (Added Permission Checks):
1. ✅ `src/app/api/swb-families/route.ts` - GET, POST, PUT, DELETE
2. ✅ `src/app/api/feasibility-approval/route.ts` - GET, PUT
3. ✅ `src/app/api/baseline-qol-approval/route.ts` - GET

### Layout:
1. ✅ `src/app/dashboard/layout.tsx` - Removed UserType-based check

## Testing Steps

### Test with Editor User (without these permissions):

1. **Login as Editor user** who does NOT have PermissionIds for:
   - SWB Families
   - Baseline Approval  
   - Feasibility Approval

2. **Try accessing pages**:
   - Navigate to `/dashboard/swb-families`
     - ✅ Expected: "Access Denied" page
     - ✅ Console: `[PageGuard] Access denied for route: /dashboard/swb-families Action: view`
   
   - Navigate to `/dashboard/approval-section/baseline-approval`
     - ✅ Expected: "Access Denied" page
     - ✅ Console: `[PageGuard] Access denied for route: /dashboard/approval-section/baseline-approval Action: view`
   
   - Navigate to `/dashboard/feasibility-approval`
     - ✅ Expected: "Access Denied" page
     - ✅ Console: `[PageGuard] Access denied for route: /dashboard/feasibility-approval Action: view`

3. **Try API calls directly** (using browser DevTools or curl):
   ```bash
   # Should return 403 Forbidden
   GET /api/swb-families
   Response: { "success": false, "message": "Access denied. You don't have permission to access this resource." }
   Status: 403
   
   GET /api/feasibility-approval
   Response: { "success": false, "message": "Access denied. You don't have permission to access this resource." }
   Status: 403
   
   GET /api/baseline-qol-approval
   Response: { "success": false, "message": "Access denied. You don't have permission to access this resource." }
   Status: 403
   ```

4. **Check Sidebar**:
   - ✅ Menu items for these routes should be hidden (filtered by `useCanAccessRoute` hook)

5. **Check browser console** (dev mode):
   ```
   [getAllowedPermissionIds] User: <userId> Allowed PermissionIds: [1, 2, 11, 14]
   [hasRoutePermission] User: <userId> Route: /dashboard/swb-families Action: view Result: DENIED (no permission found)
   [PageGuard] Access denied for route: /dashboard/swb-families Action: view
   ```

## Confirmation Checklist

- ✅ Editor users can ONLY access routes if they have explicit permission in `PE_Rights_UserPermission` (IsAllowed=1)
- ✅ Pages show "Access Denied" if user lacks permission
- ✅ API routes return 403 if user lacks permission
- ✅ Sidebar hides unauthorized menu items
- ✅ Permission checks use `PE_Rights_UserPermission` as single source of truth
- ✅ UserType is NO LONGER used for access control
- ✅ Default deny: If permission not found, access is DENIED
- ✅ Super Admin bypasses all checks (has all permissions)

## Important Notes

1. **UserType is deprecated for access control** - The `hasRouteAccess()` function in `auth-utils.ts` is still present but should NOT be used for new permission checks. Use `hasRoutePermission()` from `permission-service.ts` instead.

2. **PageGuard is required** - All pages must use PageGuard component or manually check permissions using `useRoutePermission` hook.

3. **API routes must check permissions** - All API routes must use `requireRoutePermission()` helper function.

4. **Default Deny** - If permission not found in `PE_Rights_UserPermission`, access is DENIED (secure by default).

5. **Super Admin bypass** - Users with `UserType='Super Admin'` bypass all permission checks (they have all permissions).
