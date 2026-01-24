import { ReactNode } from "react";
import { reportStyles } from "@/lib/ui/reportStyles";

interface FilterBarProps {
	children: ReactNode;
	columns?: 4 | 5;
	className?: string;
	withSpacing?: boolean;
}

/**
 * Standard filter bar container
 * Matches the styling from /dashboard/rops/report
 */
export default function FilterBar({ 
	children, 
	columns = 4, 
	className = "",
	withSpacing = false 
}: FilterBarProps) {
	const gridClass = columns === 5 ? reportStyles.filterGrid5 : reportStyles.filterGrid;
	const containerClass = withSpacing 
		? reportStyles.filterBarWithSpacing 
		: reportStyles.filterBar;
	
	return (
		<div className={`${containerClass} ${className}`}>
			<div className={gridClass}>
				{children}
			</div>
		</div>
	);
}
