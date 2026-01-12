"use client";

import { Construction, Wrench, Clock, Sparkles } from "lucide-react";

export default function DashboardPage() {
	return (
		<div className="flex items-center justify-center min-h-[70vh]">
			<div className="text-center max-w-2xl mx-auto px-6">
				{/* Main Icon */}
				<div className="mb-8 flex justify-center">
					<div className="relative">
						<div className="absolute inset-0 bg-[#0b4d2b] rounded-full blur-xl opacity-20 animate-pulse"></div>
						<div className="relative bg-gradient-to-br from-[#0b4d2b] to-[#0a3d22] p-8 rounded-full shadow-2xl">
							<Construction className="h-16 w-16 text-white" />
						</div>
					</div>
				</div>

				{/* Title */}
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					Dashboard
				</h1>

				{/* Under Construction Message */}
				<div className="mb-8">
					<h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-3">
						Under Construction
					</h2>
					<p className="text-lg text-gray-600 leading-relaxed">
						We're working hard to bring you an amazing dashboard experience. 
						Please check back soon!
					</p>
				</div>

				{/* Feature Icons */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 mb-8">
					<div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
						<div className="bg-blue-100 p-3 rounded-full mb-3">
							<Wrench className="h-6 w-6 text-blue-600" />
						</div>
						<span className="text-sm font-medium text-gray-700">Development</span>
					</div>
					<div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
						<div className="bg-green-100 p-3 rounded-full mb-3">
							<Sparkles className="h-6 w-6 text-green-600" />
						</div>
						<span className="text-sm font-medium text-gray-700">Enhancement</span>
					</div>
					<div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
						<div className="bg-purple-100 p-3 rounded-full mb-3">
							<Clock className="h-6 w-6 text-purple-600" />
						</div>
						<span className="text-sm font-medium text-gray-700">Coming Soon</span>
					</div>
					<div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
						<div className="bg-amber-100 p-3 rounded-full mb-3">
							<Construction className="h-6 w-6 text-amber-600" />
						</div>
						<span className="text-sm font-medium text-gray-700">In Progress</span>
					</div>
				</div>

				{/* Decorative Elements */}
				<div className="mt-12 pt-8 border-t border-gray-200">
					<div className="flex items-center justify-center gap-2 text-gray-500">
						<Clock className="h-4 w-4" />
						<span className="text-sm">We'll be back soon with exciting updates</span>
					</div>
				</div>
			</div>
		</div>
	);
}
