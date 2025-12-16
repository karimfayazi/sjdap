"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function AddQOLBaselinePage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Add QOL Baseline Record</h1>
					<p className="text-gray-600 mt-2">Create a new Quality of Life Baseline record</p>
				</div>
				<button
					onClick={() => router.push('/dashboard/qol-baseline')}
					className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to List
				</button>
			</div>

			{/* Content */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="text-center py-12">
					<p className="text-gray-600 text-lg">This page is under development.</p>
					<p className="text-gray-500 text-sm mt-2">Form will be added here to create new QOL Baseline records.</p>
				</div>
			</div>
		</div>
	);
}

