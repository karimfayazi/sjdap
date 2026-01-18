"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type PeUserRow = {
	UserId: string | null;
	email_address: string | null;
	UserFullName: string | null;
	Password: string | null;
	UserType: string | null;
	Designation: string | null;
	Regional_Council: string | null;
	Local_Council: string | null;
	user_create_date: string | Date | null;
	user_update_date: string | Date | null;
	AccessScope: string | null;
	Active: string | number | boolean | null;
	Setting: string | number | boolean | null;
	SwbFamilies: string | number | boolean | null;
	ActualIntervention: string | number | boolean | null;
	FinanceSection: string | number | boolean | null;
	BankInformation: string | number | boolean | null;
	BaselineApproval: string | number | boolean | null;
	FeasibilityApproval: string | number | boolean | null;
	FdpApproval: string | number | boolean | null;
	InterventionApproval: string | number | boolean | null;
	BankAccountApproval: string | number | boolean | null;
	Baseline: string | number | boolean | null;
	FamilyDevelopmentPlan: string | number | boolean | null;
	ROPs: string | number | boolean | null;
	FamilyIncome: string | number | boolean | null;
};

const COLUMNS: { key: keyof PeUserRow; label: string }[] = [
	{ key: "UserId", label: "User ID" },
	{ key: "email_address", label: "Email Address" },
	{ key: "UserFullName", label: "Full Name" },
	{ key: "Password", label: "Password" },
	{ key: "UserType", label: "User Type" },
	{ key: "Designation", label: "Designation" },
	{ key: "Regional_Council", label: "Regional Council" },
	{ key: "Local_Council", label: "Local Council" },
	{ key: "user_create_date", label: "Create Date" },
	{ key: "user_update_date", label: "Update Date" },
	{ key: "AccessScope", label: "Access Scope" },
	{ key: "Active", label: "Active" },
	{ key: "Setting", label: "Setting" },
	{ key: "SwbFamilies", label: "SWB Families" },
	{ key: "ActualIntervention", label: "Actual Intervention" },
	{ key: "FinanceSection", label: "Finance Section" },
	{ key: "BankInformation", label: "Bank Information" },
	{ key: "BaselineApproval", label: "Baseline Approval" },
	{ key: "FeasibilityApproval", label: "Feasibility Approval" },
	{ key: "FdpApproval", label: "FDP Approval" },
	{ key: "InterventionApproval", label: "Intervention Approval" },
	{ key: "BankAccountApproval", label: "Bank Account Approval" },
	{ key: "Baseline", label: "Baseline" },
	{ key: "FamilyDevelopmentPlan", label: "Family Development Plan" },
	{ key: "ROPs", label: "ROPs" },
	{ key: "FamilyIncome", label: "Family Income" },
];

export default function UserInformationPage() {
	const { userProfile, loading: authLoading } = useAuth();
	const [data, setData] = useState<PeUserRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError(null);
			try {
				// Fetch all user data (no email filter)
				const response = await fetch(`/api/user-grid?t=${refreshKey}`, {
					cache: "no-store",
				});
				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.message || "Failed to fetch data");
				}

				if (result.success && Array.isArray(result.users)) {
					setData(result.users);
				} else {
					setData([]);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
				setData([]);
			} finally {
				setLoading(false);
			}
		};

		if (!authLoading) {
			fetchData();
		}
	}, [refreshKey, authLoading]);

	const formatValue = (value: any): string => {
		if (value === null || value === undefined) {
			return "null";
		}
		if (typeof value === "boolean") {
			return value ? "Yes" : "No";
		}
		if (value instanceof Date) {
			return value.toLocaleString();
		}
		if (typeof value === "string" && value.includes("T")) {
			try {
				return new Date(value).toLocaleString();
			} catch {
				return String(value);
			}
		}
		return String(value);
	};

	const handleRefresh = () => {
		setRefreshKey((prev) => prev + 1);
	};

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold text-gray-900">User Information</h1>
				<button
					onClick={handleRefresh}
					disabled={loading}
					className="flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					Refresh
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					Error: {error}
				</div>
			)}

			{(authLoading || loading) ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading user data...</span>
				</div>
			) : (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									{COLUMNS.map((column) => (
										<th
											key={column.key}
											className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap"
										>
											{column.label}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{data.length === 0 ? (
									<tr>
										<td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-gray-500">
											No data available
										</td>
									</tr>
								) : (
									data.map((row, index) => (
										<tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
											{COLUMNS.map((column) => (
												<td
													key={column.key}
													className="px-4 py-3 text-sm text-gray-900 max-w-xs"
												>
													<div className="truncate" title={formatValue(row[column.key])}>
														{formatValue(row[column.key])}
													</div>
												</td>
											))}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{data.length > 0 && (
						<div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
							Showing {data.length} user{data.length !== 1 ? 's' : ''} from database
						</div>
					)}
				</div>
			)}
		</div>
	);
}
