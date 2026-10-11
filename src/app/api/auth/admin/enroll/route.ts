import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username = "kbadmin", faceDescriptor, fallbackPin } = body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length < 32) {
      return NextResponse.json(
        { success: false, error: "Valid biometric facial vector is required" },
        { status: 400 }
      );
    }

    const existingAdmin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN" },
    });

    let admin;
    if (existingAdmin) {
      admin = await prisma.adminProfile.update({
        where: { id: existingAdmin.id },
        data: {
          username: username.trim(),
          isFaceEnrolled: true,
          faceDescriptor: faceDescriptor,
          fallbackPinHash: fallbackPin || process.env.ADMIN_FALLBACK_PIN || "123456",
        },
      });
    } else {
      admin = await prisma.adminProfile.create({
        data: {
          username: username.trim(),
          role: "ADMIN",
          isFaceEnrolled: true,
          faceDescriptor: faceDescriptor,
          fallbackPinHash: fallbackPin || process.env.ADMIN_FALLBACK_PIN || "123456",
        },
      });
    }

    // Log enrollment event
    await prisma.systemAuditLog.create({
      data: {
        actor: admin.username,
        action: "ADMIN_FACE_ENROLLED",
        metadata: { vectorLength: faceDescriptor.length },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin face biometrics enrolled successfully!",
      admin: {
        id: admin.id,
        username: admin.username,
        isFaceEnrolled: admin.isFaceEnrolled,
      },
    });
  } catch (error: any) {
    console.error("Enrollment error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
