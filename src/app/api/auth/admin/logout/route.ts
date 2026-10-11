import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    // Clear the HTTP-only cookie
    response.cookies.set("kb_admin_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    console.error("[Admin Logout Error]:", error);
    return NextResponse.json({ success: true, message: "Logged out locally" });
  }
}

