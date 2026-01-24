/**
 * Shared UI style constants extracted from /dashboard/rops/report
 * These ensure consistent styling across all filter sections and tables
 */

export const reportStyles = {
	// Filter Section
	filterBar: "bg-white rounded-lg border border-gray-200 shadow-sm p-6",
	filterBarWithSpacing: "bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4",
	filterGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
	filterGrid5: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4",
	
	// Filter Labels
	filterLabel: "block text-sm font-medium text-gray-700 mb-1",
	
	// Filter Controls (inputs, selects, date inputs)
	filterControl: "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent",
	
	// Filter Buttons
	filterButtonPrimary: "inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors",
	filterButtonSecondary: "inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors",
	
	// Table Container
	tableCard: "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden",
	
	// Table
	table: "min-w-full divide-y divide-gray-200",
	
	// Table Header
	tableHeader: "bg-gray-50",
	tableHeaderCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
	
	// Table Body
	tableBody: "bg-white divide-y divide-gray-200",
	tableRow: "hover:bg-gray-50",
	tableCell: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
	tableCellNoWrap: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900",
	
	// Pagination
	paginationContainer: "bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between",
	paginationText: "text-sm text-gray-700",
	paginationButton: "px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
} as const;
