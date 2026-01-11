"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";

type Intervention = {
	InterventionID: number;
	FormNumber: string;
	Section: string | null;
	InterventionStatus: string | null;
	InterventionCategory: string | null;
	SubCategory: string | null;
	FrameworkDimensions: string | null;
	MainIntervention: string | null;
	InterventionType: string | null;
	FinancialCategory: string | null;
	Frequency: number | null;
	FrequencyUnit: string | null;
	Amount: number | null;
	TotalAmount: number | null;
	InterventionStartDate: string | null;
	InterventionEndDate: string | null;
	Remarks: string | null;
	MemberID: string | null;
	MainTrade: string | null;
	SubTrades: string | null;
	SpecialtyTrade: string | null;
	CNIC: string | null;
	AmountType: string | null;
	ApprovalStatus: string | null;
	CreatedBy: string | null;
	CreatedAt: string | null;
};

function ActualInterventionDetailContent() {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const formNumber = params?.formNumber as string;
	const interventionType = searchParams?.get("type") || "";
	const memberId = searchParams?.get("memberId") || "";

	const [interventions, setInterventions] = useState<Intervention[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);


	useEffect(() => {
		if (formNumber) {
			fetchInterventions();
		}
	}, [formNumber]);

	// Redirect to add page if type parameter is present
	useEffect(() => {
		if (interventionType) {
			router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}/add?type=${interventionType}&memberId=${encodeURIComponent(memberId)}`);
		}
	}, [interventionType, formNumber, memberId, router]);

	const fetchInterventions = async () => {
		if (!formNumber) return;

		try {
			setLoading(true);
			setError(null);

			const response = await fetch(
				`/api/actual-intervention/interventions?formNumber=${encodeURIComponent(formNumber)}`
			);
			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				setError(data?.message || "Failed to load interventions");
				return;
			}

			setInterventions(data.records || []);
		} catch (err) {
			console.error("Error fetching interventions:", err);
			setError("Error fetching interventions");
		} finally {
			setLoading(false);
		}
	};


	const formatDate = (dateString: string | null): string => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return dateString;
		}
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => router.push("/dashboard/actual-intervention")}
						className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
					>
						<ArrowLeft className="h-4 w-4" />
						Back
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Actual Intervention</h1>
						<p className="text-gray-600 mt-2">Form Number: {formNumber}</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => router.push(`/dashboard/actual-intervention/${encodeURIComponent(formNumber)}/add`)}
					className="inline-flex items-center gap-2 rounded-md bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3d22]"
				>
					<Plus className="h-4 w-4" />
					Add Intervention
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm font-medium">Error: {error}</p>
				</div>
			)}

			{/* Interventions Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Intervention ID
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Section
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Category
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Main Intervention
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Type
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Total Amount
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Member ID
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Start Date
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									End Date
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{interventions.length === 0 ? (
								<tr>
									<td colSpan={10} className="px-4 py-8 text-center text-gray-500">
										No interventions found.
									</td>
								</tr>
							) : (
								interventions.map((intervention) => (
									<tr key={intervention.InterventionID} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.InterventionID || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.Section || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.InterventionStatus || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.InterventionCategory || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.MainIntervention || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.InterventionType || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.TotalAmount != null
												? intervention.TotalAmount.toLocaleString()
												: "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{intervention.MemberID || "N/A"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatDate(intervention.InterventionStartDate)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{formatDate(intervention.InterventionEndDate)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

		</div>
	);
}

export default function ActualInterventionDetailPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				</div>
			}
		>
			<ActualInterventionDetailContent />
		</Suspense>
	);
}
