export * from "./interfaces/IUserPrincipal";
export * from "./interfaces/IAuthService";
export * from "./models/UserPrincipal";
export * from "./services/BaseAuthService";
export * from "./services/AdminAuthService";
export * from "./services/CustomerAuthService";
export * from "./services/AuthorizationGuard";

import { AdminAuthService } from "./services/AdminAuthService";
import { CustomerAuthService } from "./services/CustomerAuthService";
import { AuthorizationGuard } from "./services/AuthorizationGuard";

export const adminAuth = AdminAuthService.getInstance();
export const customerAuth = CustomerAuthService.getInstance();
export const authGuard = AuthorizationGuard.getInstance();

