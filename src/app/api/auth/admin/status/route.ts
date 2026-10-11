import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN" },
    });

    return NextResponse.json({
      success: true,
      hasEnrolledAdmin: Boolean(admin && admin.isFaceEnrolled),
      adminUsername: admin?.username || null,
      lastLoginAt: admin?.lastLoginAt || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
