"use client";

import { useRouter } from "next/navigation";

export default function FinancePage() {
	const router = useRouter();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Finance</h1>
				<p className="text-gray-600 mt-2">Financial management and loan processing</p>
			</div>
			
			<div className="bg-white rounded-lg shadow p-6">
				<div className="space-y-4">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">Finance Menu</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<button
							onClick={() => router.push('/dashboard/finance/loan-process')}
							className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-[#0b4d2b] hover:bg-green-50 transition-all text-left"
						>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">Loan Process</h3>
							<p className="text-gray-600 text-sm">Manage and track loan applications and processes</p>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

