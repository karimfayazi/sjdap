"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import { isSuperUser, isAdminUser, hasFullAccess, normalizePermission } from "@/lib/auth-utils";

type SectionPermission = 
	| "BaselineQOL"
	| "Dashboard"
	| "PowerBI"
	| "Family_Development_Plan"
	| "Family_Approval_CRC"
	| "Family_Income"
	| "ROP"
	| "Setting"
	| "Other"
	| "SWB_Families";

export function useSectionAccess(section: SectionPermission) {
	const router = useRouter();
	const { userProfile, loading: authLoading } = useAuth();
	const [hasAccess, setHasAccess] = useState<boolean | null>(null);

	useEffect(() => {
		if (authLoading) return;

		// ALL USERS HAVE ACCESS TO ALL SECTIONS - NO PERMISSION CHECKS
		// Grant access to everyone regardless of permissions
		if (typeof window !== "undefined") {
			console.log("=== SECTION ACCESS CHECK (ALL USERS ALLOWED) ===", {
				username: userProfile?.username,
				section: section,
				access: "GRANTED"
			});
		}

		setHasAccess(true);
	}, [userProfile, authLoading, section, router]);

	return {
		hasAccess,
		loading: authLoading || hasAccess === null,
		sectionName: section.replace(/_/g, " "),
	};
}

