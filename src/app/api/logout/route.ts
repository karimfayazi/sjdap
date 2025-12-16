import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const response = NextResponse.json({
			success: true,
			message: "Logged out successfully"
		});

		// Clear the auth cookie
		response.cookies.set({
			name: "auth",
			value: "",
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			path: "/",
			sameSite: "lax",
			maxAge: 0, // Expire immediately
		});

		return response;
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Logout failed"
			},
			{ status: 500 }
		);
	}
}

