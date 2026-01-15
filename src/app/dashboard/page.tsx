"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";

type Stats = {
	total: number;
	approved: number;
	pending: number;
	rejected: number;
};

export default function DashboardPage() {
	const [baselineStats, setBaselineStats] = useState<Stats>({
		total: 0,
		approved: 0,
		pending: 0,
		rejected: 0,
	});
	const [feasibilityStats, setFeasibilityStats] = useState<Stats>({
		total: 0,
		approved: 0,
		pending: 0,
		rejected: 0,
	});
	const [interventionStats, setInterventionStats] = useState<Stats>({
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

			// Fetch all stats in parallel
			const [baselineRes, feasibilityRes, interventionRes] = await Promise.all([
				fetch("/api/baseline-stats"),
				fetch("/api/feasibility-stats"),
				fetch("/api/intervention-stats"),
			]);

			const baselineData = await baselineRes.json();
			const feasibilityData = await feasibilityRes.json();
			const interventionData = await interventionRes.json();

			if (baselineData.success) {
				setBaselineStats(baselineData.stats);
			}
			if (feasibilityData.success) {
				setFeasibilityStats(feasibilityData.stats);
			}
			if (interventionData.success) {
				setInterventionStats(interventionData.stats);
			}

			if (!baselineData.success || !feasibilityData.success || !interventionData.success) {
				setError("Some statistics failed to load");
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
	}, []);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Overview and statistics</p>
				</div>
				<button
					onClick={fetchStats}
					disabled={loading}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					Refresh
				</button>
			</div>

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<p className="text-red-600 text-sm">{error}</p>
				</div>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading statistics...</span>
				</div>
			) : (
				<div className="space-y-8">
					{/* Baseline Statistics Cards */}
					<div className="space-y-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Baseline</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{/* Total Families Card */}
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
											# of Families
										</p>
										<p className="text-3xl font-bold text-gray-900 mt-2">
											{baselineStats.total.toLocaleString()}
										</p>
									</div>
									<div className="bg-blue-100 p-3 rounded-full">
										<Users className="h-8 w-8 text-blue-600" />
									</div>
								</div>
							</div>

							{/* Approved Families Card */}
							<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
											# of Approved Families
										</p>
										<p className="text-3xl font-bold text-emerald-900 mt-2">
											{baselineStats.approved.toLocaleString()}
										</p>
									</div>
									<div className="bg-emerald-100 p-3 rounded-full">
										<CheckCircle className="h-8 w-8 text-emerald-600" />
									</div>
								</div>
							</div>

							{/* Pending Families Card */}
							<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-amber-700 uppercase tracking-wide">
											# of Pending Families
										</p>
										<p className="text-3xl font-bold text-amber-900 mt-2">
											{baselineStats.pending.toLocaleString()}
										</p>
									</div>
									<div className="bg-amber-100 p-3 rounded-full">
										<Clock className="h-8 w-8 text-amber-600" />
									</div>
								</div>
							</div>

							{/* Rejected Families Card */}
							<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-red-700 uppercase tracking-wide">
											# of Rejected Families
										</p>
										<p className="text-3xl font-bold text-red-900 mt-2">
											{baselineStats.rejected.toLocaleString()}
										</p>
									</div>
									<div className="bg-red-100 p-3 rounded-full">
										<XCircle className="h-8 w-8 text-red-600" />
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Family Development Plan - Feasibility Section Statistics Cards */}
					<div className="space-y-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Family Development Plan - Feasibility Section</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{/* Total Feasibility Card */}
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
											# of Feasibility
										</p>
										<p className="text-3xl font-bold text-gray-900 mt-2">
											{feasibilityStats.total.toLocaleString()}
										</p>
									</div>
									<div className="bg-blue-100 p-3 rounded-full">
										<Users className="h-8 w-8 text-blue-600" />
									</div>
								</div>
							</div>

							{/* Approved Feasibility Card */}
							<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
											# of Approved
										</p>
										<p className="text-3xl font-bold text-emerald-900 mt-2">
											{feasibilityStats.approved.toLocaleString()}
										</p>
									</div>
									<div className="bg-emerald-100 p-3 rounded-full">
										<CheckCircle className="h-8 w-8 text-emerald-600" />
									</div>
								</div>
							</div>

							{/* Pending Feasibility Card */}
							<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-amber-700 uppercase tracking-wide">
											# of Pending
										</p>
										<p className="text-3xl font-bold text-amber-900 mt-2">
											{feasibilityStats.pending.toLocaleString()}
										</p>
									</div>
									<div className="bg-amber-100 p-3 rounded-full">
										<Clock className="h-8 w-8 text-amber-600" />
									</div>
								</div>
							</div>

							{/* Rejected Feasibility Card */}
							<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-red-700 uppercase tracking-wide">
											# of Rejected
										</p>
										<p className="text-3xl font-bold text-red-900 mt-2">
											{feasibilityStats.rejected.toLocaleString()}
										</p>
									</div>
									<div className="bg-red-100 p-3 rounded-full">
										<XCircle className="h-8 w-8 text-red-600" />
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Intervention Statistics Cards */}
					<div className="space-y-4">
						<div>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">Intervention Section</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{/* Total Interventions Card */}
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
											# of Interventions
										</p>
										<p className="text-3xl font-bold text-gray-900 mt-2">
											{interventionStats.total.toLocaleString()}
										</p>
									</div>
									<div className="bg-blue-100 p-3 rounded-full">
										<Users className="h-8 w-8 text-blue-600" />
									</div>
								</div>
							</div>

							{/* Approved Interventions Card */}
							<div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
											# of Approved
										</p>
										<p className="text-3xl font-bold text-emerald-900 mt-2">
											{interventionStats.approved.toLocaleString()}
										</p>
									</div>
									<div className="bg-emerald-100 p-3 rounded-full">
										<CheckCircle className="h-8 w-8 text-emerald-600" />
									</div>
								</div>
							</div>

							{/* Pending Interventions Card */}
							<div className="bg-white rounded-lg border border-amber-200 bg-amber-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-amber-700 uppercase tracking-wide">
											# of Pending
										</p>
										<p className="text-3xl font-bold text-amber-900 mt-2">
											{interventionStats.pending.toLocaleString()}
										</p>
									</div>
									<div className="bg-amber-100 p-3 rounded-full">
										<Clock className="h-8 w-8 text-amber-600" />
									</div>
								</div>
							</div>

							{/* Rejected Interventions Card */}
							<div className="bg-white rounded-lg border border-red-200 bg-red-50 shadow-sm p-6 hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-red-700 uppercase tracking-wide">
											# of Rejected
										</p>
										<p className="text-3xl font-bold text-red-900 mt-2">
											{interventionStats.rejected.toLocaleString()}
										</p>
									</div>
									<div className="bg-red-100 p-3 rounded-full">
										<XCircle className="h-8 w-8 text-red-600" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
