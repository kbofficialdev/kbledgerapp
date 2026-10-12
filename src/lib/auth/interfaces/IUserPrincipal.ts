export type UserRole = "ADMIN" | "CUSTOMER" | "ANONYMOUS";
export type AuthenticityStatus = "VERIFIED_ADMIN" | "VERIFIED_CUSTOMER" | "UNAUTHENTICATED";

export interface IUserPrincipal {
  readonly id: string;
  readonly role: UserRole;
  readonly username?: string;
  readonly customerId?: string;
  readonly ipAddress?: string;
  readonly sessionId?: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly authenticityStatus: AuthenticityStatus;

  isAuthenticated(): boolean;
  isAdmin(): boolean;
  isCustomer(): boolean;
  hasPermission(permission: string): boolean;
  getDisplayName(): string;
  toJSON(): Record<string, unknown>;
}

