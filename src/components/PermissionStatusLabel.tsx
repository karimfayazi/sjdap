"use client";

import { useSectionAccess } from "@/hooks/useSectionAccess";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type PermissionStatusLabelProps = {
	permission: 
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
	showIcon?: boolean;
	className?: string;
};

export default function PermissionStatusLabel({ 
	permission, 
	showIcon = true,
	className = "" 
}: PermissionStatusLabelProps) {
	const { hasAccess, loading } = useSectionAccess(permission);

	if (loading) {
		return (
			<div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
				{showIcon && <Loader2 className="h-3 w-3 animate-spin" />}
				<span>Checking Access...</span>
			</div>
		);
	}

	if (hasAccess) {
		return (
			<div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 ${className}`}>
				{showIcon && <CheckCircle2 className="h-3 w-3" />}
				<span>Access Granted</span>
			</div>
		);
	}

	return (
		<div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 ${className}`}>
			{showIcon && <XCircle className="h-3 w-3" />}
			<span>Access Denied</span>
		</div>
	);
}
