"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Search, Upload, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isSuperUser } from "@/lib/auth-utils";
import { hasLoanAccess as checkLoanAccess } from "@/lib/loan-access-utils";
import SectionAccessDenied from "@/components/SectionAccessDenied";

type InterventionData = {
    INTERVENTION_ID?: number;
    FAMILY_ID?: string;
    PROGRAM?: string;
    REGIONAL_COUNCIL?: string;
    HEAD_NAME?: string;
    MENTOR?: string;
    INTERVENTION_STATUS?: string;
    INTERVENTION_FRAMEWORK_DIMENSIONS?: string;
    MAIN_INTERVENTION?: string;
    LOAN_AMOUNT?: number;
    MEMBER_ID?: string;
    MEMBER_NAME?: string;
    CNIC?: string;
    MAIN_TRADE?: string;
    SUB_TRADES?: string;
};

type LoanData = {
    Intervention_ID?: number;
    Family_ID: string;
    Member_ID?: string;
    Letter_Ref?: string;
    Letter_Date?: string;
    Bank_Name?: string;
    Bank_Branch?: string;
    Account_Title?: string;
    Account_Number?: string;
    Lien_Percentage?: number;
    Beneficiary_Contact?: string;
    Beneficiary_CNIC?: string;
    Recommended_Tenure_Months?: number;
    Grace_Period_Months?: number;
    Recommended_Branch?: string;
    Loan_Status?: string;
    Post_Date?: string;
    Post_By?: string;
    Approved_Date?: string;
    Approved_By?: string;
    bank_send?: boolean;
    bank_send_date?: string;
    collateral_mark?: boolean;
    collateral_date?: string;
};

type InterventionListItem = {
    FAMILY_ID?: string;
    PROGRAM?: string;
    REGIONAL_COUNCIL?: string;
    LOCAL_COUNCIL?: string;
    JAMAT_KHANA?: string;
    HEAD_NAME?: string;
    MEMBER_NAME?: string;
    AREA_TYPE?: string;
    MENTOR?: string;
    INTERVENTION_ID?: string;
    INTERVENTION_STATUS?: string;
    INTERVENTION_FRAMEWORK_DIMENSIONS?: string;
    MAIN_INTERVENTION?: string;
    INTERVENTION_TYPE?: string;
    TOTAL_AMOUNT?: number;
    LOAN_AMOUNT?: number;
    MEMBER_ID?: string;
    ACTIVE?: string;
    CNIC?: string;
    MAIN_TRADE?: string;
    SUB_TRADES?: string;
    Finance_Officer?: string;
};

const HBL_FMB_BRANCHES = [
    "HBL FMB Main Branch Karachi",
    "HBL FMB Clifton Branch",
    "HBL FMB Saddar Branch",
    "HBL FMB DHA Branch",
    "HBL FMB North Nazimabad Branch",
    "HBL FMB Gulshan Branch",
    "HBL FMB Hyderabad Main Branch",
    "HBL FMB Qasimabad Branch",
    "HBL FMB Latifabad Branch",
    "HBL FMB Gilgit Branch",
    "HBL FMB Skardu Branch",
    "HBL FMB Hunza Branch",
    "HBL FMB Chitral Main Branch",
    "HBL FMB Blue Area Branch",
    "HBL FMB F-10 Branch",
    "HBL FMB G-9 Branch",
    "HBL FMB I-8 Branch",
    "HBL FMB Main Branch Lahore",
    "HBL FMB MM Alam Road Branch",
    "HBL FMB DHA Branch Lahore",
    "HBL FMB Liberty Branch",
    "HBL FMB Model Town Branch",
    "HBL FMB Gulberg Branch"
];

type InterventionListFilters = {
    familyId: string;
    mentor: string;
    headName: string;
    financeOfficer: string;
    loanAmount: string;
    interventionId: string;
};

export default function AddLoanRecordPage() {
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interventionId, setInterventionId] = useState<string>("");
    const [interventionData, setInterventionData] = useState<InterventionData | null>(null);
    const [loadingIntervention, setLoadingIntervention] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [showInterventionList, setShowInterventionList] = useState(false);
    const [interventionList, setInterventionList] = useState<InterventionListItem[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [mentorOptions, setMentorOptions] = useState<string[]>([]);
    const [financeOfficerOptions, setFinanceOfficerOptions] = useState<string[]>([]);
    const [listFilters, setListFilters] = useState<InterventionListFilters>({
        familyId: "",
        mentor: "",
        headName: "",
        financeOfficer: "",
        loanAmount: "",
        interventionId: ""
    });
    const [uploadedFiles, setUploadedFiles] = useState<{
        cnic: File | null;
        kyc: File | null;
        agreementLetter: File | null;
    }>({
        cnic: null,
        kyc: null,
        agreementLetter: null,
    });

    // Effective finance officer key: comes from user.finance_officer if available,
    // otherwise falls back to user full name.
    const [effectiveFinanceOfficer, setEffectiveFinanceOfficer] = useState<string | undefined>(undefined);

    // Check loan access permission
    useEffect(() => {
        if (authLoading) return;

        // Check multiple sources for access_loans value
        let accessLoansValue = userProfile?.access_loans;
        
        // Fallback to localStorage if userProfile doesn't have it
        if ((accessLoansValue === null || accessLoansValue === undefined) && typeof window !== "undefined") {
            const storedValue = localStorage.getItem('access_loans');
            if (storedValue) {
                accessLoansValue = storedValue;
            }
            
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsedData = JSON.parse(userData);
                    if (parsedData.access_loans !== undefined && parsedData.access_loans !== null) {
                        accessLoansValue = parsedData.access_loans;
                    }
                } catch (e) {
                    console.error('Error parsing userData:', e);
                }
            }
        }

        // Check if user has loan access (access_loans = 1 or "Yes")
        const userHasLoanAccess = checkLoanAccess(accessLoansValue);

        // Also check if user is admin or super user (has full access)
        const isAdmin = userProfile?.username && userProfile.username.toLowerCase() === 'admin';
        const supperUserValue = userProfile?.supper_user;
        const userIsSuperUser = isAdmin || isSuperUser(supperUserValue);

        // Debug logging
        if (typeof window !== "undefined") {
            console.log("=== ADD LOAN RECORD ACCESS CHECK ===", {
                username: userProfile?.username,
                access_loans: accessLoansValue,
                hasLoanAccess: userHasLoanAccess,
                isSuperUser: userIsSuperUser,
                willGrantAccess: userHasLoanAccess || userIsSuperUser
            });
        }

        if (!userHasLoanAccess && !userIsSuperUser) {
            setHasAccess(false);
            // DO NOT redirect - user requested to stay on access denied page
        } else {
            setHasAccess(true);
        }
    }, [userProfile, authLoading]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const stored = localStorage.getItem("userData");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.finance_officer) {
                    setEffectiveFinanceOfficer(String(parsed.finance_officer).trim());
                    return;
                }
                if (parsed.name) {
                    setEffectiveFinanceOfficer(String(parsed.name).trim());
                    return;
                }
            }
        } catch {
            // ignore JSON errors
        }

        if (userProfile?.full_name) {
            setEffectiveFinanceOfficer(userProfile.full_name.trim());
        }
    }, [userProfile?.full_name]);

    const isSuperFinanceOfficer = (effectiveFinanceOfficer || "").trim().toLowerCase() === "all";

    const [formData, setFormData] = useState<LoanData>({
        Intervention_ID: undefined,
        Family_ID: "",
        Member_ID: "",
        Letter_Ref: "",
        Letter_Date: "",
        Bank_Name: "HBL Microfinance Bank",
        Bank_Branch: "",
        Account_Title: "",
        Account_Number: "",
        Lien_Percentage: 0,
        Beneficiary_Contact: "",
        Beneficiary_CNIC: "",
        Recommended_Tenure_Months: 0,
        Grace_Period_Months: 0,
        Recommended_Branch: "",
        Loan_Status: "Pending",
        Approved_Date: "",
        Approved_By: "",
        bank_send: false,
        bank_send_date: "",
        collateral_mark: false,
        collateral_date: "",
    });

    // Set today's date for Letter_Date on the client side only to avoid hydration mismatch
    useEffect(() => {
        if (!formData.Letter_Date) {
            const today = new Date().toISOString().split("T")[0];
            setFormData(prev => ({
                ...prev,
                Letter_Date: today,
            }));
        }
    }, [formData.Letter_Date]);

    const generateLetterRef = async () => {
        try {
            const response = await fetch('/api/loan-authorization?getNextRef=true');
            const data = await response.json();
            if (data.success && data.nextRef) {
                return data.nextRef;
            }
        } catch (error) {
            console.error("Error generating letter reference:", error);
        }
        return "RL-0001";
    };

    const fetchInterventionData = async (overrideId?: string) => {
        const lookupId = (overrideId || interventionId).trim();
        if (!lookupId) {
            setError("Please enter an Intervention ID");
            setHasSearched(true);
            return;
        }

        setHasSearched(true);
        setLoadingIntervention(true);
        setError(null);

        try {
            const response = await fetch(`/api/intervention-data?interventionId=${lookupId}`);
            const data = await response.json();

            if (data.success && data.intervention) {
                setInterventionData(data.intervention);
                setInterventionId(lookupId);
                const letterRef = await generateLetterRef();

                // Calculate Lien Percentage = Loan Amount / 0.9 (rounded to nearest whole number)
                const loanAmount = Number(data.intervention.LOAN_AMOUNT) || 0;
                const lienPercentage = loanAmount ? Math.round(loanAmount / 0.9) : 0;

                setFormData(prev => ({
                    ...prev,
                    Intervention_ID: data.intervention.INTERVENTION_ID,
                    Family_ID: data.intervention.FAMILY_ID || "",
                    Member_ID: data.intervention.MEMBER_ID || "",
                    Account_Title: data.intervention.MEMBER_NAME || "",
                    Beneficiary_CNIC: data.intervention.CNIC || "",
                    Lien_Percentage: lienPercentage,
                    Letter_Ref: letterRef,
                }));
            } else {
                setError(data.message || "Intervention data not found");
                setInterventionData(null);
            }
        } catch (err) {
            setError("Error fetching intervention data");
            console.error("Error fetching intervention data:", err);
            setInterventionData(null);
        } finally {
            setLoadingIntervention(false);
        }
    };

    const fetchInterventionList = async () => {
        setListLoading(true);
        setListError(null);
        try {
            const params = new URLSearchParams();
            params.append("list", "true");
            Object.entries(listFilters).forEach(([key, value]) => {
                // Finance Officer is handled separately below
                if (key === "financeOfficer") return;
                if (value.trim()) {
                    params.append(key, value.trim());
                }
            });

            // Finance Officer restriction:
            // - If user Finance_Officer = 'All' → only apply when a specific FO is chosen in the dropdown
            // - Otherwise → always restrict to the logged-in officer mapping
            if (isSuperFinanceOfficer) {
                const selectedFO = listFilters.financeOfficer.trim();
                if (selectedFO) {
                    params.set("financeOfficer", selectedFO);
                }
            } else if (effectiveFinanceOfficer) {
                params.set("financeOfficer", effectiveFinanceOfficer);
            }

            const response = await fetch(`/api/intervention-data?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                const interventions: InterventionListItem[] = data.interventions || [];
                setInterventionList(interventions);

                // Build dropdown options for Mentor and Finance Officer
                const mentorSet = new Set<string>();
                const financeOfficerSet = new Set<string>();
                interventions.forEach(item => {
                    if (item.MENTOR) mentorSet.add(item.MENTOR);
                    if (item.Finance_Officer) financeOfficerSet.add(item.Finance_Officer);
                });
                setMentorOptions(Array.from(mentorSet).sort());
                setFinanceOfficerOptions(Array.from(financeOfficerSet).sort());
            } else {
                setListError(data.message || "Unable to load interventions");
            }
        } catch (err) {
            console.error("Error fetching intervention list:", err);
            setListError("Unable to load interventions");
        } finally {
            setListLoading(false);
        }
    };

    const handleOpenList = () => {
        setShowInterventionList((prev) => {
            const next = !prev;
            if (next) {
                fetchInterventionList();
            }
            return next;
        });
    };

    const handleUseInterventionFromList = (id?: string) => {
        if (!id) return;
        setShowInterventionList(false);
        setInterventionId(id);
        fetchInterventionData(id);
    };

    const handleListFilterChange = (field: keyof InterventionListFilters, value: string) => {
        setListFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target;
        const { name, value, type } = target;
        const checked = (target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        // Validate that Intervention_ID is present
        if (!formData.Intervention_ID) {
            setError("Please search for a valid Intervention ID before saving.");
            setSaving(false);
            return;
        }

        try {
            let uploadedFilesPaths: { [key: string]: string } = {};

            if (uploadedFiles.cnic || uploadedFiles.kyc || uploadedFiles.agreementLetter) {
                const uploadFormData = new FormData();
                uploadFormData.append("interventionId", formData.Intervention_ID?.toString() || "");
                uploadFormData.append("letterRef", formData.Letter_Ref || "");

                if (uploadedFiles.cnic) uploadFormData.append("cnic", uploadedFiles.cnic);
                if (uploadedFiles.kyc) uploadFormData.append("kyc", uploadedFiles.kyc);
                if (uploadedFiles.agreementLetter) uploadFormData.append("agreementLetter", uploadedFiles.agreementLetter);

                const uploadResponse = await fetch("/api/upload-documents", {
                    method: "POST",
                    body: uploadFormData,
                });

                const uploadResult = await uploadResponse.json();

                if (uploadResult.success) {
                    uploadedFilesPaths = uploadResult.files;
                } else {
                    setError(uploadResult.message || "Failed to upload documents");
                    return;
                }
            }

            const loanDataWithFiles = {
                ...formData,
                cnic_path: uploadedFilesPaths.cnic || null,
                kyc_path: uploadedFilesPaths.kyc || null,
                agreement_letter_path: uploadedFilesPaths.agreementLetter || null,
            };

            console.log('Submitting loan data:', loanDataWithFiles);

            const response = await fetch("/api/loan-authorization", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loanDataWithFiles),
            });

            const result = await response.json();

            if (result.success) {
                router.push('/dashboard/finance/loan-process');
            } else {
                setError(result.message || "Failed to save loan record");
            }
        } catch (err) {
            setError("Error saving loan record");
            console.error("Error saving loan record:", err);
        } finally {
            setSaving(false);
        }
    };

    // Show access denied if user doesn't have permission
    if (hasAccess === false) {
        return <SectionAccessDenied sectionName="Add Loan Record" requiredPermission="access_loans" />;
    }

    // Show loading while checking access
    if (hasAccess === null || authLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
                    <span className="ml-3 text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add New Loan Record</h1>
                    <p className="text-gray-600 mt-2">Create a new loan authorization record</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/finance/loan-process')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Loan Process
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Intervention Lookup [its take time]</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Intervention ID</label>
                            <input
                                type="text"
                                value={interventionId}
                                onChange={(e) => {
                                    setInterventionId(e.target.value);
                                    setHasSearched(false);
                                    setInterventionData(null);
                                    setError(null);
                                }}
                                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                placeholder="Enter Intervention ID"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={() => fetchInterventionData()}
                                disabled={loadingIntervention}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingIntervention ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                                {loadingIntervention ? "Searching..." : "Search"}
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenList}
                                disabled={listLoading}
                                title="View latest interventions"
                                className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
                            >
                                ?
                            </button>
                        </div>
                    </div>
                    {showInterventionList && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
                            <div className="flex flex-wrap items-center gap-3 justify-between">
                                <h4 className="text-sm font-medium text-gray-900">Intervention Explorer</h4>
                                <button
                                    type="button"
                                    onClick={fetchInterventionList}
                                    disabled={listLoading}
                                    className="px-3 py-1 text-xs font-medium text-[#0b4d2b] border border-[#0b4d2b] rounded-md hover:bg-[#0b4d2b] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Refresh
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={listFilters.familyId}
                                    onChange={(e) => handleListFilterChange("familyId", e.target.value)}
                                    placeholder="Filter by Family ID"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b]/30 focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={listFilters.interventionId}
                                    onChange={(e) => handleListFilterChange("interventionId", e.target.value)}
                                    placeholder="Filter by Intervention ID"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b]/30 focus:outline-none"
                                />
                                <select
                                    value={listFilters.mentor}
                                    onChange={(e) => handleListFilterChange("mentor", e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b]/30 focus:outline-none"
                                >
                                    <option value="">All Mentors</option>
                                    {mentorOptions.map((mentor) => (
                                        <option key={mentor} value={mentor}>
                                            {mentor}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={listFilters.headName}
                                    onChange={(e) => handleListFilterChange("headName", e.target.value)}
                                    placeholder="Filter by Head Name"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b]/30 focus:outline-none"
                                />
                                <div className="flex flex-col gap-2">
                                    <select
                                        value={
                                            isSuperFinanceOfficer
                                                ? listFilters.financeOfficer
                                                : effectiveFinanceOfficer || ""
                                        }
                                        onChange={
                                            isSuperFinanceOfficer
                                                ? (e) => handleListFilterChange("financeOfficer", e.target.value)
                                                : undefined
                                        }
                                        disabled={!isSuperFinanceOfficer}
                                        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${
                                            isSuperFinanceOfficer
                                                ? "bg-white focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b]/30 focus:outline-none"
                                                : "bg-gray-50 text-gray-700 cursor-not-allowed"
                                        }`}
                                    >
                                        {isSuperFinanceOfficer ? (
                                            <>
                                                <option value="">All Finance Officers</option>
                                                {financeOfficerOptions.map((fo) => (
                                                    <option key={fo} value={fo}>
                                                        {fo}
                                                    </option>
                                                ))}
                                            </>
                                        ) : (
                                            <option>
                                                {effectiveFinanceOfficer || "Finance Officer"}
                                            </option>
                                        )}
                                    </select>
                                    <input
                                        type="number"
                                        value={listFilters.loanAmount}
                                        onChange={(e) => handleListFilterChange("loanAmount", e.target.value)}
                                        placeholder="Filter by Loan Amount"
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b]/30 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchInterventionList}
                                    disabled={listLoading}
                                    className="px-3 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply Filters
                                </button>
                            </div>
                            {listError && (
                                <p className="text-sm text-red-600">{listError}</p>
                            )}
                            <div className="max-h-64 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="sticky top-0 bg-white">
                                        <tr>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">Intervention ID</th>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">Family ID</th>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">Program</th>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">Member Name</th>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">Mentor</th>
                                            <th className="px-2 py-1 text-left font-medium text-gray-600">Finance Officer</th>
                                            <th className="px-2 py-1 text-right font-medium text-gray-600">Status</th>
                                            <th className="px-2 py-1 text-right font-medium text-gray-600">Loan Amt</th>
                                            <th className="px-2 py-1 text-right font-medium text-gray-600">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {listLoading ? (
                                            <tr>
                                                <td colSpan={8} className="px-2 py-4 text-center text-gray-500">
                                                    Loading interventions...
                                                </td>
                                            </tr>
                                        ) : interventionList.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-2 py-4 text-center text-gray-500">
                                                    No interventions found.
                                                </td>
                                            </tr>
                                        ) : (
                                            interventionList.map((item) => (
                                                <tr
                                                    key={`${item.INTERVENTION_ID}-${item.FAMILY_ID}`}
                                                    className="hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => handleUseInterventionFromList(item.INTERVENTION_ID)}
                                                >
                                                    <td className="px-2 py-1 font-medium text-gray-800">{item.INTERVENTION_ID || "-"}</td>
                                                    <td className="px-2 py-1 text-gray-600">{item.FAMILY_ID || "-"}</td>
                                                    <td className="px-2 py-1 text-gray-600">{item.PROGRAM || "-"}</td>
                                                    <td className="px-2 py-1 text-gray-600">{item.MEMBER_NAME || "-"}</td>
                                                    <td className="px-2 py-1 text-gray-600">{item.MENTOR || "-"}</td>
                                                    <td className="px-2 py-1 text-gray-600">{item.Finance_Officer || "-"}</td>
                                                    <td className="px-2 py-1 text-right text-gray-600">{item.INTERVENTION_STATUS || "-"}</td>
                                                    <td className="px-2 py-1 text-right text-gray-600">
                                                        {item.LOAN_AMOUNT ? item.LOAN_AMOUNT.toLocaleString("en-PK") : "-"}
                                                    </td>
                                                    <td className="px-2 py-1 text-right">
                                                        <button
                                                            type="button"
                                                            className="px-2 py-1 text-[10px] font-medium text-[#0b4d2b] border border-[#0b4d2b] rounded-md hover:bg-[#0b4d2b] hover:text-white transition-colors"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleUseInterventionFromList(item.INTERVENTION_ID);
                                                            }}
                                                        >
                                                            Use ID
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {interventionData && (
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Intervention Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Family ID</label>
                                <input type="text" value={interventionData.FAMILY_ID || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Program</label>
                                <input type="text" value={interventionData.PROGRAM || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Regional Council</label>
                                <input type="text" value={interventionData.REGIONAL_COUNCIL || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Head Name</label>
                                <input type="text" value={interventionData.HEAD_NAME || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Mentor</label>
                                <input type="text" value={interventionData.MENTOR || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Intervention Status</label>
                                <input type="text" value={interventionData.INTERVENTION_STATUS || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Framework Dimensions</label>
                                <input type="text" value={interventionData.INTERVENTION_FRAMEWORK_DIMENSIONS || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Main Intervention</label>
                                <input type="text" value={interventionData.MAIN_INTERVENTION || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Loan Amount</label>
                                <input type="text" value={interventionData.LOAN_AMOUNT ? interventionData.LOAN_AMOUNT.toString() : ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Member ID</label>
                                <input type="text" value={interventionData.MEMBER_ID || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Member Name</label>
                                <input type="text" value={interventionData.MEMBER_NAME || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">CNIC</label>
                                <input type="text" value={interventionData.CNIC || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Main Trade</label>
                                <input type="text" value={interventionData.MAIN_TRADE || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Sub Trades</label>
                                <input type="text" value={interventionData.SUB_TRADES || ""} readOnly className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100" />
                            </div>
                        </div>
                    </div>
                )}

                {hasSearched && !interventionData && !loadingIntervention && (
                    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Intervention Not Found</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>This intervention ID was not found in the system. Please contact your mentor for assistance.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {interventionData && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Letter Reference</label>
                                    <input type="text" name="Letter_Ref" value={formData.Letter_Ref} readOnly className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Letter Date</label>
                                    <input type="date" name="Letter_Date" value={formData.Letter_Date} readOnly className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Bank & Account Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                    <input type="text" name="Bank_Name" value={formData.Bank_Name} readOnly className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Branch</label>
                                    <select
                                        name="Bank_Branch"
                                        value={formData.Bank_Branch}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select Bank Branch</option>
                                        {HBL_FMB_BRANCHES.map((branch) => (
                                            <option key={branch} value={branch}>
                                                {branch}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Title</label>
                                    <input type="text" name="Account_Title" value={formData.Account_Title} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">IBAN Account Number (24 characters)</label>
                                    <input
                                        type="text"
                                        name="Account_Number"
                                        value={formData.Account_Number}
                                        onChange={(e) => {
                                            // Allow only letters/numbers, no spaces, always uppercase
                                            const raw = e.target.value.replace(/\s/g, "").toUpperCase();
                                            const value = raw.slice(0, 24);
                                            setFormData(prev => ({
                                                ...prev,
                                                Account_Number: value,
                                            }));
                                        }}
                                        maxLength={24}
                                        placeholder="PKXXXXXXXXXXXXXXXXXXXXXXXX"
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none font-mono"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Enter IBAN in format: PK followed by 22 characters</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Lien Percentage <span className="text-xs text-gray-500">(Loan Amount / 0.9)</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="Lien_Percentage"
                                        value={formData.Lien_Percentage}
                                        readOnly
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm bg-gray-50 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Beneficiary Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary Contact</label>
                                    <input
                                        type="text"
                                        name="Beneficiary_Contact"
                                        value={formData.Beneficiary_Contact}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary CNIC</label>
                                    <input
                                        type="text"
                                        name="Beneficiary_CNIC"
                                        value={formData.Beneficiary_CNIC || ""}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
                                            let formatted = digits;
                                            if (digits.length > 5 && digits.length <= 12) {
                                                formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
                                            } else if (digits.length > 12) {
                                                formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
                                            }
                                            handleInputChange({
                                                ...e,
                                                target: { ...e.target, value: formatted },
                                            } as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        maxLength={15}
                                        placeholder="12345-1234567-1"
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Format: 12345-1234567-1</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Loan Details</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Tenure (Months)</label>
                                    <input type="number" name="Recommended_Tenure_Months" value={formData.Recommended_Tenure_Months} onChange={handleInputChange} min="0" className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (Months)</label>
                                    <input type="number" name="Grace_Period_Months" value={formData.Grace_Period_Months} onChange={handleInputChange} min="0" className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Recommended Branch</label>
                                    <input type="text" name="Recommended_Branch" value={formData.Recommended_Branch} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700">Bank Send</label>
                                    <input
                                        type="checkbox"
                                        name="bank_send"
                                        checked={!!formData.bank_send}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-[#0b4d2b] border-gray-300 rounded"
                                    />
                                    {formData.bank_send && (
                                        <input
                                            type="date"
                                            name="bank_send_date"
                                            value={formData.bank_send_date || ""}
                                            onChange={handleInputChange}
                                            className="ml-4 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700">Collateral Mark</label>
                                    <input
                                        type="checkbox"
                                        name="collateral_mark"
                                        checked={!!formData.collateral_mark}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-[#0b4d2b] border-gray-300 rounded"
                                    />
                                    {formData.collateral_mark && (
                                        <input
                                            type="date"
                                            name="collateral_date"
                                            value={formData.collateral_date || ""}
                                            onChange={handleInputChange}
                                            className="ml-4 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Status</label>
                                    <select
                                        name="Loan_Status"
                                        value={formData.Loan_Status}
                                        onChange={handleInputChange}
                                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Banking Sending Process">Banking Sending Process</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Disbursed">Disbursed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 col-span-2">
                                <h3 className="text-lg font-medium text-gray-900">Document Upload</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Document</label>
                                        <div className="flex items-center gap-3">
                                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setUploadedFiles(prev => ({ ...prev, cnic: e.target.files?.[0] || null }))} className="hidden" id="cnic-upload" />
                                            <label htmlFor="cnic-upload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 transition-colors">
                                                <Upload className="h-4 w-4" />
                                                Choose CNIC File
                                            </label>
                                            {uploadedFiles.cnic && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FileText className="h-4 w-4" />
                                                    {uploadedFiles.cnic.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">KYC Document</label>
                                        <div className="flex items-center gap-3">
                                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setUploadedFiles(prev => ({ ...prev, kyc: e.target.files?.[0] || null }))} className="hidden" id="kyc-upload" />
                                            <label htmlFor="kyc-upload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 transition-colors">
                                                <Upload className="h-4 w-4" />
                                                Choose KYC File
                                            </label>
                                            {uploadedFiles.kyc && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FileText className="h-4 w-4" />
                                                    {uploadedFiles.kyc.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Agreement Letter</label>
                                        <div className="flex items-center gap-3">
                                            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setUploadedFiles(prev => ({ ...prev, agreementLetter: e.target.files?.[0] || null }))} className="hidden" id="agreement-upload" />
                                            <label htmlFor="agreement-upload" className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 transition-colors">
                                                <Upload className="h-4 w-4" />
                                                Choose Agreement Letter
                                            </label>
                                            {uploadedFiles.agreementLetter && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <FileText className="h-4 w-4" />
                                                    {uploadedFiles.agreementLetter.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                            <button type="button" onClick={() => router.push('/dashboard/finance/loan-process')} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {saving ? "Saving..." : "Save Record"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}