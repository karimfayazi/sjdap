"use client";

import { useEffect, useState } from "react";

export type UserProfile = {
	username: string;
	email: string;
	full_name: string | null;
	department: string | null;
	region: string | null;
	address: string | null;
	contact_no: string | null;
	access_level: string | null;
	active: boolean | null;
	access_add: boolean | number | null;
	access_edit: boolean | number | null;
	access_delete: boolean | number | null;
	access_reports: boolean | number | null;
	section: string | null;
	supper_user: string | boolean | number | null;
	access_loans: boolean | number | string | null;
	bank_account: boolean | number | string | null;
	BaselineQOL: boolean | number | null;
	Dashboard: boolean | number | null;
	PowerBI: boolean | number | null;
	Family_Development_Plan: boolean | number | null;
	Family_Income: boolean | number | null;
	ROP: boolean | number | null;
	Setting: boolean | number | null;
	Other: boolean | number | null;
	SWB_Families: boolean | number | null;
	ActualIntervention: boolean | number | null;
	FinanceSection: boolean | number | null;
	BankInformation: boolean | number | null;
	BaselineApproval: boolean | number | null;
	FeasibilityApproval: boolean | number | null;
	FdpApproval: boolean | number | null;
	InterventionApproval: boolean | number | null;
	BankAccountApproval: boolean | number | null;
};

export type UserInfo = {
	id: string;
	name: string | null;
	username: string | null;
	department: string | null;
	region: string | null;
};

export function useAuth() {
	const [user, setUser] = useState<UserInfo | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const getUserId = (): string | null => {
		if (typeof window === 'undefined') return null;
		
		try {
			const rawCookieString = document.cookie;
			
			if (process.env.NODE_ENV === 'development') {
				console.log('[useAuth.getUserId:CLIENT] Raw cookie string:', rawCookieString);
			}
			
			const authCookie = rawCookieString
				.split("; ")
				.find((row) => row.startsWith("auth="));
			
			if (!authCookie) {
				if (process.env.NODE_ENV === 'development') {
					console.log('[useAuth.getUserId:CLIENT] No auth cookie found');
				}
				return null;
			}
			
			// Extract value after "auth=" (handle values with = in them)
			const cookieValue = authCookie.split("=").slice(1).join("=");
			
			if (process.env.NODE_ENV === 'development') {
				console.log('[useAuth.getUserId:CLIENT] Auth cookie found:', authCookie);
				console.log('[useAuth.getUserId:CLIENT] Cookie value (before extraction):', cookieValue);
			}
			
			// Decode URL encoding (handles %3A for colon)
			let decoded: string;
			try {
				const decodedAttempt = decodeURIComponent(cookieValue);
				decoded = decodedAttempt !== cookieValue ? decodedAttempt : cookieValue;
			} catch (error) {
				decoded = cookieValue;
			}
			
			if (process.env.NODE_ENV === 'development') {
				console.log('[useAuth.getUserId:CLIENT] Decoded cookie value:', decoded);
			}
			
			// Remove quotes if present
			decoded = decoded.replace(/^["']|["']$/g, '');
			
			// Match authenticated:userId pattern (try multiple patterns)
			const patterns = [
				/^authenticated:(.+)$/,  // Standard: authenticated:103
				/^authenticated%3A(.+)$/, // URL encoded: authenticated%3A103 (if not decoded)
				/^authenticated(.+)$/     // Fallback: authenticated103
			];
			
			for (const pattern of patterns) {
				const match = decoded.match(pattern);
				if (match && match[1]) {
					const userId = match[1].trim();
					if (process.env.NODE_ENV === 'development') {
						console.log('[useAuth.getUserId:CLIENT] Extracted userId:', userId);
					}
					return userId || null;
				}
			}
			
			if (process.env.NODE_ENV === 'development') {
				console.warn('[useAuth.getUserId:CLIENT] No match found. Decoded value:', decoded);
			}
			
			return null;
		} catch (error) {
			console.error('[useAuth.getUserId:CLIENT] Error parsing cookie:', error);
			return null;
		}
	};

	const fetchUserInfo = async (): Promise<UserInfo | null> => {
		const userId = getUserId();
		if (!userId) return null;

		try {
			const res = await fetch(`/api/user-info`);
			const data = await res.json();
			
			if (data.success) {
				return data.user;
			}
			return null;
		} catch (error) {
			console.error("Error fetching user info:", error);
			return null;
		}
	};

	const fetchUserProfile = async (): Promise<UserProfile | null> => {
		const userId = getUserId();
		if (!userId) {
			console.error('[useAuth] No user ID found - user not authenticated');
			return null;
		}

		try {
			// Add cache-busting parameter to force fresh data from server
			const cacheBuster = `?t=${Date.now()}`;
			const res = await fetch(`/api/user-profile${cacheBuster}`, {
				credentials: 'include', // Include cookies in the request
			});
			const data = await res.json();

			if (data.success) {
				return data.user;
			} else {
				// Log the error response
				console.error('[useAuth] API returned error:', {
					success: data.success,
					message: data.message,
					debug: data.debug,
					status: res.status
				});
				return null;
			}
		} catch (error) {
			console.error("[useAuth] Error fetching user profile:", error);
			return null;
		}
	};

	const refreshUser = async () => {
		setLoading(true);
		setError(null);
		
		try {
			// Add cache-busting parameter to force fresh data from server
			const cacheBuster = `?t=${Date.now()}`;
			const [userInfo, profile] = await Promise.all([
				fetchUserInfo(),
				fetch(`/api/user-profile${cacheBuster}`, {
					credentials: 'include', // Include cookies in the request
				}).then(res => res.json()).then(data => data.success ? data.user : null)
			]);
			
			// If API calls fail, try to get data from localStorage
			if (!userInfo && typeof window !== 'undefined') {
				const storedUser = localStorage.getItem('userData');
				if (storedUser) {
					const parsedUser = JSON.parse(storedUser);
					setUser({
						id: parsedUser.id,
						name: parsedUser.name,
						username: parsedUser.username,
						department: parsedUser.department,
						region: parsedUser.region
					});
				}
			} else {
				setUser(userInfo);
			}
			
			// Debug: Log the profile to verify all fields are present
			if (profile && typeof window !== "undefined") {
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
			}
			
			setUserProfile(profile);
		} catch (err) {
			setError("Failed to load user data");
			console.error("Error refreshing user:", err);
			
			// Fallback to localStorage
			if (typeof window !== 'undefined') {
				const storedUser = localStorage.getItem('userData');
				if (storedUser) {
					const parsedUser = JSON.parse(storedUser);
					setUser({
						id: parsedUser.id,
						name: parsedUser.name,
						username: parsedUser.username,
						department: parsedUser.department,
						region: parsedUser.region
					});
				}
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		refreshUser();
	}, []);

	return {
		user,
		userProfile,
		loading,
		error,
		refreshUser,
		getUserId,
		isAuthenticated: !!user
	};
}
