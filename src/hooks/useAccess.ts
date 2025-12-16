"use client";

import { useState, useEffect } from "react";

type AccessLevel = 'Admin' | 'User' | null;

type AccessPermissions = {
	accessLevel: AccessLevel;
	isAdmin: boolean;
	canUpload: boolean;
	canManageCategories: boolean;
	canManageSubCategories: boolean;
	loading: boolean;
	error: string | null;
};

export function useAccess(userId?: string | null) {
	const [permissions, setPermissions] = useState<AccessPermissions>({
		accessLevel: null,
		isAdmin: false,
		canUpload: false,
		canManageCategories: false,
		canManageSubCategories: false,
		loading: true,
		error: null
	});

	useEffect(() => {
		if (!userId) {
			setPermissions(prev => ({
				...prev,
				loading: false,
				error: "No user ID provided"
			}));
			return;
		}

		checkAccess(userId);
	}, [userId]);

	const checkAccess = async (userId: string) => {
		try {
			setPermissions(prev => ({ ...prev, loading: true, error: null }));
			
			const response = await fetch(`/api/auth/access?userId=${encodeURIComponent(userId)}`);
			const data = await response.json();
			
			if (data.success) {
				setPermissions({
					accessLevel: data.accessLevel,
					isAdmin: data.isAdmin,
					canUpload: data.canUpload,
					canManageCategories: data.canManageCategories,
					canManageSubCategories: data.canManageSubCategories,
					loading: false,
					error: null
				});
			} else {
				setPermissions({
					accessLevel: null,
					isAdmin: false,
					canUpload: false,
					canManageCategories: false,
					canManageSubCategories: false,
					loading: false,
					error: data.message || "Failed to check access"
				});
			}
		} catch (error) {
			setPermissions({
				accessLevel: null,
				isAdmin: false,
				canUpload: false,
				canManageCategories: false,
				canManageSubCategories: false,
				loading: false,
				error: "Error checking access permissions"
			});
			console.error("Error checking access:", error);
		}
	};

	const refreshAccess = () => {
		if (userId) {
			checkAccess(userId);
		}
	};

	return {
		...permissions,
		refreshAccess
	};
}
