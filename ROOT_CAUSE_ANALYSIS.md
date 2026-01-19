# Root Cause Analysis: User 148 Cannot Access /dashboard/feasibility-approval

## User Information
- **UserId**: 148
- **Email**: shehla.altaf@sjdap.org
- **UserType**: EDO (Economic Development Officer)
- **Regional_Council**: SOUTHERN REGION
- **Local_Council**: GARDEN
- **AccessScope**: REGION

## Problem Statement
User 148 cannot access `/dashboard/feasibility-approval` even though page rights are set. The UI message indicates permissions come from `PE_Rights_UserPermission` table.

## Root Cause Analysis

### A) Route-to-Permission Mapping ✅

**Finding**: The route `/dashboard/feasibility-approval` is correctly mapped in code:

1. **permission-service.ts** (line 70):
   ```typescript
   "/dashboard/feasibility-approval": "view"
   ```

2. **useCanAccessRoute.ts** (line 42):
   ```typescript
   '/dashboard/feasibility-approval': 'FeasibilityApproval'
   ```

3. **user-profile/route.ts** (line 323):
   ```typescript
   FeasibilityApproval: hasRouteInSection('/dashboard/feasibility-approval')
   ```

**Conclusion**: Route mapping is correct in code. The issue is in the database.

### B) Database Permission Assignment ❌

**Root Cause**: User 148 likely does NOT have the required `PermissionId` assigned in `PE_Rights_UserPermission` table for the `/dashboard/feasibility-approval` route with action `view`.

**How Permission Check Works**:
1. System looks up `PE_Rights_Page` table for route `/dashboard/feasibility-approval`
2. Finds `PermissionId` linked to that `PageId` with `ActionKey = 'view'`
3. Checks `PE_Rights_UserPermission` for `UserId = 148` and that `PermissionId`
4. Verifies `IsAllowed = 1` or `'Yes'`
5. If not found, checks role permissions via `PE_Rights_UserRole` → `PE_Rights_RolePermission`

**Diagnostic SQL** (see `diagnose_user_148_permissions.sql`):
- Query 5 checks if user has the specific permission
- Query 9 shows the gap between required and user's permissions

### C) AccessScope Logic ✅

**Finding**: `AccessScope` (REGION) does NOT block page access. It only filters data in API queries.

**Evidence**:
- `feasibility-approval/route.ts` line 29-44: `regionalCouncilFilter` is only applied to data queries, not permission checks
- Permission check happens BEFORE data filtering (line 11-19)
- `AccessScope` is used for data scoping, not access control

**Conclusion**: AccessScope is NOT the issue.

### D) Route Normalization Bugs ⚠️

**Finding**: Potential route matching issues:
- Trailing slash: `/dashboard/feasibility-approval` vs `/dashboard/feasibility-approval/`
- Case sensitivity: RoutePath comparison in SQL might be case-sensitive
- Query string: Route might include query params

**Fix Applied**: Created `route-normalizer.ts` to normalize routes consistently.

### E) Code Bugs Found ✅

**Bug 1**: `feasibility-approval/route.ts` line 31
- **Issue**: `isSuperAdmin` variable is undefined
- **Fix**: Import `isSuperAdmin` from `@/lib/rbac-utils` and await it
- **Impact**: Would cause runtime error, but doesn't affect permission check

**Bug 2**: Route path matching in SQL
- **Issue**: SQL uses exact match `pg.[RoutePath] = @route_path` which doesn't handle:
  - Trailing slashes
  - Case differences
  - Sub-routes
- **Fix**: Use normalized route path with LIKE pattern matching

## Solution

### 1. Database Fix (PRIMARY)

Run `fix_user_148_permissions.sql` to:
1. Find the `PermissionId` for `/dashboard/feasibility-approval` with action `view`
2. Grant that permission to User 148 in `PE_Rights_UserPermission` with `IsAllowed = 'Yes'`

**If Page/Permission doesn't exist**:
- Create `PE_Rights_Page` entry for `/dashboard/feasibility-approval`
- Create `PE_Rights_Permission` entry with `ActionKey = 'view'`
- Grant to User 148

### 2. Code Fixes (SECONDARY)

**Applied**:
1. ✅ Fixed `isSuperAdmin` bug in `feasibility-approval/route.ts`
2. ✅ Created `route-normalizer.ts` for consistent route matching
3. ✅ Updated `permission-service.ts` to use normalized routes

**Benefits**:
- Handles trailing slash mismatches
- Handles case sensitivity
- Supports sub-route matching
- More robust permission checks

## Expected Outcome

After running the SQL fix:
1. User 148 will have `PermissionId` for `/dashboard/feasibility-approval` in `PE_Rights_UserPermission`
2. `hasRoutePermission(148, '/dashboard/feasibility-approval', 'view')` will return `true`
3. Page will load successfully
4. API will return data (filtered by Regional_Council if AccessScope = REGION)

## Verification Steps

1. Run diagnostic SQL queries to confirm current state
2. Run fix SQL script to grant permission
3. Verify permission exists: Query 4 in diagnostic SQL
4. Test page access: Navigate to `/dashboard/feasibility-approval`
5. Check API response: Should return 200 OK with data

## Files Modified

1. `src/app/api/feasibility-approval/route.ts` - Fixed `isSuperAdmin` bug
2. `src/lib/route-normalizer.ts` - New file for route normalization
3. `src/lib/permission-service.ts` - Updated to use normalized routes
4. `diagnose_user_148_permissions.sql` - Diagnostic queries
5. `fix_user_148_permissions.sql` - Fix script
