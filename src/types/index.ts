export type CustomerType =
  | "INDIVIDUAL"
  | "MARKET"
  | "WHOLESALE"
  | "AGENT"
  | "ONLINE";

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: "مفرد",
  MARKET: "ماركت",
  WHOLESALE: "جملة",
  AGENT: "وكيل",
  ONLINE: "أونلاين",
};

export const CUSTOMER_TYPES: CustomerType[] = [
  "INDIVIDUAL",
  "MARKET",
  "WHOLESALE",
  "AGENT",
  "ONLINE",
];

export interface UserData {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  phone: string | null;
  roles: string[];
  createdAt: string;
}

export interface CustomerData {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  governorate: string | null;
  customerType: CustomerType;
  customerCategoryId: string | null;
  customerCategoryName: string | null;
  isActive: boolean;
  notes: string | null;
  accounts: CustomerAccountData[];
  createdAt: string;
}

export interface CustomerAccountData {
  id: string;
  customerId: string;
  currency: string;
  balance: number;
}

export interface SupplierData {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  governorate: string | null;
  notes: string | null;
  isActive: boolean;
  accounts: SupplierAccountData[];
  createdAt: string;
}

export interface SupplierAccountData {
  id: string;
  supplierId: string;
  currency: string;
  balance: number;
}

export interface CustomerCategoryData {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  customerCount?: number;
  createdAt: string;
}

export interface ProductData {
  id: string;
  name: string;
  code: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  packaging: string;
  piecesPerCarton: number;
  unit: string;
  purchasePrice: number;
  purchaseCurrency: string;
  isActive: boolean;
  prices: ProductPriceData[];
}

export interface ProductPriceData {
  id: string;
  productId: string;
  customerType: CustomerType;
  price: number;
  currency: string;
}

export interface WarehouseData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
}

export interface ExchangeRateData {
  id: string;
  usdToIqd: number;
  date: string;
  note: string | null;
}

export interface RoleData {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionData {
  id: string;
  key: string;
  name: string;
  module: string;
  description: string | null;
}

export interface AuditLogData {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
}
