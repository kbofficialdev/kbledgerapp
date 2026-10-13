/**
 * CUSTOMER & VILLAGE DOMAIN MODULE: TYPE DEFINITIONS
 */

export type CustomerStatusFilter =
  | "all"
  | "active"
  | "blacklisted"
  | "inactive"
  | "with_balance"
  | "zero_balance";

export interface CustomerQueryOptions {
  status?: CustomerStatusFilter | string;
  filter?: string;
  villageId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerSummary {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  altMobile?: string | null;
  email?: string | null;
  address?: string | null;
  villageId: string;
  villageName: string;
  villageCode: string;
  creditLimit: number;
  currentBalance: number;
  notes?: string | null;
  isActive: boolean;
  orderCount?: number;
  paymentCount?: number;
  createdAt: Date;
}

export interface CreateCustomerDTO {
  name: string;
  mobile: string;
  villageId: string;
  altMobile?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  initialBalance?: number;
  notes?: string;
}

export interface UpdateCustomerDTO {
  name?: string;
  mobile?: string;
  villageId?: string;
  altMobile?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit?: number;
  notes?: string | null;
  isActive?: boolean;
  action?: "BLACKLIST" | "DISABLE" | "ACTIVATE" | "ENABLE";
}

export interface VillageDTO {
  id: string;
  code: string;
  name: string;
  taluk?: string | null;
  district?: string | null;
  pincode?: string | null;
  notes?: string | null;
  isActive: boolean;
  customerCount?: number;
  totalBalance?: number;
}

