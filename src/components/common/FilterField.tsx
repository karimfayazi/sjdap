import { ReactNode } from "react";
import { reportStyles } from "@/lib/ui/reportStyles";

interface FilterFieldProps {
	label: string;
	children: ReactNode;
	className?: string;
}

/**
 * Standard filter field wrapper with label and control
 * Matches the styling from /dashboard/rops/report
 */
export default function FilterField({ label, children, className = "" }: FilterFieldProps) {
	return (
		<div className={className}>
			<label className={reportStyles.filterLabel}>{label}</label>
			{children}
		</div>
	);
}
