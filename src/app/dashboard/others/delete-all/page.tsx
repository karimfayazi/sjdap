"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import NoPermissionMessage from "@/components/NoPermissionMessage";

interface Family {
	FormNo: string;
	FullName: string;
	CNICNo: string;
	ApplicationDate: string;
	PrimaryContactNo: string;
	TotalFamilyMembers: number;
	RegionalCouncil: string;
	LocalCouncil: string;
}

export default function DeleteAllPage() {
	const router = useRouter();
	const { userProfile, loading: authLoading } = useAuth();
	const [isSuperUserState, setIsSuperUserState] = useState<boolean | null>(null);
	const [families, setFamilies] = useState<Family[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingFormNumber, setDeletingFormNumber] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Check if user is Super User
	useEffect(() => {
		if (authLoading) return;
		
		if (userProfile) {
			const superUserValue = userProfile.supper_user;
			setIsSuperUserState(isSuperUser(superUserValue));
		} else {
			try {
				const stored = localStorage.getItem("userData");
				if (stored) {
					const parsed = JSON.parse(stored);
					const su = parsed.super_user || parsed.supper_user;
					setIsSuperUserState(isSuperUser(su));
				} else {
					setIsSuperUserState(false);
				}
			} catch {
				setIsSuperUserState(false);
			}
		}
	}, [userProfile, authLoading]);

	// Fetch all families from baseline
	useEffect(() => {
		fetchFamilies();
	}, []);

	const fetchFamilies = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch("/api/baseline-applications?limit=1000");
			const data = await response.json();

			if (data.success && data.data) {
				setFamilies(data.data);
			} else {
				setError("Failed to fetch families");
			}
		} catch (err: any) {
			console.error("Error fetching families:", err);
			setError(err.message || "Error fetching families");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteClick = (formNumber: string) => {
		setConfirmDelete(formNumber);
		setError(null);
		setSuccess(null);
	};

	const handleConfirmDelete = async (formNumber: string) => {
		setDeletingFormNumber(formNumber);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(`/api/others/delete-family?formNumber=${encodeURIComponent(formNumber)}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(`Family ${formNumber} deleted successfully`);
				// Remove the deleted family from the list
				setFamilies(families.filter((f) => f.FormNo !== formNumber));
				setConfirmDelete(null);
			} else {
				setError(data.message || "Failed to delete family");
			}
		} catch (err: any) {
			console.error("Error deleting family:", err);
			setError(err.message || "Error deleting family");
		} finally {
			setDeletingFormNumber(null);
		}
	};

	const handleCancelDelete = () => {
		setConfirmDelete(null);
		setError(null);
	};

	// Check Super User status - only Super Users can access this page
	if (isSuperUserState === null || authLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Checking permissions...</span>
				</div>
			</div>
		);
	}

	if (!isSuperUserState) {
		return <NoPermissionMessage />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
						<Trash2 className="h-8 w-8 text-red-600" />
						Delete Families
					</h1>
					<p className="text-gray-600 mt-2">View and delete families from baseline (PE_Application_BasicInfo)</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={fetchFamilies}
						disabled={loading}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</button>
					<button
						onClick={() => router.push("/dashboard")}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						Back to Dashboard
					</button>
				</div>
			</div>

			{/* Warning Banner */}
			<div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
				<div className="flex items-start gap-4">
					<AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<h2 className="text-xl font-bold text-red-900 mb-2">⚠️ Warning</h2>
						<p className="text-red-800 mb-2">
							Deleting a family will <strong>permanently delete</strong> all records associated with that family, including:
						</p>
						<ul className="list-disc list-inside text-red-700 space-y-1 mb-2">
							<li>Application basic information</li>
							<li>Family status records</li>
							<li>Family development plan records</li>
							<li>Family member records</li>
							<li>All related intervention records</li>
						</ul>
						<p className="text-red-900 font-semibold">
							⚠️ This action cannot be undone. Please ensure you have a backup if needed.
						</p>
					</div>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<h3 className="text-sm font-medium text-red-800">Error</h3>
						<p className="text-sm text-red-700 mt-1">{error}</p>
					</div>
					<button
						onClick={() => setError(null)}
						className="text-red-600 hover:text-red-800"
					>
						×
					</button>
				</div>
			)}

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
					<CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<h3 className="text-sm font-medium text-green-800">Success</h3>
						<p className="text-sm text-green-700 mt-1">{success}</p>
					</div>
					<button
						onClick={() => setSuccess(null)}
						className="text-green-600 hover:text-green-800"
					>
						×
					</button>
				</div>
			)}

			{/* Families Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">
						All Families ({families.length})
					</h2>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
						<span className="ml-3 text-gray-600">Loading families...</span>
					</div>
				) : families.length === 0 ? (
					<div className="text-center py-12 text-gray-500">
						<p>No families found in baseline.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Form Number
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Full Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										CNIC Number
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Contact
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Family Members
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Region
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Application Date
									</th>
									<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{families.map((family) => (
									<tr key={family.FormNo} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{family.FormNo}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{family.FullName || "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{family.CNICNo || "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{family.PrimaryContactNo || "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{family.TotalFamilyMembers || 0}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{family.RegionalCouncil || "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{family.ApplicationDate
												? new Date(family.ApplicationDate).toLocaleDateString()
												: "N/A"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											{confirmDelete === family.FormNo ? (
												<div className="flex items-center justify-end gap-2">
													<button
														onClick={() => handleConfirmDelete(family.FormNo)}
														disabled={deletingFormNumber === family.FormNo}
														className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													>
														{deletingFormNumber === family.FormNo ? (
															<>
																<Loader2 className="h-3 w-3 animate-spin" />
																Deleting...
															</>
														) : (
															<>
																<CheckCircle className="h-3 w-3" />
																Yes, Delete
															</>
														)}
													</button>
													<button
														onClick={handleCancelDelete}
														disabled={deletingFormNumber === family.FormNo}
														className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													>
														Cancel
													</button>
												</div>
											) : (
												<button
													onClick={() => handleDeleteClick(family.FormNo)}
													disabled={deletingFormNumber !== null || confirmDelete !== null}
													className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<Trash2 className="h-3 w-3" />
													Delete
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Confirmation Modal */}
			{confirmDelete && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
						<div className="p-6">
							<div className="flex items-start gap-4 mb-4">
								<AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
									<p className="text-gray-700 mb-2">
										Are you sure you want to delete family <strong>{confirmDelete}</strong>?
									</p>
									<p className="text-sm text-red-600 font-semibold">
										This action cannot be undone. All records associated with this family will be permanently deleted.
									</p>
								</div>
							</div>
							<div className="flex justify-end gap-3">
								<button
									onClick={handleCancelDelete}
									disabled={deletingFormNumber !== null}
									className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Cancel
								</button>
								<button
									onClick={() => handleConfirmDelete(confirmDelete)}
									disabled={deletingFormNumber !== null}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
								>
									{deletingFormNumber === confirmDelete ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Deleting...
										</>
									) : (
										<>
											<Trash2 className="h-4 w-4" />
											Yes, Delete Family
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
