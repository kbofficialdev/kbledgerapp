import { NextRequest, NextResponse } from "next/server";
import { clearCustomerCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("kb_customer_session")?.value;
  if (token) {
    const { invalidateSessionInDb } = await import("@/lib/session-db");
    await invalidateSessionInDb(token);
  }

  const response = NextResponse.json({
    success: true,
    redirectUrl: "/customer/login",
    message: "Signed out of customer portal.",
  });

  clearCustomerCookie(response);
  return response;
}

