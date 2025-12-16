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
	access_add: boolean | number | null;
	access_edit: boolean | number | null;
	access_delete: boolean | number | null;
	access_reports: boolean | number | null;
	section: string | null;
	supper_user: string | boolean | number | null;
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
		
		const authCookie = document.cookie
			.split("; ")
			.find((row) => row.startsWith("auth="))
			?.split("=")[1];

		if (authCookie && authCookie.startsWith("authenticated:")) {
			return authCookie.split(":")[1];
		}
		return null;
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
		if (!userId) return null;

		try {
			const res = await fetch(`/api/user-profile`);
			const data = await res.json();

			if (data.success) {
				return data.user;
			}
			return null;
		} catch (error) {
			console.error("Error fetching user profile:", error);
			return null;
		}
	};

	const refreshUser = async () => {
		setLoading(true);
		setError(null);
		
		try {
			const [userInfo, profile] = await Promise.all([
				fetchUserInfo(),
				fetchUserProfile()
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
