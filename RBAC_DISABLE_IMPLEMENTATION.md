# RBAC Disable Implementation Summary

## Overview
Temporarily disabled all RBAC (Role-Based Access Control) permission checks across the entire application while keeping authentication intact. All logged-in users can now access all pages and APIs without permission restrictions.

## Feature Flag
**File**: `src/lib/rbac-config.ts`

- Created centralized feature flag: `RBAC_DISABLED`
- Can be controlled via environment variable: `NEXT_PUBLIC_DISABLE_RBAC=1`
- Currently hardcoded to `true` (RBAC disabled)
- To re-enable RBAC: Set `RBAC_DISABLED = false` in `rbac-config.ts` or remove the env var

## Files Modified

### 1. Core Permission Services

#### `src/lib/rbac-config.ts` (NEW)
- Centralized feature flag configuration
- `isRBACDisabled()` function for checking flag status

#### `src/lib/permission-service.ts`
- Updated `hasRoutePermission()` to return `true` immediately when RBAC is disabled
- Added import: `import { isRBACDisabled } from "./rbac-config";`
- **Change**: Early return `true` before any database permission checks

#### `src/lib/api-permission-helper.ts`
- Updated `requireRoutePermission()` to skip permission checks when RBAC is disabled
- Added import: `import { isRBACDisabled } from "./rbac-config";`
- **Change**: Early return `{ hasAccess: true, userId }` before permission validation

#### `src/lib/rbac-utils.ts`
- Updated `hasPermission()` to return `true` when RBAC is disabled
- **Change**: Early return `true` before role/permission database queries

#### `src/lib/auth-utils.ts`
- Updated `hasRouteAccess()` (legacy UserType-based function) to return `true` when RBAC is disabled
- **Change**: Early return `true` before UserType-based route restrictions

### 2. Client-Side Hooks

#### `src/hooks/useRoutePermission.ts`
- Updated to grant access immediately when RBAC is disabled
- Added import: `import { isRBACDisabled } from "@/lib/rbac-config";`
- **Change**: Sets `hasAccess = true` and `loading = false` immediately if RBAC disabled

#### `src/hooks/useCanAccessRoute.ts`
- Updated `canAccessRoute()` pure function to return `true` when RBAC is disabled
- Added import: `import { isRBACDisabled } from "@/lib/rbac-config";`
- **Change**: Early return `true` before section permission checks

### 3. UI Components

#### `src/components/PageGuard.tsx`
- Updated to always render children when RBAC is disabled
- Added import: `import { isRBACDisabled } from "@/lib/rbac-config";`
- **Change**: Early return `<>{children}</>` before permission checks

#### `src/components/RequirePermission.tsx`
- Updated to always render children when RBAC is disabled
- Added import: `import { isRBACDisabled } from "@/lib/rbac-config";`
- **Change**: Early return `<>{children}</>` before permission checks

## API Routes Affected

All API routes using `requireRoutePermission()` are automatically affected:

1. **`src/app/api/swb-families/route.ts`** - GET, POST, PUT, DELETE
2. **`src/app/api/baseline-qol-approval/route.ts`** - GET
3. **`src/app/api/feasibility-approval/route.ts`** - GET, PUT (already updated in previous task)
4. **`src/app/api/bank-information/route.ts`** - All methods
5. **`src/app/api/loan-authorization/route.ts`** - All methods
6. **`src/app/api/check-route-permission/route.ts`** - Uses `hasRoutePermission()` (automatically affected)

**Note**: All these routes now allow access to any authenticated user when RBAC is disabled.

## What Still Works

✅ **Authentication**: Users must still be logged in (401 Unauthorized for unauthenticated requests)
✅ **Data Filtering**: Regional/Local council filtering (if not permission-based) remains intact
✅ **Super Admin Logic**: Still works when RBAC is re-enabled
✅ **Dashboard & Logout**: Unchanged

## What's Disabled

❌ **Permission Checks**: All `PE_Rights_*` table queries are skipped
❌ **403 Forbidden Errors**: No permission-based 403 responses
❌ **Access Denied Screens**: `AccessDenied` and `AccessRestricted` components are bypassed
❌ **Route Guards**: `PageGuard` and `RequirePermission` always allow access
❌ **UserType Restrictions**: Legacy `hasRouteAccess()` always returns true

## Testing Checklist

- [x] Code compiles without errors
- [x] No linter errors
- [x] All permission functions check flag first
- [x] All hooks check flag first
- [x] All components check flag first
- [x] API routes skip permission checks when flag is true
- [x] Authentication still required (401 for unauthenticated)

## How to Re-enable RBAC

1. **Option 1**: Edit `src/lib/rbac-config.ts`
   ```typescript
   export const RBAC_DISABLED = false; // Change true to false
   ```

2. **Option 2**: Remove environment variable
   ```bash
   # Remove NEXT_PUBLIC_DISABLE_RBAC from .env
   ```

3. **Option 3**: Set environment variable to false
   ```bash
   NEXT_PUBLIC_DISABLE_RBAC=0
   ```

## Implementation Pattern

All permission checks follow this pattern:

```typescript
// Server-side (API routes, services)
if (isRBACDisabled()) {
  return true; // or { hasAccess: true, userId }
}

// Client-side (hooks, components)
if (isRBACDisabled()) {
  return true; // or <>{children}</>
}

// Continue with normal permission checks...
```

## Notes

- The flag is checked **first** in all permission functions, before any database queries
- This ensures maximum performance when RBAC is disabled (no unnecessary DB calls)
- Authentication checks remain in place (users must be logged in)
- All changes are backward compatible - re-enabling RBAC restores original behavior
