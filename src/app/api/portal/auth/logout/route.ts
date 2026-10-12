import { NextRequest, NextResponse } from "next/server";
import { clearCustomerCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Customer logged out successfully.",
    });

    clearCustomerCookie(response);

    return response;
  } catch (error: any) {
    console.error("[Customer Logout Error]:", error);
    return NextResponse.json({ success: true, message: "Logged out locally" });
  }
}

