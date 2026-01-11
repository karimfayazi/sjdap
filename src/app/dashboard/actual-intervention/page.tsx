"use client";

import { useEffect, useState } from "react";
import { Download, Edit2, X, Save } from "lucide-react";
import { useSectionAccess } from "@/hooks/useSectionAccess";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type InterventionData = {
	[key: string]: any; // Dynamic type since we don't know all columns
};

export default function ActualInterventionPage() {
	const { hasAccess, loading: accessLoading, sectionName } = useSectionAccess("Dashboard");
	const [interventions, setInterventions] = useState<InterventionData[]>([]);
	const [lastNightUpdates, setLastNightUpdates] = useState<InterventionData[]>([]);
	const [lastNightCount, setLastNightCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [showLastNightOnly, setShowLastNightOnly] = useState(false);
	const itemsPerPage = 20;
	const [editingIntervention, setEditingIntervention] = useState<InterventionData | null>(null);
	const [editFormData, setEditFormData] = useState<InterventionData>({});
	const [showEditModal, setShowEditModal] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchInterventions();
	}, []);

	const fetchInterventions = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/actual-intervention');
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();

			if (data.success) {
				setInterventions(data.interventions || []);
				setLastNightUpdates(data.lastNightUpdates || []);
				setLastNightCount(data.lastNightCount || 0);
			} else {
				setError(data.message || "Failed to fetch interventions");
				setInterventions([]); // Ensure interventions is set even on error
				setLastNightUpdates([]);
				setLastNightCount(0);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Error fetching interventions";
			setError(errorMessage);
			setInterventions([]); // Ensure interventions is set even on error
			console.error("Error fetching interventions:", err);
		} finally {
			setLoading(false);
		}
	};

	// Get all unique column names from the data
	const getColumns = () => {
		if (!interventions || interventions.length === 0) return [];
		const firstIntervention = interventions[0];
		if (!firstIntervention) return [];
		return Object.keys(firstIntervention);
	};

	// Get editable columns (exclude system/internal columns)
	const getEditableColumns = () => {
		const allColumns = getColumns();
		// Exclude common system columns that shouldn't be edited
		const excludedColumns = ['ID', 'CREATED_DATE', 'UPDATED_DATE', 'SYSTEMDATE', 'POST_DATE', 'POST_BY'];
		return allColumns.filter(col => !excludedColumns.some(excluded => col.toUpperCase().includes(excluded)));
	};

	// Helper function to check if a field is a date field
	const isDateField = (fieldName: string): boolean => {
		const lowerField = fieldName.toLowerCase();
		return lowerField.includes('date') || lowerField.includes('_date') || lowerField.includes('date_');
	};

	// Helper function to format date for input (YYYY-MM-DD)
	const formatDateForInput = (value: any): string => {
		if (!value) return "";
		
		// If already in YYYY-MM-DD format
		if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
			return value.split('T')[0]; // Remove time portion if present
		}
		
		// Try to parse as date
		try {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				return date.toISOString().split('T')[0];
			}
		} catch (e) {
			// Not a valid date
		}
		
		return "";
	};

	const handleEdit = (intervention: InterventionData) => {
		setEditingIntervention(intervention);
		
		// Format dates properly for date inputs
		const formattedData: InterventionData = {};
		Object.keys(intervention).forEach(key => {
			if (isDateField(key)) {
				formattedData[key] = formatDateForInput(intervention[key]);
			} else {
				formattedData[key] = intervention[key];
			}
		});
		
		setEditFormData(formattedData);
		setShowEditModal(true);
	};

	const handleCancelEdit = () => {
		setShowEditModal(false);
		setEditingIntervention(null);
		setEditFormData({});
	};

	const handleSaveEdit = async () => {
		if (!editingIntervention) return;

		try {
			setSaving(true);
			setError(null);

			const response = await fetch("/api/actual-intervention", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(editFormData),
			});

			const data = await response.json();

			if (data.success) {
				alert("Intervention record updated successfully");
				setShowEditModal(false);
				setEditingIntervention(null);
				setEditFormData({});
				fetchInterventions(); // Refresh the list
			} else {
				setError(data.message || "Failed to update intervention record");
			}
		} catch (err) {
			console.error("Error updating intervention record:", err);
			setError("Error updating intervention record. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleFieldChange = (field: string, value: any) => {
		setEditFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	// Filter interventions based on search term and last night filter
	const filteredInterventions = (showLastNightOnly ? lastNightUpdates : interventions).filter((intervention) => {
		if (!searchTerm) return true;
		const searchLower = searchTerm.toLowerCase();
		return Object.values(intervention).some(value => 
			value?.toString().toLowerCase().includes(searchLower)
		);
	});

	// Pagination
	const totalPages = Math.ceil(filteredInterventions.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedInterventions = filteredInterventions.slice(startIndex, startIndex + itemsPerPage);

	// CSV Export
	const exportToCSV = () => {
		const columns = getColumns();
		if (columns.length === 0) return;

		const csvContent = [
			columns.join(","),
			...filteredInterventions.map((intervention) =>
				columns.map(col => {
					const value = intervention[col];
					// Handle values with commas or quotes
					if (value === null || value === undefined) return "";
					const stringValue = String(value);
					if (stringValue.includes(",") || stringValue.includes('"')) {
						return `"${stringValue.replace(/"/g, '""')}"`;
					}
					return stringValue;
				}).join(",")
			)
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `actual_interventions_${new Date().toISOString().split('T')[0]}.csv`);
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
						{accessLoading ? "Checking permissions..." : "Loading interventions..."}
					</p>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have permission
	if (hasAccess === false) {
		return <SectionAccessDenied sectionName={sectionName} requiredPermission="Dashboard" />;
	}

	const columns = getColumns();

	// Always render something - never return blank
	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Actual Intervention</h1>
					<p className="text-gray-600 mt-2">Record and monitor actual interventions</p>
				</div>
				<div className="flex items-center gap-3">
					{lastNightCount > 0 && (
						<button
							onClick={() => setShowLastNightOnly(!showLastNightOnly)}
							className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
								showLastNightOnly
									? "bg-blue-600 text-white hover:bg-blue-700"
									: "bg-blue-100 text-blue-700 hover:bg-blue-200"
							}`}
						>
							<span className="relative flex h-3 w-3">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
							</span>
							Last Night Updates ({lastNightCount})
						</button>
					)}
					<button
						onClick={exportToCSV}
						disabled={!interventions || interventions.length === 0}
						className="flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Last Night Updates Banner */}
			{lastNightCount > 0 && !showLastNightOnly && (
				<div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex-shrink-0">
								<span className="relative flex h-3 w-3">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
								</span>
							</div>
							<div>
								<h3 className="text-lg font-semibold text-blue-900">
									{lastNightCount} {lastNightCount === 1 ? "record was" : "records were"} updated last night
								</h3>
								<p className="text-sm text-blue-700 mt-1">
									Click the "Last Night Updates" button above to view only the recently updated records.
								</p>
							</div>
						</div>
						<button
							onClick={() => setShowLastNightOnly(true)}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
						>
							View Updates
						</button>
					</div>
				</div>
			)}

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
					<button
						onClick={fetchInterventions}
						className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
					>
						Retry
					</button>
				</div>
			)}

			{/* Search */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
				<input
					type="text"
					placeholder="Search interventions..."
					value={searchTerm}
					onChange={(e) => {
						setSearchTerm(e.target.value);
						setCurrentPage(1);
					}}
					className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
				/>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					{!interventions || interventions.length === 0 || columns.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							{error ? "Unable to load intervention data. Please try again." : "No intervention data available."}
						</div>
					) : (
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									{columns.map((column) => (
										<th
											key={column}
											className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											{column.replace(/_/g, " ")}
										</th>
									))}
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{paginatedInterventions.length === 0 ? (
									<tr>
										<td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500">
											{searchTerm ? "No interventions found matching your search" : showLastNightOnly ? "No updates found from last night" : "No interventions found"}
										</td>
									</tr>
								) : (
									paginatedInterventions.map((intervention, index) => {
										// Check if this intervention is in last night updates by comparing unique identifiers
										const interventionId = intervention['INTERVENTION_ID'] || intervention['Intervention_ID'] || intervention['ID'];
										const familyId = intervention['FAMILY_ID'] || intervention['Family_ID'];
										const isLastNightUpdate = lastNightUpdates.some((update) => {
											const updateId = update['INTERVENTION_ID'] || update['Intervention_ID'] || update['ID'];
											const updateFamilyId = update['FAMILY_ID'] || update['Family_ID'];
											return (interventionId && updateId && interventionId === updateId) ||
												(familyId && updateFamilyId && familyId === updateFamilyId);
										});
										
										return (
											<tr 
												key={index} 
												className={`hover:bg-gray-50 ${isLastNightUpdate ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}
											>
												{columns.map((column) => (
													<td
														key={column}
														className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
													>
														{intervention[column] !== null && intervention[column] !== undefined
															? String(intervention[column])
															: "N/A"}
													</td>
												))}
												<td className="px-4 py-3 whitespace-nowrap text-sm">
													<button
														onClick={() => handleEdit(intervention)}
														className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
														title="Edit"
													>
														<Edit2 className="h-4 w-4" />
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					)}
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
								<span className="font-medium">
									{Math.min(startIndex + itemsPerPage, filteredInterventions.length)}
								</span>{" "}
								of <span className="font-medium">{filteredInterventions.length}</span> results
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

			{/* Edit Modal */}
			{showEditModal && editingIntervention && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-200">
							<h2 className="text-2xl font-bold text-gray-900">Edit Intervention</h2>
							<button
								onClick={handleCancelEdit}
								className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* Modal Body */}
						<div className="flex-1 overflow-y-auto p-6">
							{error && (
								<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
									<p className="text-red-600 text-sm">{error}</p>
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{getEditableColumns().map((column) => {
									const value = editFormData[column];
									const isReadOnly = ['FAMILY_ID', 'INTERVENTION_ID', 'MEMBER_ID'].some(
										key => column.toUpperCase().includes(key)
									);
									const isDate = isDateField(column);

									return (
										<div key={column} className="space-y-1">
											<label className="block text-sm font-medium text-gray-700">
												{column.replace(/_/g, " ")}
												{isReadOnly && <span className="text-gray-400 ml-1">(Read-only)</span>}
											</label>
											{isReadOnly ? (
												<input
													type={isDate ? "date" : "text"}
													value={isDate ? formatDateForInput(value) : (value !== null && value !== undefined ? String(value) : "")}
													disabled
													className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
												/>
											) : (
												<input
													type={isDate ? "date" : "text"}
													value={isDate ? formatDateForInput(value) : (value !== null && value !== undefined ? String(value) : "")}
													onChange={(e) => handleFieldChange(column, e.target.value)}
													className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
												/>
											)}
										</div>
									);
								})}
							</div>
						</div>

						{/* Modal Footer */}
						<div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
							<button
								onClick={handleCancelEdit}
								disabled={saving}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveEdit}
								disabled={saving}
								className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{saving ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Saving...
									</>
								) : (
									<>
										<Save className="h-4 w-4" />
										Save Changes
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

