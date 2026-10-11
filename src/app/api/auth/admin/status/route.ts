import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN", isFaceEnrolled: true },
    });

    const hasEnrolledAdmin = Boolean(admin && admin.isFaceEnrolled);

    return NextResponse.json({
      success: true,
      hasEnrolledAdmin,
      isRegistrationAllowed: !hasEnrolledAdmin,
      adminUsername: admin?.username || null,
      lastLoginAt: admin?.lastLoginAt || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
