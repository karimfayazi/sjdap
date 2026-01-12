"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Construction, TrendingUp, DollarSign } from "lucide-react";

export default function FamilyIncomePage() {
	const router = useRouter();

	return (
		<div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
			<div className="max-w-4xl w-full mx-auto px-4">
				<div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
					{/* Header Section with Gradient */}
					<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0a5d2e] to-[#0b4d2b] px-8 py-12 text-center">
						<div className="flex justify-center mb-6">
							<div className="relative">
								<div className="absolute inset-0 bg-white rounded-full opacity-20 animate-pulse"></div>
								<div className="relative bg-white rounded-full p-6 shadow-lg">
									<DollarSign className="h-16 w-16 text-[#0b4d2b]" />
								</div>
							</div>
						</div>
						<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Family Income</h1>
						<p className="text-xl text-green-100">Income Management and Tracking</p>
					</div>

					{/* Content Section */}
					<div className="px-8 py-12">
						<div className="text-center mb-8">
							<div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
								<Clock className="h-12 w-12 text-yellow-600 animate-pulse" />
							</div>
							<h2 className="text-3xl font-bold text-gray-900 mb-4">This Section is Under Process</h2>
							<p className="text-lg text-gray-600 max-w-2xl mx-auto">
								We are currently working on developing this feature. Our team is dedicated to bringing you the best experience possible.
							</p>
						</div>

						{/* Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
							<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border-2 border-blue-200">
								<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
									<TrendingUp className="h-8 w-8 text-white" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900 mb-2">Development</h3>
								<p className="text-sm text-gray-600">Active development in progress</p>
							</div>

							<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border-2 border-green-200">
								<div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
									<Clock className="h-8 w-8 text-white" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
								<p className="text-sm text-gray-600">Feature will be available shortly</p>
							</div>

							<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border-2 border-purple-200">
								<div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-4">
									<Construction className="h-8 w-8 text-white" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900 mb-2">Enhancement</h3>
								<p className="text-sm text-gray-600">Improving user experience</p>
							</div>
						</div>

						{/* Action Button */}
						<div className="text-center">
							<button
								onClick={() => router.push("/dashboard")}
								className="inline-flex items-center gap-2 px-8 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d22] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
							>
								<ArrowLeft className="h-5 w-5" />
								Back to Dashboard
							</button>
						</div>
					</div>

					{/* Footer Decoration */}
					<div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
						<div className="flex items-center justify-center gap-2 text-sm text-gray-500">
							<Clock className="h-4 w-4" />
							<span>Please check back later for updates</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
