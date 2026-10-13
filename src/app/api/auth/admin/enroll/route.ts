import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminToken, requireAdminSession, setAdminCookie } from "@/lib/auth-session";
import { sanitizeApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

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
      where: { role: "ADMIN", isFaceEnrolled: true },
    });

    // If admin face is already enrolled:
    // Registration is disabled unless caller holds a valid cryptographically signed Admin session
    if (existingAdmin) {
      const auth = await requireAdminSession(req);
      if (!auth.authorized) {
        return NextResponse.json(
          {
            success: false,
            registrationDisabled: true,
            error:
              "Admin registration is permanently disabled. Administrator face is already enrolled.",
          },
          { status: 403 }
        );
      }
    }

    let admin;
    if (existingAdmin) {
      admin = await prisma.adminProfile.update({
        where: { id: existingAdmin.id },
        data: {
          username: username.trim(),
          isFaceEnrolled: true,
          faceDescriptor: faceDescriptor,
          fallbackPinHash: fallbackPin || existingAdmin.fallbackPinHash || null,
        },
      });
    } else {
      admin = await prisma.adminProfile.create({
        data: {
          username: username.trim(),
          role: "ADMIN",
          isFaceEnrolled: true,
          faceDescriptor: faceDescriptor,
          fallbackPinHash: fallbackPin || process.env.ADMIN_FALLBACK_PIN || null,
        },
      });
    }

    const newSessionToken = await createAdminToken(admin.username);

    // Log enrollment event
    await prisma.systemAuditLog.create({
      data: {
        actor: admin.username,
        action: existingAdmin ? "ADMIN_FACE_RE_TRAINED" : "INITIAL_ADMIN_FACE_ENROLLED",
        metadata: { vectorLength: faceDescriptor.length },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Admin face biometrics enrolled successfully! Registration is now permanently disabled.",
      sessionToken: newSessionToken,
      admin: {
        id: admin.id,
        username: admin.username,
        isFaceEnrolled: admin.isFaceEnrolled,
      },
    });
    setAdminCookie(response, newSessionToken);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Biometric registration failed. Please try again.") },
      { status: 500 }
    );
  }
}
