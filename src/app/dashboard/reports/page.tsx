"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Calendar, Folder, Search, RotateCcw, Filter, Upload, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAccess } from "@/hooks/useAccess";

type ReportData = {
	ReportTitle: string;
	Description: string;
	FilePath: string;
	EventDate: string;
	MainCategory: string;
	SubCategory: string;
};

export default function ReportsPage() {
	// For demo purposes, using a hardcoded user ID. In real app, get from auth context
	const userId = "1"; // Replace with actual user ID from auth context
	const { canUpload, loading: accessLoading } = useAccess(userId);
	
	const [reports, setReports] = useState<ReportData[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedMainCategory, setSelectedMainCategory] = useState("");
	const [selectedSubCategory, setSelectedSubCategory] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [mainCategories, setMainCategories] = useState<string[]>([]);
	const [subCategories, setSubCategories] = useState<string[]>([]);

	useEffect(() => {
		fetchReports();
	}, []);

	const fetchReports = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedMainCategory) params.append('mainCategory', selectedMainCategory);
			if (selectedSubCategory) params.append('subCategory', selectedSubCategory);
			if (searchTerm) params.append('search', searchTerm);

			const response = await fetch(`/api/reports?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setReports(data.reports || []);
				
				// Extract unique categories for filters
				const uniqueMainCategories = [...new Set(data.reports.map((report: ReportData) => report.MainCategory).filter(Boolean))] as string[];
				const uniqueSubCategories = [...new Set(data.reports.map((report: ReportData) => report.SubCategory).filter(Boolean))] as string[];
				
				setMainCategories(uniqueMainCategories);
				setSubCategories(uniqueSubCategories);
			} else {
				setError(data.message || "Failed to fetch reports");
			}
		} catch (err) {
			setError("Error fetching reports");
			console.error("Error fetching reports:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		fetchReports();
	};

	const handleReset = () => {
		setSearchTerm("");
		setSelectedMainCategory("");
		setSelectedSubCategory("");
		fetchReports();
	};

	const handleDownload = (filePath: string, reportTitle: string) => {
		try {
			// Check if filePath already contains the full path or starts with ~/Uploads/Reports/
			let fullUrl;
			if (filePath.startsWith('~/Uploads/Reports/')) {
				// Remove the ~/Uploads/Reports/ prefix and construct the correct URL
				const fileName = filePath.replace('~/Uploads/Reports/', '');
				fullUrl = `https://rif-ii.org/${fileName}`;
			} else if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
				// Already a full URL
				fullUrl = filePath;
			} else if (filePath.startsWith('Uploads/Reports/')) {
				// Remove Uploads/Reports/ prefix and construct the correct URL
				const fileName = filePath.replace('Uploads/Reports/', '');
				fullUrl = `https://rif-ii.org/${fileName}`;
			} else {
				// Just a filename, construct the full URL
				fullUrl = `https://rif-ii.org/${filePath}`;
			}
			
			// Create a temporary link element to trigger download
			const link = document.createElement('a');
			link.href = fullUrl;
			link.download = reportTitle || 'report';
			link.target = '_blank';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Download failed:', error);
			alert('Download failed. Please try again.');
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	const getFileExtension = (filePath: string) => {
		return filePath.split('.').pop()?.toUpperCase() || 'FILE';
	};

	const getFileIcon = (filePath: string) => {
		const extension = getFileExtension(filePath).toLowerCase();
		if (['pdf'].includes(extension)) return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['ppt', 'pptx'].includes(extension)) return '📋';
		return '📄';
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Reports</h1>
					<p className="text-gray-600 mt-2">Browse and download available reports</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading reports...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Reports</h1>
					<p className="text-gray-600 mt-2">Browse and download available reports</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchReports}
						className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
		{/* Header */}
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Reports</h1>
				<p className="text-gray-600 mt-2">Browse and download available reports</p>
			</div>
			<div className="flex items-center space-x-3">
				{canUpload && (
					<Link
						href="/dashboard/reports/upload"
						className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						<Upload className="h-4 w-4 mr-2" />
						Upload Reports
					</Link>
				)}
				<button
					onClick={fetchReports}
					className="inline-flex items-center px-4 py-2 text-[#0b4d2b] bg-[#0b4d2b]/10 rounded-lg hover:bg-[#0b4d2b]/20 transition-colors"
				>
					<RefreshCw className="h-4 w-4 mr-2" />
					Refresh
				</button>
				<button className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors">
					<Download className="h-4 w-4 mr-2" />
					Export
				</button>
			</div>
		</div>

			{/* Search and Filters */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Search & Filter Reports</h3>
						<p className="text-sm text-gray-600">Find specific reports by title, description, or category</p>
					</div>
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<div className="h-2 w-2 bg-green-500 rounded-full"></div>
							<span className="text-xs text-gray-500 font-medium">Live Search</span>
						</div>
						<button
							onClick={handleReset}
							className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
						>
							<RotateCcw className="h-3 w-3 mr-1" />
							Reset
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
					{/* Search Input */}
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">Search Reports</label>
						<div className="relative">
							<input
								type="text"
								placeholder="Search by title or description..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#0b4d2b]/20 focus:border-[#0b4d2b] focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
								onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
							/>
						</div>
					</div>

					{/* Main Category Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
						<select
							value={selectedMainCategory}
							onChange={(e) => setSelectedMainCategory(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Categories</option>
							{mainCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>

					{/* Sub Category Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Sub Category</label>
						<select
							value={selectedSubCategory}
							onChange={(e) => setSelectedSubCategory(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Sub Categories</option>
							{subCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Search Button */}
				<div className="flex justify-end">
					<button
						onClick={handleSearch}
						className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm"
					>
						<Filter className="h-4 w-4 mr-2" />
						Apply Filters
					</button>
				</div>
			</div>

			{/* Reports Grid */}
			{reports.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
					<p className="text-gray-600">
						{searchTerm || selectedMainCategory || selectedSubCategory 
							? "Try adjusting your search criteria" 
							: "Reports will appear here once they are uploaded"
						}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{reports.map((report, index) => (
						<div
							key={index}
							className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group"
						>
							{/* File Icon and Type */}
							<div className="p-6 pb-4">
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center space-x-3">
										<div className="text-3xl">
											{getFileIcon(report.FilePath)}
										</div>
										<div>
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												{getFileExtension(report.FilePath)}
											</span>
										</div>
									</div>
								</div>

								{/* Report Title */}
								<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors line-clamp-2 mb-3">
									{report.ReportTitle}
								</h3>

								{/* Description */}
								<p className="text-sm text-gray-600 line-clamp-3 mb-4">
									{report.Description || "No description available"}
								</p>

								{/* Category Information */}
								<div className="space-y-2 text-sm text-gray-500 mb-4">
									{report.MainCategory && (
										<div className="flex items-center">
											<Folder className="h-4 w-4 mr-2" />
											<span className="line-clamp-1">{report.MainCategory}</span>
										</div>
									)}
									{report.SubCategory && (
										<div className="flex items-center">
											<Folder className="h-4 w-4 mr-2" />
											<span className="line-clamp-1">{report.SubCategory}</span>
										</div>
									)}
									{report.EventDate && (
										<div className="flex items-center">
											<Calendar className="h-4 w-4 mr-2" />
											<span>{formatDate(report.EventDate)}</span>
										</div>
									)}
								</div>
							</div>

							{/* Download Button */}
							<div className="px-6 py-4 bg-gray-50 rounded-b-lg">
								<button
									onClick={() => handleDownload(report.FilePath, report.ReportTitle)}
									className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors group-hover:shadow-md"
								>
									<Download className="h-4 w-4 mr-2" />
									View Report
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Results Count */}
			{reports.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {reports.length} report{reports.length !== 1 ? 's' : ''}
					{(searchTerm || selectedMainCategory || selectedSubCategory) && ' matching your criteria'}
				</div>
			)}
		</div>
	);
}