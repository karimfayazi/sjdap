"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Clock, ArrowLeft, ExternalLink } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type LastNightUpdate = {
	Section: string;
	FamilyID: string | null;
	RecordID: string;
	HeadName: string | null;
	Mentor: string | null;
	Status: string | null;
	UpdateDate: string;
	DateField: string;
};

type UpdatesBySection = Record<string, LastNightUpdate[]>;

export default function LastNightUpdatesPage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Dashboard");
	const router = useRouter();
	const [updates, setUpdates] = useState<LastNightUpdate[]>([]);
	const [updatesBySection, setUpdatesBySection] = useState<UpdatesBySection>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedSection, setSelectedSection] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 50;

	useEffect(() => {
		fetchLastNightUpdates();
	}, []);

	const fetchLastNightUpdates = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/last-night-updates');
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();

			if (data.success) {
				setUpdates(data.updates || []);
				setUpdatesBySection(data.updatesBySection || {});
			} else {
				setError(data.message || "Failed to fetch last night updates");
				setUpdates([]);
				setUpdatesBySection({});
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Error fetching last night updates";
			setError(errorMessage);
			setUpdates([]);
			setUpdatesBySection({});
			console.error("Error fetching last night updates:", err);
		} finally {
			setLoading(false);
		}
	};

	// Filter updates based on search and section
	const filteredUpdates = updates.filter((update) => {
		if (selectedSection && update.Section !== selectedSection) return false;
		if (!searchTerm) return true;
		const searchLower = searchTerm.toLowerCase();
		return (
			update.Section?.toLowerCase().includes(searchLower) ||
			update.FamilyID?.toLowerCase().includes(searchLower) ||
			update.RecordID?.toLowerCase().includes(searchLower) ||
			update.HeadName?.toLowerCase().includes(searchLower) ||
			update.Mentor?.toLowerCase().includes(searchLower) ||
			update.Status?.toLowerCase().includes(searchLower)
		);
	});

	// Pagination
	const totalPages = Math.ceil(filteredUpdates.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedUpdates = filteredUpdates.slice(startIndex, startIndex + itemsPerPage);

	// Get section counts
	const sectionCounts = Object.keys(updatesBySection).map(section => ({
		section,
		count: updatesBySection[section].length
	}));

	// Format date
	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateString;
		}
	};

	// Get section route
	const getSectionRoute = (section: string, recordId: string | null, familyId: string | null) => {
		switch (section) {
			case 'Actual Intervention':
				return '/dashboard/actual-intervention';
			case 'Financial Assets':
				return '/dashboard/baseline-qol';
			case 'Family Status Log':
				return '/dashboard/family-status';
			case 'Family Status':
				return '/dashboard/family-status';
			case 'Bank Information':
				return '/dashboard/finance/bank-information/view';
			case 'Loan Process':
				return '/dashboard/finance/loan-process';
			case 'ROP Update':
				return '/dashboard/others/rop-update';
			case 'Baseline Application':
				return '/dashboard/baseline-qol';
			default:
				return null;
		}
	};

	// CSV Export
	const exportToCSV = () => {
		const headers = ['Section', 'Family ID', 'Record ID', 'Head Name', 'Mentor', 'Status', 'Update Date'];
		const csvContent = [
			headers.join(","),
			...filteredUpdates.map((update) =>
				[
					update.Section || "",
					update.FamilyID || "",
					update.RecordID || "",
					update.HeadName || "",
					update.Mentor || "",
					update.Status || "",
					formatDate(update.UpdateDate)
				].map(val => {
					const stringVal = String(val);
					if (stringVal.includes(",") || stringVal.includes('"')) {
						return `"${stringVal.replace(/"/g, '""')}"`;
					}
					return stringVal;
				}).join(",")
			)
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `last_night_updates_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Show loading while checking access
	if (accessLoading || loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<p className="mt-4 text-gray-600">
						{accessLoading ? "Checking permissions..." : "Loading last night updates..."}
					</p>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="Dashboard" />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
							<Clock className="h-8 w-8 text-blue-600" />
							Last Night Updates
						</h1>
						<p className="text-gray-600 mt-2">
							All records updated between yesterday 6 PM and today 6 AM
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={fetchLastNightUpdates}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
					<button
						onClick={exportToCSV}
						disabled={filteredUpdates.length === 0}
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Total Updates</p>
							<p className="text-3xl font-bold text-gray-900 mt-2">{updates.length}</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-full">
							<Clock className="h-6 w-6 text-blue-600" />
						</div>
					</div>
				</div>
				{sectionCounts.slice(0, 3).map(({ section, count }) => (
					<div key={section} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">{section}</p>
								<p className="text-3xl font-bold text-gray-900 mt-2">{count}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-full">
								<ExternalLink className="h-6 w-6 text-green-600" />
							</div>
						</div>
					</div>
				))}
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
					<button
						onClick={fetchLastNightUpdates}
						className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
					>
						Retry
					</button>
				</div>
			)}

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
						<input
							type="text"
							placeholder="Search by section, family ID, record ID, name, mentor, or status..."
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setCurrentPage(1);
							}}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Filter by Section</label>
						<select
							value={selectedSection || ""}
							onChange={(e) => {
								setSelectedSection(e.target.value || null);
								setCurrentPage(1);
							}}
							className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
						>
							<option value="">All Sections</option>
							{sectionCounts.map(({ section }) => (
								<option key={section} value={section}>
									{section} ({updatesBySection[section].length})
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Updates Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					{filteredUpdates.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							{error ? "Unable to load updates. Please try again." : "No updates found from last night."}
						</div>
					) : (
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Date</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{paginatedUpdates.map((update, index) => {
									const sectionRoute = getSectionRoute(update.Section, update.RecordID, update.FamilyID);
									return (
										<tr key={`${update.Section}-${update.RecordID}-${index}`} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
													{update.Section}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{update.FamilyID || "N/A"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{update.RecordID || "N/A"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{update.HeadName || "N/A"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{update.Mentor || "N/A"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												{update.Status ? (
													<span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
														{update.Status}
													</span>
												) : (
													"N/A"
												)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(update.UpdateDate)}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												{sectionRoute ? (
													<button
														onClick={() => router.push(sectionRoute)}
														className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
													>
														View
														<ExternalLink className="h-3 w-3" />
													</button>
												) : (
													<span className="text-gray-400">-</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
								<span className="font-medium">
									{Math.min(startIndex + itemsPerPage, filteredUpdates.length)}
								</span>{" "}
								of <span className="font-medium">{filteredUpdates.length}</span> results
							</div>
							<nav className="flex gap-2">
								<button
									onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
									disabled={currentPage === 1}
									className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
								>
									Previous
								</button>
								<button
									onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
									disabled={currentPage === totalPages}
									className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
								>
									Next
								</button>
							</nav>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
