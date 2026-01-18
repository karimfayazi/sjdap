"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import { isSuperUser, isAdminUser, hasFullAccess, normalizePermission, isSuperAdminByUserType } from "@/lib/auth-utils";

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

		// Permission columns have been removed from database - grant access to ALL users for ALL sections
		console.log(`[useSectionAccess] Granting access to section: ${section} for all users (permission columns removed)`);
		setHasAccess(true);
		return;

		// Debug logging - always log for BaselineQOL and Setting to help troubleshoot
		if (typeof window !== "undefined") {
			if (section === "BaselineQOL" || section === "Setting") {
				console.log(`[useSectionAccess] ${section} Debug:`, {
					section: section,
					permissionValue: permissionValue,
					permissionValueType: typeof permissionValue,
					permissionValueRaw: permissionValue,
					hasSectionAccess: hasSectionAccess,
					normalizePermissionResult: normalizePermission(permissionValue),
					userProfileKeys: Object.keys(userProfile),
					permissionInProfile: userProfile[section as keyof typeof userProfile],
					permissionType: typeof userProfile[section as keyof typeof userProfile],
					isSuperAdmin: isSuperAdminByType || isSuperUserByValue,
					userType: accessLevel,
					userEmail: userProfile.email,
					userUsername: userProfile.username
				});
			} else if (process.env.NODE_ENV === "development") {
				console.log(`[useSectionAccess] Section: ${section}, Permission Value:`, permissionValue, `Type:`, typeof permissionValue, `Has Access:`, hasSectionAccess);
			}
		}

		setHasAccess(hasSectionAccess);
	}, [userProfile, authLoading, section, router]);

	return {
		hasAccess,
		loading: authLoading || hasAccess === null,
		sectionName: section.replace(/_/g, " "),
	};
}

