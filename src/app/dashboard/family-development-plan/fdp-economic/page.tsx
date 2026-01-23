"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Eye, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type BusinessTrade = {
	mainTrade: string;
	subTrade: string;
	definition: string;
	code: string;
};

const BUSINESS_TRADES: BusinessTrade[] = [
	{ mainTrade: "AGRICULTURE", subTrade: "HORTICULTURE", definition: "ORCHARDS/NURSERIES/FLORI/VEGETABLES/ORGANICS/GREEN/MEDICINAL", code: "T-001" },
	{ mainTrade: "AGRICULTURE", subTrade: "AGRONOMY", definition: "CROP PRODUCTION/CEREALS, PULSES, OILSEEDS, FODDER", code: "T-002" },
	{ mainTrade: "AGRICULTURE", subTrade: "LIVESTOCK", definition: "DAIRY FARMING/POULTRY/SHEEP & GOAT/YAK/FISH FARMING/APICULTURE/MEAT PRODUCTION/FODDER PRODUCTION/VETERINARY SERVICES AND ANIMAL HEALTH", code: "T-003" },
	{ mainTrade: "AGRICULTURE", subTrade: "AGRI BUSINESS", definition: "FOOD PROCESSING/AGRI MARKETING/SUPPLY CHAIN MANAGEMENGT/AGRI BASED ENTERPRISES/CONSULTENCY SERVICE", code: "T-004" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "GENERAL AND GROCERY STORES", definition: "MINI MART, DAIRY SHOP, KIRYANA SHOP, FRESH FRUITS & VEGETABLES, MEAT & POULTRY SHOP, BAKERY & CONFECTIONERY, BEVERAGE SHOP", code: "T-005" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "STREET VENDING", definition: "HAWKERS/CARTS/KOSIK/MOVABLE SHOPS/MOBILE VENDORS", code: "T-006" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "ELECTRONIC AND APPLIANCES", definition: "TV & AUDIO SYSTEMS, REFRIGERATORS & FREEZERS, AIR CONDITIONERS, WASHING MACHINES, KITCHEN APPLIANCES, COMPUTER, MOBILE & LAPTOPS, CAMERAS & ACCESSORIES", code: "T-007" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "FASHION & APPERAL SHOP", definition: "MEN'S & WOMEN'S CLOTHING, KIDS WEAR, TRADITIONAL CLOTHING, TAILORING & STITCHING, ACCESSORIES (BELTS, CAPS, BAGS), TEXTILE & FABRIC, GARMENTS, COSMETICS & BEAUTY PRODUCTS", code: "T-008" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "HOME IMPROVEMENT AND HARDWARE", definition: "PAINT & HARDWARE, CONSTRUCTION MATERIALS, PLUMBING & SANITARY, ELECTRICAL ITEMS, LIGHTING SHOPS, TOOLS & EQUIPMENT, GARDENING TOOLS", code: "T-009" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "MECHENICAL ACESSORIES SHOP", definition: "AUTO PARTS, MOTORBIKE SPARE PARTS, TRACTOR/MACHINERY PARTS, BICYCLE SPARE PARTS, TYRE SHOPS, LUBRICANTS & OILS", code: "T-010" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "PHARMACY & MEDICAL STORE", definition: "GENERAL PHARMACY, HERBAL/UNANI MEDICINE, MEDICAL EQUIPMENT & SURGICAL ITEMS, BABY PRODUCTS & NUTRITION, HEALTH & WELLNESS PRODUCTS", code: "T-011" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "STATIONERY AND OFFICE SUPPLIES", definition: "SCHOOL STATIONERY, OFFICE STATIONERY, PRINTING & PHOTOCOPY SERVICES, BOOKS & NOVELS, MAGAZINES, ART SUPPLIES", code: "T-012" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "FURNITURE AND HOME DÉCOR SHOPS", definition: "WOODEN FURNITURE, PLASTIC/STEEL FURNITURE, UPHOLSTERY, CURTAINS & CARPETS, KITCHEN CABINETS, HOME DÉCOR ITEMS", code: "T-013" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "MOBILE PHONES & ACCESSORIES", definition: "MOBILE PHONES, MOBILE ACCESSORIES (CHARGERS, EARPHONES, COVERS), TABLETS & IPADS, REPAIRING SHOPS, SIM & RECHARGE SHOPS", code: "T-014" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "FOOTWEAR SHOPS", definition: "MEN'S FOOTWEAR, WOMEN'S FOOTWEAR, CHILDREN'S FOOTWEAR, SPORTS SHOES, TRADITIONAL FOOTWEAR", code: "T-015" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "SPORTS EQUIPMENT", definition: "CRICKET EQUIPMENT, FOOTBALL EQUIPMENT, BADMINTON/TENNIS RACKETS, GYM & FITNESS EQUIPMENT, OUTDOOR GAMES ITEMS", code: "T-016" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "TOYS SHOPS", definition: "EDUCATIONAL TOYS, BATTERY-OPERATED TOYS, DOLLS & ACTION FIGURES, OUTDOOR TOYS (BICYCLES, SWINGS), PUZZLE & BOARD GAMES", code: "T-017" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "GIFTS AND HANDICRAFTS SHOPS", definition: "SOUVENIRS, LOCAL HANDICRAFTS, DECORATIVE ITEMS, GIFT PACKS, CARDS & WRAPPING MATERIALS", code: "T-018" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "WHOLE SALE & DISTRIBUTION OUTLETS", definition: "FOOD WHOLESALE, CLOTHING WHOLESALE, ELECTRONICS WHOLESALE, MEDICAL WHOLESALE, AGRICULTURAL SUPPLIES WHOLESALE, GENERAL DISTRIBUTION AGENTS", code: "T-019" },
	{ mainTrade: "RETAIL AND TRADE", subTrade: "SECOND HAND SHOP", definition: "ALL KIND OF LEFTOVERS/SECOND HAND SHOPS", code: "T-020" },
	{ mainTrade: "FOOD & HOSPITALITY", subTrade: "HOME BASED FOOD BUSINESSES", definition: "BAKING/CATERING/CLOUD KITCHEN/FROZEN FOOD/HOMEMADE PICKLES & CHUTNEYS, DRY FRUIT PACKAGING, HOME-COOKED MEALS (LUNCH/DINNER), FROZEN SNACKS, BAKERY ITEMS (CAKES, COOKIES), TRADITIONAL SWEETS", code: "T-021" },
	{ mainTrade: "FOOD & HOSPITALITY", subTrade: "SMALL RESTAURANTS, REFRESHMENT CORNER & CAFES", definition: "FOOD CART/ TEA STALL/ ANY SORT OF FOOD STALLS/STREET FOOD VENDORS/DESI FOOD RESTAURANT, BBQ & GRILL, CHINESE FOOD CORNER, FAST FOOD CAFÉ, FAMILY-STYLE RESTAURANT", code: "T-022" },
	{ mainTrade: "FOOD & HOSPITALITY", subTrade: "FOOD KOSIK & STALLS", definition: "GOLGAPPA/CHAAT STALL, FRIES & SNACKS STALL, LOCAL BBQ STALL,PIZZA OUTLET, BURGER SHOP, FRIED CHICKEN OUTLET, SANDWICH SHOP, WRAPS & ROLLS OUTLET", code: "T-023" },
	{ mainTrade: "FOOD & HOSPITALITY", subTrade: "GUEST HOUSE/REST HOUSE", definition: "AIR BNB/FAMILY GUEST HOUSE, TOURIST REST HOUSE/RESORT", code: "T-024" },
	{ mainTrade: "SERVICES", subTrade: "TAILORING & ALTERATIONS", definition: "TRAILOR SHOP, PEKO SHOP", code: "T-025" },
	{ mainTrade: "SERVICES", subTrade: "GROOMING SERVICES", definition: "SALON, BARBER, BEAUTY PARLOR, SPA", code: "T-026" },
	{ mainTrade: "SERVICES", subTrade: "HOUSEHOLD MANTAINANCE SERVICES", definition: "ELECTRICIAN, PLUMBER, CARPENTER", code: "T-027" },
	{ mainTrade: "SERVICES", subTrade: "AUTOMECHENIC", definition: "MOTORBIKE, CAR, TRACTOR, SPARE PARTS FITTING", code: "T-028" },
	{ mainTrade: "SERVICES", subTrade: "HOUSEHOLD SERVICES", definition: "MAID/LAUNDRY/CLEANING, COOKING, LAUNDRY, PEST CONTROL, DOMESTIC HELP", code: "T-029" },
	{ mainTrade: "SERVICES", subTrade: "TUTOR & DAY CARE SERVICES", definition: "PRIVATE TUITION, DAYCARE CENTER, EARLY LEARNING SUPPORT", code: "T-030" },
	{ mainTrade: "SERVICES", subTrade: "CATERING & EVENT MANAGEMENT SERVICE", definition: "WEDDING CATERING, FESTIVAL CATERING, HOME-PARTY CATERING, WEDDING BANQUET FOOD, FESTIVAL FOOD STALLS, RELIGIOUS EVENT FOOD SERVICES, COMMUNITY FUNCTIONS CATERING, WEDDING PLANNER, STAGE DECORATION, CATERING COORDINATION, SOUND SYSTEM, PHOTOGRAPHY & VIDEOGRAPHY", code: "T-031" },
	{ mainTrade: "SERVICES", subTrade: "TRAVEL AND TOUR OPERATORS", definition: "", code: "T-032" },
	{ mainTrade: "SERVICES", subTrade: "HEALTH & FITNESS SERVICES", definition: "GYM, PHYSIOTHERAPY, YOGA, FITNESS TRAINER, SPORTS COACHING", code: "T-033" },
	{ mainTrade: "SERVICES", subTrade: "FINANCIAL SERVICES", definition: "MONEY EXCHANGE, BOOKKEEPING, SMALL ACCOUNTING SERVICES, MOBILE BANKING AGENTS, INSURANCE AGENTS", code: "T-034" },
	{ mainTrade: "SERVICES", subTrade: "ELECTRIC HARDWARE REPAIR AND MANTAINANCE", definition: "APPLIANCES REPAIR, ELECTRONICS REPAIR, TAILORING MACHINE REPAIR", code: "T-035" },
	{ mainTrade: "SERVICES", subTrade: "LOGISTICS & DELIVERY SERVICES", definition: "GOODS TRANSPORT, COURIER, FOOD DELIVERY, BIKE/CAR RENTALS", code: "T-036" },
	{ mainTrade: "SERVICES", subTrade: "EDUCATION & SKILL TRAINING CENTERS", definition: "COMPUTER TRAINING, VOCATIONAL TRAINING, LANGUAGE CENTERS", code: "T-037" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "HOME BASED MANUFACTRUING AND PRODUCTION", definition: "CANDLES/OIL/SOAP/SKINCARE/SMALL FURNITURE MAKING/ARTS & CRAFTS/EMBROIDRY/JEWELLERY MAKING/WOOD CARVING", code: "T-038" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "FOOD PROCESSING & PRESERVATION", definition: "JAM & JELLY MAKING, PICKLE PRODUCTION, DRIED FRUIT PACKAGING, SPICE GRINDING & PACKAGING, FLOUR MILLING, FROZEN FOODS", code: "T-039" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "HANDICRAFTS & TRADITIONAL PRODUCTS", definition: "WOOLEN PRODUCTS (SHAWLS, CAPS, SOCKS), WOOD CARVING, POTTERY, STONE CRAFTS, HANDWOVEN MATS & CARPETS", code: "T-040" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "TEXTILE & GARMENTS PRODUCTION", definition: "SCHOOL UNIFORMS, BOUTIQUE CLOTHING, TRADITIONAL DRESSES, BED SHEETS & PILLOW COVERS, WORKWEAR & PROTECTIVE CLOTHING", code: "T-041" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "FURNITURE & WOODWORKS", definition: "WOODEN CHAIRS & TABLES, CABINETS & CUPBOARDS, SOFA SETS, SCHOOL FURNITURE, DOORS & WINDOWS", code: "T-042" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "CONSTRUCTION MATERIALS PRODUCTION", definition: "BRICKS, BLOCKS, CONCRETE TILES, PAVING STONES, READY-MIX PLASTER", code: "T-043" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "LEATHER PRODUCTS MANUFACTURING", definition: "SHOES, SANDALS, BAGS, BELTS, WALLETS", code: "T-044" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "COSMETICS & HERBAL PRODUCTS", definition: "NATURAL SOAPS, HERBAL CREAMS, ORGANIC OILS, PERFUMES, HAIR OILS", code: "T-045" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "PAPER PRODUCTS & PRINTING PRESS SERVICE", definition: "NOTEBOOKS, REGISTERS, PAPER BAGS, PACKAGING CARTONS, WEDDING CARDS & FLYERS, BUSINESS CARDS, FLYERS & BROCHURES, POSTERS, FLEX PRINTING, SCHOOL NOTEBOOKS, WEDDING CARDS, CUSTOM PACKAGING", code: "T-046" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "RECYCLING & UPCYCLING PRODUCTION", definition: "RECYCLED PLASTIC ITEMS, UPCYCLED FURNITURE, REUSABLE SHOPPING BAGS, ECO-FRIENDLY CRAFTS", code: "T-047" },
	{ mainTrade: "MANUFACTURING & PRODUCTION", subTrade: "SMALL-SCALE INDUSTRIAL PRODUCTION", definition: "FLOUR MILLS, OIL EXTRACTION UNITS, SPICE MILLS, SMALL BEVERAGE PRODUCTION, PACKAGED WATER, HUSKER MACHINE", code: "T-048" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "E-COMMERCE", definition: "ONLINE CLOTHING STORE, HANDICRAFT SELLING, FOOD DELIVERY PLATFORM, SECOND-HAND MARKETPLACE, ELECTRONICS & MOBILE ACCESSORIES, ONLINE GROCERY DELIVERY", code: "T-049" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "DIGITAL MEDIA, IT & SOFTWARE SERVICES", definition: "MOBILE APP DEVELOPMENT, WEBSITE DESIGN, SOFTWARE SOLUTIONS, IT CONSULTING, CLOUD SERVICES, CYBERSECURITY SERVICES, YOUTUBE CHANNEL, VLOGGING, PODCAST PRODUCTION, E-BOOKS & SELF-PUBLISHING, ONLINE TRAINING VIDEOS, SOCIAL MEDIA MANAGEMENT, PAID ADS CAMPAIGNS (FACEBOOK, GOOGLE), INFLUENCER MARKETING, EMAIL MARKETING, BRAND PROMOTION, VIDEO MARKETING, GRAPHIC DESIGN, CONTENT WRITING, TRANSLATION, WEB DEVELOPMENT, DATA ENTRY, VIRTUAL ASSISTANCE, SEO SERVICES", code: "T-050" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "MOBILE & COMPUTER REPAIR SERVICES", definition: "SMARTPHONE REPAIR, LAPTOP/PC REPAIR, PRINTER & SCANNER REPAIR, NETWORK INSTALLATION, DATA RECOVERY SERVICES", code: "T-051" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "ONLINE EDUCATION & E-LEARNING SERVICES", definition: "LANGUAGE LEARNING APPS, ONLINE TUITION PLATFORMS, SKILLS TRAINING (IT, ACCOUNTING, DESIGN), DIGITAL LIBRARIES", code: "T-052" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "TECH-BASED FINANCIAL SERVICES (FINTECH)", definition: "MOBILE WALLET AGENT, ONLINE BILL PAYMENT SERVICE, POS (POINT OF SALE) SERVICES, MICRO-LENDING APPS", code: "T-053" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "TECH-ENABLED LOGISTICS, RIDE-HAILING & DELIVERY SERVICES", definition: "FOOD DELIVERY APPS, COURIER & PARCEL SERVICE, GROCERY DELIVERY, BIKE RIDE-HAILING, CAR RIDE-HAILING, AUTO-RICKSHAW RIDE-HAILING, SHARED CARPOOLING SERVICES", code: "T-054" },
	{ mainTrade: "TECHNOLOGY ENABLED SERVICES & PRODUCTS", subTrade: "GAMING & ANIMATION", definition: "GAME DEVELOPMENT (MOBILE/PC), 3D ANIMATION, MOTION GRAPHICS, AR/VR EXPERIENCES", code: "T-055" },
	{ mainTrade: "TRANSPORT & LOGISTICS", subTrade: "PASSENGER TRANSPORTATION", definition: "TAXI SERVICE, VAN/HIACE SERVICE, BUS SERVICE, RICKSHAW TRANSPORT, SCHOOL VAN SERVICE, AMBULANCE SERVICE", code: "T-056" },
	{ mainTrade: "TRANSPORT & LOGISTICS", subTrade: "VEHICLE RENTAL SERVICES", definition: "CAR RENTAL, JEEP RENTAL FOR TOURISM, BIKE RENTAL, WEDDING CAR RENTAL, CONSTRUCTION MACHINERY RENTAL (TRACTOR, LOADER), TOUR BUSES, COASTERS FOR GROUPS, JEEP SAFARI SERVICE, TREKKING EXPEDITION LOGISTICS, HOTEL SHUTTLE TRANSPORT", code: "T-057" },
	{ mainTrade: "TRANSPORT & LOGISTICS", subTrade: "FREIGHT & CARGO SERVICES", definition: "REGIONAL TRUCKING, CONTAINER TRANSPORT, BULK MATERIAL TRANSPORT, CROSS-BORDER GOODS SERVICE. PICKUP VAN DELIVERY, TRUCK TRANSPORT, COLD STORAGE TRANSPORT, AGRICULTURAL GOODS TRANSPORT, FUEL/WOOD/COAL DELIVERY, THREE WHEEL LOADER, LOCAL DOCUMENT COURIER, PARCEL DELIVERY, CASH-ON-DELIVERY (COD) SERVICE, E-COMMERCE DELIVERY, SAME-DAY COURIER", code: "T-058" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "DAILY WAGE LABOURS/MASIONARY", definition: "GENERAL LABOUR, MASON, HELPER, STONE CUTTING WORKER, CONCRETE MIXING WORKER", code: "T-059" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "SKILLED LABOUR", definition: "ELECTRICIAN, PLUMBER, CARPENTER, STEEL FIXER, PAINTER, TILE/MARBLE FIXER, WELDER, POP/FALSE CEILING WORKER, PAINTING & POLISHING, ROOFING REPAIR, FLOORING & TILING, PLUMBING REPAIR, WOOD & FURNITURE REPAIR", code: "T-060" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "SMALL CONTRACTORS", definition: "HOUSE CONSTRUCTION CONTRACTOR, ROAD & PAVEMENT CONTRACTOR, RENOVATION CONTRACTOR, PLUMBING & ELECTRICAL WORKS CONTRACTOR", code: "T-061" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "BUILDING MATERIAL SUPPLIERS", definition: "CEMENT SHOP, SAND & GRAVEL SUPPLIER, BRICKS & BLOCKS SUPPLIER, STEEL & IRON RODS SHOP, PAINT & HARDWARE SUPPLIER", code: "T-062" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "MACHINERY & EQUIPMENT RENTAL SERVICES", definition: "TRACTOR TROLLEY, MIXER MACHINE RENTAL, SCAFFOLDING RENTAL, CRANE/LIFTER RENTAL, GENERATOR RENTAL", code: "T-063" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "ARCHITECTURAL & DRAFTING SERVICES", definition: "HOUSE MAPS DESIGNING, COST ESTIMATION, AUTOCAD DRAWING, STRUCTURAL DESIGN SUPPORT", code: "T-064" },
	{ mainTrade: "BUILDING & CONSTRUCTION", subTrade: "INTERIOR & EXTERIOR FINISHING SERVICES", definition: "FALSE CEILING, GLASS & ALUMINUM WORKS, LANDSCAPING & GARDENING, INTERIOR DECORATION, LIGHTING INSTALLATION", code: "T-065" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "NUTRITION & DIETARY SERVICES", definition: "NUTRITIONIST CONSULTATIONS, WEIGHT LOSS/GAIN PROGRAMS, MEAL PLANNING, DIET SUPPLEMENTS SHOP, ORGANIC FOOD ADVISORY", code: "T-066" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "FITNESS CENTERS & SPORTS TRAINING", definition: "GYM & BODYBUILDING CENTER, AEROBICS & ZUMBA CLASSES, YOGA & MEDITATION CENTER, MARTIAL ARTS TRAINING, PERSONAL FITNESS TRAINER", code: "T-067" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "SMALL CLINICS", definition: "GENERAL PRACTITIONER CLINIC, DENTAL CLINIC, EYE CLINIC, CHILD CARE CLINIC, WOMEN'S HEALTH CLINIC", code: "T-068" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "MEDICAL STORES / ALTERNATIVE & TRADITIONAL MEDICINE", definition: "COMMUNITY PHARMACY, HERBAL MEDICINE SHOP, OVER-THE-COUNTER MEDICINES, MEDICAL SUPPLIES STORE, HERBAL THERAPY, HOMEOPATHY CLINIC, UNANI/TIBB CLINIC, ACUPUNCTURE, SPIRITUAL HEALING CENTER,HERBAL TEAS, ORGANIC SUPPLEMENTS, NATURAL SKINCARE, ESSENTIAL OILS, FITNESS ACCESSORIES", code: "T-069" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "MENTAL HEALTH & COUNSELING SERVICES", definition: "INDIVIDUAL THERAPY, FAMILY & MARRIAGE COUNSELING, STRESS MANAGEMENT PROGRAMS, ADDICTION COUNSELING", code: "T-070" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "HOME-BASED HEALTH SERVICES", definition: "HOME NURSING, ELDERLY CARE SERVICE, MIDWIFERY & MATERNAL CARE, CHILDCARE HEALTH SUPPORT", code: "T-071" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "REHABILITATION & PHYSIOTHERAPY CENTERS", definition: "PHYSIOTHERAPY CLINIC, SPORTS INJURY REHABILITATION, POST-SURGERY RECOVERY, CHIROPRACTIC SERVICES", code: "T-072" },
	{ mainTrade: "HEALTH & WELLNESS", subTrade: "DIAGNOSTICS & LABORATORY SERVICES", definition: "PATHOLOGY LAB, X-RAY SERVICE, ULTRASOUND CLINIC, BLOOD TESTING LAB", code: "T-073" },
];

type FDPEconomicFormData = {
	// Family-Level Information (read-only)
	FormNumber: string;
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	FamilyPerCapitaIncome: number;
	SelfSufficiencyIncomePerCapita: number;
	BaselineIncomePerCapitaAsPercentOfSelfSufficiency: number;
	BaselinePovertyLevel: string;
	
	// Intervention Information
	BeneficiaryID: string;
	BeneficiaryName: string;
	BeneficiaryAge: number;
	BeneficiaryGender: string;
	BeneficiaryCurrentOccupation: string;
	InterventionType: string;
	SubFieldOfInvestment: string;
	Trade: string;
	MainTrade: string;
	SubTradeCode: string;
	SkillsDevelopmentCourse: string;
	Institution: string;
	
	// Financial Information
	InvestmentRequiredTotal: number;
	ContributionFromBeneficiary: number;
	InvestmentFromPEProgram: number;
	GrantAmount: number;
	LoanAmount: number;
	InvestmentValidationStatus: number; // 1 = Valid, 0 = Invalid
	PlannedMonthlyIncome: number | null;
	CurrentMonthlyIncome: number;
	IncrementalMonthlyIncome: number;
	FeasibilityID: string;
	
	// Approval
	ApprovalStatus: string;
	ApprovalRemarks: string;
};

type FamilyMember = {
	BeneficiaryID: string;
	FullName: string;
	Gender: string;
	DOBMonth: string | null;
	DOBYear: string | null;
	Occupation: string | null;
	MonthlyIncome: number | null;
};

type BaselineData = {
	BaselineFamilyIncome: number;
	FamilyMembersCount: number;
	SelfSufficiencyIncomePerCapita: number;
	Area_Type: string;
};

type FeasibilityData = {
	FDP_ID: number;
	FamilyID?: string;
	MemberID?: string;
	MemberName?: string;
	PlanCategory: string;
	TotalInvestmentRequired: number;
	CostPerParticipant: number;
	InvestmentFromPEProgram: number;
	TotalSalesRevenue: number;
	CurrentBaselineIncome: number;
	FeasibilityType: string;
	ApprovalStatus: string;
	InvestmentRationale?: string;
	MarketBusinessAnalysis?: string;
	TotalDirectCosts?: number;
	TotalIndirectCosts?: number;
	NetProfitLoss?: number;
	PrimaryIndustry?: string;
	SubField?: string;
	Trade?: string;
	CourseTitle?: string;
	TrainingInstitution?: string;
};

function FDPEconomicContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formNumber = searchParams.get("formNumber");
	const memberNo = searchParams.get("memberNo");
	const memberName = searchParams.get("memberName");
	const fdpEconomicId = searchParams.get("fdpEconomicId"); // For edit mode

	const isEditMode = !!fdpEconomicId;

	const { userProfile } = useAuth();
	const [formData, setFormData] = useState<FDPEconomicFormData>({
		FormNumber: formNumber || "",
		BaselineFamilyIncome: 0,
		FamilyMembersCount: 0,
		FamilyPerCapitaIncome: 0,
		SelfSufficiencyIncomePerCapita: 0,
		BaselineIncomePerCapitaAsPercentOfSelfSufficiency: 0,
		BaselinePovertyLevel: "",
		BeneficiaryID: memberNo || "",
		BeneficiaryName: memberName || "",
		BeneficiaryAge: 0,
		BeneficiaryGender: "",
		BeneficiaryCurrentOccupation: "",
		InterventionType: "",
		SubFieldOfInvestment: "",
		Trade: "",
		MainTrade: "",
		SubTradeCode: "",
		SkillsDevelopmentCourse: "",
		Institution: "",
		InvestmentRequiredTotal: 0,
		ContributionFromBeneficiary: 0,
		InvestmentFromPEProgram: 0,
		GrantAmount: 0,
		LoanAmount: 0,
		InvestmentValidationStatus: 0, // 0 = Invalid, 1 = Valid
		PlannedMonthlyIncome: null,
		CurrentMonthlyIncome: 0,
		IncrementalMonthlyIncome: 0,
		FeasibilityID: "",
		ApprovalStatus: "Pending",
		ApprovalRemarks: "",
	});

	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
	const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
	const [feasibilityStudies, setFeasibilityStudies] = useState<FeasibilityData[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [fdpEconomicRecords, setFdpEconomicRecords] = useState<any[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
	const [totalMemberPEInvestment, setTotalMemberPEInvestment] = useState<number>(0);
	const [memberFeasibilityLimit, setMemberFeasibilityLimit] = useState<number | null>(null);
	const [selectedFeasibilityId, setSelectedFeasibilityId] = useState<string>("");
	const [approvedFeasibilityStudies, setApprovedFeasibilityStudies] = useState<FeasibilityData[]>([]);
	const [maxEconomicSupportAmount, setMaxEconomicSupportAmount] = useState<number>(500000); // Fixed at PKR 500,000
	const [alreadyDefinedEconomicSupport, setAlreadyDefinedEconomicSupport] = useState<number>(0);
	const [availableEconomicSupport, setAvailableEconomicSupport] = useState<number>(0);
	const [showViewModal, setShowViewModal] = useState(false);
	const [viewRecord, setViewRecord] = useState<any | null>(null);
	const [familyInfo, setFamilyInfo] = useState<any | null>(null);

	// Calculate age from DOB
	const calculateAge = (dobMonth: string | null, dobYear: string | null): number => {
		if (!dobMonth || !dobYear) return 0;
		
		const monthMap: { [key: string]: number } = {
			"Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
			"Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
		};
		
		const month = monthMap[dobMonth];
		const year = parseInt(dobYear);
		
		if (isNaN(year) || month === undefined) return 0;
		
		const today = new Date();
		const birthDate = new Date(year, month, 1);
		
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		
		return age;
	};

	// Calculate poverty level based on Baseline Income Per Capita as % of Self-Sufficiency
	const calculatePovertyLevel = (selfSufficiencyPercent: number): string => {
		// Less than 25% → Level -4
		if (selfSufficiencyPercent < 25) {
			return "Level -4";
		}
		// 25% to less than 50% → Level -3
		if (selfSufficiencyPercent >= 25 && selfSufficiencyPercent < 50) {
			return "Level -3";
		}
		// 50% to less than 75% → Level -2
		if (selfSufficiencyPercent >= 50 && selfSufficiencyPercent < 75) {
			return "Level -2";
		}
		// 75% to less than 100% → Level -1
		if (selfSufficiencyPercent >= 75 && selfSufficiencyPercent < 100) {
			return "Level -1";
		}
		// 100% to 124% → Level 0
		if (selfSufficiencyPercent >= 100 && selfSufficiencyPercent <= 124) {
			return "Level 0";
		}
		// 125% and above → Level +1
		if (selfSufficiencyPercent >= 125) {
			return "Level +1";
		}
		
		// Default fallback
		return "Level -4";
	};

	// Fetch baseline data, family members, and feasibility studies
	useEffect(() => {
		if (!formNumber) {
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				
				// Fetch baseline data
				const baselineResponse = await fetch(`/api/family-development-plan/baseline-data?formNumber=${encodeURIComponent(formNumber)}`);
				const baselineResult = await baselineResponse.json();
				
				if (baselineResult.success && baselineResult.data) {
					const data = baselineResult.data;
					setBaselineData(data);
					
					// Use the calculated values from the API (which now matches baseline-qol/view calculation)
					const perCapitaIncome = data.FamilyPerCapitaIncome || 0;
					const selfSufficiencyPercent = data.BaselineIncomePerCapitaAsPercentOfSelfSufficiency || 0;
					
					// Calculate poverty level based on Baseline Income Per Capita as % of Self-Sufficiency
					const povertyLevel = calculatePovertyLevel(selfSufficiencyPercent);
					
					setFormData(prev => ({
						...prev,
						BaselineFamilyIncome: data.BaselineFamilyIncome, // Total Family Baseline Income
						FamilyMembersCount: data.FamilyMembersCount,
						FamilyPerCapitaIncome: perCapitaIncome,
						SelfSufficiencyIncomePerCapita: data.SelfSufficiencyIncomePerCapita,
						BaselineIncomePerCapitaAsPercentOfSelfSufficiency: selfSufficiencyPercent,
						BaselinePovertyLevel: povertyLevel,
					}));
				}

				// Fetch family members
				const membersResponse = await fetch(`/api/family-development-plan/members?formNumber=${encodeURIComponent(formNumber)}`);
				const membersData = await membersResponse.json();
				
				if (membersData.success && membersData.data) {
					setFamilyMembers(membersData.data);
					
					// Auto-select the member if memberNo is provided
					if (memberNo) {
						const selectedMember = membersData.data.find((m: FamilyMember) => m.BeneficiaryID === memberNo);
						if (selectedMember) {
							const age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
							setFormData(prev => ({
								...prev,
								BeneficiaryID: selectedMember.BeneficiaryID,
								BeneficiaryName: selectedMember.FullName,
								BeneficiaryAge: age,
								BeneficiaryGender: selectedMember.Gender || "",
								BeneficiaryCurrentOccupation: selectedMember.Occupation || "",
								CurrentMonthlyIncome: selectedMember.MonthlyIncome || 0,
							}));
						}
					}
				}

				// Fetch feasibility studies for this family/member
				if (memberNo) {
					const feasibilityResponse = await fetch(`/api/family-development-plan/feasibility?familyID=${encodeURIComponent(formNumber)}&memberID=${encodeURIComponent(memberNo)}`);
					const feasibilityData = await feasibilityResponse.json();
					
					if (feasibilityData.success && feasibilityData.data) {
						const studies = Array.isArray(feasibilityData.data) ? feasibilityData.data : [feasibilityData.data];
						// Include both ECONOMIC and SKILLS feasibility studies
						const allStudies = studies.filter((s: any) => s && (s.PlanCategory === "ECONOMIC" || s.PlanCategory === "SKILLS"));
						setFeasibilityStudies(allStudies);
						
						// Filter only approved feasibility studies for the dropdown
						const approvedStudies = allStudies.filter((s: any) => s && s.ApprovalStatus === "Approved");
						setApprovedFeasibilityStudies(approvedStudies);
						
						// Calculate total Investment from PE Program from all ECONOMIC feasibility studies for this member
						const economicStudies = studies.filter((s: any) => s && s.PlanCategory === "ECONOMIC");
						const totalFeasibilityInvestment = economicStudies.reduce((sum: number, study: any) => {
							const investment = parseFloat(study.InvestmentFromPEProgram) || 0;
							return sum + investment;
						}, 0);
						setMemberFeasibilityLimit(totalFeasibilityInvestment > 0 ? Math.round(totalFeasibilityInvestment) : null);
					}
				}

				// Load all existing FDP Economic records for this family/member
				if (formNumber) {
					const fdpResponse = await fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}${memberNo ? `&beneficiaryID=${encodeURIComponent(memberNo)}` : ""}`);
					const fdpData = await fdpResponse.json();
					
					if (fdpData.success && fdpData.data) {
						const records = Array.isArray(fdpData.data) ? fdpData.data : [fdpData.data];
						setFdpEconomicRecords(records);
						
						// Calculate total PE Investment for this member (excluding current record if editing)
						if (memberNo) {
							const totalPEInvestment = records.reduce((sum: number, record: any) => {
								const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setTotalMemberPEInvestment(Math.round(totalPEInvestment));
						}
						
						// If in edit mode with fdpEconomicId, load that specific record
						if (isEditMode && fdpEconomicId) {
							const existing = records.find((r: any) => r.FDP_EconomicID?.toString() === fdpEconomicId) || records[0];
							if (existing) {
								setSelectedRecordId(existing.FDP_EconomicID);
								setFormData(prev => ({
									...prev,
									BeneficiaryID: existing.BeneficiaryID || prev.BeneficiaryID,
									BeneficiaryName: existing.BeneficiaryName || prev.BeneficiaryName,
									BeneficiaryAge: existing.BeneficiaryAge || prev.BeneficiaryAge,
									BeneficiaryGender: existing.BeneficiaryGender || prev.BeneficiaryGender,
								BeneficiaryCurrentOccupation: existing.BeneficiaryCurrentOccupation || prev.BeneficiaryCurrentOccupation,
								InterventionType: existing.InterventionType || "",
								SubFieldOfInvestment: existing.SubFieldOfInvestment || "",
								Trade: existing.Trade || "",
								MainTrade: existing.FieldOfInvestment || existing.MainTrade || "", // Map FieldOfInvestment to MainTrade
								SubTradeCode: existing.SubTradeCode || "",
									SkillsDevelopmentCourse: existing.SkillsDevelopmentCourse || "",
									Institution: existing.Institution || "",
									InvestmentRequiredTotal: Math.round(existing.InvestmentRequiredTotal || 0),
									ContributionFromBeneficiary: Math.round(existing.ContributionFromBeneficiary || 0),
									InvestmentFromPEProgram: Math.round(existing.InvestmentFromPEProgram || 0),
									GrantAmount: Math.round(existing.GrantAmount || 0),
									LoanAmount: Math.round(existing.LoanAmount || 0),
									InvestmentValidationStatus: existing.InvestmentValidationStatus !== undefined ? existing.InvestmentValidationStatus : 0,
									PlannedMonthlyIncome: existing.PlannedMonthlyIncome !== null && existing.PlannedMonthlyIncome !== undefined ? Math.round(existing.PlannedMonthlyIncome) : null,
									CurrentMonthlyIncome: Math.round(existing.CurrentMonthlyIncome || 0),
									IncrementalMonthlyIncome: Math.round(existing.IncrementalMonthlyIncome || 0),
									FeasibilityID: existing.FeasibilityID?.toString() || "",
									ApprovalStatus: "Pending", // Always set to Pending as it's read-only
									ApprovalRemarks: existing.ApprovalRemarks || "",
								}));
								setShowForm(true);
							}
						} else {
							// If there are records, show gridview by default
							if (records.length > 0) {
								setShowForm(false);
							} else {
								setShowForm(true);
							}
						}
					} else {
						setShowForm(true);
					}
				}
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load data. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [formNumber, memberNo, isEditMode, fdpEconomicId]);

	// Calculate total economic support already defined for the family
	const totalDefinedEconomicSupport = useMemo(() => {
		if (!formNumber) return 0;

		// Sum all InvestmentFromPEProgram from all economic records for this family
		// Exclude current record if editing
		return fdpEconomicRecords.reduce((sum: number, record: any) => {
			if (isEditMode && selectedRecordId !== null && record.FDP_EconomicID === selectedRecordId) {
				return sum;
			}
			const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
			return sum + investment;
		}, 0);
	}, [formNumber, fdpEconomicRecords, isEditMode, selectedRecordId]);

	useEffect(() => {
		if (!formNumber) return;

		const alreadyDefined = totalDefinedEconomicSupport;
		// Available = Max - Already Defined (not including current form's value)
		const available = Math.max(0, maxEconomicSupportAmount - alreadyDefined);

		setAlreadyDefinedEconomicSupport(alreadyDefined);
		setAvailableEconomicSupport(available);
	}, [formNumber, totalDefinedEconomicSupport, maxEconomicSupportAmount]);

	// Set selected feasibility when approved studies are loaded and we have a FeasibilityID
	useEffect(() => {
		if (formData.FeasibilityID && approvedFeasibilityStudies.length > 0) {
			const feasibilityIdStr = formData.FeasibilityID.toString();
			const isApproved = approvedFeasibilityStudies.some(f => f.FDP_ID.toString() === feasibilityIdStr);
			if (isApproved && selectedFeasibilityId !== feasibilityIdStr) {
				setSelectedFeasibilityId(feasibilityIdStr);
				// Also update InterventionType if not already set
				const selectedFeasibility = approvedFeasibilityStudies.find(f => f.FDP_ID.toString() === feasibilityIdStr);
				if (selectedFeasibility && !formData.InterventionType) {
					// Use FeasibilityType directly for Economic plans
					let interventionType = selectedFeasibility.FeasibilityType || "";
					// For Skills, use Employment
					if (selectedFeasibility.PlanCategory === "SKILLS") {
						interventionType = "Employment";
					}
					if (interventionType) {
						setFormData(prev => ({ ...prev, InterventionType: interventionType }));
					}
				}
			}
		}
	}, [approvedFeasibilityStudies, formData.FeasibilityID]);

	// Auto-calculate fields
	useEffect(() => {
		// Calculate Investment From PE Program (rounded)
		const peInvestment = formData.InvestmentRequiredTotal - formData.ContributionFromBeneficiary;
		setFormData(prev => ({ ...prev, InvestmentFromPEProgram: Math.round(Math.max(0, peInvestment)) }));
		
		// Validate Grants + Loan = Investment Required from PE Program
		const grantLoanTotal = formData.GrantAmount + formData.LoanAmount;
		const peInvestmentRequired = Math.max(0, peInvestment);
		
		// Check if Grants exceeds Investment Required from PE Program
		if (formData.GrantAmount > peInvestmentRequired) {
			setValidationErrors(prev => ({
				...prev,
				grantLoanValidation: `Grants (${Math.round(formData.GrantAmount).toLocaleString()}) cannot exceed Investment Required from PE Program (${Math.round(peInvestmentRequired).toLocaleString()})`
			}));
		}
		// Check if Loan exceeds Investment Required from PE Program
		else if (formData.LoanAmount > peInvestmentRequired) {
			setValidationErrors(prev => ({
				...prev,
				grantLoanValidation: `Loan (${Math.round(formData.LoanAmount).toLocaleString()}) cannot exceed Investment Required from PE Program (${Math.round(peInvestmentRequired).toLocaleString()})`
			}));
		}
		// Check if Grants + Loan equals Investment Required from PE Program
		else if (Math.abs(Math.round(grantLoanTotal) - Math.round(peInvestmentRequired)) > 0) {
			setValidationErrors(prev => ({
				...prev,
				grantLoanValidation: `Grants (${Math.round(formData.GrantAmount).toLocaleString()}) + Loan (${Math.round(formData.LoanAmount).toLocaleString()}) = ${Math.round(grantLoanTotal).toLocaleString()} must equal Investment Required from PE Program (${Math.round(peInvestmentRequired).toLocaleString()})`
			}));
		} else {
			setValidationErrors(prev => {
				const { grantLoanValidation, ...rest } = prev;
				return rest;
			});
		}
		
		// Validate against feasibility study InvestmentFromPEProgram
		if (formData.FeasibilityID) {
			const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID);
			if (selectedFeasibility && selectedFeasibility.InvestmentFromPEProgram !== null && selectedFeasibility.InvestmentFromPEProgram !== undefined) {
				const calculatedPEInvestment = Math.round(Math.max(0, peInvestment));
				if (calculatedPEInvestment > Math.round(selectedFeasibility.InvestmentFromPEProgram)) {
					setValidationErrors(prev => ({
						...prev,
						feasibilityInvestment: `Investment Required from PE Program (${calculatedPEInvestment.toLocaleString()}) cannot exceed Investment from PE Program in Feasibility Study (${Math.round(selectedFeasibility.InvestmentFromPEProgram).toLocaleString()})`
					}));
				} else {
					setValidationErrors(prev => {
						const { feasibilityInvestment, ...rest } = prev;
						return rest;
					});
				}
			}
		}
		
		// Validate total member-level PE Investment doesn't exceed feasibility limit
		if (memberFeasibilityLimit !== null && memberFeasibilityLimit !== undefined) {
			const calculatedPEInvestment = Math.round(Math.max(0, peInvestment));
			// If editing, subtract the current record's investment from total
			const currentRecordInvestment = isEditMode && selectedRecordId
				? Math.round(fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0)
				: 0;
			const adjustedTotal = Math.round(totalMemberPEInvestment - currentRecordInvestment + calculatedPEInvestment);
			
			if (adjustedTotal > memberFeasibilityLimit) {
				setValidationErrors(prev => ({
					...prev,
					memberLevelInvestment: `Total PE Investment for this member (${adjustedTotal.toLocaleString()}) cannot exceed the total Investment from PE Program defined in Feasibility Studies (${Math.round(memberFeasibilityLimit).toLocaleString()}). Current total: ${Math.round(totalMemberPEInvestment - currentRecordInvestment).toLocaleString()}, Adding: ${calculatedPEInvestment.toLocaleString()}`
				}));
			} else {
				setValidationErrors(prev => {
					const { memberLevelInvestment, ...rest } = prev;
					return rest;
				});
			}
		}
	}, [formData.InvestmentRequiredTotal, formData.ContributionFromBeneficiary, formData.FeasibilityID, feasibilityStudies, memberFeasibilityLimit, totalMemberPEInvestment, isEditMode, selectedRecordId, fdpEconomicRecords]);

	useEffect(() => {
		// Calculate Incremental Monthly Income (rounded)
		const plannedIncome = formData.PlannedMonthlyIncome ?? 0;
		const incremental = plannedIncome - formData.CurrentMonthlyIncome;
		const roundedIncremental = Math.round(Math.max(0, incremental));
		setFormData(prev => ({ ...prev, IncrementalMonthlyIncome: roundedIncremental }));
	}, [formData.PlannedMonthlyIncome, formData.CurrentMonthlyIncome]);

	// Business Rule: If loan < 50,000, convert to grant (applied on blur, not while typing)
	const handleLoanBlur = () => {
		if (formData.LoanAmount > 0 && formData.LoanAmount < 50000) {
			setFormData(prev => ({
				...prev,
				GrantAmount: Math.round(prev.GrantAmount + prev.LoanAmount),
				LoanAmount: 0,
			}));
		}
	};

	// Validate investment: Grant + Loan = PE Investment
	const validateInvestment = (): boolean => {
		const total = Math.round(formData.GrantAmount + formData.LoanAmount);
		const peInvestment = Math.round(formData.InvestmentFromPEProgram);
		
		if (Math.abs(total - peInvestment) > 0) { // No tolerance needed since values are rounded
			setValidationErrors(prev => ({
				...prev,
				investment: `Grant (${Math.round(formData.GrantAmount).toLocaleString()}) + Loan (${Math.round(formData.LoanAmount).toLocaleString()}) = ${total.toLocaleString()} must equal PE Program Investment (${peInvestment.toLocaleString()})`
			}));
			return false;
		}
		
		setValidationErrors(prev => {
			const { investment, ...rest } = prev;
			return rest;
		});
		return true;
	};

	const handleChange = (field: keyof FDPEconomicFormData, value: string | number | null) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		
		// Clear validation errors when user makes changes
		if (validationErrors[field as string]) {
			setValidationErrors(prev => {
				const { [field as string]: _, ...rest } = prev;
				return rest;
			});
		}
	};

	const handleBeneficiaryChange = (memberNo: string) => {
		const selectedMember = familyMembers.find(m => m.BeneficiaryID === memberNo);
		if (selectedMember) {
			const age = calculateAge(selectedMember.DOBMonth, selectedMember.DOBYear);
			setFormData(prev => ({
				...prev,
				BeneficiaryID: selectedMember.BeneficiaryID,
				BeneficiaryName: selectedMember.FullName,
				BeneficiaryAge: age,
				BeneficiaryGender: selectedMember.Gender || "",
				BeneficiaryCurrentOccupation: selectedMember.Occupation || "",
				CurrentMonthlyIncome: Math.round(selectedMember.MonthlyIncome || 0),
			}));
			
			// Fetch feasibility studies for the new member
			if (formNumber) {
				fetch(`/api/family-development-plan/feasibility?familyID=${encodeURIComponent(formNumber)}&memberID=${encodeURIComponent(memberNo)}`)
					.then(res => res.json())
					.then(data => {
						if (data.success && data.data) {
							const studies = Array.isArray(data.data) ? data.data : [data.data];
							// Include both ECONOMIC and SKILLS feasibility studies
							const allStudies = studies.filter((s: any) => s && (s.PlanCategory === "ECONOMIC" || s.PlanCategory === "SKILLS"));
							setFeasibilityStudies(allStudies);
							
							// Calculate total Investment from PE Program from all ECONOMIC feasibility studies for this member
							const economicStudies = studies.filter((s: any) => s && s.PlanCategory === "ECONOMIC");
							const totalFeasibilityInvestment = economicStudies.reduce((sum: number, study: any) => {
								const investment = parseFloat(study.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setMemberFeasibilityLimit(totalFeasibilityInvestment > 0 ? Math.round(totalFeasibilityInvestment) : null);
						}
					});
				
				// Fetch and recalculate total member PE Investment
				fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}&beneficiaryID=${encodeURIComponent(memberNo)}`)
					.then(res => res.json())
					.then(data => {
						if (data.success && data.data) {
							const records = Array.isArray(data.data) ? data.data : [data.data];
							const totalPEInvestment = records.reduce((sum: number, record: any) => {
								const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setTotalMemberPEInvestment(Math.round(totalPEInvestment));
						}
					});
			}
		}
	};

	const handleFeasibilityChange = (feasibilityId: string) => {
		const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === feasibilityId);
		if (selectedFeasibility) {
			// For SKILLS, use CostPerParticipant as Investment Required; for ECONOMIC, use InvestmentFromPEProgram
			const investmentRequired = selectedFeasibility.PlanCategory === "SKILLS" 
				? (selectedFeasibility.CostPerParticipant || 0)
				: (selectedFeasibility.InvestmentFromPEProgram || 0);
			
			setFormData(prev => ({
				...prev,
				FeasibilityID: feasibilityId,
				InvestmentRequiredTotal: Math.round(investmentRequired),
				// Don't auto-populate PlannedMonthlyIncome - let user enter it manually
				CurrentMonthlyIncome: Math.round(selectedFeasibility.CurrentBaselineIncome || prev.CurrentMonthlyIncome),
			}));
			// Clear validation error when feasibility changes
			if (validationErrors.feasibilityInvestment) {
				setValidationErrors(prev => {
					const { feasibilityInvestment, ...rest } = prev;
					return rest;
				});
			}
		}
	};

	// Handler for Link Approved Feasibility dropdown
	const handleApprovedFeasibilityChange = (feasibilityId: string) => {
		setSelectedFeasibilityId(feasibilityId);
		const selectedFeasibility = approvedFeasibilityStudies.find(f => f.FDP_ID.toString() === feasibilityId);
		if (selectedFeasibility) {
			// Map FeasibilityType to InterventionType - use FeasibilityType directly (Business, Agriculture, Livestock)
			let interventionType = selectedFeasibility.FeasibilityType || "";
			// For Skills, use Employment
			if (selectedFeasibility.PlanCategory === "SKILLS") {
				interventionType = "Employment";
			}
			
			// For SKILLS, use CostPerParticipant as Investment Required; for ECONOMIC, use InvestmentFromPEProgram
			const investmentRequired = selectedFeasibility.PlanCategory === "SKILLS" 
				? (selectedFeasibility.CostPerParticipant || 0)
				: (selectedFeasibility.InvestmentFromPEProgram || 0);
			
			setFormData(prev => ({
				...prev,
				FeasibilityID: feasibilityId,
				InterventionType: interventionType,
				Trade: selectedFeasibility.Trade || prev.Trade,
				SubFieldOfInvestment: selectedFeasibility.SubField || prev.SubFieldOfInvestment,
				SkillsDevelopmentCourse: selectedFeasibility.CourseTitle || prev.SkillsDevelopmentCourse,
				Institution: selectedFeasibility.TrainingInstitution || prev.Institution,
				InvestmentRequiredTotal: Math.round(investmentRequired),
				// Don't auto-populate PlannedMonthlyIncome - let user enter it manually
				CurrentMonthlyIncome: Math.round(selectedFeasibility.CurrentBaselineIncome || prev.CurrentMonthlyIncome),
			}));
		} else if (!feasibilityId) {
			// Clear selection
			setFormData(prev => ({
				...prev,
				InterventionType: "",
				Trade: "",
				SubFieldOfInvestment: "",
				SkillsDevelopmentCourse: "",
				Institution: "",
				FeasibilityID: "",
			}));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);
		setValidationErrors({});

		// Validation - Check all required fields
		const missingFields: string[] = [];
		
		if (!formData.BeneficiaryID || formData.BeneficiaryID.trim() === "") {
			missingFields.push("Beneficiary ID");
		}
		
		if (!formData.InterventionType || formData.InterventionType.trim() === "") {
			missingFields.push("Type of Intervention");
		}
		
		if (!formData.FeasibilityID || formData.FeasibilityID.trim() === "") {
			missingFields.push("Link Approved Feasibility");
		}
		
		if (formData.InvestmentRequiredTotal <= 0) {
			missingFields.push("Investment Required (must be greater than 0 - please link a feasibility study)");
		}
		
		if (formData.InvestmentFromPEProgram <= 0) {
			missingFields.push("Investment Required from PE Program (must be greater than 0)");
		}
		
		if (formData.PlannedMonthlyIncome === null || formData.PlannedMonthlyIncome === undefined || formData.PlannedMonthlyIncome <= 0) {
			missingFields.push("Planned Income per Month (must be greater than 0)");
		}
		
		// Validate Business-specific fields
		if (formData.InterventionType === "Business") {
			if (!formData.MainTrade || formData.MainTrade.trim() === "") {
				missingFields.push("Main Trade");
			}
			if (!formData.SubFieldOfInvestment || formData.SubFieldOfInvestment.trim() === "") {
				missingFields.push("Sub Trade");
			}
		}
		
		// Validate Employment-specific fields
		if (formData.InterventionType === "Employment") {
			if (!formData.SkillsDevelopmentCourse || formData.SkillsDevelopmentCourse.trim() === "") {
				missingFields.push("Skills Development Course");
			}
			if (!formData.Institution || formData.Institution.trim() === "") {
				missingFields.push("Institution");
			}
		}
		
		// Validate other intervention types
		if (formData.InterventionType && formData.InterventionType !== "Business" && formData.InterventionType !== "Employment") {
			if (!formData.Trade || formData.Trade.trim() === "") {
				missingFields.push("Trade");
			}
		}
		
		if (missingFields.length > 0) {
			setError(`Please fill in all required fields: ${missingFields.join(", ")}`);
			return;
		}

		// Business Rule: If loan < 50,000, convert to grant (apply before validation)
		let finalLoanAmount = Math.round(formData.LoanAmount);
		let finalGrantAmount = Math.round(formData.GrantAmount);
		if (formData.LoanAmount > 0 && formData.LoanAmount < 50000) {
			finalGrantAmount = Math.round(formData.GrantAmount + formData.LoanAmount);
			finalLoanAmount = 0;
		}

		// Validate Grants and Loan don't exceed Investment Required from PE Program
		const peInvestment = Math.round(formData.InvestmentFromPEProgram);
		if (finalGrantAmount > peInvestment) {
			setError(`Grants (${finalGrantAmount.toLocaleString()}) cannot exceed Investment Required from PE Program (${peInvestment.toLocaleString()})`);
			return;
		}
		if (finalLoanAmount > peInvestment) {
			setError(`Loan (${finalLoanAmount.toLocaleString()}) cannot exceed Investment Required from PE Program (${peInvestment.toLocaleString()})`);
			return;
		}
		
		// Validate investment with converted values (all rounded)
		const total = finalGrantAmount + finalLoanAmount;
		if (peInvestment <= 0) {
			setError("Investment Required from PE Program must be greater than 0. Please select a feasibility study or enter investment details.");
			return;
		}
		if (Math.abs(total - peInvestment) > 0) {
			setError(`Grant (${finalGrantAmount.toLocaleString()}) + Loan (${finalLoanAmount.toLocaleString()}) = ${total.toLocaleString()} must equal Investment Required from PE Program (${peInvestment.toLocaleString()})`);
			return;
		}

		// Business Rule: If intervention ≤ 75,000, must be 100% grant
		if (formData.InvestmentRequiredTotal <= 75000 && finalLoanAmount > 0) {
			setError("Interventions ≤ PKR 75,000 must be 100% Grant. Please set Loan Amount to 0.");
			return;
		}

		// Validate Investment Required from PE Program against Feasibility Study
		if (formData.FeasibilityID) {
			const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID);
			if (selectedFeasibility && selectedFeasibility.InvestmentFromPEProgram !== null && selectedFeasibility.InvestmentFromPEProgram !== undefined) {
				if (peInvestment > Math.round(selectedFeasibility.InvestmentFromPEProgram)) {
					setError(`Investment Required from PE Program (${peInvestment.toLocaleString()}) cannot exceed Investment from PE Program in Feasibility Study (${Math.round(selectedFeasibility.InvestmentFromPEProgram).toLocaleString()})`);
					return;
				}
			}
		}

		// Validate total member-level PE Investment doesn't exceed feasibility limit
		if (memberFeasibilityLimit !== null && memberFeasibilityLimit !== undefined) {
			const currentRecordInvestment = isEditMode && selectedRecordId
				? Math.round(fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0)
				: 0;
			const adjustedTotal = Math.round(totalMemberPEInvestment - currentRecordInvestment + peInvestment);
			
			if (adjustedTotal > memberFeasibilityLimit) {
				setError(`Total PE Investment for this member (${adjustedTotal.toLocaleString()}) cannot exceed the total Investment from PE Program defined in Feasibility Studies (${Math.round(memberFeasibilityLimit).toLocaleString()}). Current total: ${Math.round(totalMemberPEInvestment - currentRecordInvestment).toLocaleString()}, Adding: ${peInvestment.toLocaleString()}`);
				return;
			}
		}

		setSaving(true);

		try {
			const url = isEditMode 
				? `/api/family-development-plan/fdp-economic?fdpEconomicId=${encodeURIComponent(fdpEconomicId!)}`
				: "/api/family-development-plan/fdp-economic";
			
			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					FieldOfInvestment: formData.MainTrade || "", // Map MainTrade to FieldOfInvestment
					InvestmentRequiredTotal: Math.round(formData.InvestmentRequiredTotal),
					ContributionFromBeneficiary: Math.round(formData.ContributionFromBeneficiary),
					InvestmentFromPEProgram: Math.round(formData.InvestmentFromPEProgram),
					PlannedMonthlyIncome: formData.PlannedMonthlyIncome !== null ? Math.round(formData.PlannedMonthlyIncome) : null,
					IncrementalMonthlyIncome: Math.round(formData.IncrementalMonthlyIncome || 0),
					CurrentMonthlyIncome: Math.round(formData.CurrentMonthlyIncome),
					GrantAmount: Math.round(finalGrantAmount),
					LoanAmount: Math.round(finalLoanAmount),
					InvestmentValidationStatus: 1, // 1 = Valid, 0 = Invalid
					CreatedBy: userProfile?.username || userProfile?.email || "System",
					UpdatedBy: userProfile?.username || userProfile?.email || "System",
				}),
			});

			const result = await response.json();

			if (result.success) {
				setSuccess(true);
				// Reload FDP Economic records
				if (formNumber) {
					const fdpResponse = await fetch(`/api/family-development-plan/fdp-economic?familyID=${encodeURIComponent(formNumber)}${memberNo ? `&beneficiaryID=${encodeURIComponent(memberNo)}` : ""}`);
					const fdpData = await fdpResponse.json();
					if (fdpData.success && fdpData.data) {
						const records = Array.isArray(fdpData.data) ? fdpData.data : [fdpData.data];
						setFdpEconomicRecords(records);
						
						// Recalculate total member PE Investment
						if (memberNo) {
							const totalPEInvestment = records.reduce((sum: number, record: any) => {
								const investment = parseFloat(record.InvestmentFromPEProgram) || 0;
								return sum + investment;
							}, 0);
							setTotalMemberPEInvestment(Math.round(totalPEInvestment));
						}
					}
				}
				// Reset form (preserve baseline data and beneficiary info)
								setFormData(prev => ({
									...prev,
									InterventionType: "",
									SubFieldOfInvestment: "",
									Trade: "",
									MainTrade: "",
									SubTradeCode: "",
									SkillsDevelopmentCourse: "",
									Institution: "",
									InvestmentRequiredTotal: 0,
									ContributionFromBeneficiary: 0,
									InvestmentFromPEProgram: 0,
									GrantAmount: 0,
									LoanAmount: 0,
									InvestmentValidationStatus: 0,
									PlannedMonthlyIncome: null,
									FeasibilityID: "",
									ApprovalStatus: "Pending",
									ApprovalRemarks: "",
								}));
				setSelectedRecordId(null);
				setShowForm(false);
				setTimeout(() => {
					setSuccess(false);
				}, 3000);
			} else {
				setError(result.message || "Failed to save FDP Economic data");
			}
		} catch (err: any) {
			console.error("Error saving FDP Economic data:", err);
			setError(err.message || "Failed to save FDP Economic data");
		} finally {
			setSaving(false);
		}
	};

	const formatCurrency = (value: number): string => {
		const roundedValue = Math.round(value);
		return `Rs. ${roundedValue.toLocaleString()}`;
	};

	const formatPercent = (value: number): string => {
		return `${value.toFixed(2)}%`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
				<span className="ml-3 text-gray-600">Loading FDP Economic data...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
					<button
						onClick={() => router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`)}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<ArrowLeft className="h-5 w-5 text-gray-600" />
				</button>
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Economic Plan</h1>
					<p className="text-gray-600 mt-2">
						{formNumber && memberNo && (
							<span>
								Form Number: {formNumber} | Member: {memberNo} {memberName && `- ${memberName}`}
							</span>
						)}
					</p>
				</div>
			</div>

			{/* Error/Success Messages */}
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
					<AlertCircle className="h-5 w-5" />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
					FDP Economic data saved successfully!
				</div>
			)}

			{/* Gridview or Form Toggle */}
			{fdpEconomicRecords.length > 0 && !showForm && (
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold text-gray-900">Existing FDP Economic Development Records</h2>
						<button
							type="button"
							onClick={() => {
								setShowForm(true);
								setSelectedRecordId(null);
								setFormData(prev => ({
									...prev,
									InterventionType: "",
									SubFieldOfInvestment: "",
									Trade: "",
									MainTrade: "",
									SubTradeCode: "",
									SkillsDevelopmentCourse: "",
									Institution: "",
									InvestmentRequiredTotal: 0,
									ContributionFromBeneficiary: 0,
									InvestmentFromPEProgram: 0,
									GrantAmount: 0,
									LoanAmount: 0,
									InvestmentValidationStatus: 0,
									PlannedMonthlyIncome: null,
									FeasibilityID: "",
									ApprovalStatus: "Pending",
									ApprovalRemarks: "",
								}));
							}}
							className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors"
						>
							Add New FDP Economic Development
						</button>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Type</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment Required</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PE Investment</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validation</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{fdpEconomicRecords.map((record) => (
									<tr key={record.FDP_EconomicID} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.FDP_EconomicID}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.BeneficiaryName || record.BeneficiaryID || "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.InterventionType || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.InvestmentRequiredTotal ? `PKR ${parseFloat(record.InvestmentRequiredTotal).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											{record.InvestmentFromPEProgram ? `PKR ${parseFloat(record.InvestmentFromPEProgram).toLocaleString()}` : "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												record.InvestmentValidationStatus === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
											}`}>
												{record.InvestmentValidationStatus === 1 ? "Valid" : "Invalid"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												record.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
												record.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{record.ApprovalStatus || "Pending"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={async () => {
														setViewRecord(record);
														// Fetch family information
														try {
															const basicInfoResponse = await fetch(`/api/baseline-applications/basic-info?formNumber=${encodeURIComponent(formNumber || "")}`);
															const basicInfoResult = await basicInfoResponse.json();
															if (basicInfoResult.success && basicInfoResult.data) {
																setFamilyInfo(basicInfoResult.data);
															}
														} catch (err) {
															console.error("Error fetching family info:", err);
														}
														setShowViewModal(true);
													}}
													className="text-blue-600 hover:text-blue-800"
													title="View"
												>
													<Eye className="h-4 w-4" />
												</button>
												{(() => {
													const isApproved = record.ApprovalStatus && (
														(record.ApprovalStatus.toString().trim().toLowerCase() === "accepted") ||
														(record.ApprovalStatus.toString().trim().toLowerCase() === "approved") ||
														(record.ApprovalStatus.toString().trim().toLowerCase().includes("approve"))
													);
													
													if (isApproved) {
														return (
															<span className="text-gray-400 text-xs italic">Cannot edit</span>
														);
													}
													
													return (
														<button
															type="button"
															onClick={() => {
																setSelectedRecordId(record.FDP_EconomicID);
																router.push(`/dashboard/family-development-plan/fdp-economic?formNumber=${encodeURIComponent(formNumber || "")}&memberNo=${encodeURIComponent(memberNo || "")}&memberName=${encodeURIComponent(memberName || "")}&fdpEconomicId=${record.FDP_EconomicID}`);
															}}
															className="text-[#0b4d2b] hover:text-[#0a3d22]"
														>
															Edit
														</button>
													);
												})()}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Form */}
			{showForm && (
				<form 
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit(e);
					}}
					onKeyDown={(e) => {
						// Prevent form submission on Enter key press in input fields
						if (e.key === 'Enter') {
							const target = e.target as HTMLElement;
							if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
								e.preventDefault();
							}
						}
					}}
					className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8"
				>
				{/* Section 1: Family-Level Information (Read-Only) */}
				<div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">1. Family-Level Information</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family ID</label>
							<input
								type="text"
								value={formData.FormNumber}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Income of the Family</label>
							<input
								type="text"
								value={formatCurrency(formData.BaselineFamilyIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Number of Members in the Family</label>
							<input
								type="text"
								value={formData.FamilyMembersCount}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Family Per Capita Income</label>
							<input
								type="text"
								value={formatCurrency(formData.FamilyPerCapitaIncome)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Self-Sufficiency Income Required (Per Capita)</label>
							<input
								type="text"
								value={formatCurrency(formData.SelfSufficiencyIncomePerCapita)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Income Per Capita as % of Self-Sufficiency</label>
							<input
								type="text"
								value={formatPercent(formData.BaselineIncomePerCapitaAsPercentOfSelfSufficiency)}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Baseline Poverty Level</label>
							<input
								type="text"
								value={formData.BaselinePovertyLevel}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Max Economic Support Amount</label>
							<input
								type="text"
								value={maxEconomicSupportAmount && maxEconomicSupportAmount > 0 
									? `PKR ${maxEconomicSupportAmount.toLocaleString()}` 
									: "-"}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Already Defined Economic Support</label>
							<input
								type="text"
								value={`PKR ${alreadyDefinedEconomicSupport.toLocaleString()}`}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Available Economic Support</label>
							<input
								type="text"
								value={`PKR ${availableEconomicSupport.toLocaleString()}`}
								readOnly
								className={`w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed font-semibold ${availableEconomicSupport < 0 ? 'text-red-600' : availableEconomicSupport === 0 ? 'text-orange-600' : 'text-green-600'}`}
							/>
						</div>
					</div>
				</div>

				{/* Section 2: Intervention Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">2. Intervention Information</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Beneficiary ID (Family Member) <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.BeneficiaryID}
								onChange={(e) => handleBeneficiaryChange(e.target.value)}
								required
								disabled={!!memberNo}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								<option value="">Select Member</option>
								{familyMembers.map((member) => (
									<option key={member.BeneficiaryID} value={member.BeneficiaryID}>
										{member.BeneficiaryID} - {member.FullName}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
							<input
								type="text"
								value={formData.BeneficiaryName}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
							<input
								type="text"
								value={formData.BeneficiaryAge}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
							<input
								type="text"
								value={formData.BeneficiaryGender}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Current Occupation</label>
							<input
								type="text"
								value={formData.BeneficiaryCurrentOccupation}
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Link Approved Feasibility <span className="text-red-500">*</span>
							</label>
							<select
								value={selectedFeasibilityId}
								onChange={(e) => handleApprovedFeasibilityChange(e.target.value)}
								required
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
							>
								<option value="">Select Approved Feasibility</option>
								{approvedFeasibilityStudies.map((study) => {
									const investmentRequired = study.PlanCategory === "SKILLS" 
										? (study.CostPerParticipant || 0)
										: (study.TotalInvestmentRequired || 0);
									const investmentFromPE = study.InvestmentFromPEProgram || 0;
									
									// Display feasibility type or course title for skills
									const feasibilityTypeDisplay = study.PlanCategory === "SKILLS" 
										? (study.CourseTitle || study.PrimaryIndustry || "Skills Development")
										: (study.FeasibilityType || "Economic");
									
									const planCategoryDisplay = study.PlanCategory === "SKILLS" ? "Skills" : "Economic";
									
									return (
										<option key={study.FDP_ID} value={study.FDP_ID.toString()}>
											ID: {study.FDP_ID} - {feasibilityTypeDisplay} ({planCategoryDisplay}) | Investment Required (from Feasibility): PKR {investmentRequired.toLocaleString()} | Investment Required from PE Program: PKR {investmentFromPE.toLocaleString()}
										</option>
									);
								})}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Type of Intervention <span className="text-red-500">*</span>
							</label>
							{selectedFeasibilityId ? (
								<input
									type="text"
									value={formData.InterventionType}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							) : (
								<select
									value={formData.InterventionType}
									onChange={(e) => handleChange("InterventionType", e.target.value)}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
								<option value="">Select Type</option>
								<option value="Employment">Employment</option>
								<option value="Business">Business</option>
								<option value="Micro Enterprise">Micro Enterprise</option>
								<option value="Agriculture">Agriculture</option>
								<option value="Livestock">Livestock</option>
								</select>
							)}
						</div>
						{formData.InterventionType === "Business" ? (
							<>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Main Trade <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.MainTrade}
									onChange={(e) => {
										handleChange("MainTrade", e.target.value);
										// Clear Sub Trade when Main Trade changes
										handleChange("SubFieldOfInvestment", "");
										handleChange("SubTradeCode", "");
									}}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								>
									<option value="">Select Main Trade</option>
										{Array.from(new Set(BUSINESS_TRADES.map(t => t.mainTrade))).map(mainTrade => (
											<option key={mainTrade} value={mainTrade}>{mainTrade}</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Sub Trade <span className="text-red-500">*</span>
									</label>
									<select
										value={formData.SubFieldOfInvestment}
										onChange={(e) => {
											const selectedSubTrade = e.target.value;
											const selectedTrade = BUSINESS_TRADES.find(t => 
												t.mainTrade === formData.MainTrade && t.subTrade === selectedSubTrade
											);
											handleChange("SubFieldOfInvestment", selectedSubTrade);
											handleChange("SubTradeCode", selectedTrade?.code || "");
										}}
										required
										disabled={!formData.MainTrade}
										className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
									>
										<option value="">Select Sub Trade</option>
										{BUSINESS_TRADES
											.filter(t => t.mainTrade === formData.MainTrade)
											.map(trade => (
												<option key={trade.code} value={trade.subTrade}>
													{trade.subTrade}
												</option>
											))}
									</select>
								</div>
								{formData.SubFieldOfInvestment && (() => {
									const selectedTrade = BUSINESS_TRADES.find(t => 
										t.mainTrade === formData.MainTrade && t.subTrade === formData.SubFieldOfInvestment
									);
									return selectedTrade ? (
										<div className="col-span-2">
											<div className="bg-blue-50 border border-blue-200 rounded-md p-4">
												<div className="flex items-start gap-2">
													<div className="flex-1">
														<p className="text-sm font-semibold text-gray-900 mb-1">Definition:</p>
														<p className="text-sm text-gray-700">{selectedTrade.definition || "No definition available"}</p>
													</div>
													<div className="text-right">
														<p className="text-xs text-gray-500 mb-1">Sub Trade Code:</p>
														<p className="text-sm font-semibold text-[#0b4d2b]">{selectedTrade.code}</p>
													</div>
												</div>
											</div>
										</div>
									) : null;
								})()}
							</>
						) : (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Trade <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.Trade}
										onChange={(e) => handleChange("Trade", e.target.value)}
										readOnly={!!selectedFeasibilityId}
										required
										className={`w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${selectedFeasibilityId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
										placeholder="Enter trade"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Sub Trade</label>
									<input
										type="text"
										value={formData.SubFieldOfInvestment}
										onChange={(e) => handleChange("SubFieldOfInvestment", e.target.value)}
										readOnly={!!selectedFeasibilityId}
										className={`w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${selectedFeasibilityId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
										placeholder="Enter sub trade"
									/>
								</div>
							</>
						)}
						{formData.InterventionType === "Employment" && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Skills Development Course <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.SkillsDevelopmentCourse}
										onChange={(e) => handleChange("SkillsDevelopmentCourse", e.target.value)}
										readOnly={!!selectedFeasibilityId}
										required
										className={`w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${selectedFeasibilityId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
										placeholder="Enter course name"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Institution <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.Institution}
										onChange={(e) => handleChange("Institution", e.target.value)}
										readOnly={!!selectedFeasibilityId}
										required
										className={`w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${selectedFeasibilityId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
										placeholder="Enter institution name"
									/>
								</div>
							</>
						)}
					</div>
				</div>

				{/* Section 3: Financial Information */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">3. Financial Information</h2>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Investment Required (from Feasibility)</label>
								<input
									type="text"
									value={formatCurrency(formData.InvestmentRequiredTotal)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
								{formData.FeasibilityID && (() => {
									const selectedFeasibility = feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID);
									if (!selectedFeasibility) return null;
									
									const investmentRequired = selectedFeasibility.PlanCategory === "SKILLS" 
										? (selectedFeasibility.CostPerParticipant || 0)
										: (selectedFeasibility.TotalInvestmentRequired || 0);
									
									return (
										<p className="mt-1 text-xs text-gray-500">
											From Feasibility ({selectedFeasibility.PlanCategory === "SKILLS" ? "Skills Development" : "Economic"}): Investment Required (PKR) = {formatCurrency(Math.round(investmentRequired))}, Investment from PE Program = {formatCurrency(Math.round(selectedFeasibility.InvestmentFromPEProgram || 0))}
										</p>
									);
								})()}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Contribution from Family / Beneficiary</label>
								<input
									type="text"
									value={formatCurrency(formData.ContributionFromBeneficiary)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Investment Required from PE Program</label>
								<input
									type="text"
									value={formatCurrency(formData.InvestmentFromPEProgram)}
									readOnly
									className={`w-full rounded-md border px-4 py-2 text-sm cursor-not-allowed ${
										validationErrors.feasibilityInvestment || validationErrors.memberLevelInvestment
											? "border-red-300 bg-red-50 text-red-600" 
											: "border-gray-300 bg-gray-100 text-gray-600"
									}`}
								/>
								{validationErrors.feasibilityInvestment && (
									<p className="mt-1 text-xs text-red-600">{validationErrors.feasibilityInvestment}</p>
								)}
								{validationErrors.memberLevelInvestment && (
									<p className="mt-1 text-xs text-red-600">{validationErrors.memberLevelInvestment}</p>
								)}
								{formData.FeasibilityID && !validationErrors.feasibilityInvestment && (
									<p className="mt-1 text-xs text-gray-500">
										Max from Feasibility: {formatCurrency(Math.round(feasibilityStudies.find(f => f.FDP_ID.toString() === formData.FeasibilityID)?.InvestmentFromPEProgram || 0))}
									</p>
								)}
								{memberFeasibilityLimit !== null && (
									<p className="mt-1 text-xs text-gray-500">
										Member-level limit: {formatCurrency(Math.round(memberFeasibilityLimit))} | 
										Current total: {formatCurrency(Math.round(totalMemberPEInvestment - (isEditMode && selectedRecordId ? (fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0) : 0)))} | 
										After {isEditMode ? "update" : "adding"}: {formatCurrency(Math.round((totalMemberPEInvestment - (isEditMode && selectedRecordId ? (fdpEconomicRecords.find(r => r.FDP_EconomicID === selectedRecordId)?.InvestmentFromPEProgram || 0) : 0)) + formData.InvestmentFromPEProgram))}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Grants</label>
								<input
									type="number"
									value={formData.GrantAmount || ""}
									onChange={(e) => {
										const value = parseFloat(e.target.value) || 0;
										handleChange("GrantAmount", Math.round(value));
									}}
									onBlur={(e) => {
										const value = parseFloat(e.target.value) || 0;
										handleChange("GrantAmount", Math.round(value));
									}}
									className={`w-full rounded-md border px-4 py-2 text-sm focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
										validationErrors.grantLoanValidation 
											? "border-red-300 focus:border-red-500" 
											: "border-gray-300 focus:border-[#0b4d2b]"
									}`}
									placeholder="0"
									min="0"
									step="1"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Loan</label>
								<input
									type="number"
									value={formData.LoanAmount || ""}
									onChange={(e) => {
										const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
										handleChange("LoanAmount", Math.round(value));
									}}
									onBlur={(e) => {
										const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
										handleChange("LoanAmount", Math.round(value));
										handleLoanBlur();
									}}
									className={`w-full rounded-md border px-4 py-2 text-sm focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none ${
										validationErrors.grantLoanValidation 
											? "border-red-300 focus:border-red-500" 
											: "border-gray-300 focus:border-[#0b4d2b]"
									}`}
									placeholder="0"
									min="0"
									step="1"
								/>
								{formData.LoanAmount > 0 && formData.LoanAmount < 50000 && (
									<p className="mt-1 text-xs text-yellow-600">Loan amount &lt; PKR 50,000 will be automatically converted to Grant when you leave this field</p>
								)}
							</div>
							{validationErrors.grantLoanValidation && (
								<div className="col-span-2">
									<p className="text-sm text-red-600">{validationErrors.grantLoanValidation}</p>
								</div>
							)}
							{!validationErrors.grantLoanValidation && formData.GrantAmount + formData.LoanAmount > 0 && (
								<div className="col-span-2">
									<p className="text-sm text-green-600">
										✓ Grants ({Math.round(formData.GrantAmount).toLocaleString()}) + Loan ({Math.round(formData.LoanAmount).toLocaleString()}) = {Math.round(formData.GrantAmount + formData.LoanAmount).toLocaleString()} matches Investment Required from PE Program ({Math.round(formData.InvestmentFromPEProgram).toLocaleString()})
									</p>
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Planned Income per Month (Avg. of 12 Months) <span className="text-red-500">*</span>
								</label>
								<input
									type="number"
									value={formData.PlannedMonthlyIncome ?? ""}
									onChange={(e) => {
										const value = e.target.value === "" ? null : (parseFloat(e.target.value) || 0);
										if (value !== null) {
											// Round the value
											const roundedValue = Math.round(value);
											handleChange("PlannedMonthlyIncome", roundedValue);
										} else {
											handleChange("PlannedMonthlyIncome", null);
										}
									}}
									onBlur={(e) => {
										// Ensure value is rounded on blur as well
										const value = e.target.value === "" ? null : (parseFloat(e.target.value) || 0);
										if (value !== null && value !== Math.round(value)) {
											handleChange("PlannedMonthlyIncome", Math.round(value));
										} else if (value === null) {
											handleChange("PlannedMonthlyIncome", null);
										}
									}}
									required
									className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
									placeholder=""
									min="1"
									step="1"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary's Current Income per Month</label>
								<input
									type="text"
									value={formatCurrency(formData.CurrentMonthlyIncome)}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Incremental Planned Income per Month</label>
								<input
									type="text"
									value={formatCurrency(Math.round(formData.IncrementalMonthlyIncome || 0))}
									readOnly
									className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Section 4: Approval Section */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">4. Approval Section</h2>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
							<input
								type="text"
								value="Pending"
								readOnly
								className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-600 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Approval Remarks</label>
							<textarea
								value={formData.ApprovalRemarks}
								onChange={(e) => handleChange("ApprovalRemarks", e.target.value)}
								rows={3}
								className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
								placeholder="Enter approval remarks"
							/>
						</div>
					</div>
				</div>

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
					<button
						type="button"
						onClick={() => {
							if (fdpEconomicRecords.length > 0) {
								setShowForm(false);
								setSelectedRecordId(null);
							} else {
								router.push(`/dashboard/family-development-plan?formNumber=${encodeURIComponent(formNumber || "")}&showMembers=true`);
							}
						}}
						className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
					>
						{fdpEconomicRecords.length > 0 ? "Back to List" : "Cancel"}
					</button>
					<button
						type="submit"
						disabled={saving}
						className="px-6 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{saving ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								<span>Saving...</span>
							</>
						) : (
							<>
								<Save className="h-4 w-4" />
								<span>Save FDP Economic</span>
							</>
						)}
					</button>
				</div>
				</form>
			)}

			{/* View Modal */}
			{showViewModal && viewRecord && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						{/* Modal Header */}
						<div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
							<h2 className="text-2xl font-bold text-gray-900">View Economic Development Record</h2>
							<button
								type="button"
								onClick={() => {
									setShowViewModal(false);
									setViewRecord(null);
									setFamilyInfo(null);
								}}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="h-6 w-6" />
							</button>
						</div>

						{/* Modal Body */}
						<div className="p-6 space-y-6">
							{/* Family Information */}
							{familyInfo && (
								<div className="bg-gray-50 rounded-lg p-6">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Family Information</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
											<p className="text-sm text-gray-900">{familyInfo.FormNumber || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
											<p className="text-sm text-gray-900">{familyInfo.Full_Name || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">CNIC Number</label>
											<p className="text-sm text-gray-900">{familyInfo.CNICNumber || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Regional Community</label>
											<p className="text-sm text-gray-900">{familyInfo.RegionalCommunity || "N/A"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Local Community</label>
											<p className="text-sm text-gray-900">{familyInfo.LocalCommunity || "N/A"}</p>
										</div>
										{baselineData && (
											<>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">Baseline Family Income</label>
													<p className="text-sm text-gray-900">{formatCurrency(baselineData.BaselineFamilyIncome)}</p>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">Family Members Count</label>
													<p className="text-sm text-gray-900">{baselineData.FamilyMembersCount || 0}</p>
												</div>
											</>
										)}
									</div>
								</div>
							)}

							{/* Economic Data */}
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Economic Development Data</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">FDP Economic ID</label>
										<p className="text-sm text-gray-900">{viewRecord.FDP_EconomicID || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Form Number</label>
										<p className="text-sm text-gray-900">{viewRecord.FormNumber || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary ID</label>
										<p className="text-sm text-gray-900">{viewRecord.BeneficiaryID || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
										<p className="text-sm text-gray-900">{viewRecord.BeneficiaryName || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Age</label>
										<p className="text-sm text-gray-900">{viewRecord.BeneficiaryAge || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Gender</label>
										<p className="text-sm text-gray-900">{viewRecord.BeneficiaryGender || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Current Occupation</label>
										<p className="text-sm text-gray-900">{viewRecord.BeneficiaryCurrentOccupation || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Intervention Type</label>
										<p className="text-sm text-gray-900">{viewRecord.InterventionType || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Field Of Investment</label>
										<p className="text-sm text-gray-900">{viewRecord.FieldOfInvestment || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Sub Field Of Investment</label>
										<p className="text-sm text-gray-900">{viewRecord.SubFieldOfInvestment || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
										<p className="text-sm text-gray-900">{viewRecord.Trade || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Skills Development Course</label>
										<p className="text-sm text-gray-900">{viewRecord.SkillsDevelopmentCourse || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
										<p className="text-sm text-gray-900">{viewRecord.Institution || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Investment Required Total</label>
										<p className="text-sm text-gray-900">{viewRecord.InvestmentRequiredTotal ? formatCurrency(parseFloat(viewRecord.InvestmentRequiredTotal)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Contribution From Beneficiary</label>
										<p className="text-sm text-gray-900">{viewRecord.ContributionFromBeneficiary ? formatCurrency(parseFloat(viewRecord.ContributionFromBeneficiary)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Investment From PE Program</label>
										<p className="text-sm text-gray-900">{viewRecord.InvestmentFromPEProgram ? formatCurrency(parseFloat(viewRecord.InvestmentFromPEProgram)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Grant Amount</label>
										<p className="text-sm text-gray-900">{viewRecord.GrantAmount ? formatCurrency(parseFloat(viewRecord.GrantAmount)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
										<p className="text-sm text-gray-900">{viewRecord.LoanAmount ? formatCurrency(parseFloat(viewRecord.LoanAmount)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Investment Validation Status</label>
										<p className="text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-semibold ${
												viewRecord.InvestmentValidationStatus === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
											}`}>
												{viewRecord.InvestmentValidationStatus === 1 ? "Valid" : "Invalid"}
											</span>
										</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Planned Monthly Income</label>
										<p className="text-sm text-gray-900">{viewRecord.PlannedMonthlyIncome ? formatCurrency(parseFloat(viewRecord.PlannedMonthlyIncome)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Current Monthly Income</label>
										<p className="text-sm text-gray-900">{viewRecord.CurrentMonthlyIncome ? formatCurrency(parseFloat(viewRecord.CurrentMonthlyIncome)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Incremental Monthly Income</label>
										<p className="text-sm text-gray-900">{viewRecord.IncrementalMonthlyIncome ? formatCurrency(parseFloat(viewRecord.IncrementalMonthlyIncome)) : "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Feasibility ID</label>
										<p className="text-sm text-gray-900">{viewRecord.FeasibilityID || "N/A"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
										<p className="text-sm text-gray-900">
											<span className={`px-2 py-1 rounded-full text-xs font-semibold ${
												viewRecord.ApprovalStatus === "Approved" ? "bg-green-100 text-green-800" :
												viewRecord.ApprovalStatus === "Rejected" ? "bg-red-100 text-red-800" :
												"bg-yellow-100 text-yellow-800"
											}`}>
												{viewRecord.ApprovalStatus || "Pending"}
											</span>
										</p>
									</div>
									{viewRecord.ApprovalDate && (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
											<p className="text-sm text-gray-900">{new Date(viewRecord.ApprovalDate).toLocaleDateString()}</p>
										</div>
									)}
									{viewRecord.ApprovalRemarks && (
										<div className="md:col-span-2">
											<label className="block text-sm font-medium text-gray-700 mb-1">Approval Remarks</label>
											<p className="text-sm text-gray-900">{viewRecord.ApprovalRemarks}</p>
										</div>
									)}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
										<p className="text-sm text-gray-900">{viewRecord.CreatedBy || "N/A"}</p>
									</div>
									{viewRecord.CreatedAt && (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
											<p className="text-sm text-gray-900">{new Date(viewRecord.CreatedAt).toLocaleString()}</p>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
							<button
								type="button"
								onClick={() => {
									setShowViewModal(false);
									setViewRecord(null);
									setFamilyInfo(null);
								}}
								className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function FDPEconomicPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			}
		>
			<FDPEconomicContent />
		</Suspense>
	);
}
