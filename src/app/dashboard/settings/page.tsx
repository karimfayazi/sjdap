"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Save, User, Lock, Bell, Globe, Shield, Users, Download, Edit, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser as checkIsSuperUser } from "@/lib/auth-utils";

type UserProfileData = {
	USER_ID: string;
	USER_FULL_NAME: string | null;
	USER_TYPE: string | null;
	DESIGNATION: string | null;
	PROGRAM: string | null;
	REGION: string | null;
	AREA: string | null;
	SECTION: string | null;
	FDP: string | null;
	PLAN_INTERVENTION: string | null;
	TRACKING_SYSTEM: string | null;
	RC: string | null;
	LC: string | null;
	REPORT_TO: string | null;
	CAN_ADD: boolean | number | null;
	CAN_UPDATE: boolean | number | null;
	CAN_DELETE: boolean | number | null;
	CAN_UPLOAD: boolean | number | null;
	SEE_REPORTS: boolean | number | null;
	ROP_EDIT: boolean | number | null;
	access_loans: boolean | number | null;
	baseline_access: boolean | number | null;
	bank_account: boolean | number | null;
	Supper_User: boolean | number | null;
	ACTIVE: boolean | number | null;
};

type LocationRow = {
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
};

type UserData = {
	USER_ID: string;
	USER_FULL_NAME: string | null;
	PASSWORD: string | null;
	RE_PASSWORD: string | null;
	USER_TYPE: string | null;
	DESIGNATION: string | null;
	ACTIVE: boolean | number | null;
	CAN_ADD: boolean | number | null;
	CAN_UPDATE: boolean | number | null;
	CAN_DELETE: boolean | number | null;
	CAN_UPLOAD: boolean | number | null;
	SEE_REPORTS: boolean | number | null;
	UPDATE_DATE: string | null;
	PROGRAM: string | null;
	REGION: string | null;
	AREA: string | null;
	SECTION: string | null;
	FDP: string | null;
	PLAN_INTERVENTION: string | null;
	TRACKING_SYSTEM: string | null;
	RC: string | null;
	LC: string | null;
	REPORT_TO: string | null;
	ROP_EDIT: boolean | number | null;
	access_loans: boolean | number | string | null;
	baseline_access: boolean | number | null;
	bank_account: boolean | number | string | null;
	Supper_User: boolean | number | string | null;
	Finance_Officer: string | null;
	BaselineQOL: boolean | number | null;
	Dashboard: boolean | number | null;
	PowerBI: boolean | number | null;
	Family_Development_Plan: boolean | number | null;
	Family_Approval_CRC: boolean | number | null;
	Family_Income: boolean | number | null;
	ROP: boolean | number | null;
	Setting: boolean | number | null;
	Other: boolean | number | null;
	SWB_Families: boolean | number | null;
};

function UserDataView() {
	const router = useRouter();
	const [users, setUsers] = useState<UserData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filters, setFilters] = useState({
		userId: "",
		fullName: "",
		userType: "",
		designation: "",
		program: "",
		region: "",
		area: "",
		section: "",
		active: "",
		bankAccount: "",
	});

	useEffect(() => {
		fetchUsers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchUsers = async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.userId) params.append("userId", filters.userId);
			if (filters.fullName) params.append("fullName", filters.fullName);
			if (filters.userType) params.append("userType", filters.userType);
			if (filters.designation) params.append("designation", filters.designation);
			if (filters.program) params.append("program", filters.program);
			if (filters.region) params.append("region", filters.region);
			if (filters.area) params.append("area", filters.area);
			if (filters.section) params.append("section", filters.section);
			if (filters.active !== "") params.append("active", filters.active);
			if (filters.bankAccount !== "") params.append("bankAccount", filters.bankAccount);

			const response = await fetch(`/api/users?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setUsers(data.users || []);
			} else {
				setError(data.message || "Failed to fetch users");
			}
		} catch (err) {
			setError("Error fetching users");
			console.error("Error fetching users:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFilters(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleFilterSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		fetchUsers();
	};

	const handleClearFilters = () => {
		setFilters({
			userId: "",
			fullName: "",
			userType: "",
			designation: "",
			program: "",
			region: "",
			area: "",
			section: "",
			active: "",
			bankAccount: "",
		});
		setTimeout(() => fetchUsers(), 100);
	};

	const exportToCSV = () => {
		if (users.length === 0) {
			alert("No data to export");
			return;
		}

		// Get all unique keys from all users
		const headers = Object.keys(users[0]);
		
		// Create CSV content
		const csvHeaders = headers.join(",");
		const csvRows = users.map(user => {
			return headers.map(header => {
				const value = user[header as keyof UserData];
				// Handle null/undefined and escape commas/quotes
				if (value === null || value === undefined) return "";
				const stringValue = String(value);
				// Escape quotes and wrap in quotes if contains comma or quote
				if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
					return `"${stringValue.replace(/"/g, '""')}"`;
				}
				return stringValue;
			}).join(",");
		});

		const csvContent = [csvHeaders, ...csvRows].join("\n");
		
		// Create blob and download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Get unique values for dropdowns
	const uniqueUserTypes = Array.from(new Set(users.map(u => u.USER_TYPE).filter(Boolean))).sort();
	const uniquePrograms = Array.from(new Set(users.map(u => u.PROGRAM).filter(Boolean))).sort();
	const uniqueRegions = Array.from(new Set(users.map(u => u.REGION).filter(Boolean))).sort();
	const uniqueAreas = Array.from(new Set(users.map(u => u.AREA).filter(Boolean))).sort();
	const uniqueSections = Array.from(new Set(users.map(u => u.SECTION).filter(Boolean))).sort();
	const uniqueDesignations = Array.from(new Set(users.map(u => u.DESIGNATION).filter(Boolean))).sort();
	const totalUsers = users.length;

        const formatBool = (value: boolean | number | string | null) => {
                if (value === 1 || value === "1" || value === true || value === "true") return "Yes";
                if (value === 0 || value === "0" || value === false || value === "false") return "No";
                return "N/A";
        };

	const handleDeleteBankAccount = async (userId: string) => {
		if (!userId) return;

		const confirmed = window.confirm(
			`Are you sure you want to remove bank account access for user ID: ${userId}?`
		);
		if (!confirmed) return;

		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/users/bank-account", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to remove bank account access");
			}

			// Refresh users list
			await fetchUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove bank account access");
			console.error("Error removing bank account access:", err);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	const handleEditUser = (user: UserData) => {
		router.push(`/dashboard/settings/edit/${encodeURIComponent(user.USER_ID)}`);
	};

	const handleDeleteUser = async (userId: string) => {
		if (!userId) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete user: ${userId}? This action cannot be undone.`
		);
		if (!confirmed) return;

		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, {
				method: "DELETE",
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to delete user");
			}

			// Refresh users list
			await fetchUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete user");
			console.error("Error deleting user:", err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold text-gray-900">User Data</h2>
				<button
					onClick={exportToCSV}
					disabled={users.length === 0 || loading}
					className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
				>
					<Download className="h-4 w-4" />
					Export to CSV
				</button>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
					<p className="text-sm font-medium text-gray-600">Total Users</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}

			{/* Filters */}
			<form onSubmit={handleFilterSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
						<input
							type="text"
							name="userId"
							value={filters.userId}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Search User ID"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
						<input
							type="text"
							name="fullName"
							value={filters.fullName}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							placeholder="Search Full Name"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
						<select
							name="userType"
							value={filters.userType}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueUserTypes.map(type => (
								<option key={type || ""} value={type || ""}>{type || ""}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
						<select
							name="designation"
							value={filters.designation}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueDesignations.map(des => (
								<option key={des || ""} value={des || ""}>{des || ""}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
						<select
							name="program"
							value={filters.program}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniquePrograms.map(prog => (
								<option key={prog || ""} value={prog || ""}>{prog || ""}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
						<select
							name="region"
							value={filters.region}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueRegions.map(reg => (
								<option key={reg || ""} value={reg || ""}>{reg || ""}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
						<select
							name="area"
							value={filters.area}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueAreas.map(ar => (
								<option key={ar || ""} value={ar || ""}>{ar || ""}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
						<select
							name="section"
							value={filters.section}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							{uniqueSections.map(sec => (
								<option key={sec || ""} value={sec || ""}>{sec || ""}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
						<select
							name="active"
							value={filters.active}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							<option value="true">Active</option>
							<option value="false">Inactive</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
						<select
							name="bankAccount"
							value={filters.bankAccount}
							onChange={handleFilterChange}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All</option>
							<option value="Yes">Yes</option>
						</select>
					</div>
				</div>
				<div className="flex gap-2 mt-4">
					<button
						type="submit"
						disabled={loading}
						className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
					>
						{loading ? "Loading..." : "Apply Filters"}
					</button>
					<button
						type="button"
						onClick={handleClearFilters}
						className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
					>
						Clear Filters
					</button>
				</div>
			</form>

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading users...</span>
				</div>
			) : (
				<div className="overflow-x-auto border border-gray-200 rounded-lg">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Can Add</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Can Update</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Can Delete</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Super User</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Loans</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Account</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BaselineQOL</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PowerBI</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Dev Plan</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Approval</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Income</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROP</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setting</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Other</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SWB Families</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Date</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{users.length === 0 ? (
								<tr>
									<td colSpan={25} className="px-4 py-8 text-center text-gray-500">
										No users found
									</td>
								</tr>
							) : (
								users.map((user, index) => (
									<tr key={user.USER_ID || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
											{user.USER_ID || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.USER_FULL_NAME || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.USER_TYPE || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.DESIGNATION || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.PROGRAM || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.REGION || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.AREA || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{user.SECTION || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												user.ACTIVE ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
											}`}>
												{user.ACTIVE ? "Active" : "Inactive"}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatBool(user.CAN_ADD)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatBool(user.CAN_UPDATE)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatBool(user.CAN_DELETE)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Supper_User) === "Yes" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Supper_User)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.access_loans) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.access_loans)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.bank_account) === "Yes" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.bank_account)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.BaselineQOL) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.BaselineQOL)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Dashboard) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Dashboard)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.PowerBI) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.PowerBI)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Family_Development_Plan) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Family_Development_Plan)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Family_Approval_CRC) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Family_Approval_CRC)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Family_Income) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Family_Income)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.ROP) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.ROP)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Setting) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Setting)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.Other) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.Other)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												formatBool(user.SWB_Families) === "Yes" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
											}`}>
												{formatBool(user.SWB_Families)}
											</span>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => handleEditUser(user)}
													className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
													title="Edit User"
												>
													<Edit className="h-3 w-3" />
													Edit
												</button>
												<button
													type="button"
													onClick={() => handleDeleteUser(user.USER_ID)}
													className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
													title="Delete User"
												>
													<Trash2 className="h-3 w-3" />
													Delete
												</button>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatDate(user.UPDATE_DATE)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function SettingsPageContent() {
	const { user } = useAuth();
	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab") || "profile";

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState(initialTab);
	const [locations, setLocations] = useState<LocationRow[]>([]);
	const [isSuperUser, setIsSuperUser] = useState(false);
	
	const [formData, setFormData] = useState<UserProfileData>({
		USER_ID: "",
		USER_FULL_NAME: "",
		USER_TYPE: "",
		DESIGNATION: "",
		PROGRAM: "",
		REGION: "",
		AREA: "",
		SECTION: "",
		FDP: "",
		PLAN_INTERVENTION: "",
		TRACKING_SYSTEM: "",
		RC: "",
		LC: "",
		REPORT_TO: "",
		CAN_ADD: false,
		CAN_UPDATE: false,
		CAN_DELETE: false,
		CAN_UPLOAD: false,
		SEE_REPORTS: false,
		ROP_EDIT: false,
		access_loans: false,
		baseline_access: false,
		bank_account: false,
		Supper_User: false,
		ACTIVE: true,
	});

	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const [newUserData, setNewUserData] = useState<UserProfileData>({
		USER_ID: "",
		USER_FULL_NAME: "",
		USER_TYPE: "",
		DESIGNATION: "",
		PROGRAM: "",
		REGION: "",
		AREA: "",
		SECTION: "",
		FDP: "",
		PLAN_INTERVENTION: "",
		TRACKING_SYSTEM: "",
		RC: "",
		LC: "",
		REPORT_TO: "",
		CAN_ADD: false,
		CAN_UPDATE: false,
		CAN_DELETE: false,
		CAN_UPLOAD: false,
		SEE_REPORTS: false,
		ROP_EDIT: false,
		access_loans: false,
		baseline_access: false,
		bank_account: false,
		Supper_User: false,
		ACTIVE: true,
	});

	// Keep activeTab in sync with ?tab= query param
	useEffect(() => {
		const tabParam = searchParams.get("tab");
		if (tabParam && tabParam !== activeTab) {
			setActiveTab(tabParam);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);


	useEffect(() => {
		fetchUserProfile();
		fetchLocations();
	}, []);

	const fetchUserProfile = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/user/profile');
			const result = await response.json();

			if (result.success && result.user) {
				setFormData({
					USER_ID: result.user.USER_ID || "",
					USER_FULL_NAME: result.user.USER_FULL_NAME || "",
					USER_TYPE: result.user.USER_TYPE || "",
					DESIGNATION: result.user.DESIGNATION || "",
					PROGRAM: result.user.PROGRAM || "",
					REGION: result.user.REGION || "",
					AREA: result.user.AREA || "",
					SECTION: result.user.SECTION || "",
					FDP: result.user.FDP || "",
					PLAN_INTERVENTION: result.user.PLAN_INTERVENTION || "",
					TRACKING_SYSTEM: result.user.TRACKING_SYSTEM || "",
					RC: result.user.RC || "",
					LC: result.user.LC || "",
					REPORT_TO: result.user.REPORT_TO || "",
					CAN_ADD: result.user.CAN_ADD || false,
					CAN_UPDATE: result.user.CAN_UPDATE || false,
					CAN_DELETE: result.user.CAN_DELETE || false,
					CAN_UPLOAD: result.user.CAN_UPLOAD || false,
					SEE_REPORTS: result.user.SEE_REPORTS || false,
					ROP_EDIT: result.user.ROP_EDIT || false,
					access_loans: result.user.access_loans || false,
					baseline_access: result.user.baseline_access || false,
					bank_account: result.user.bank_account || false,
					Supper_User: result.user.Supper_User || false,
					ACTIVE: result.user.ACTIVE !== undefined ? result.user.ACTIVE : true,
				});
			} else {
				setError(result.message || "Failed to load profile");
			}
		} catch (err) {
			setError("Error loading profile");
			console.error("Error fetching profile:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchLocations = async () => {
		try {
			const response = await fetch("/api/locations");
			const result = await response.json();

			if (result.success && Array.isArray(result.locations)) {
				setLocations(result.locations);
			}
		} catch (err) {
			console.error("Error fetching locations:", err);
		}
	};

	// Derive Super User flag from localStorage and profile data
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const stored = localStorage.getItem("userData");
			if (stored) {
				const parsed = JSON.parse(stored);
				const su = parsed.super_user;
				const isSu =
					su === 1 ||
					su === "1" ||
					su === true ||
					su === "true" ||
					su === "Yes" ||
					su === "yes";
				if (isSu) {
					setIsSuperUser(true);
				}
			}
		} catch {
			// ignore localStorage errors
		}
	}, []);

	const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		const checked = (e.target as HTMLInputElement).checked;
		
		setFormData(prev => ({
			...prev,
			[name]: type === "checkbox" ? checked : value
		}));
		setError(null);
		setSuccess(null);
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setPasswordData(prev => ({
			...prev,
			[name]: value
		}));
		setError(null);
		setSuccess(null);
	};

	const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value, type } = e.target;
		const checked = (e.target as HTMLInputElement).checked;

		setNewUserData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
		setError(null);
		setSuccess(null);
	};

	const handleProfileSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch('/api/user/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to update profile");
			}

			setSuccess(result.message || "Profile updated successfully!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile");
			console.error("Error updating profile:", err);
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (passwordData.newPassword !== passwordData.confirmPassword) {
			setError("New passwords do not match!");
			return;
		}

		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch('/api/user/password', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: passwordData.currentPassword,
					newPassword: passwordData.newPassword
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to change password");
			}

			setSuccess(result.message || "Password changed successfully!");
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to change password");
			console.error("Error changing password:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleNewUserSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const payload = {
				...newUserData,
				// Default password fields: let backend enforce required fields
			};

			// For creation we need basic required values
			if (!payload.USER_ID || !payload.USER_FULL_NAME || !payload.USER_TYPE) {
				throw new Error("User ID, Full Name and User Type are required.");
			}

			// For now set PASSWORD = USER_ID (or you can change this rule)
			const response = await fetch("/api/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...payload,
					PASSWORD: payload.USER_ID,
					RE_PASSWORD: payload.USER_ID,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to create user");
			}

			setSuccess(result.message || "User created successfully!");

			// Reset new user form
			setNewUserData({
				USER_ID: "",
				USER_FULL_NAME: "",
				USER_TYPE: "",
				DESIGNATION: "",
				PROGRAM: "",
				REGION: "",
				AREA: "",
				SECTION: "",
				FDP: "",
				PLAN_INTERVENTION: "",
				TRACKING_SYSTEM: "",
				RC: "",
				LC: "",
				REPORT_TO: "",
				CAN_ADD: false,
				CAN_UPDATE: false,
				CAN_DELETE: false,
				CAN_UPLOAD: false,
				SEE_REPORTS: false,
				ROP_EDIT: false,
				access_loans: false,
				baseline_access: false,
				bank_account: false,
				Supper_User: false,
				ACTIVE: true,
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create user");
			console.error("Error creating user:", err);
		} finally {
			setSaving(false);
		}
	};

	const tabs = [
		{ id: "profile", label: "Profile", icon: User },
		...(isSuperUser ? [{ id: "permissions", label: "Permissions", icon: Shield }] : []),
		{ id: "password", label: "Password", icon: Lock },
		...(isSuperUser
			? [
					{ id: "addUser", label: "Add New User", icon: User },
					{ id: "users", label: "View Users", icon: Users },
			  ]
			: []),
	];

	// Cascading dropdown data for Area -> RC -> LC in profile
	const availableAreas = Array.from(
		new Set(locations.map((l) => l.AREA).filter(Boolean))
	).sort() as string[];

	const availableRCs = Array.from(
		new Set(
			locations
				.filter((l) => !formData.AREA || l.AREA === formData.AREA)
				.map((l) => l.REGIONAL_COUNCIL)
				.filter(Boolean)
		)
	).sort() as string[];

	const availableLCs = Array.from(
		new Set(
			locations
				.filter((l) => !formData.AREA || l.AREA === formData.AREA)
				.filter((l) => !formData.RC || l.REGIONAL_COUNCIL === formData.RC)
				.map((l) => l.LOCAL_COUNCIL)
				.filter(Boolean)
		)
	).sort() as string[];

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
					<p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading profile...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
					<p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
				</div>
				{isSuperUser && (
					<div className="flex gap-3">
						<Link
							href="/dashboard/settings?tab=addUser"
							className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							Add User
						</Link>
						<Link
							href="/dashboard/settings?tab=users"
							className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white text-[#0b4d2b] border border-[#0b4d2b] rounded-md hover:bg-gray-50 transition-colors"
						>
							View Users
						</Link>
					</div>
				)}
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-green-600 text-sm">{success}</p>
				</div>
			)}

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				{/* Tabs */}
				<div className="border-b border-gray-200">
					<nav className="flex -mb-px">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`
										flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
										${activeTab === tab.id
											? "border-[#0b4d2b] text-[#0b4d2b]"
											: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}
									`}
								>
									<Icon className="h-4 w-4" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{/* Profile Tab */}
					{activeTab === "profile" && (
						<form onSubmit={handleProfileSubmit} className="space-y-6">
							<div>
								<h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											User ID
										</label>
										<input
											type="text"
											value={formData.USER_ID}
											disabled
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Full Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											name="USER_FULL_NAME"
											value={formData.USER_FULL_NAME || ""}
											onChange={handleProfileChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter full name"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											User Type
										</label>
										<input
											type="text"
											name="USER_TYPE"
											value={formData.USER_TYPE || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter user type"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Designation
										</label>
										<input
											type="text"
											name="DESIGNATION"
											value={formData.DESIGNATION || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter designation"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Program
										</label>
										<select
											name="PROGRAM"
											value={formData.PROGRAM || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">Select Program</option>
											<option value="FEAP">FEAP</option>
											<option value="SEDP">SEDP</option>
											<option value="ALL">ALL</option>
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Region
										</label>
										<input
											type="text"
											name="REGION"
											value={formData.REGION || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter region"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Area
										</label>
										<select
											name="AREA"
											value={formData.AREA || ""}
											onChange={(e) => {
												// When Area changes, also clear RC and LC to keep cascade consistent
												handleProfileChange(e);
												setFormData((prev) => ({
													...prev,
													RC: "",
													LC: "",
												}));
											}}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">All</option>
											{availableAreas.map((area) => (
												<option key={area} value={area}>
													{area}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Section
										</label>
										<input
											type="text"
											name="SECTION"
											value={formData.SECTION || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter section"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											FDP
										</label>
										<input
											type="text"
											name="FDP"
											value={formData.FDP || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter FDP"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Plan Intervention
										</label>
										<input
											type="text"
											name="PLAN_INTERVENTION"
											value={formData.PLAN_INTERVENTION || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter plan intervention"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Tracking System
										</label>
										<input
											type="text"
											name="TRACKING_SYSTEM"
											value={formData.TRACKING_SYSTEM || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter tracking system"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Regional Council (RC)
										</label>
										<select
											name="RC"
											value={formData.RC || ""}
											onChange={(e) => {
												// When RC changes, clear LC
												handleProfileChange(e);
												setFormData((prev) => ({
													...prev,
													LC: "",
												}));
											}}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											disabled={!formData.AREA}
										>
											<option value="">
												{formData.AREA ? "All" : "Select Area first"}
											</option>
											{availableRCs.map((rc) => (
												<option key={rc} value={rc}>
													{rc}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Local Council (LC)
										</label>
										<select
											name="LC"
											value={formData.LC || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											disabled={!formData.AREA || !formData.RC}
										>
											<option value="">
												{formData.AREA && formData.RC
													? "All"
													: "Select Area and RC first"}
											</option>
											{availableLCs.map((lc) => (
												<option key={lc} value={lc}>
													{lc}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Report To
										</label>
										<input
											type="text"
											name="REPORT_TO"
											value={formData.REPORT_TO || ""}
											onChange={handleProfileChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter report to"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Active Status
										</label>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="ACTIVE"
												checked={formData.ACTIVE === 1 || formData.ACTIVE === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
											<span className="ml-3 text-sm text-gray-700">
												{formData.ACTIVE ? "Active" : "Inactive"}
											</span>
										</label>
									</div>
								</div>

								<div className="flex justify-end pt-4">
									<button
										type="submit"
										disabled={saving}
										className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Save className="h-4 w-4" />
										{saving ? "Saving..." : "Save Changes"}
									</button>
								</div>
							</div>
						</form>
					)}

					{/* Permissions Tab */}
					{activeTab === "permissions" && (
						<form onSubmit={handleProfileSubmit} className="space-y-6">
							<div>
								<h2 className="text-xl font-semibold text-gray-900 mb-4">User Permissions</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Can Add</label>
											<p className="text-sm text-gray-500">Permission to add new records</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="CAN_ADD"
												checked={formData.CAN_ADD === 1 || formData.CAN_ADD === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Can Update</label>
											<p className="text-sm text-gray-500">Permission to update records</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="CAN_UPDATE"
												checked={formData.CAN_UPDATE === 1 || formData.CAN_UPDATE === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Can Delete</label>
											<p className="text-sm text-gray-500">Permission to delete records</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="CAN_DELETE"
												checked={formData.CAN_DELETE === 1 || formData.CAN_DELETE === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Can Upload</label>
											<p className="text-sm text-gray-500">Permission to upload files</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="CAN_UPLOAD"
												checked={formData.CAN_UPLOAD === 1 || formData.CAN_UPLOAD === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">See Reports</label>
											<p className="text-sm text-gray-500">Permission to view reports</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="SEE_REPORTS"
												checked={formData.SEE_REPORTS === 1 || formData.SEE_REPORTS === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">ROP Edit</label>
											<p className="text-sm text-gray-500">Permission to edit ROPs</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="ROP_EDIT"
												checked={formData.ROP_EDIT === 1 || formData.ROP_EDIT === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Access Loans</label>
											<p className="text-sm text-gray-500">Permission to access loans module</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="access_loans"
												checked={formData.access_loans === 1 || formData.access_loans === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Baseline Access</label>
											<p className="text-sm text-gray-500">Permission to access baseline data</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="baseline_access"
												checked={formData.baseline_access === 1 || formData.baseline_access === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Bank Account</label>
											<p className="text-sm text-gray-500">Permission to access bank account module</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="bank_account"
												checked={formData.bank_account === 1 || formData.bank_account === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>

									<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
										<div>
											<label className="text-sm font-medium text-gray-900">Super User</label>
											<p className="text-sm text-gray-500">Super user privileges</p>
										</div>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="Supper_User"
												checked={formData.Supper_User === 1 || formData.Supper_User === true}
												onChange={handleProfileChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
										</label>
									</div>
								</div>

								<div className="flex justify-end pt-4">
									<button
										type="submit"
										disabled={saving}
										className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Save className="h-4 w-4" />
										{saving ? "Saving..." : "Save Changes"}
									</button>
								</div>
							</div>
						</form>
					)}

					{/* Password Tab */}
					{activeTab === "password" && (
						<form onSubmit={handlePasswordSubmit} className="space-y-6">
							<div>
								<h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
								<div className="space-y-4 max-w-md">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Current Password <span className="text-red-500">*</span>
										</label>
										<input
											type="password"
											name="currentPassword"
											value={passwordData.currentPassword}
											onChange={handlePasswordChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter current password"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											New Password <span className="text-red-500">*</span>
										</label>
										<input
											type="password"
											name="newPassword"
											value={passwordData.newPassword}
											onChange={handlePasswordChange}
											required
											minLength={6}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter new password (min 6 characters)"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Confirm New Password <span className="text-red-500">*</span>
										</label>
										<input
											type="password"
											name="confirmPassword"
											value={passwordData.confirmPassword}
											onChange={handlePasswordChange}
											required
											minLength={6}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Confirm new password"
										/>
									</div>
								</div>

								<div className="flex justify-end pt-4">
									<button
										type="submit"
										disabled={saving}
										className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Save className="h-4 w-4" />
										{saving ? "Changing..." : "Change Password"}
									</button>
								</div>
							</div>
						</form>
					)}

					{/* Add New User Tab (Super User only) */}
					{activeTab === "addUser" && isSuperUser && (
						<form onSubmit={handleNewUserSubmit} className="space-y-6">
							<div>
								<h2 className="text-xl font-semibold text-gray-900 mb-4">Add New User</h2>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											User ID <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											name="USER_ID"
											value={newUserData.USER_ID}
											onChange={handleNewUserChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter new user ID"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Full Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											name="USER_FULL_NAME"
											value={newUserData.USER_FULL_NAME || ""}
											onChange={handleNewUserChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter full name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											User Type <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											name="USER_TYPE"
											value={newUserData.USER_TYPE || ""}
											onChange={handleNewUserChange}
											required
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter user type"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Designation
										</label>
										<input
											type="text"
											name="DESIGNATION"
											value={newUserData.DESIGNATION || ""}
											onChange={handleNewUserChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter designation"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Program
										</label>
										<select
											name="PROGRAM"
											value={newUserData.PROGRAM || ""}
											onChange={handleNewUserChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">Select Program</option>
											<option value="FEAP">FEAP</option>
											<option value="SEDP">SEDP</option>
											<option value="ALL">ALL</option>
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Region
										</label>
										<input
											type="text"
											name="REGION"
											value={newUserData.REGION || ""}
											onChange={handleNewUserChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter region"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Area
										</label>
										<select
											name="AREA"
											value={newUserData.AREA || ""}
											onChange={handleNewUserChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
										>
											<option value="">All</option>
											{availableAreas.map((area) => (
												<option key={area} value={area}>
													{area}
												</option>
											))}
										</select>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Section
										</label>
										<input
											type="text"
											name="SECTION"
											value={newUserData.SECTION || ""}
											onChange={handleNewUserChange}
											className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
											placeholder="Enter section"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Active Status
										</label>
										<label className="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												name="ACTIVE"
												checked={newUserData.ACTIVE === 1 || newUserData.ACTIVE === true}
												onChange={handleNewUserChange}
												className="sr-only peer"
											/>
											<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
											<span className="ml-3 text-sm text-gray-700">
												{newUserData.ACTIVE ? "Active" : "Inactive"}
											</span>
										</label>
									</div>
								</div>

								<h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
									Permissions
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{[
										{ key: "CAN_ADD", label: "Can Add", desc: "Permission to add new records" },
										{ key: "CAN_UPDATE", label: "Can Update", desc: "Permission to update records" },
										{ key: "CAN_DELETE", label: "Can Delete", desc: "Permission to delete records" },
										{ key: "CAN_UPLOAD", label: "Can Upload", desc: "Permission to upload files" },
										{ key: "SEE_REPORTS", label: "See Reports", desc: "Permission to view reports" },
										{ key: "ROP_EDIT", label: "ROP Edit", desc: "Permission to edit ROPs" },
										{ key: "access_loans", label: "Access Loans", desc: "Access loans module" },
										{ key: "baseline_access", label: "Baseline Access", desc: "Access baseline data" },
										{ key: "bank_account", label: "Bank Account", desc: "Access bank account module" },
										{ key: "Supper_User", label: "Super User", desc: "Super user privileges" },
									].map((item) => {
										const value = (newUserData as any)[item.key];
										// Explicitly convert to boolean: 1, true, "1", "true" = checked; 0, false, "0", "false", null, undefined = unchecked
										const isChecked = value === 1 || value === true || value === "1" || value === "true";
										
										return (
											<div
												key={item.key}
												className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
											>
												<div>
													<label className="text-sm font-medium text-gray-900">
														{item.label}
													</label>
													<p className="text-sm text-gray-500">{item.desc}</p>
												</div>
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														name={item.key}
														checked={isChecked}
														onChange={handleNewUserChange}
														className="sr-only peer"
													/>
													<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0b4d2b] peer-focus:ring-opacity-20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0b4d2b]"></div>
												</label>
											</div>
										);
									})}
								</div>

								<div className="flex justify-end pt-4">
									<button
										type="submit"
										disabled={saving}
										className="inline-flex items-center gap-2 px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Save className="h-4 w-4" />
										{saving ? "Saving..." : "Create User"}
									</button>
								</div>
							</div>
						</form>
					)}

					{/* View User Data Tab */}
					{activeTab === "users" && <UserDataView />}
				</div>
			</div>
		</div>
	);
}

export default function SettingsPage() {
	const [isSuperUser, setIsSuperUser] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	// Check if user is Super User
	useEffect(() => {
		const checkSuperUser = async () => {
			try {
				// First check localStorage
				if (typeof window !== "undefined") {
					const stored = localStorage.getItem("userData");
					if (stored) {
						const parsed = JSON.parse(stored);
						const supperUserValue = parsed.super_user;
						// Use utility function for consistent checking
						const isSu = checkIsSuperUser(supperUserValue);
						
						console.log("=== SETTINGS PAGE ACCESS CHECK ===", {
							supperUserValue,
							isSuperUser: isSu
						});
						
						setIsSuperUser(isSu);
					} else {
						setIsSuperUser(false);
					}
				}
			} catch (error) {
				console.error("Error checking super user status:", error);
				setIsSuperUser(false);
			} finally {
				setLoading(false);
			}
		};

		checkSuperUser();
	}, []);

	// Show loading while checking access
	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	// Show access denied if user is not Super User
	if (!isSuperUser) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
						<p className="text-gray-600 mt-2">Access Restricted</p>
					</div>
				</div>
				<div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<div className="ml-4">
							<h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
							<p className="mt-2 text-red-700">
								This section is only accessible to <strong>Super Users (Admin)</strong>.
							</p>
							<p className="mt-1 text-red-600 text-sm">
								If you believe you should have access, please contact your system administrator.
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
						<p className="text-gray-600 mt-2">Loading...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<SettingsPageContent />
		</Suspense>
	);
}
