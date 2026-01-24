import { ReactNode } from "react";
import { reportStyles } from "@/lib/ui/reportStyles";

interface DataCardTableProps {
	children: ReactNode;
	className?: string;
}

/**
 * Standard table container/card wrapper
 * Matches the styling from /dashboard/rops/report
 */
export default function DataCardTable({ children, className = "" }: DataCardTableProps) {
	return (
		<div className={`${reportStyles.tableCard} ${className}`}>
			<div className="overflow-x-auto">
				{children}
			</div>
		</div>
	);
}
