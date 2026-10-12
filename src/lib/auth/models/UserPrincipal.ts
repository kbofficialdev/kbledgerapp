import { IUserPrincipal, UserRole, AuthenticityStatus } from "../interfaces/IUserPrincipal";

export class UserPrincipal implements IUserPrincipal {
  readonly id: string;
  readonly role: UserRole;
  readonly username?: string;
  readonly customerId?: string;
  readonly ipAddress?: string;
  readonly sessionId?: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly authenticityStatus: AuthenticityStatus;

  constructor(params: {
    id: string;
    role: UserRole;
    username?: string;
    customerId?: string;
    ipAddress?: string;
    sessionId?: string;
    issuedAt?: number;
    expiresAt?: number;
    authenticityStatus?: AuthenticityStatus;
  }) {
    this.id = params.id;
    this.role = params.role;
    this.username = params.username;
    this.customerId = params.customerId;
    this.ipAddress = params.ipAddress;
    this.sessionId = params.sessionId;
    this.issuedAt = params.issuedAt || Date.now();
    this.expiresAt = params.expiresAt || Date.now() + 86400000;
    this.authenticityStatus =
      params.authenticityStatus ||
      (params.role === "ADMIN"
        ? "VERIFIED_ADMIN"
        : params.role === "CUSTOMER"
        ? "VERIFIED_CUSTOMER"
        : "UNAUTHENTICATED");
  }

  static createAnonymous(): UserPrincipal {
    return new UserPrincipal({
      id: "anonymous",
      role: "ANONYMOUS",
      authenticityStatus: "UNAUTHENTICATED",
      expiresAt: 0,
    });
  }

  static createAdmin(
    username: string,
    issuedAt?: number,
    expiresAt?: number,
    ipAddress?: string,
    sessionId?: string
  ): UserPrincipal {
    return new UserPrincipal({
      id: `admin_${username}`,
      role: "ADMIN",
      username,
      issuedAt,
      expiresAt,
      ipAddress,
      sessionId,
      authenticityStatus: "VERIFIED_ADMIN",
    });
  }

  static createCustomer(
    customerId: string,
    issuedAt?: number,
    expiresAt?: number,
    ipAddress?: string,
    sessionId?: string
  ): UserPrincipal {
    return new UserPrincipal({
      id: customerId,
      role: "CUSTOMER",
      customerId,
      issuedAt,
      expiresAt,
      ipAddress,
      sessionId,
      authenticityStatus: "VERIFIED_CUSTOMER",
    });
  }

  isAuthenticated(): boolean {
    const expiryMs =
      typeof this.expiresAt === "number" && this.expiresAt < 10000000000
        ? this.expiresAt * 1000
        : this.expiresAt;
    return (
      (this.role === "ADMIN" || this.role === "CUSTOMER") &&
      expiryMs > Date.now()
    );
  }

  isAdmin(): boolean {
    return this.isAuthenticated() && this.role === "ADMIN";
  }

  isCustomer(): boolean {
    return this.isAuthenticated() && this.role === "CUSTOMER";
  }

  hasPermission(permission: string): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isAdmin()) return true; // Admin has superuser access
    // Customer permissions
    const customerAllowedPermissions = [
      "view_own_khata",
      "view_own_bills",
      "view_own_payments",
      "pay_via_upi",
    ];
    return customerAllowedPermissions.includes(permission);
  }

  getDisplayName(): string {
    if (this.isAdmin()) {
      return this.username ? `Admin (${this.username})` : "Store Administrator";
    }
    if (this.isCustomer()) {
      return this.customerId ? `Customer (${this.customerId.slice(-6)})` : "Valued Customer";
    }
    return "Guest Visitor";
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      role: this.role,
      username: this.username,
      customerId: this.customerId,
      ipAddress: this.ipAddress,
      sessionId: this.sessionId,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      authenticityStatus: this.authenticityStatus,
      isAuthenticated: this.isAuthenticated(),
      displayName: this.getDisplayName(),
    };
  }
}
