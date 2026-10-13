import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN", isFaceEnrolled: true },
    });

    const hasEnrolledAdmin = Boolean(admin && admin.isFaceEnrolled);
    const sessionToken = req.cookies.get("kb_admin_session")?.value;
    const authResult = await verifyAdminToken(sessionToken);
    const isAuthenticated = authResult.valid;

    return NextResponse.json({
      success: true,
      hasEnrolledAdmin,
      isRegistrationAllowed: !hasEnrolledAdmin,
      adminUsername: isAuthenticated ? admin?.username || null : null,
      lastLoginAt: isAuthenticated ? admin?.lastLoginAt || null : null,
      isAuthenticated,
    });
  } catch (error: any) {
    console.error("[Admin Status Error]:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to verify admin status.") },
      { status: 500 }
    );
  }
}
