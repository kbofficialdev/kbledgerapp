import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("kb_admin_session")?.value;
  if (token) {
    const { invalidateSessionInDb } = await import("@/lib/session-db");
    await invalidateSessionInDb(token);
  }

  const response = NextResponse.json({
    success: true,
    message: "Admin logged out successfully.",
  });

  clearAdminCookie(response);
  return response;
}

