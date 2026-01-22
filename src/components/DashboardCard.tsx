import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

type DashboardCardProps = {
	title: string;
	description: string;
	href: string;
	icon: LucideIcon;
	disabled?: boolean;
};

export default function DashboardCard({
	title,
	description,
	href,
	icon: Icon,
	disabled = false,
}: DashboardCardProps) {
	const cardContent = (
		<div
			className={`
				group relative bg-white rounded-lg border border-gray-200 shadow-sm p-4
				transition-all duration-200
				${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md hover:border-[#0b4d2b] hover:-translate-y-0.5 cursor-pointer"}
			`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3 flex-1 min-w-0">
					<div className="flex-shrink-0 mt-0.5">
						<div className="bg-[#0b4d2b]/10 p-2 rounded-lg group-hover:bg-[#0b4d2b]/20 transition-colors">
							<Icon className="h-5 w-5 text-[#0b4d2b]" />
						</div>
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors">
							{title}
						</h3>
						<p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
					</div>
				</div>
				{!disabled && (
					<div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<ArrowRight className="h-4 w-4 text-[#0b4d2b]" />
					</div>
				)}
			</div>
		</div>
	);

	if (disabled) {
		return cardContent;
	}

	return (
		<Link href={href} className="block">
			{cardContent}
		</Link>
	);
}
