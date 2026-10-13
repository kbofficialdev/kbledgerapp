import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeApiError } from "@/lib/api-error";

function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 999;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { liveDescriptor } = body;

    if (!liveDescriptor || !Array.isArray(liveDescriptor)) {
      return NextResponse.json(
        { success: false, error: "Missing facial biometric descriptor" },
        { status: 400 }
      );
    }

    const admin = await prisma.adminProfile.findFirst({
      where: { role: "ADMIN", isFaceEnrolled: true },
    });

    if (!admin || !admin.faceDescriptor) {
      return NextResponse.json(
        {
          success: false,
          needsEnrollment: true,
          error: "No administrator face currently enrolled. Please enroll first in Admin Settings.",
        },
        { status: 404 }
      );
    }

    const enrolledDescriptor = admin.faceDescriptor as unknown as number[];

    const similarity = computeCosineSimilarity(liveDescriptor, enrolledDescriptor);
    const distance = computeEuclideanDistance(liveDescriptor, enrolledDescriptor);

    // Strict threshold: Cosine similarity >= 0.80 or distance <= 0.45
    const isStrictMatch = similarity >= 0.80 || distance <= 0.45;

    if (!isStrictMatch) {
      // Log failed attempt
      await prisma.systemAuditLog.create({
        data: {
          actor: "ANONYMOUS_FACE_LOGIN",
          action: "FACE_LOGIN_REJECTED",
          metadata: {
            similarity: Math.round(similarity * 100) / 100,
            distance: Math.round(distance * 100) / 100,
          },
        },
      });

      return NextResponse.json({
        success: false,
        match: false,
        confidence: Math.round(similarity * 100),
        error: `Face does not match registered admin profile (Similarity: ${Math.round(similarity * 100)}%).`,
      });
    }

    // Match Succeeded: Dispatch MFA OTP to Admin Email
    const adminEmail = admin.email || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, error: "Administrator email not configured." },
        { status: 400 }
      );
    }
    const otp = generateOtp("admin_mfa");
    await sendOtpEmail({
      to: adminEmail,
      name: admin.username,
      otp,
      role: "ADMIN",
    });

    await prisma.systemAuditLog.create({
      data: {
        actor: admin.username,
        action: "FACE_VERIFIED_MFA_OTP_DISPATCHED",
        metadata: {
          confidence: Math.round(similarity * 100),
          dispatchedTo: adminEmail,
        },
      },
    });

    const maskedEmail = adminEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      success: true,
      match: true,
      requiresMfa: true,
      confidence: Math.round(similarity * 100),
      maskedEmail,
      admin: {
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: sanitizeApiError(error, "Biometric authentication failed. Please retry or use PIN.") },
      { status: 500 }
    );
  }
}

