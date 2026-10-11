import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    const expectedPin = process.env.ADMIN_FALLBACK_PIN || "123456";

    if (!pin || pin.trim() !== expectedPin) {
      await prisma.systemAuditLog.create({
        data: {
          actor: "ANONYMOUS_PIN_LOGIN",
          action: "PIN_LOGIN_FAILED",
        },
      });

      return NextResponse.json(
        { success: false, error: "Invalid administrator emergency PIN" },
        { status: 401 }
      );
    }

    const sessionToken = `kb_adm_pin_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await prisma.systemAuditLog.create({
      data: {
        actor: "ADMIN_EMERGENCY_PIN",
        action: "PIN_LOGIN_SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      sessionToken,
      admin: {
        username: "kbadmin",
        role: "ADMIN",
        loginMethod: "EMERGENCY_PIN",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

