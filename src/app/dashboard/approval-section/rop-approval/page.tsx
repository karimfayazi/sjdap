"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Eye, Edit2, Filter, X, ArrowLeft, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import PageGuard from "@/components/PageGuard";

type ROP = {
	ROPId: number;
	FormNumber: string;
	BeneficiaryID: string | null;
	BankNo: number | null;
	InterventionID: string | null;
	InterventionSection: string | null;
	PayableAmount: number | null;
	PayAmount: number | null;
	MonthOfPayment: string | null;
	PaymentType: string | null;
	ApprovalStatus: string | null;
	SubmittedBy: string | null;
	SubmittedAt: string | null;
	Remarks: string | null;
	Payment_Done: string | null;
	// Family Information
	FamilyFullName: string | null;
	FamilyCNIC: string | null;
	RegionalCommunity: string | null;
	LocalCommunity: string | null;
	// Member Information
	MemberName: string | null;
	MemberCNIC: string | null;
	// Bank Information
	BankName: string | null;
	AccountNo: string | null;
};

export default function ROPApprovalPage() {
	const router = useRouter();
	const [rops, setRops] = useState<ROP[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		approvalStatus: "",
		regionalCommunity: "",
	});

	// Unique values for filters
	const [approvalStatuses, setApprovalStatuses] = useState<string[]>([]);
	const [regionalCommunities, setRegionalCommunities] = useState<string[]>([]);

	// Modal states
	const [showApproveModal, setShowApproveModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [selectedRopId, setSelectedRopId] = useState<number | null>(null);
	const [remarks, setRemarks] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [modalError, setModalError] = useState<string | null>(null);

	// Toast notification state
	const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
		show: false,
		message: "",
		type: "success",
	});

	useEffect(() => {
		fetchROPs();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchROPs = async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (filters.approvalStatus) params.append("approvalStatus", filters.approvalStatus);
			if (filters.regionalCommunity) params.append("regionalCommunity", filters.regionalCommunity);
			if (searchTerm) params.append("search", searchTerm);

			const response = await fetch(`/api/approval/rop-approval?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const rops: ROP[] = (data.rops || []) as ROP[];
				setRops(rops);

				// Extract unique values for filters
				const uniqueStatuses: string[] = Array.from(new Set(
					rops.map((r) => r.ApprovalStatus || "Pending")
				));
				const uniqueCommunities: string[] = Array.from(new Set(
					rops.map((r) => r.RegionalCommunity).filter((v): v is string => Boolean(v))
				));

				setApprovalStatuses(uniqueStatuses.sort());
				setRegionalCommunities(uniqueCommunities.sort());
			} else {
				setError(data.message || "Failed to fetch ROPs");
			}
		} catch (err: any) {
			console.error("Error fetching ROPs:", err);
			setError(err.message || "Error fetching ROPs");
		} finally {
			setLoading(false);
		}
	};

	const handleView = (ropId: number) => {
		router.push(`/dashboard/approval-section/rop-approval/view?ropId=${ropId}`);
	};

	const openApproveModal = (ropId: number) => {
		setSelectedRopId(ropId);
		setRemarks("");
		setModalError(null);
		setShowApproveModal(true);
	};

	const openRejectModal = (ropId: number) => {
		setSelectedRopId(ropId);
		setRemarks("");
		setModalError(null);
		setShowRejectModal(true);
	};

	const closeModals = () => {
		setShowApproveModal(false);
		setShowRejectModal(false);
		setSelectedRopId(null);
		setRemarks("");
		setModalError(null);
		setSubmitting(false);
	};

	const showToast = (message: string, type: "success" | "error" = "success") => {
		setToast({ show: true, message, type });
		setTimeout(() => {
			setToast({ show: false, message: "", type: "success" });
		}, 3000);
	};

	const handleApproveSubmit = async () => {
		if (!selectedRopId) return;

		setSubmitting(true);
		setModalError(null);

		try {
			const response = await fetch(`/api/approval/rop-approval/${selectedRopId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					approvalStatus: "Approved",
					remarks: remarks.trim() || "",
				}),
			});

			const data = await response.json();

			if (data.success) {
				closeModals();
				fetchROPs();
				showToast("ROP Approved successfully", "success");
			} else {
				setModalError(data.message || "Failed to approve ROP");
			}
		} catch (err: any) {
			console.error("Error approving ROP:", err);
			setModalError(err.message || "Failed to approve ROP");
		} finally {
			setSubmitting(false);
		}
	};

	const handleRejectSubmit = async () => {
		if (!selectedRopId) return;

		if (!remarks || remarks.trim() === "") {
			setModalError("Remarks are required for rejection");
			return;
		}

		setSubmitting(true);
		setModalError(null);

		try {
			const response = await fetch(`/api/approval/rop-approval/${selectedRopId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					approvalStatus: "Rejected",
					remarks: remarks.trim(),
				}),
			});

			const data = await response.json();

			if (data.success) {
				closeModals();
				fetchROPs();
				showToast("ROP Rejected successfully", "success");
			} else {
				setModalError(data.message || "Failed to reject ROP");
			}
		} catch (err: any) {
			console.error("Error rejecting ROP:", err);
			setModalError(err.message || "Failed to reject ROP");
		} finally {
			setSubmitting(false);
		}
	};

	const clearFilters = () => {
		setFilters({ approvalStatus: "", regionalCommunity: "" });
		setSearchTerm("");
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number | null) => {
		if (amount === null || amount === undefined) return "N/A";
		return `PKR ${amount.toLocaleString()}`;
	};

	const isApproved = (v: any) => {
		if (!v) return false;
		const status = String(v).trim().toLowerCase();
		return status === "approved";
	};

	const isRejected = (v: any) => {
		if (!v) return false;
		const upper = String(v).trim().toUpperCase();
		return upper === "REJECTED";
	};

	const getPaymentDoneBadge = (paymentDone: string | null) => {
		if (!paymentDone) return null;
		const upper = String(paymentDone).trim().toUpperCase();
		if (upper === "DONE" || upper === "PAYMENT") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 ml-2">Done</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 ml-2">Not Done</span>;
	};

	const getStatusBadge = (status: string | null) => {
		if (!status || status === "Pending") {
			return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>;
		}
		const statusUpper = String(status).trim().toUpperCase();
		if (statusUpper === "APPROVED" || statusUpper === "APPROVAL" || statusUpper === "ACCEPTED") {
			return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Approved</span>;
		} else if (statusUpper === "REJECTED" || statusUpper === "REJECTION") {
			return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Rejected</span>;
		}
		return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">{status}</span>;
	};

	return (
		<PageGuard requiredAction="view">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex justify-between items-center">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold text-gray-900">ROP Approval</h1>
						</div>
						<p className="text-gray-600 mt-2">Review and approve ROP submissions</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={() => router.push("/dashboard")}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Dashboard
						</button>
						<button
							onClick={fetchROPs}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</button>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-800">{error}</p>
					</div>
				)}

				{/* Search and Filters */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
						<input
						type="text"
						placeholder="Search by Form Number, Beneficiary ID, or Intervention ID..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								fetchROPs();
							}
						}}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
					/>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
							<select
								value={filters.approvalStatus}
								onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Statuses</option>
								{approvalStatuses.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
							<select
								value={filters.regionalCommunity}
								onChange={(e) => setFilters({ ...filters, regionalCommunity: e.target.value })}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Communities</option>
								{regionalCommunities.map((community) => (
									<option key={community} value={community}>
										{community}
									</option>
								))}
							</select>
						</div>

						<div className="flex items-end">
							<button
								onClick={clearFilters}
								className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
							>
								<X className="h-4 w-4" />
								Clear Filters
							</button>
						</div>
					</div>

					<button
						onClick={fetchROPs}
						className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
					>
						<Filter className="h-4 w-4" />
						Apply Filters
					</button>
				</div>

				{/* ROPs Table */}
				{loading ? (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
						<p className="text-gray-600 mt-4">Loading ROPs...</p>
					</div>
				) : rops.length === 0 ? (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
						<p className="text-gray-600">No ROPs found.</p>
					</div>
				) : (
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Intervention ID
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Family Information
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Section
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Intervention Type
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Total Amount
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Beneficiary Information
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Mentor
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Created
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{rops.map((rop) => (
										<tr key={rop.ROPId} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{rop.InterventionID || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												<div>
													<div className="font-medium">{rop.FormNumber || "N/A"}</div>
													<div className="text-gray-500">{rop.FamilyFullName || "N/A"}</div>
													<div className="text-xs text-gray-400">
														{rop.RegionalCommunity || "N/A"} / {rop.LocalCommunity || "N/A"}
													</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{rop.InterventionSection || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{rop.PaymentType || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												<div>
													<div className="font-semibold">{formatCurrency(rop.PayableAmount)}</div>
													{rop.PayAmount !== null && rop.PayAmount !== rop.PayableAmount && (
														<div className="text-xs text-gray-500">Pay: {formatCurrency(rop.PayAmount)}</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												<div>
													<div>
														<span className="text-xs font-medium text-gray-500">BeneficiaryID:</span>{" "}
														<span className="text-gray-900">{rop.BeneficiaryID || "—"}</span>
													</div>
													{rop.MemberName && (
														<div className="mt-1">
															<span className="text-xs font-medium text-gray-500">MemberName:</span>{" "}
															<span className="text-gray-900">{rop.MemberName}</span>
														</div>
													)}
													{rop.BankNo && (
														<div className="mt-1">
															<span className="text-xs font-medium text-gray-500">BankNo:</span>{" "}
															<span className="text-gray-900">{rop.BankNo}</span>
															{rop.BankName && (
																<> | <span className="text-gray-900">{rop.BankName}</span></>
															)}
															{rop.AccountNo && (
																<> | <span className="text-gray-900 font-mono">{rop.AccountNo}</span></>
															)}
														</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex flex-col gap-1">
													{getStatusBadge(rop.ApprovalStatus)}
													{getPaymentDoneBadge(rop.Payment_Done)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{rop.SubmittedBy || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{formatDate(rop.SubmittedAt)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
												<button
													onClick={() => handleView(rop.ROPId)}
													className="text-[#0b4d2b] hover:text-[#0a3d22] inline-flex items-center gap-1"
													title="View Details"
												>
													<Eye className="h-4 w-4" />
												</button>
												{(() => {
													const status = (rop.ApprovalStatus || '').trim().toUpperCase();
													// Show Approve/Reject buttons if status is NOT Approved/Accepted
													// This allows switching from Rejected -> Approved
													const isApprovedOrAccepted = status === 'APPROVED' || status === 'ACCEPTED';
													const canTakeAction = !isApprovedOrAccepted;
													
													if (canTakeAction) {
														return (
															<>
																<button
																	onClick={() => openApproveModal(rop.ROPId)}
																	className="inline-flex items-center gap-1 text-green-600 hover:text-green-800"
																	title="Approve"
																>
																	<CheckCircle className="h-4 w-4" />
																</button>
																<button
																	onClick={() => openRejectModal(rop.ROPId)}
																	className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
																	title="Reject"
																>
																	<XCircle className="h-4 w-4" />
																</button>
															</>
														);
													}
													return null;
												})()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Toast Notification */}
				{toast.show && (
					<div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
						<div
							className={`rounded-lg shadow-lg px-6 py-4 flex items-center gap-3 ${
								toast.type === "success"
									? "bg-green-50 border border-green-200 text-green-800"
									: "bg-red-50 border border-red-200 text-red-800"
							}`}
						>
							{toast.type === "success" ? (
								<CheckCircle className="h-5 w-5 text-green-600" />
							) : (
								<XCircle className="h-5 w-5 text-red-600" />
							)}
							<p className="font-medium">{toast.message}</p>
						</div>
					</div>
				)}

				{/* Approve Modal */}
				{showApproveModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
							<div className="p-6">
								<div className="flex items-start gap-4 mb-4">
									<div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
										<CheckCircle className="h-6 w-6 text-green-600" />
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-semibold text-gray-900 mb-2">Approve ROP</h3>
										<p className="text-gray-600 text-sm">
											Are you sure you want to approve this ROP? This action will update the approval status.
										</p>
									</div>
								</div>

								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Remarks (Optional)
									</label>
									<textarea
										value={remarks}
										onChange={(e) => setRemarks(e.target.value)}
										placeholder="Enter optional remarks..."
										rows={3}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent resize-none"
									/>
								</div>

								{modalError && (
									<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
										<p className="text-red-800 text-sm">{modalError}</p>
									</div>
								)}

								<div className="flex justify-end gap-3">
									<button
										onClick={closeModals}
										disabled={submitting}
										className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
									>
										Cancel
									</button>
									<button
										onClick={handleApproveSubmit}
										disabled={submitting}
										className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
									>
										{submitting ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Approving...
											</>
										) : (
											"Approve"
										)}
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Reject Modal */}
				{showRejectModal && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
						<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
							<div className="p-6">
								<div className="flex items-start gap-4 mb-4">
									<div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
										<XCircle className="h-6 w-6 text-red-600" />
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-semibold text-gray-900 mb-2">Reject ROP</h3>
										<p className="text-gray-600 text-sm">
											Are you sure you want to reject this ROP? Please provide a reason for rejection.
										</p>
									</div>
								</div>

								<div className="mb-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Remarks <span className="text-red-500">*</span>
									</label>
									<textarea
										value={remarks}
										onChange={(e) => setRemarks(e.target.value)}
										placeholder="Enter rejection remarks (required)..."
										rows={4}
										required
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent resize-none"
									/>
									{!remarks.trim() && (
										<p className="mt-1 text-sm text-red-600">Remarks are required for rejection</p>
									)}
								</div>

								{modalError && (
									<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
										<p className="text-red-800 text-sm">{modalError}</p>
									</div>
								)}

								<div className="flex justify-end gap-3">
									<button
										onClick={closeModals}
										disabled={submitting}
										className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
									>
										Cancel
									</button>
									<button
										onClick={handleRejectSubmit}
										disabled={submitting || !remarks.trim()}
										className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
									>
										{submitting ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Rejecting...
											</>
										) : (
											"Reject"
										)}
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</PageGuard>
	);
}
