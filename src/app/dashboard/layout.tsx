"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	
	return (
		<div className="h-full bg-gray-50 flex flex-col">

			{/* Main Content with Sidebar */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className={`hidden md:flex border-r border-gray-200 bg-white p-4 transition-all duration-300 overflow-y-auto ${
					sidebarCollapsed ? "w-16" : "w-60"
				}`}>
					<div className="w-full">
						<Sidebar 
							collapsed={sidebarCollapsed} 
							setCollapsed={setSidebarCollapsed} 
						/>
					</div>
				</aside>

				{/* Main Section */}
				<main className="flex-1 p-6 overflow-y-auto transition-all duration-300">
					{children}
				</main>
			</div>
		</div>
	);
}
