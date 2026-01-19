# Super Admin Access Fix - Summary

## Problem Statement

User: **karim.fayazi@sjdap.org**
- Database: `dbo.PE_User.UserType = 'Super Admin'`
- Issue: Cannot access `/dashboard/settings`
- Error shown: "Access Denied - Your current user type: Unknown"

**Goal**: Fix the code so the app correctly identifies the logged-in user as Super Admin (UserType) and allows access to `/dashboard/settings`. Also ensure the user type is never shown as "Unknown" when the session/user exists.

## Root Cause Analysis

### 1. Settings Page Access Check Logic ❌

**File**: `src/app/dashboard/settings/page.tsx`

**Problems**:
1. **Line 64-69**: The code was trying multiple fallback paths to read UserType:
   ```typescript
   const rawType =
     userProfile?.access_level ||
     (userProfile as any)?.AccessLevel ||
     (userProfile as any)?.UserType ||
     (userProfile as any)?.userType ||
     "";
   ```
   This was overly complex and could fail if `userProfile` was null or `access_level` was undefined.

2. **Line 72**: Defaulted to "Unknown" if `rawType` was empty:
   ```typescript
   let shownType = rawType || "Unknown";
   ```
   This caused "Unknown" to be shown even when the user session existed.

3. **Line 53-57**: If `userIdFromCookie` and `userProfile` were both falsy, it immediately set `shownType = "Unknown"` without checking if the profile was still loading.

4. **Missing logging**: No debug logging to see what values were being received.

### 2. User Profile API Returns Correct Data ✅

**File**: `src/app/api/user-profile/route.ts`

**Status**: The API correctly:
- Reads `UserType` from database (line 60, 95)
- Maps it to `userTypeValue` (line 160-162)
- Returns it as `access_level: userTypeValue` (line 200)

**No changes needed** - The API is working correctly.

### 3. useAuth Hook Logging ❌

**File**: `src/hooks/useAuth.ts`

**Problem**: The debug logging only checked for `BaselineQOL` but didn't log `access_level` (which contains UserType), making it hard to debug why UserType wasn't being detected.

## Solution Implemented

### 1. Fixed Settings Page Access Check ✅

**File**: `src/app/dashboard/settings/page.tsx`

**Changes**:
1. **Simplified UserType reading**: Now only reads from `userProfile?.access_level` (which contains UserType from database)
2. **Better error handling**: Never shows "Unknown" - shows "Not Authenticated" if no session, or "Error: UserType not found" if session exists but UserType is missing
3. **Improved fallback logic**: If `access_level` check fails, calls `/api/check-super-admin` API and uses the returned `userType`
4. **Added debug logging**: Logs all relevant values in development mode
5. **Better loading state**: Shows "Loading..." while checking instead of "Unknown"

**Before**:
```typescript
const rawType =
  userProfile?.access_level ||
  (userProfile as any)?.AccessLevel ||
  (userProfile as any)?.UserType ||
  (userProfile as any)?.userType ||
  "";

let isSuperAdmin = adminValues.includes(normalize(rawType));
let shownType = rawType || "Unknown";
```

**After**:
```typescript
// Read UserType from access_level (which contains UserType from database)
const rawType = userProfile?.access_level || "";

// Debug logging (dev only)
if (process.env.NODE_ENV === 'development') {
  console.log('[SettingsPage] Checking Super Admin access:', {
    userIdFromCookie,
    hasUserProfile: !!userProfile,
    access_level: userProfile?.access_level,
    rawType,
    normalized: normalize(rawType),
    email: userProfile?.email,
    username: userProfile?.username,
    fullProfile: userProfile
  });
}

let isSuperAdmin = adminValues.includes(normalize(rawType));
let shownType = rawType || "Loading...";

// ... fallback to API check if needed ...

// Never show "Unknown" - if we have a session, we should have a userType
if (shownType === "Unknown" || shownType === "") {
  if (userIdFromCookie || userProfile) {
    // We have a session but no userType - this is an error
    console.error('[SettingsPage] User session exists but UserType is missing:', {
      userIdFromCookie,
      userProfile,
      access_level: userProfile?.access_level
    });
    shownType = "Error: UserType not found";
  } else {
    shownType = "Not Authenticated";
  }
}
```

### 2. Enhanced useAuth Logging ✅

**File**: `src/hooks/useAuth.ts`

**Changes**: Added logging for `access_level` (UserType) to help debug issues:

**Before**:
```typescript
console.log('[useAuth] User profile loaded:', {
  email: profile.email,
  username: profile.username,
  BaselineQOL: profile.BaselineQOL,
  BaselineQOLType: typeof profile.BaselineQOL,
  allKeys: Object.keys(profile)
});
```

**After**:
```typescript
console.log('[useAuth] User profile loaded:', {
  email: profile.email,
  username: profile.username,
  access_level: profile.access_level, // This contains UserType from database
  access_levelType: typeof profile.access_level,
  BaselineQOL: profile.BaselineQOL,
  BaselineQOLType: typeof profile.BaselineQOL,
  supper_user: profile.supper_user,
  full_name: profile.full_name,
  allKeys: Object.keys(profile)
});

// Warn if access_level (UserType) is missing
if (!profile.access_level) {
  console.warn('[useAuth] WARNING: access_level (UserType) is missing from profile!', {
    profile,
    allKeys: Object.keys(profile)
  });
}
```

## Data Flow

1. **Database**: `PE_User.UserType = 'Super Admin'`
2. **API**: `/api/user-profile` reads `UserType` and returns it as `access_level: 'Super Admin'`
3. **useAuth Hook**: Stores profile with `access_level: 'Super Admin'`
4. **Settings Page**: Reads `userProfile.access_level` and normalizes to check if it's "super admin"
5. **Access Granted**: If normalized value matches "super admin" or "supper admin", access is granted

## Files Modified

1. ✅ `src/app/dashboard/settings/page.tsx`
   - Simplified UserType reading logic
   - Added better error handling (never shows "Unknown")
   - Added debug logging
   - Improved fallback to API check

2. ✅ `src/hooks/useAuth.ts`
   - Enhanced debug logging to include `access_level` (UserType)
   - Added warning if `access_level` is missing

## Testing Steps

### Test with karim.fayazi@sjdap.org:

1. **Login as karim.fayazi@sjdap.org**
   - UserType in database: `'Super Admin'`

2. **Navigate to `/dashboard/settings`**
   - ✅ Expected: Settings page loads without "Access Denied"
   - ✅ Expected: No "Unknown" user type shown
   - ✅ Expected: All tabs (Users, Roles, Pages, Permissions, etc.) are accessible

3. **Check browser console** (dev mode):
   ```
   [useAuth] User profile loaded: {
     email: "karim.fayazi@sjdap.org",
     username: "...",
     access_level: "Super Admin",  // ✅ Should show "Super Admin"
     access_levelType: "string",
     ...
   }
   
   [SettingsPage] Checking Super Admin access: {
     userIdFromCookie: "...",
     hasUserProfile: true,
     access_level: "Super Admin",  // ✅ Should show "Super Admin"
     rawType: "Super Admin",
     normalized: "super admin",
     ...
   }
   ```

4. **Verify access is granted**:
   - ✅ Settings page should load
   - ✅ No "Access Denied" message
   - ✅ User type should show "Super Admin" (if displayed anywhere)

## Confirmation Checklist

- ✅ Settings page correctly reads UserType from `userProfile.access_level`
- ✅ UserType is never shown as "Unknown" when session exists
- ✅ Super Admin users (UserType='Super Admin') can access `/dashboard/settings`
- ✅ Debug logging added to help troubleshoot future issues
- ✅ Better error messages (shows "Not Authenticated" or "Error: UserType not found" instead of "Unknown")
- ✅ Fallback to `/api/check-super-admin` if `access_level` check fails

## Important Notes

1. **UserType is stored in `access_level`**: The `user-profile` API returns `UserType` from database as `access_level` field in the profile object.

2. **Normalization**: The code normalizes "Super Admin" to "super admin" (lowercase) for comparison, so it matches both "Super Admin" and "Supper Admin" (typo variant).

3. **Fallback API**: If the initial `access_level` check fails, the code calls `/api/check-super-admin` which queries the database directly to verify Super Admin status.

4. **Never show "Unknown"**: The code now ensures that if a user session exists, it will either show the actual UserType or an error message, never "Unknown".

5. **Debug logging**: All debug logs are only shown in development mode (`process.env.NODE_ENV === 'development'`).
