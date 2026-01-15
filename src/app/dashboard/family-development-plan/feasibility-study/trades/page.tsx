"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";

type SubTradeOption = {
	mainCategory: string;
	subTrades: string;
	code: string;
};

const SUB_TRADE_OPTIONS: SubTradeOption[] = [
	{
		mainCategory: "EARLY CHILDHOOD DEVELOPMENT (ECD)",
		subTrades: "ECD DIPLOMA",
		code: "T-086"
	},
	{
		mainCategory: "ELECTRONIC HARWARE TRAINING",
		subTrades: "ELECTRICAL WIRING, INDUSTRIAL ELECTRICIAN, SOLAR SYSTEM TECHNICIAN, HOME APPLIANCE TECHNICIAN, MOBILE REPAIRING, ELECTRONIC REPAIR, AC/FRIDGE TECHNICIAN, GENERATOR MECHANIC, MOBILE REPAIR",
		code: "T-087"
	},
	{
		mainCategory: "MECHANICAL AND AUTOMOTIVE",
		subTrades: "AUTO MECHANIC, MOTORCYCLE MECHANIC, VEHICLE ELECTRICIAN, DIESEL ENGINE TECHNICIAN, HEAVY VEHICLE OPERATOR",
		code: "T-088"
	},
	{
		mainCategory: "CONSTRUCTION AND BUILDING TRADES",
		subTrades: "MASONRY, CARPENTRY, PLUMBING, WELDING, TILE FIXING, PAINTING, STEEL FIXING, INTERIOR FINISHING",
		code: "T-089"
	},
	{
		mainCategory: "HOTEL & RESTAURANT MANAGEMENT",
		subTrades: "WAITER/STEWARD, HOUSEKEEPING, FRONT OFFICE ASSISTANT, COOK/CHEF, TOUR GUIDE, BAKERY AND CONFECTIONERY, FOOD PRESERVATION, CATERING, PICKLE/JAM MAKING",
		code: "T-090"
	},
	{
		mainCategory: "INFORMATION TECHNOLOGY AND SOFTWARE DEVELOPMENT",
		subTrades: "COMPUTER OPERATOR, DATA ENTRY, GRAPHIC DESIGN, WEB DEVELOPMENT, NETWORKING, IT SUPPORT",
		code: "T-091"
	},
	{
		mainCategory: "HEALTH AND WELLNESS",
		subTrades: "NURSE ASSISTANT, HEALTH TECHNICIAN, PHYSIOTHERAPY ASSISTANT, COMMUNITY HEALTH WORKER",
		code: "T-092"
	},
	{
		mainCategory: "TEXTILE AND APPAREL",
		subTrades: "TAILORING, EMBROIDERY, HANDICRAFT, FASHION DESIGN, INDUSTRIAL SEWING MACHINE OPERATION",
		code: "T-093"
	},
	{
		mainCategory: "SECURITY AND SAFETY",
		subTrades: "SECURITY GUARD, FIRE SAFETY ASSISTANT, SAFETY COMPLIANCE OFFICER",
		code: "T-094"
	},
	{
		mainCategory: "HANDICRAFTS AND ARTISAN SKILLS",
		subTrades: "KNITTING, EMBROIDERY, CARPET WEAVING, WOODCRAFT, POTTERY, JEWELRY MAKING",
		code: "T-095"
	},
	{
		mainCategory: "BEAUTY AND PERSONAL CARE",
		subTrades: "BEAUTICIAN, BARBER, MAKEUP ARTIST, HAIR STYLIST, SPA THERAPIST",
		code: "T-096"
	},
	{
		mainCategory: "SMALL MANUFACTURING",
		subTrades: "BLOCK MAKING, FURNITURE CARPENTRY, WELDING FABRICATION, LEATHER GOODS",
		code: "T-097"
	},
	{
		mainCategory: "RETAIL AND TRADE",
		subTrades: "SHOP MANAGEMENT, POINT OF SALE OPERATION, CUSTOMER DEALING, MERCHANDISING",
		code: "T-098"
	},
	{
		mainCategory: "VOCATIONAL AND SKILL ENHANCEMENT",
		subTrades: "MAID/LAUNDRY/CLEANING, COOKING, LAUNDRY, PEST CONTROL, DOMESTIC HELP",
		code: "T-099"
	},
	{
		mainCategory: "LANGUAGE AND SOFTSKILLS TRAININGS",
		subTrades: "PRIVATE TUITION, DAYCARE CENTER, EARLY LEARNING SUPPORT",
		code: "T-100"
	}
];

function TradesContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						onClick={() => router.back()}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
					</button>
					<div>
						<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
							<Briefcase className="h-8 w-8 text-[#0b4d2b]" />
							Show Trades [After Feasibility Study]
						</h1>
						<p className="text-gray-600 mt-1">
							{formNumber && `Form: ${formNumber}`}
							{memberNo && ` | Member: ${memberName || memberNo}`}
							{memberNo && ` | Member ID: ${memberNo}`}
						</p>
					</div>
				</div>
			</div>

			{/* Trades Table */}
			<div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
				{/* Table Header */}
				<div className="bg-gradient-to-r from-[#0b4d2b] via-[#0d5d35] to-[#0b4d2b] px-6 py-4 border-b-2 border-[#0a3d22]">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						<Briefcase className="h-6 w-6" />
						Available Trades for Skills Development
					</h2>
					<p className="text-sm text-white/80 mt-1">Total Trades: {SUB_TRADE_OPTIONS.length}</p>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gradient-to-r from-gray-700 to-gray-800">
							<tr>
								<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
									Sr. No
								</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
									Trade Code
								</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-gray-600">
									Main Category
								</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
									Sub Trades / Categories of Business and Jobs
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{SUB_TRADE_OPTIONS.map((trade, index) => (
								<tr 
									key={trade.code} 
									className="hover:bg-gradient-to-r hover:from-[#0b4d2b]/5 hover:to-[#0b4d2b]/10 transition-colors"
								>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 border-r border-gray-200">
										{index + 1}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#0b4d2b] border-r border-gray-200">
										<div className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-gradient-to-br from-[#0b4d2b] to-[#0a3d22] text-white shadow-sm">
											{trade.code}
										</div>
									</td>
									<td className="px-6 py-4 text-sm font-semibold text-gray-800 border-r border-gray-200">
										{trade.mainCategory}
									</td>
									<td className="px-6 py-4 text-sm text-gray-700 leading-relaxed">
										<div className="flex flex-wrap gap-2">
											{trade.subTrades.split(',').map((subTrade, idx) => (
												<span
													key={idx}
													className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
												>
													{subTrade.trim()}
												</span>
											))}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Summary Card */}
			<div className="bg-gradient-to-r from-[#0b4d2b]/10 to-[#0b4d2b]/5 rounded-lg border-2 border-[#0b4d2b]/20 p-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
						<div className="text-sm font-medium text-gray-600">Total Trades</div>
						<div className="text-2xl font-bold text-[#0b4d2b] mt-1">{SUB_TRADE_OPTIONS.length}</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
						<div className="text-sm font-medium text-gray-600">Trade Categories</div>
						<div className="text-2xl font-bold text-[#0b4d2b] mt-1">{SUB_TRADE_OPTIONS.length}</div>
					</div>
					<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
						<div className="text-sm font-medium text-gray-600">Total Sub-Trades</div>
						<div className="text-2xl font-bold text-[#0b4d2b] mt-1">
							{SUB_TRADE_OPTIONS.reduce((sum, trade) => sum + trade.subTrades.split(',').length, 0)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function TradesPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<TradesContent />
		</Suspense>
	);
}
