"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import { normalizePermission } from "@/lib/auth-utils";
import { hasUserTypeSectionAccess } from "@/lib/accessByUserType";

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
	| "SWB_Families"
	| "ActualIntervention"
	| "FinanceSection"
	| "BankInformation"
	| "BaselineApproval"
	| "FeasibilityApproval"
	| "FdpApproval"
	| "InterventionApproval"
	| "BankAccountApproval";

export function useSectionAccess(section: SectionPermission) {
	const router = useRouter();
	const { userProfile, loading: authLoading } = useAuth();
	const [hasAccess, setHasAccess] = useState<boolean | null>(null);

	useEffect(() => {
		if (authLoading) return;

		if (!userProfile) {
			setHasAccess(false);
			return;
		}

		// Check UserType-based access FIRST (before RBAC permissions)
		const userType = userProfile.access_level; // access_level contains UserType from database
		const hasUserTypeAccess = hasUserTypeSectionAccess(userType, section);
		
		if (hasUserTypeAccess) {
			// UserType allows access - grant immediately without checking RBAC
			if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
				console.log(`[useSectionAccess] UserType access granted:`, {
					section,
					userType,
					user: userProfile.username
				});
			}
			setHasAccess(true);
			return;
		}

		// Fall back to RBAC permission check
		// Get permission value from userProfile (now based on PE_Rights_UserPermission)
		const permissionValue = userProfile[section as keyof typeof userProfile];
		const hasSectionAccess = normalizePermission(permissionValue);

		// Debug logging (dev only)
		if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
			console.log(`[useSectionAccess] Section: ${section}, Permission Value:`, permissionValue, `Type:`, typeof permissionValue, `Has Access:`, hasSectionAccess, `User:`, userProfile.username, `UserType:`, userType);
		}

		setHasAccess(hasSectionAccess);
	}, [userProfile, authLoading, section, router]);

	return {
		hasAccess,
		loading: authLoading || hasAccess === null,
		sectionName: section.replace(/_/g, " "),
	};
}

