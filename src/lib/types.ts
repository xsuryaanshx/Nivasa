import type { OccupancyPriceTier } from "./rentByOccupancy";

export type PaymentStatus = "paid" | "pending" | "late";

export interface Building {
  id: string;
  name: string;
  address: string;
  rooms: number;
  occupied: number;
  monthlyRevenue: number;
  image?: string;
  is_public?: boolean;
  slug?: string;
  public_description?: string;
  public_amenities?: string[];
  contact_phone?: string;
  cover_image_url?: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  whatsapp_number?: string;
  aadhar?: string;
  joined_at: string;
  /** Number of people billed for rent (used with occupancy-based room pricing). */
  occupancy_count?: number;
  depositAmount?: number;
  depositMethod?: "Cash" | "Bank" | "UPI";
  status?: "active" | "vacated";
  leftAt?: string;
  document_url?: string;
}

export interface ElectricityReading {
  month: string;
  units: number;
}

export interface Payment {
  id: string;
  roomId: string;
  tenantId?: string;
  tenantName: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  method: "Cash" | "Bank" | "UPI";
  note?: string;
}

export interface Room {
  id: string;
  number: string;
  buildingId: string;
  buildingName: string;
  rent: number;
  /** When set, rent follows these tiers by tenant billing occupancy. */
  occupancyPrices?: OccupancyPriceTier[] | null;
  status: PaymentStatus;
  tenants: Tenant[];
  prevReading: number;
  currReading: number;
  ratePerUnit: number;
  meterStartDate?: string;
  history: ElectricityReading[];
  pastTenants: Tenant[];
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone?: string;
  aadhar?: string;
  allocatedBuildings: string[]; // Array of building IDs
}

export interface Invoice {
  id: string;
  user_id: string;
  tenant_id: string;
  room_id: string;
  month_year: string;
  base_rent: number;
  electricity_cost: number;
  add_ons: { name: string; cost: number }[];
  previous_dues: number;
  total_due: number;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  rent_collection_date: number | null;
}

export interface MaintenanceRequest {
  id: string;
  user_id: string;
  property_id: string;
  unit_id?: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  cost: number;
  category: "maintenance" | "facility" | "utility" | "other";
  created_at: string;
  updated_at: string;
}
