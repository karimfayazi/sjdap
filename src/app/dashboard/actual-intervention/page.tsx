"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InterventionData = {
	[key: string]: any; // Dynamic type since we don't know all columns
};

export default function ActualInterventionPage() {
	const [interventions, setInterventions] = useState<InterventionData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;

	useEffect(() => {
		fetchInterventions();
	}, []);

	const fetchInterventions = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/actual-intervention');
			const data = await response.json();

			if (data.success) {
				setInterventions(data.interventions || []);
			} else {
				setError(data.message || "Failed to fetch interventions");
			}
		} catch (err) {
			setError("Error fetching interventions");
			console.error("Error fetching interventions:", err);
		} finally {
			setLoading(false);
		}
	};

	// Get all unique column names from the data
	const getColumns = () => {
		if (interventions.length === 0) return [];
		return Object.keys(interventions[0]);
	};

	// Filter interventions based on search term
	const filteredInterventions = interventions.filter((intervention) => {
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<p className="mt-4 text-gray-600">Loading interventions...</p>
				</div>
			</div>
		);
	}

	const columns = getColumns();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Actual Intervention</h1>
					<p className="text-gray-600 mt-2">Record and monitor actual interventions</p>
				</div>
				<button
					onClick={exportToCSV}
					disabled={interventions.length === 0}
					className="flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Download className="h-4 w-4" />
					Export CSV
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
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
					{columns.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							No intervention data available.
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
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{paginatedInterventions.length === 0 ? (
									<tr>
										<td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
											{searchTerm ? "No interventions found matching your search" : "No interventions found"}
										</td>
									</tr>
								) : (
									paginatedInterventions.map((intervention, index) => (
										<tr key={index} className="hover:bg-gray-50">
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
										</tr>
									))
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
		</div>
	);
}

