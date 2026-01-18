import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const normalize = (v?: string | null) => (v ?? "").trim().toLowerCase();
const isAdminType = (v?: string | null) =>
  ["super admin", "supper admin"].includes(normalize(v));

// Allowed email for settings access (in addition to Super Admin)
const ALLOWED_SETTINGS_EMAIL = "karim.fayazi@sjdap.org";
const isAllowedEmail = (email?: string | null) => {
  if (!email) return false;
  return normalize(email) === normalize(ALLOWED_SETTINGS_EMAIL);
};

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    // Handle both numeric UserId and string email_address
    // Try to parse userId as number first, if it fails, treat as string (email)
    const userIdNum = userId && !isNaN(Number(userId)) ? parseInt(userId, 10) : null;
    const userIdStr = userId ? String(userId).trim() : null;
    const eml = (email ?? "").trim();

    if (!userIdNum && !userIdStr && !eml) {
      return NextResponse.json(
        { ok: false, isSuperAdmin: false, userType: null, error: "userId or email required" },
        { status: 400 }
      );
    }

    const pool = await getDb();
    const request = pool.request();
    
    // Build query to handle both numeric UserId and string email_address
    const q = `
      SELECT TOP 1 UserId, email_address, UserType
      FROM [SJDA_Users].[dbo].[PE_User]
      WHERE (@UserId IS NOT NULL AND UserId = @UserId)
         OR (@Email IS NOT NULL AND email_address = @Email);
    `;

    // Set parameters - use numeric UserId if available
    request.input("UserId", userIdNum && userIdNum > 0 ? userIdNum : null);
    // Use email parameter if provided, otherwise use userIdStr (could be email or other identifier)
    const emailToUse = eml || userIdStr || null;
    request.input("Email", emailToUse);
    
    const r = await request.query(q);

    const row = r.recordset?.[0];
    const userType = row?.UserType ?? null;
    const userEmail = row?.email_address ?? null;

    // Check if user is Super Admin by type OR has allowed email
    const isSuperAdminByType = isAdminType(userType);
    const hasAllowedEmail = isAllowedEmail(userEmail);
    const hasAccess = isSuperAdminByType || hasAllowedEmail;

    console.log('[check-super-admin] Result:', {
      userId: userId,
      email: email,
      userIdNum: userIdNum,
      userIdStr: userIdStr,
      emailToUse: emailToUse,
      found: !!row,
      userType: userType,
      userEmail: userEmail,
      isSuperAdminByType: isSuperAdminByType,
      hasAllowedEmail: hasAllowedEmail,
      hasAccess: hasAccess
    });

    return NextResponse.json({
      ok: true,
      isSuperAdmin: hasAccess,
      userType,
      userEmail,
      found: !!row,
    });
  } catch (e: any) {
    console.error('[check-super-admin] Error:', e);
    return NextResponse.json(
      { ok: false, isSuperAdmin: false, userType: null, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
