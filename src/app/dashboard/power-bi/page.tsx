"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

export default function PowerBIPage() {
	const powerBIUrl = "http://data.sjdap.local/reports/powerbi/Silver%20Jubilee%20Development%20Agency%20Pakistan/FEAP/FEAP-DASHBOARDS";
	const [iframeLoaded, setIframeLoaded] = useState(false);
	const [showDirectLink, setShowDirectLink] = useState(false);

	useEffect(() => {
		// Check if iframe loaded after 5 seconds
		const timer = setTimeout(() => {
			if (!iframeLoaded) {
				setShowDirectLink(true);
			}
		}, 5000);

		return () => clearTimeout(timer);
	}, [iframeLoaded]);

	const handleIframeLoad = () => {
		setIframeLoaded(true);
		setShowDirectLink(false);
	};

	return (
		<div className="h-full flex flex-col -m-6">
			<div className="px-6 pt-6 pb-4 flex-shrink-0">
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Power BI Dashboard</h1>
						<p className="text-gray-600 mt-2">FEAP Dashboards - Silver Jubilee Development Agency</p>
					</div>
					<a
						href={powerBIUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors text-sm"
					>
						<ExternalLink className="h-4 w-4" />
						Open in New Tab
					</a>
				</div>
			</div>
			
			<div className="flex-1 overflow-hidden px-6 pb-6 relative">
				{!iframeLoaded && (
					<div className="absolute inset-0 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center z-10">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-4"></div>
							<p className="text-gray-600 mb-2">Loading Power BI Dashboard...</p>
							{showDirectLink && (
								<p className="text-sm text-gray-500 mt-4">
									If the dashboard doesn't load,{" "}
									<a
										href={powerBIUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-[#0b4d2b] hover:underline font-medium"
									>
										click here to open it directly
									</a>
								</p>
							)}
						</div>
					</div>
				)}
				
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full overflow-hidden">
					<iframe
						src={powerBIUrl}
						className="w-full h-full border-0"
						title="Power BI Dashboard"
						allowFullScreen
						onLoad={handleIframeLoad}
						style={{ display: iframeLoaded ? 'block' : 'none' }}
					/>
				</div>
			</div>
		</div>
	);
}

