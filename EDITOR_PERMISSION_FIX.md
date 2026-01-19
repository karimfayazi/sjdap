# Editor Permission Fix - Summary

## Root Cause Analysis

Editor users (UserType='Editor') were able to access three routes they should NOT have access to:
- `/dashboard/swb-families`
- `/dashboard/approval-section/baseline-approval`
- `/dashboard/feasibility-approval`

### Root Causes:

1. **Dashboard Layout Using UserType-Based Checks** ❌
   - **File**: `src/app/dashboard/layout.tsx`
   - **Issue**: Used `hasRouteAccess()` which only checks UserType, not `PE_Rights_UserPermission`
   - **Problem**: The function returns `false` for routes not in Editor's allowed list, but pages themselves had no guards

2. **Pages Had No Permission Guards** ❌
   - **Files**: 
     - `src/app/dashboard/swb-families/page.tsx` - Line 232: "Access control removed - all users can access this page"
     - `src/app/dashboard/approval-section/baseline-approval/page.tsx` - Line 21: "Access control removed - all users can access this page"
     - `src/app/dashboard/feasibility-approval/page.tsx` - Line 199: "Access control removed - all users can access this page"
   - **Problem**: Pages had comments saying access control was removed and no PageGuard components

3. **API Routes Only Checked Authentication** ❌
   - **Files**: 
     - `src/app/api/swb-families/route.ts`
     - `src/app/api/feasibility-approval/route.ts`
     - `src/app/api/baseline-qol-approval/route.ts`
   - **Problem**: Only checked if user is authenticated, not if they have permission

4. **hasRouteAccess Function Only Checks UserType** ❌
   - **File**: `src/lib/auth-utils.ts` - Lines 150-191
   - **Problem**: This function grants access based on UserType (Editor, Super Admin, etc.) but does NOT check `PE_Rights_UserPermission` table
   - **Note**: This function is now deprecated in favor of permission-based checks

## Solution Implemented

### 1. Removed UserType-Based Access Check from Dashboard Layout ✅
**File**: `src/app/dashboard/layout.tsx`

**Changes**:
- Removed `hasRouteAccess()` check that was based on UserType
- Added comment explaining that route access is now checked by PageGuard components
- Individual pages now enforce their own permissions

### 2. Added PageGuard to All Three Pages ✅

**Files Modified**:
- `src/app/dashboard/swb-families/page.tsx`
- `src/app/dashboard/approval-section/baseline-approval/page.tsx`
- `src/app/dashboard/feasibility-approval/page.tsx`

**Changes**:
- Wrapped page content in `<PageGuard requiredAction="view">` component
- Removed comments saying "Access control removed"
- Removed UserType-based checks from feasibility-approval page

### 3. Added Permission Checks to API Routes ✅

**Files Modified**:
- `src/app/api/swb-families/route.ts`
  - GET: Checks permission for `/dashboard/swb-families` with action "view"
  - POST: Checks permission with action "add"
  - PUT: Checks permission with action "edit"
  - DELETE: Checks permission with action "delete"

- `src/app/api/feasibility-approval/route.ts`
  - GET: Checks permission for `/dashboard/feasibility-approval` with action "view"
  - PUT: Checks permission with action "edit"

- `src/app/api/baseline-qol-approval/route.ts`
  - GET: Checks permission for `/dashboard/approval-section/baseline-approval` with action "view"

**Implementation**:
```typescript
const permissionCheck = await requireRoutePermission(
  request,
  "/dashboard/swb-families",  // or appropriate route
  "view"  // or "add", "edit", "delete"
);

if (!permissionCheck.hasAccess) {
  return permissionCheck.error; // Returns 403
}

const userId = permissionCheck.userId;
```

## Permission Source of Truth

✅ **ONLY `PE_Rights_UserPermission` table is used** - NOT UserType or PE_User columns

The permission system:
1. Checks `PE_Rights_UserPermission` for user's allowed PermissionIds (IsAllowed=1)
2. Maps routes to permissions via `ROUTE_PERMISSION_MAP` in `permission-service.ts`
3. Checks user permissions first, then role permissions
4. Super Admin bypasses all checks (has all permissions)

## Route-to-Permission Mapping

The routes are mapped in `src/lib/permission-service.ts`:

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

### Pages:
- ✅ `src/app/dashboard/swb-families/page.tsx` - Added PageGuard
- ✅ `src/app/dashboard/approval-section/baseline-approval/page.tsx` - Added PageGuard
- ✅ `src/app/dashboard/feasibility-approval/page.tsx` - Added PageGuard, removed UserType check

### API Routes:
- ✅ `src/app/api/swb-families/route.ts` - Added permission checks to GET, POST, PUT, DELETE
- ✅ `src/app/api/feasibility-approval/route.ts` - Added permission checks to GET, PUT
- ✅ `src/app/api/baseline-qol-approval/route.ts` - Added permission check to GET

### Layout:
- ✅ `src/app/dashboard/layout.tsx` - Removed UserType-based access check

## Testing with Editor User

### Expected Behavior:
- ✅ Editor users can ONLY access routes if they have explicit permission in `PE_Rights_UserPermission` (IsAllowed=1)
- ✅ If Editor user does NOT have permission for these 3 routes, they will see "Access Denied"
- ✅ API calls will return 403 Forbidden
- ✅ Sidebar will hide these menu items if user lacks permission

### Test Steps:

1. **Login as Editor user** (UserType='Editor') who does NOT have PermissionIds for:
   - SWB Families
   - Baseline Approval
   - Feasibility Approval

2. **Try accessing pages directly**:
   - Navigate to `/dashboard/swb-families` → Should show "Access Denied"
   - Navigate to `/dashboard/approval-section/baseline-approval` → Should show "Access Denied"
   - Navigate to `/dashboard/feasibility-approval` → Should show "Access Denied"

3. **Check browser console** (dev mode):
   ```
   [hasRoutePermission] User: <userId> Route: /dashboard/swb-families Action: view Result: DENIED
   [PageGuard] Access denied for route: /dashboard/swb-families Action: view
   ```

4. **Try API calls directly**:
   ```bash
   # Should return 403
   GET /api/swb-families
   GET /api/feasibility-approval
   GET /api/baseline-qol-approval
   ```

5. **Check Sidebar**:
   - Menu items for these routes should be hidden if user lacks permission

## Important Notes

1. **UserType is NO LONGER used for access control** - Only `PE_Rights_UserPermission` table
2. **Default Deny**: If permission not found, access is DENIED (secure by default)
3. **Super Admin**: Users with `UserType='Super Admin'` bypass all permission checks
4. **PageGuard**: All pages must use PageGuard or check permissions manually
5. **API Protection**: All API routes must use `requireRoutePermission()` helper

## Confirmation

✅ Editor users can now ONLY access routes if they have explicit permission in `PE_Rights_UserPermission`
✅ Pages show "Access Denied" if user lacks permission
✅ API routes return 403 if user lacks permission
✅ Sidebar hides unauthorized menu items
✅ Permission checks use `PE_Rights_UserPermission` as single source of truth
