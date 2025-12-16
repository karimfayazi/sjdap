"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type FamilyDetailedData = {
	FAMILY_ID: string | null;
	PROGRAM: string | null;
	AREA: string | null;
	REGIONAL_COUNCIL: string | null;
	LOCAL_COUNCIL: string | null;
	JAMAT_KHANA: string | null;
	HEAD_NAME: string | null;
	CNIC: string | null;
	CONTACT: string | null;
	PER_CAPITA_INCOME: number | null;
	TOTAL_FAMILY_MEMBER: number | null;
	AREA_TYPE: string | null;
};

export default function FamiliesDetailedPage() {
	const [families, setFamilies] = useState<FamilyDetailedData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 20;

	useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/families-detailed');
			const data = await response.json();

			if (data.success) {
				setFamilies(data.families || []);
			} else {
				setError(data.message || "Failed to fetch families");
			}
		} catch (err) {
			setError("Error fetching families");
			console.error("Error fetching families:", err);
		} finally {
			setLoading(false);
		}
	};

	// Filter families based on search term
	const filteredFamilies = families.filter((family) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			(family.FAMILY_ID?.toLowerCase().includes(searchLower)) ||
			(family.HEAD_NAME?.toLowerCase().includes(searchLower)) ||
			(family.CNIC?.toLowerCase().includes(searchLower)) ||
			(family.PROGRAM?.toLowerCase().includes(searchLower)) ||
			(family.AREA?.toLowerCase().includes(searchLower)) ||
			(family.REGIONAL_COUNCIL?.toLowerCase().includes(searchLower)) ||
			(family.LOCAL_COUNCIL?.toLowerCase().includes(searchLower)) ||
			(family.JAMAT_KHANA?.toLowerCase().includes(searchLower)) ||
			(family.CONTACT?.toLowerCase().includes(searchLower)) ||
			(family.AREA_TYPE?.toLowerCase().includes(searchLower))
		);
	});

	// Pagination
	const totalPages = Math.ceil(filteredFamilies.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedFamilies = filteredFamilies.slice(startIndex, startIndex + itemsPerPage);

	// CSV Export
	const exportToCSV = () => {
		const headers = [
			"Family ID",
			"Program",
			"Area",
			"Regional Council",
			"Local Council",
			"Jamat Khana",
			"Head Name",
			"CNIC",
			"Contact",
			"Per Capita Income",
			"Total Family Member",
			"Area Type"
		];

		const csvContent = [
			headers.join(","),
			...filteredFamilies.map((family) =>
				[
					family.FAMILY_ID || "",
					family.PROGRAM || "",
					family.AREA || "",
					family.REGIONAL_COUNCIL || "",
					family.LOCAL_COUNCIL || "",
					family.JAMAT_KHANA || "",
					family.HEAD_NAME || "",
					family.CNIC || "",
					family.CONTACT || "",
					family.PER_CAPITA_INCOME || "",
					family.TOTAL_FAMILY_MEMBER || "",
					family.AREA_TYPE || ""
				].join(",")
			)
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `families_detailed_${new Date().toISOString().split('T')[0]}.csv`);
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
					<p className="mt-4 text-gray-600">Loading families...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Families Detailed</h1>
					<p className="text-gray-600 mt-2">View detailed family information</p>
				</div>
				<button
					onClick={exportToCSV}
					className="flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
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
					placeholder="Search by Family ID, Head Name, CNIC, Program, Area, etc..."
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
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family ID</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regional Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Council</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jamat Khana</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Name</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNIC</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per Capita Income</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Family Member</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Type</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{paginatedFamilies.length === 0 ? (
								<tr>
									<td colSpan={12} className="px-4 py-8 text-center text-gray-500">
										{searchTerm ? "No families found matching your search" : "No families found"}
									</td>
								</tr>
							) : (
								paginatedFamilies.map((family, index) => (
									<tr key={family.FAMILY_ID || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
											{family.FAMILY_ID || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.PROGRAM || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.AREA || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.REGIONAL_COUNCIL || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.LOCAL_COUNCIL || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.JAMAT_KHANA || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.HEAD_NAME || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.CNIC || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.CONTACT || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.PER_CAPITA_INCOME ? family.PER_CAPITA_INCOME.toLocaleString() : "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.TOTAL_FAMILY_MEMBER || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{family.AREA_TYPE || "N/A"}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<div className="text-sm text-gray-700">
								Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
								<span className="font-medium">
									{Math.min(startIndex + itemsPerPage, filteredFamilies.length)}
								</span>{" "}
								of <span className="font-medium">{filteredFamilies.length}</span> results
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

