"use client";

import { Suspense } from "react";
import ApplicationDetailsPage from "./page";

export default function ViewPageWrapper() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<ApplicationDetailsPage />
		</Suspense>
	);
}



