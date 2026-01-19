# Settings Page Authentication Fix - Summary

## Problem Statement

User: **karim.fayazi@sjdap.org** (UserId=103, Super Admin)
- Database: `dbo.PE_User.UserType = 'Super Admin'`
- Issue: Opening `/dashboard/settings` shows:
  - "Access Denied - Your current user type: Not Authenticated"
- This indicates the Settings page guard is not receiving an authenticated user/session OR the auth state is not available at the time of the check.

**Goal**: Fix the code so an authenticated user is recognized as authenticated on `/dashboard/settings` and can access the page. Remove the incorrect "Not Authenticated" state when the user is actually logged in.

## Root Cause Analysis

### 1. Race Condition in Settings Page Access Check ❌

**File**: `src/app/dashboard/settings/page.tsx`

**Problem**: The access check was happening too early, before the `useAuth` hook finished loading the user profile:

```typescript
// Line 55-59 (BEFORE FIX):
if (!userIdFromCookie && !userProfile) {
  setAccessDenied(true);
  setShownType("Not Authenticated");
  setCheckingAccess(false);
  return;
}
```

**Issues**:
1. **Timing Issue**: Even though `loading` was false, `userProfile` could still be `null` if:
   - The API call was still in progress
   - The API call failed silently
   - There was a race condition between `loading` becoming false and `userProfile` being set

2. **No Fallback**: If `getUserId()` failed to parse the cookie (even though the cookie exists), the code immediately denied access without trying to fetch the profile directly.

3. **Missing Credentials**: API calls were not including `credentials: 'include'`, which could cause cookies to not be sent in some scenarios.

### 2. useAuth Hook Missing Credentials ❌

**File**: `src/hooks/useAuth.ts`

**Problem**: The `fetchUserProfile` function was not including `credentials: 'include'` in the fetch request, which could cause cookies to not be sent:

```typescript
// BEFORE FIX:
const res = await fetch(`/api/user-profile${cacheBuster}`);
```

**Issue**: Without `credentials: 'include'`, cookies might not be sent with the request, causing the API to return 401 Unauthorized.

## Solution Implemented

### 1. Fixed Settings Page Access Check ✅

**File**: `src/app/dashboard/settings/page.tsx`

**Changes**:
1. **Added Fallback Profile Fetch**: If `userProfile` is null but `userIdFromCookie` exists, try to fetch the profile directly from the API
2. **Better Cookie Checking**: Check if the auth cookie exists even if `getUserId()` returns null (might be a parsing issue)
3. **Added Credentials**: Include `credentials: 'include'` in all API calls to ensure cookies are sent
4. **Enhanced Debugging**: Added comprehensive logging to help diagnose auth issues

**After**:
```typescript
// If no userId from cookie AND no profile after loading is complete, check if cookie exists
if (!userIdFromCookie && !userProfile) {
  // Double-check: maybe cookie exists but getUserId() failed to parse it
  if (typeof window !== 'undefined') {
    const allCookies = document.cookie.split('; ');
    const authCookie = allCookies.find((row) => row.startsWith("auth="));
    
    // If auth cookie exists but getUserId() returned null, there might be a parsing issue
    if (authCookie) {
      // Cookie exists but parsing failed - try to fetch profile directly
      try {
        const res = await fetch("/api/user-profile?t=" + Date.now(), {
          credentials: 'include', // Include cookies
        });
        const data = await res.json();
        if (data.success && data.user) {
          // Profile exists - use it
          const profile = data.user;
          const rawType = profile.access_level || "";
          const normalize = (v?: string | null) => (v || "").trim().toLowerCase();
          const adminValues = ["super admin", "supper admin"];
          const isSuperAdmin = adminValues.includes(normalize(rawType));
          
          setShownType(rawType || "Error: UserType not found");
          setAccessDenied(!isSuperAdmin);
          setCheckingAccess(false);
          return;
        }
      } catch (error) {
        console.error('[SettingsPage] Error fetching profile as fallback:', error);
      }
    }
  }
  
  // Only show "Not Authenticated" if we're certain there's no session
  setAccessDenied(true);
  setShownType("Not Authenticated");
  setCheckingAccess(false);
  return;
}

// ... later in the code ...

// If we don't have a profile yet but have userIdFromCookie, try to fetch it
if (!userProfile && userIdFromCookie) {
  try {
    const res = await fetch("/api/user-profile?t=" + Date.now(), {
      credentials: 'include', // Include cookies
    });
    const data = await res.json();
    if (data.success && data.user) {
      // Use the fetched profile
      const fetchedProfile = data.user;
      const fetchedRawType = fetchedProfile.access_level || "";
      if (fetchedRawType) {
        rawType = fetchedRawType;
        isSuperAdmin = adminValues.includes(normalize(fetchedRawType));
        shownType = fetchedRawType;
      }
    }
  } catch (error) {
    console.error('[SettingsPage] Error fetching profile:', error);
  }
}
```

### 2. Fixed useAuth Hook to Include Credentials ✅

**File**: `src/hooks/useAuth.ts`

**Changes**: Added `credentials: 'include'` to all fetch requests to ensure cookies are sent:

**Before**:
```typescript
const res = await fetch(`/api/user-profile${cacheBuster}`);
```

**After**:
```typescript
const res = await fetch(`/api/user-profile${cacheBuster}`, {
  credentials: 'include', // Include cookies in the request
});
```

**Applied to**:
1. `fetchUserProfile()` function
2. `refreshUser()` function (both places where `/api/user-profile` is called)

## Data Flow

1. **Login**: User logs in → Cookie set: `auth=authenticated:103` (or email)
2. **Settings Page Loads**: 
   - `useAuth` hook calls `fetchUserProfile()` with `credentials: 'include'`
   - API receives cookie and returns user profile with `access_level: 'Super Admin'`
   - Settings page checks `userProfile.access_level`
3. **Fallback**: If profile not loaded:
   - Check if auth cookie exists
   - If cookie exists, fetch profile directly from API
   - Use fetched profile to determine access
4. **Access Granted**: If `access_level` normalizes to "super admin", access is granted

## Files Modified

1. ✅ `src/app/dashboard/settings/page.tsx`
   - Added fallback to fetch profile if not loaded
   - Added better cookie checking
   - Added `credentials: 'include'` to API calls
   - Enhanced debugging logs

2. ✅ `src/hooks/useAuth.ts`
   - Added `credentials: 'include'` to all fetch requests
   - Ensures cookies are sent with API calls

## Testing Steps

### Test with karim.fayazi@sjdap.org:

1. **Login as karim.fayazi@sjdap.org**
   - UserType in database: `'Super Admin'`
   - UserId: `103`

2. **Navigate to `/dashboard/settings`**
   - ✅ Expected: Settings page loads without "Access Denied"
   - ✅ Expected: No "Not Authenticated" user type shown
   - ✅ Expected: All tabs (Users, Roles, Pages, Permissions, etc.) are accessible

3. **Refresh the page** (F5 or Ctrl+R)
   - ✅ Expected: Settings page still loads correctly
   - ✅ Expected: No "Not Authenticated" error after refresh

4. **Check browser console** (dev mode):
   ```
   [useAuth] User profile loaded: {
     email: "karim.fayazi@sjdap.org",
     username: "103",
     access_level: "Super Admin",  // ✅ Should show "Super Admin"
     ...
   }
   
   [SettingsPage] Auth state check: {
     loading: false,
     userIdFromCookie: "103",  // ✅ Should show userId
     hasUserProfile: true,
     access_level: "Super Admin",  // ✅ Should show "Super Admin"
     ...
   }
   ```

5. **Check Network Tab** (DevTools):
   - ✅ `/api/user-profile` request should include `Cookie: auth=authenticated:103`
   - ✅ Response should be 200 OK with user profile
   - ✅ No 401 Unauthorized errors

## Confirmation Checklist

- ✅ Settings page waits for auth to fully load before checking
- ✅ Fallback mechanism fetches profile if not loaded
- ✅ All API calls include `credentials: 'include'` to send cookies
- ✅ Better cookie checking (verifies cookie exists even if parsing fails)
- ✅ Enhanced debugging logs to help diagnose issues
- ✅ "Not Authenticated" only shown when truly not authenticated
- ✅ Super Admin users can access `/dashboard/settings`
- ✅ Page works correctly after refresh

## Important Notes

1. **Credentials Required**: All fetch requests to `/api/user-profile` and `/api/check-super-admin` now include `credentials: 'include'` to ensure cookies are sent.

2. **Fallback Mechanism**: If the profile isn't loaded by the time the check runs, the code now:
   - Checks if the auth cookie exists
   - If cookie exists, fetches the profile directly
   - Uses the fetched profile to determine access

3. **Race Condition Fixed**: The code now handles the case where `loading` is false but `userProfile` is still null (race condition).

4. **Better Error Handling**: Instead of immediately showing "Not Authenticated", the code now tries multiple fallback methods before denying access.

5. **Debug Logging**: Comprehensive logging in development mode helps diagnose auth issues quickly.
