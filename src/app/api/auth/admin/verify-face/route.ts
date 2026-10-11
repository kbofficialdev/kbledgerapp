import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Match Succeeded!
    const sessionToken = `kb_adm_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await prisma.$transaction([
      prisma.adminProfile.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.systemAuditLog.create({
        data: {
          actor: admin.username,
          action: "FACE_LOGIN_SUCCESS",
          metadata: {
            confidence: Math.round(similarity * 100),
            sessionToken: sessionToken.slice(0, 16),
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      match: true,
      confidence: Math.round(similarity * 100),
      sessionToken,
      admin: {
        username: admin.username,
        role: admin.role,
        lastLoginAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Face verification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
