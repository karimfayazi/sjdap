import { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { reportStyles } from "@/lib/ui/reportStyles";

/**
 * Standard input/select control styling
 * Use this className for all filter inputs, selects, and date inputs
 */
export const filterControlClassName = reportStyles.filterControl;

/**
 * Standard input component with consistent styling
 */
export function FilterInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className={`${reportStyles.filterControl} ${props.className || ""}`}
		/>
	);
}

/**
 * Standard select component with consistent styling
 */
export function FilterSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			{...props}
			className={`${reportStyles.filterControl} ${props.className || ""}`}
		/>
	);
}
