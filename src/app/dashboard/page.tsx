"use client";

import { useEffect, useState } from "react";
import { 
	Users, 
	CheckCircle, 
	RefreshCw,
	Clock,
	XCircle,
	FileCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Stats = {
	total: number;
	approved: number;
	pending: number;
	rejected: number;
};

export default function DashboardPage() {
	const { loading: authLoading } = useAuth();
	const [baselineStats, setBaselineStats] = useState<Stats>({
		total: 0,
		approved: 0,
		pending: 0,
		rejected: 0,
	});
	const [feasibilityStats, setFeasibilityStats] = useState({
		families: 0,
		feasibility: 0,
		pending: 0,
		approved: 0,
		rejected: 0,
	});
	const [interventionStats, setInterventionStats] = useState<Stats>({
		total: 0,
		approved: 0,
		pending: 0,
		rejected: 0,
	});
	const [fdpStats, setFdpStats] = useState<Stats>({
		total: 0,
		approved: 0,
		pending: 0,
		rejected: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchStats = async () => {
		try {
			setLoading(true);
			setError(null);

			const results = await Promise.allSettled([
				fetch("/api/baseline-stats"),
				fetch("/api/feasibility-stats"),
				fetch("/api/intervention-stats"),
				fetch("/api/fdp-stats"),
			]);

			const errors: string[] = [];

			if (results[0].status === "fulfilled") {
				try {
					const baselineData = await results[0].value.json();
					if (baselineData.success && baselineData.stats) {
						setBaselineStats(baselineData.stats);
					} else if (baselineData.stats) {
						setBaselineStats(baselineData.stats);
						errors.push("Baseline stats: " + (baselineData.message || "Failed to load"));
					}
				} catch (err) {
					errors.push("Baseline stats: " + (err instanceof Error ? err.message : "Failed to load"));
				}
			}

			if (results[1].status === "fulfilled") {
				try {
					const feasibilityData = await results[1].value.json();
					if (feasibilityData.success) {
						setFeasibilityStats({
							families: feasibilityData.families || 0,
							feasibility: feasibilityData.feasibility || 0,
							pending: feasibilityData.pending || 0,
							approved: feasibilityData.approved || 0,
							rejected: feasibilityData.rejected || 0,
						});
					} else {
						setFeasibilityStats({
							families: feasibilityData.families || 0,
							feasibility: feasibilityData.feasibility || 0,
							pending: feasibilityData.pending || 0,
							approved: feasibilityData.approved || 0,
							rejected: feasibilityData.rejected || 0,
						});
						errors.push("Feasibility stats: " + (feasibilityData.message || "Failed to load"));
					}
				} catch (err) {
					errors.push("Feasibility stats: " + (err instanceof Error ? err.message : "Failed to load"));
				}
			}

			if (results[2].status === "fulfilled") {
				try {
					const interventionData = await results[2].value.json();
					if (interventionData.success && interventionData.stats) {
						setInterventionStats(interventionData.stats);
					} else if (interventionData.stats) {
						setInterventionStats(interventionData.stats);
						errors.push("Intervention stats: " + (interventionData.message || "Failed to load"));
					}
				} catch (err) {
					errors.push("Intervention stats: " + (err instanceof Error ? err.message : "Failed to load"));
				}
			}

			if (results[3].status === "fulfilled") {
				try {
					const fdpData = await results[3].value.json();
					if (fdpData.success && fdpData.stats) {
						setFdpStats(fdpData.stats);
					} else if (fdpData.stats) {
						setFdpStats(fdpData.stats);
						errors.push("FDP stats: " + (fdpData.message || "Failed to load"));
					}
				} catch (err) {
					errors.push("FDP stats: " + (err instanceof Error ? err.message : "Failed to load"));
				}
			}

			if (errors.length > 0 && errors.length === 4) {
				setError("All statistics failed to load. Please try again.");
			} else if (errors.length > 0) {
				console.warn("Some statistics had issues:", errors);
			}
		} catch (err) {
			console.error("Error fetching stats:", err);
			setError("Error fetching statistics. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
		if (!authLoading) {
			setLoading(false);
		}
	}, [authLoading]);

	if (loading || authLoading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="flex flex-col items-center gap-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b4d2b]"></div>
					<span className="text-gray-600">Loading dashboard...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-1 text-sm">Overview of statistics and approvals</p>
				</div>
				<button
					onClick={fetchStats}
					disabled={loading}
					className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					Refresh
				</button>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}

			{/* Statistics Cards */}
			<div className="space-y-6">
				{/* Baseline Statistics */}
				<div className="space-y-3">
					<h2 className="text-lg font-semibold text-gray-900">Baseline</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-gray-600 uppercase tracking-wide"># of Families</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">{baselineStats.total.toLocaleString()}</p>
								</div>
								<div className="bg-blue-100 p-2.5 rounded-lg">
									<Users className="h-6 w-6 text-blue-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-emerald-700 uppercase tracking-wide"># of Approved Families</p>
									<p className="text-2xl font-bold text-emerald-900 mt-1">{baselineStats.approved.toLocaleString()}</p>
								</div>
								<div className="bg-emerald-100 p-2.5 rounded-lg">
									<CheckCircle className="h-6 w-6 text-emerald-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-amber-700 uppercase tracking-wide"># of Pending Families</p>
									<p className="text-2xl font-bold text-amber-900 mt-1">{baselineStats.pending.toLocaleString()}</p>
								</div>
								<div className="bg-amber-100 p-2.5 rounded-lg">
									<Clock className="h-6 w-6 text-amber-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-red-700 uppercase tracking-wide"># of Rejected Families</p>
									<p className="text-2xl font-bold text-red-900 mt-1">{baselineStats.rejected.toLocaleString()}</p>
								</div>
								<div className="bg-red-100 p-2.5 rounded-lg">
									<XCircle className="h-6 w-6 text-red-600" />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Feasibility Statistics */}
				<div className="space-y-3">
					<h2 className="text-lg font-semibold text-gray-900">Family Development Plan - Feasibility Section</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-gray-600 uppercase tracking-wide"># of Families</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">{feasibilityStats.families.toLocaleString()}</p>
								</div>
								<div className="bg-blue-100 p-2.5 rounded-lg">
									<Users className="h-6 w-6 text-blue-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-gray-600 uppercase tracking-wide"># of Feasibility</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">{feasibilityStats.feasibility.toLocaleString()}</p>
								</div>
								<div className="bg-blue-100 p-2.5 rounded-lg">
									<FileCheck className="h-6 w-6 text-blue-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-amber-700 uppercase tracking-wide"># of Pending Feasibility</p>
									<p className="text-2xl font-bold text-amber-900 mt-1">{feasibilityStats.pending.toLocaleString()}</p>
								</div>
								<div className="bg-amber-100 p-2.5 rounded-lg">
									<Clock className="h-6 w-6 text-amber-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-emerald-700 uppercase tracking-wide"># of Approved Feasibility</p>
									<p className="text-2xl font-bold text-emerald-900 mt-1">{feasibilityStats.approved.toLocaleString()}</p>
								</div>
								<div className="bg-emerald-100 p-2.5 rounded-lg">
									<CheckCircle className="h-6 w-6 text-emerald-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-red-700 uppercase tracking-wide"># of Rejected Feasibility</p>
									<p className="text-2xl font-bold text-red-900 mt-1">{feasibilityStats.rejected.toLocaleString()}</p>
								</div>
								<div className="bg-red-100 p-2.5 rounded-lg">
									<XCircle className="h-6 w-6 text-red-600" />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* FDP Statistics */}
				<div className="space-y-3">
					<h2 className="text-lg font-semibold text-gray-900">Family Development Plan</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-gray-600 uppercase tracking-wide"># of Families</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">{fdpStats.total.toLocaleString()}</p>
								</div>
								<div className="bg-blue-100 p-2.5 rounded-lg">
									<Users className="h-6 w-6 text-blue-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-emerald-700 uppercase tracking-wide"># of Approved Families</p>
									<p className="text-2xl font-bold text-emerald-900 mt-1">{fdpStats.approved.toLocaleString()}</p>
								</div>
								<div className="bg-emerald-100 p-2.5 rounded-lg">
									<CheckCircle className="h-6 w-6 text-emerald-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-amber-700 uppercase tracking-wide"># of Pending Families</p>
									<p className="text-2xl font-bold text-amber-900 mt-1">{fdpStats.pending.toLocaleString()}</p>
								</div>
								<div className="bg-amber-100 p-2.5 rounded-lg">
									<Clock className="h-6 w-6 text-amber-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-red-700 uppercase tracking-wide"># of Rejected Families</p>
									<p className="text-2xl font-bold text-red-900 mt-1">{fdpStats.rejected.toLocaleString()}</p>
								</div>
								<div className="bg-red-100 p-2.5 rounded-lg">
									<XCircle className="h-6 w-6 text-red-600" />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Intervention Statistics */}
				<div className="space-y-3">
					<h2 className="text-lg font-semibold text-gray-900">Intervention Section</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-gray-600 uppercase tracking-wide"># of Interventions</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">{interventionStats.total.toLocaleString()}</p>
								</div>
								<div className="bg-blue-100 p-2.5 rounded-lg">
									<Users className="h-6 w-6 text-blue-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-emerald-700 uppercase tracking-wide"># of Approved</p>
									<p className="text-2xl font-bold text-emerald-900 mt-1">{interventionStats.approved.toLocaleString()}</p>
								</div>
								<div className="bg-emerald-100 p-2.5 rounded-lg">
									<CheckCircle className="h-6 w-6 text-emerald-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-amber-700 uppercase tracking-wide"># of Pending</p>
									<p className="text-2xl font-bold text-amber-900 mt-1">{interventionStats.pending.toLocaleString()}</p>
								</div>
								<div className="bg-amber-100 p-2.5 rounded-lg">
									<Clock className="h-6 w-6 text-amber-600" />
								</div>
							</div>
						</div>
						<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-4 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium text-red-700 uppercase tracking-wide"># of Rejected</p>
									<p className="text-2xl font-bold text-red-900 mt-1">{interventionStats.rejected.toLocaleString()}</p>
								</div>
								<div className="bg-red-100 p-2.5 rounded-lg">
									<XCircle className="h-6 w-6 text-red-600" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
