"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import { isSuperUser, normalizePermission } from "@/lib/auth-utils";

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

		// Check if user is super user
		const supperUserValue = userProfile?.supper_user;
		const userIsSuperUser = isSuperUser(supperUserValue);

		// SPECIAL RULE: Setting and Other pages are ONLY accessible by Super Users
		// Even if Setting=1 or Other=1, deny access unless Supper_User=Yes/1
		if (section === "Setting" || section === "Other") {
			if (typeof window !== "undefined") {
				console.log(`=== ${section.toUpperCase()} ACCESS CHECK (SUPER USER ONLY) ===`, {
					username: userProfile?.username,
					supper_user: supperUserValue,
					isSuperUser: userIsSuperUser,
					section: section
				});
			}

			if (userIsSuperUser) {
				console.log(`✅ SUPER USER: Granting access to ${section}`);
				setHasAccess(true);
			} else {
				console.log(`❌ ACCESS DENIED: ${section} requires Super User (Supper_User=Yes/1)`);
				setHasAccess(false);
			}
			return;
		}

		// Debug logging for other sections
		if (typeof window !== "undefined") {
			console.log("=== SECTION ACCESS CHECK ===", {
				username: userProfile?.username,
				supper_user: supperUserValue,
				isSuperUser: userIsSuperUser,
				section: section,
				sectionPermission: userProfile?.[section],
				fullUserProfile: section === "SWB_Families" ? userProfile : undefined // Full profile for SWB_Families debugging
			});
		}

		// Super users bypass ALL permission checks - they have access to everything
		if (userIsSuperUser) {
			console.log(`✅ SUPER USER: Granting full access to ${section}`);
			setHasAccess(true);
			return;
		}

		// Check section permission - normalize the value (handles 1/0, Yes/No, True/False)
		const permission = userProfile?.[section];
		const hasPermission = normalizePermission(permission);

		// Enhanced debug logging for SWB_Families
		if (typeof window !== "undefined") {
			const debugInfo: any = {
				username: userProfile?.username,
				section: section,
				permission: permission,
				permissionType: typeof permission,
				normalized: hasPermission,
				hasAccess: hasPermission === true
			};
			
			// Add extra info for SWB_Families debugging
			if (section === "SWB_Families") {
				debugInfo.swbFamiliesRaw = permission;
				debugInfo.swbFamiliesNormalized = hasPermission;
				debugInfo.superUser = userIsSuperUser;
				debugInfo.supperUserValue = supperUserValue;
			}
			
			console.log("=== SECTION PERMISSION CHECK ===", debugInfo);
		}

		// If permission is explicitly false (0, "No", false) or null/undefined, deny access
		// For SWB_Families: If value is true (from 1 or true in DB), grant access
		if (hasPermission !== true) {
			if (typeof window !== "undefined" && section === "SWB_Families") {
				console.log("❌ SWB_Families ACCESS DENIED - Permission value:", permission, "Normalized:", hasPermission);
			}
			setHasAccess(false);
			// Don't redirect automatically - let the component show the access denied message
		} else {
			if (typeof window !== "undefined" && section === "SWB_Families") {
				console.log("✅ SWB_Families ACCESS GRANTED - Permission value:", permission, "Normalized:", hasPermission);
			}
			setHasAccess(true);
		}
	}, [userProfile, authLoading, section, router]);

	return {
		hasAccess,
		loading: authLoading || hasAccess === null,
		sectionName: section.replace(/_/g, " "),
	};
}

