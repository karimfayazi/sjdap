"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

type FamilyInfo = {
	FormNumber: string | null;
	Full_Name: string | null;
	CNICNumber: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
	TotalFamilyMembers: number | null;
};

export default function DeleteFamilyPage() {
	const router = useRouter();
	const [formNumber, setFormNumber] = useState("");
	const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(false);
	const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

	const searchFamily = async () => {
		if (!formNumber.trim()) {
			setError("Please enter a Form Number");
			return;
		}

		setLoading(true);
		setError(null);
		setFamilyInfo(null);
		setDeleteConfirm(false);
		setDeleteMessage(null);

		try {
			const response = await fetch(`/api/family-development-plan?formNumber=${encodeURIComponent(formNumber.trim())}&limit=1`);
			const data = await response.json();

			if (data.success && data.data && data.data.length > 0) {
				setFamilyInfo(data.data[0]);
			} else {
				setError("Family not found with the provided Form Number");
			}
		} catch (err: any) {
			console.error("Error searching family:", err);
			setError(err.message || "Error searching for family");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!familyInfo?.FormNumber) {
			setError("No family selected for deletion");
			return;
		}

		if (!deleteConfirm) {
			setError("Please confirm deletion by checking the confirmation box");
			return;
		}

		setDeleting(true);
		setError(null);
		setDeleteMessage(null);

		try {
			const response = await fetch(`/api/others/delete-family?formNumber=${encodeURIComponent(familyInfo.FormNumber)}`, {
				method: "DELETE",
			});
			const data = await response.json();

			if (data.success) {
				setDeleteMessage(data.message || "Family deleted successfully");
				setFamilyInfo(null);
				setFormNumber("");
				setDeleteConfirm(false);
			} else {
				setError(data.message || "Failed to delete family");
			}
		} catch (err: any) {
			console.error("Error deleting family:", err);
			setError(err.message || "Error deleting family");
		} finally {
			setDeleting(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			searchFamily();
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Delete Family</h1>
					<p className="text-gray-600 mt-2">Search and delete family records by Form Number</p>
				</div>
				<button
					onClick={() => router.push("/dashboard")}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
				>
					<RefreshCw className="h-4 w-4" />
					Back to Dashboard
				</button>
			</div>

			{/* Search Section */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex gap-4 items-end">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Form Number
						</label>
						<input
							type="text"
							value={formNumber}
							onChange={(e) => setFormNumber(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Enter Form Number (e.g., PE-00014)"
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
						/>
					</div>
					<button
						onClick={searchFamily}
						disabled={loading || !formNumber.trim()}
						className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? "Searching..." : "Search"}
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 className="text-sm font-medium text-red-800">Error</h3>
						<p className="text-sm text-red-700 mt-1">{error}</p>
					</div>
				</div>
			)}

			{/* Success Message */}
			{deleteMessage && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
					<div>
						<h3 className="text-sm font-medium text-green-800">Success</h3>
						<p className="text-sm text-green-700 mt-1">{deleteMessage}</p>
					</div>
				</div>
			)}

			{/* Family Information */}
			{familyInfo && (
				<div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
					<div className="flex items-start gap-3 mb-4">
						<AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h2 className="text-xl font-semibold text-red-900 mb-2">Family Information</h2>
							<p className="text-sm text-red-700">
								Warning: Deleting this family will permanently remove all associated records including family members, interventions, and related data.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
								{familyInfo.FormNumber || "-"}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
								{familyInfo.Full_Name || "-"}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">CNIC Number</label>
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
								{familyInfo.CNICNumber || "-"}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Total Family Members</label>
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
								{familyInfo.TotalFamilyMembers !== null ? familyInfo.TotalFamilyMembers : 0}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
								{familyInfo.RegionalCommunity || "-"}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Local Community</label>
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900">
								{familyInfo.LocalCommunity || "-"}
							</div>
						</div>
					</div>

					{/* Delete Confirmation */}
					<div className="border-t border-red-200 pt-4">
						<div className="flex items-start gap-3 mb-4">
							<input
								type="checkbox"
								id="deleteConfirm"
								checked={deleteConfirm}
								onChange={(e) => setDeleteConfirm(e.target.checked)}
								className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
							/>
							<label htmlFor="deleteConfirm" className="text-sm text-gray-700">
								I understand that this action cannot be undone. All family data, members, interventions, and related records will be permanently deleted.
							</label>
						</div>
						<button
							onClick={handleDelete}
							disabled={!deleteConfirm || deleting}
							className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Trash2 className="h-4 w-4" />
							{deleting ? "Deleting..." : "Delete Family"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}


