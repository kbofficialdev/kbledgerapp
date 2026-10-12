import { IAuthService, AuthValidationResult } from "../interfaces/IAuthService";
import { IUserPrincipal } from "../interfaces/IUserPrincipal";
import { UserPrincipal } from "../models/UserPrincipal";

export abstract class BaseAuthService implements IAuthService {
  protected readonly secret: string;

  constructor(secret?: string) {
    this.secret =
      secret ||
      process.env.AUTH_SECRET ||
      process.env.ADMIN_SECRET ||
      "kb_khata_admin_session_secret_2026";
  }

  // Abstract template method for subclasses to specialize token creation
  abstract createToken(principal: IUserPrincipal): Promise<string>;

  // Abstract template method for subclasses to specialize validation
  abstract validateToken(token: string | undefined): Promise<AuthValidationResult>;

  /**
   * Universal Web Crypto provider
   */
  protected getCrypto(): Crypto {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
      return globalThis.crypto;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return (require("crypto") as any).webcrypto;
    } catch {
      throw new Error("Universal WebCrypto is not supported in the current environment.");
    }
  }

  /**
   * Base64URL string encoder
   */
  public base64UrlEncode(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /**
   * Base64URL string decoder
   */
  public base64UrlDecode(str: string): string {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  /**
   * ArrayBuffer to Base64URL string
   */
  public arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /**
   * Sign message with HMAC-SHA256
   */
  public async signHmac(message: string): Promise<string> {
    const enc = new TextEncoder();
    const wc = this.getCrypto();
    const key = await wc.subtle.importKey(
      "raw",
      enc.encode(this.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await wc.subtle.sign("HMAC", key, enc.encode(message));
    return this.arrayBufferToBase64Url(signature);
  }

  /**
   * Constant-time signature comparison to prevent timing attacks
   */
  public timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

