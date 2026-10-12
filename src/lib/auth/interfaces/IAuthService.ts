import { IUserPrincipal } from "./IUserPrincipal";

export interface AuthValidationResult {
  valid: boolean;
  principal: IUserPrincipal;
  error?: string;
}

export interface AuthTokenResult {
  success: boolean;
  token?: string;
  principal?: IUserPrincipal;
  error?: string;
}

export interface IAuthService {
  validateToken(token: string | undefined): Promise<AuthValidationResult>;
  createToken(principal: IUserPrincipal): Promise<string>;
}

