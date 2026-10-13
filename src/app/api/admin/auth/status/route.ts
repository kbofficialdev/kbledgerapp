import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminSession = await getAdminSession(req);
    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN" },
    });

    const isAuth = Boolean(adminSession);
    return NextResponse.json({
      success: true,
      authenticated: isAuth,
      isAuthenticated: isAuth,
      username: isAuth ? adminSession?.username || admin?.username || null : null,
      role: isAuth ? "ADMIN" : null,
      adminEmail: isAuth ? admin?.email || null : null,
      hasEnrolledAdmin: Boolean(admin),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to verify admin status.") },
      { status: 500 }
    );
  }
}
