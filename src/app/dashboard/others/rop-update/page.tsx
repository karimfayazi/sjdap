"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, RefreshCw, Search } from "lucide-react";

type ROPData = {
	INTERVENTION_ID_MONTH_ROP: string;
	INTERVENTION_ID: string | null;
	MONTH_ROP: string | null;
	AMOUNT: number | null;
	REMARKS: string | null;
	MENTOR: string | null;
	Payment_Type: string | null;
	SYSTEMDATE: string | null;
};

export default function ROPUpdatePage() {
	const router = useRouter();
	const [rops, setRops] = useState<ROPData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		interventionId: "",
		monthRop: "",
		mentor: "",
		paymentType: "",
	});
	const [editingRop, setEditingRop] = useState<ROPData | null>(null);
	const [saving, setSaving] = useState(false);
	const [options, setOptions] = useState<{
		mentors: string[];
		paymentTypes: string[];
		monthRops: string[];
	}>({
		mentors: [],
		paymentTypes: [],
		monthRops: [],
	});

	const fetchOptions = async () => {
		try {
			const response = await fetch("/api/rop-update?getOptions=true");
			const data = await response.json();
			if (data.success) {
				setOptions({
					mentors: data.mentors || [],
					paymentTypes: data.paymentTypes || [],
					monthRops: data.monthRops || [],
				});
			}
		} catch (err) {
			console.error("Error fetching options:", err);
		}
	};

	const fetchROPs = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value) {
					params.append(key, value);
				}
			});

			const response = await fetch(`/api/rop-update?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setRops(data.rops || []);
			} else {
				setError(data.message || "Failed to fetch ROP data");
			}
		} catch (err: any) {
			console.error("Error fetching ROP data:", err);
			setError(err.message || "Error fetching ROP data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOptions();
		fetchROPs();
	}, []);

	const handleFilterChange = (key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const handleApplyFilters = () => {
		fetchROPs();
	};

	const handleClearFilters = () => {
		setFilters({
			interventionId: "",
			monthRop: "",
			mentor: "",
			paymentType: "",
		});
		setSearchTerm("");
	};

	const handleEdit = (rop: ROPData) => {
		setEditingRop({ ...rop });
	};

	const handleSave = async () => {
		if (!editingRop) return;

		setSaving(true);
		try {
			const response = await fetch("/api/rop-update", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(editingRop),
			});

			const data = await response.json();

			if (data.success) {
				setEditingRop(null);
				fetchROPs();
			} else {
				setError(data.message || "Failed to update ROP");
			}
		} catch (err: any) {
			console.error("Error updating ROP:", err);
			setError(err.message || "Error updating ROP");
		} finally {
			setSaving(false);
		}
	};

	const filteredRops = rops.filter((rop) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			(rop.INTERVENTION_ID && String(rop.INTERVENTION_ID).toLowerCase().includes(search)) ||
			(rop.MONTH_ROP && String(rop.MONTH_ROP).toLowerCase().includes(search)) ||
			(rop.MENTOR && String(rop.MENTOR).toLowerCase().includes(search)) ||
			(rop.Payment_Type && String(rop.Payment_Type).toLowerCase().includes(search))
		);
	});

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">ROP Update</h1>
						<p className="text-gray-600 mt-2">Update ROP Records</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading ROP data...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">ROP Update</h1>
					<p className="text-gray-600 mt-2">Update ROP Records</p>
				</div>
				<button
					onClick={fetchROPs}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Search and Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-10 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<input
						type="text"
						placeholder="Intervention ID"
						value={filters.interventionId}
						onChange={(e) => handleFilterChange("interventionId", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					/>
					<select
						value={filters.monthRop}
						onChange={(e) => handleFilterChange("monthRop", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					>
						<option value="">All Month ROPs</option>
						{options.monthRops.map((month) => (
							<option key={month} value={month}>
								{month}
							</option>
						))}
					</select>
					<select
						value={filters.mentor}
						onChange={(e) => handleFilterChange("mentor", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					>
						<option value="">All Mentors</option>
						{options.mentors.map((mentor) => (
							<option key={mentor} value={mentor}>
								{mentor}
							</option>
						))}
					</select>
					<select
						value={filters.paymentType}
						onChange={(e) => handleFilterChange("paymentType", e.target.value)}
						className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
					>
						<option value="">All Payment Types</option>
						{options.paymentTypes.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
				</div>
				
				<div className="flex gap-2">
					<button
						onClick={handleApplyFilters}
						className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						Apply Filters
					</button>
					<button
						onClick={handleClearFilters}
						className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention ID</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month ROP</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredRops.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-gray-500">
										No ROP records found
									</td>
								</tr>
							) : (
								filteredRops.map((rop, index) => (
									<tr key={rop.INTERVENTION_ID_MONTH_ROP || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm">
											<button
												onClick={() => handleEdit(rop)}
												className="px-3 py-1 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors text-sm"
											>
												Edit
											</button>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rop.INTERVENTION_ID || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rop.MONTH_ROP || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rop.AMOUNT?.toLocaleString() || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rop.MENTOR || "N/A"}</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rop.Payment_Type || "N/A"}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{rop.REMARKS || "N/A"}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Edit Modal */}
			{editingRop && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="p-6">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Edit ROP Record</h3>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Intervention ID</label>
									<input
										type="text"
										value={editingRop.INTERVENTION_ID || ""}
										onChange={(e) => setEditingRop({ ...editingRop, INTERVENTION_ID: e.target.value })}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Month ROP</label>
									<select
										value={editingRop.MONTH_ROP || ""}
										onChange={(e) => setEditingRop({ ...editingRop, MONTH_ROP: e.target.value })}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Month ROP</option>
										{options.monthRops.map((month) => (
											<option key={month} value={month}>
												{month}
											</option>
										))}
									</select>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
									<input
										type="number"
										value={editingRop.AMOUNT || ""}
										onChange={(e) => setEditingRop({ ...editingRop, AMOUNT: e.target.value ? parseFloat(e.target.value) : null })}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Mentor</label>
									<select
										value={editingRop.MENTOR || ""}
										onChange={(e) => setEditingRop({ ...editingRop, MENTOR: e.target.value })}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Mentor</option>
										{options.mentors.map((mentor) => (
											<option key={mentor} value={mentor}>
												{mentor}
											</option>
										))}
									</select>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
									<select
										value={editingRop.Payment_Type || ""}
										onChange={(e) => setEditingRop({ ...editingRop, Payment_Type: e.target.value })}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									>
										<option value="">Select Payment Type</option>
										{options.paymentTypes.map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
								</div>
								
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
									<textarea
										value={editingRop.REMARKS || ""}
										onChange={(e) => setEditingRop({ ...editingRop, REMARKS: e.target.value })}
										rows={3}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									/>
								</div>
							</div>
							
							<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
								<button
									onClick={() => setEditingRop(null)}
									className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
									disabled={saving}
								>
									Cancel
								</button>
								<button
									onClick={handleSave}
									disabled={saving}
									className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50"
								>
									<Save className="h-4 w-4" />
									{saving ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
