import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAdminCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("kb_admin_session")?.value;

    if (sessionToken) {
      await prisma.systemAuditLog.create({
        data: {
          actor: "kbadmin",
          action: "ADMIN_LOGOUT",
          metadata: { sessionTokenSnippet: sessionToken.slice(0, 16) },
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Admin logged out successfully.",
    });

    clearAdminCookie(response);

    return response;
  } catch (error: any) {
    console.error("[Admin Logout Error]:", error);
    return NextResponse.json({ success: true, message: "Logged out locally" });
  }
}

