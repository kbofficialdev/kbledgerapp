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

    return NextResponse.json({
      success: true,
      authenticated: Boolean(adminSession),
      isAuthenticated: Boolean(adminSession),
      username: adminSession?.username || null,
      role: adminSession ? "ADMIN" : null,
      adminEmail: process.env.EMAIL_USER || "noreply.kb.app@gmail.com",
      hasEnrolledAdmin: Boolean(admin),
    });
  } catch (error: any) {
    console.error("[Admin Auth Status Error]:", error);
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Failed to verify admin status.") },
      { status: 500 }
    );
  }
}

