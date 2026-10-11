import nodemailer from "nodemailer";

// In-memory OTP storage with TTL (10 minutes)
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();

export function getMailTransporter() {
  const host = process.env.EMAIL_SERVER_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_SERVER_PORT || "465", 10);
  const user = process.env.EMAIL_USER || "noreply.kb.app@gmail.com";
  const pass = process.env.EMAIL_PASS || "rpdlqvcrzyuygewi";

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Generate 6-digit secure numeric OTP
 */
export function generateOtp(identifier: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(identifier.toLowerCase().trim(), { code, expiresAt, attempts: 0 });
  return code;
}

/**
 * Verify OTP
 */
export function verifyOtp(identifier: string, enteredCode: string): { valid: boolean; message: string } {
  const key = identifier.toLowerCase().trim();
  const record = otpStore.get(key);

  if (!record) {
    return { valid: false, message: "No OTP requested or OTP has expired. Please request a new OTP." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { valid: false, message: "OTP has expired. Please request a fresh OTP." };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(key);
    return { valid: false, message: "Too many failed attempts. Please request a new OTP." };
  }

  if (record.code !== enteredCode.trim()) {
    return { valid: false, message: "Invalid OTP. Please check the 6-digit code and try again." };
  }

  // Success: clear consumed OTP
  otpStore.delete(key);
  return { valid: true, message: "OTP verified successfully." };
}

/**
 * Send Welcome Email with Customer Portal Credentials
 */
export async function sendCustomerWelcomeEmail({
  to,
  customerName,
  customerCode,
  villageName,
  mobile,
  initialBalance,
  portalUrl,
}: {
  to: string;
  customerName: string;
  customerCode: string;
  villageName: string;
  mobile: string;
  initialBalance: number;
  portalUrl: string;
}): Promise<boolean> {
  try {
    const transporter = getMailTransporter();
    const from = process.env.EMAIL_FROM || "KB Khata & Fashions <noreply.kb.app@gmail.com>";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to KB Khata Portal</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
    <!-- Brand Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: rgba(255,255,255,0.2); font-weight: 900; font-size: 20px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.3);">KB</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">KB Khata & Fashions</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">గ్రామీణ వ్యాపార ఖాతా & స్మార్ట్ లెడ్జర్ పోర్టల్</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px;">
      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">నమస్కారం ${customerName} గారు,</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        KB Khata & Fashions నందు మీ కస్టమర్ ఖాతా విజయవంతంగా తెరవబడింది. మీ కొనుగోలు బిల్లులు, రశీదులు మరియు ఉద్ధార లెడ్జర్ వివరాలు మీ వ్యక్తిగత కస్టమర్ పోర్టల్ ద్వారా ఎప్పుడైనా చూసుకోవచ్చు మరియు Google Pay ద్వారా సులభంగా చెల్లించవచ్చు.
      </p>

      <!-- Account Summary Bento -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">ఖాతా వివరాలు / Account Credentials</div>
        
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">ఖాతా కోడ్ (Customer Code):</td>
            <td style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #0f172a; text-align: right;">${customerCode}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">గ్రామం (Village Route):</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a; text-align: right;">${villageName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">మొబైల్ నంబర్:</td>
            <td style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #0f172a; text-align: right;">${mobile}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">ప్రారంభ బకాయి (Balance):</td>
            <td style="padding: 6px 0; font-weight: 800; color: #e11d48; text-align: right; font-family: monospace;">₹${initialBalance.toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
          Open My Customer Khata Portal →
        </a>
      </div>

      <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
        Direct Portal Link: <br />
        <a href="${portalUrl}" style="color: #2563eb; word-break: break-all;">${portalUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 18px 28px; background: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">KB Khata & Fashions Store • Google Pay: kbfashions.eazypay@icici</p>
      <p style="margin: 4px 0 0 0;">ఈ ఇమెయిల్ ఆటోమేటిక్‌గా పంపబడింది. దయచేసి దీనికి సమాధానం ఇవ్వవద్దు.</p>
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from,
      to,
      subject: `[KB Khata] Welcome ${customerName} — మీ కస్టమర్ ఖాతా వివరాలు & పోర్టల్ లాగిన్ (${customerCode})`,
      html,
    });

    console.log(`[Email] Customer credentials sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("[Email Error] Failed to send customer credentials email:", error);
    return false;
  }
}

/**
 * Send OTP Email for Customer or Admin Verification
 */
export async function sendOtpEmail({
  to,
  name,
  otp,
  role = "CUSTOMER",
}: {
  to: string;
  name: string;
  otp: string;
  role?: "ADMIN" | "CUSTOMER";
}): Promise<boolean> {
  try {
    const transporter = getMailTransporter();
    const from = process.env.EMAIL_FROM || "KB Khata & Fashions <noreply.kb.app@gmail.com>";
    const isOwner = role === "ADMIN";

    const subject = isOwner
      ? `[KB Security] Admin Login OTP: ${otp}`
      : `[KB Khata] Customer Portal Login OTP: ${otp}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Security Verification Code</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
    <div style="background: ${isOwner ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" : "linear-gradient(135deg, #059669 0%, #0d9488 100%)"}; padding: 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 800;">${isOwner ? "Admin Security Authorization" : "KB Khata Verification"}</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">One-Time Security Passcode</p>
    </div>

    <div style="padding: 28px; text-align: center;">
      <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
        Hello <strong>${name}</strong>,<br />
        Use the following one-time password to complete your login verification:
      </p>

      <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 900; font-family: monospace; color: #0f172a; margin: 10px 0 20px 0;">
        ${otp}
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
        This OTP is valid for <strong>10 minutes</strong>. Never share this code with anyone.
      </p>
    </div>

    <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      KB Khata Security Gateway • Automated Dispatch
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`[Email] OTP sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("[Email Error] Failed to send OTP email:", error);
    return false;
  }
}
