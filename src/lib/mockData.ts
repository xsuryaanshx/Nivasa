// Mock data for the Nivasa rental management app.
// API_PLACEHOLDER: Replace these with Supabase queries when wiring backend.

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
}

export interface ElectricityReading {
  month: string;
  units: number;
}

export interface Payment {
  id: string;
  roomId: string;
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

export const buildings: Building[] = [
  { id: "b1", name: "Shreeji Heights",   address: "14 MG Road, Andheri West", rooms: 18, occupied: 16, monthlyRevenue: 248000 },
  { id: "b2", name: "Omkar Residency",      address: "Sector 14, Vashi",     rooms: 12, occupied: 11, monthlyRevenue: 182000 },
  { id: "b3", name: "Gokuldham Society", address: "Film City Road, Goregaon",       rooms: 24, occupied: 20, monthlyRevenue: 316000 },
  { id: "b4", name: "Sunshine Apartments", address: "Koramangala 4th Block",         rooms: 8,  occupied: 7,  monthlyRevenue: 144000 },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lastSixMonths = () => {
  const now = new Date().getMonth();
  return Array.from({ length: 6 }, (_, i) => months[(now - 5 + i + 12) % 12]);
};

const seedReadings = (base: number) =>
  lastSixMonths().map((m, i) => ({ month: m, units: Math.round(base + Math.sin(i) * 18 + i * 3) }));

export const rooms: Room[] = [
  { id: "r1",  number: "A-101", buildingId: "b1", buildingName: "Shreeji Heights", rent: 14000, status: "paid",
    tenants: [{ id: "t1", name: "Aarav Sharma",  phone: "+91 98765 43210", joined_at: "2024-03-12" }],
    prevReading: 4820, currReading: 4956, ratePerUnit: 8.5, history: seedReadings(120), pastTenants: [] },
  { id: "r2",  number: "A-102", buildingId: "b1", buildingName: "Shreeji Heights", rent: 14000, status: "pending",
    tenants: [{ id: "t2", name: "Neha Gupta",  phone: "+91 98765 43211", joined_at: "2024-08-01" }],
    prevReading: 3120, currReading: 3289, ratePerUnit: 8.5, history: seedReadings(140), pastTenants: [] },
  { id: "r3",  number: "A-201", buildingId: "b1", buildingName: "Shreeji Heights", rent: 15000, status: "late",
    tenants: [{ id: "t3", name: "Rajesh Kumar",  phone: "+91 98765 43212", joined_at: "2023-11-20" }],
    prevReading: 5621, currReading: 5840, ratePerUnit: 8.5, history: seedReadings(180),
    pastTenants: [{ id: "tp1", name: "Suresh Menon", phone: "+91 98765 43213", joined_at: "2022-01-05" }] },
  { id: "r4",  number: "12",  buildingId: "b2", buildingName: "Omkar Residency",    rent: 12500, status: "paid",
    tenants: [{ id: "t4", name: "Priya Patel",   phone: "+91 98765 43214", joined_at: "2024-06-15" }],
    prevReading: 2100, currReading: 2310, ratePerUnit: 8.5, history: seedReadings(200), pastTenants: [] },
  { id: "r5",  number: "14",  buildingId: "b2", buildingName: "Omkar Residency",    rent: 12500, status: "paid",
    tenants: [{ id: "t5", name: "Rahul Verma",  phone: "+91 98765 43215", joined_at: "2024-02-08" }],
    prevReading: 1800, currReading: 1932, ratePerUnit: 8.5, history: seedReadings(110), pastTenants: [] },
  { id: "r6",  number: "B-07",  buildingId: "b3", buildingName: "Gokuldham Society", rent: 13000, status: "pending",
    tenants: [{ id: "t6", name: "Vikram Singh",  phone: "+91 98765 43216", joined_at: "2024-09-22" }],
    prevReading: 2980, currReading: 3094, ratePerUnit: 8.5, history: seedReadings(105), pastTenants: [] },
  { id: "r7",  number: "B-08",  buildingId: "b3", buildingName: "Gokuldham Society", rent: 13000, status: "paid",
    tenants: [{ id: "t7", name: "Sneha Desai",   phone: "+91 98765 43217", joined_at: "2023-12-01" }],
    prevReading: 4501, currReading: 4612, ratePerUnit: 8.5, history: seedReadings(98),  pastTenants: [] },
  { id: "r8",  number: "B-11",  buildingId: "b3", buildingName: "Gokuldham Society", rent: 13500, status: "late",
    tenants: [{ id: "t8", name: "Amit Joshi", phone: "+91 98765 43218", joined_at: "2024-04-17" }],
    prevReading: 3340, currReading: 3580, ratePerUnit: 8.5, history: seedReadings(160), pastTenants: [] },
  { id: "r9",  number: "3A",  buildingId: "b4", buildingName: "Sunshine Apartments",   rent: 18000, status: "paid",
    tenants: [{ id: "t9", name: "Pooja Reddy", phone: "+91 98765 43219", joined_at: "2024-01-10" }],
    prevReading: 6010, currReading: 6122, ratePerUnit: 8.5, history: seedReadings(90),  pastTenants: [] },
  { id: "r10", number: "3B",  buildingId: "b4", buildingName: "Sunshine Apartments",   rent: 18000, status: "pending",
    tenants: [], prevReading: 0, currReading: 0, ratePerUnit: 8.5, history: seedReadings(60), pastTenants: [] },
];

export const payments: Payment[] = [
  { id: "p1",  roomId: "r1", tenantName: "Aarav Sharma",  amount: 14000, date: "2025-04-02", status: "paid",    method: "Bank" },
  { id: "p2",  roomId: "r2", tenantName: "Neha Gupta",  amount: 14000, date: "2025-04-18", status: "pending", method: "UPI"  },
  { id: "p3",  roomId: "r3", tenantName: "Rajesh Kumar",  amount: 15000, date: "2025-04-12", status: "late",    method: "Cash" },
  { id: "p4",  roomId: "r4", tenantName: "Priya Patel",   amount: 12500, date: "2025-04-04", status: "paid",    method: "Bank" },
  { id: "p5",  roomId: "r5", tenantName: "Rahul Verma",  amount: 12500, date: "2025-04-03", status: "paid",    method: "UPI"  },
  { id: "p6",  roomId: "r6", tenantName: "Vikram Singh",  amount: 13000, date: "2025-04-20", status: "pending", method: "Bank" },
  { id: "p7",  roomId: "r7", tenantName: "Sneha Desai",   amount: 13000, date: "2025-04-01", status: "paid",    method: "UPI"  },
  { id: "p8",  roomId: "r8", tenantName: "Amit Joshi", amount: 13500, date: "2025-04-09", status: "late",    method: "Cash" },
  { id: "p9",  roomId: "r9", tenantName: "Pooja Reddy",amount: 18000, date: "2025-04-05", status: "paid",    method: "Bank" },
  { id: "p10", roomId: "r1", tenantName: "Aarav Sharma",  amount: 14000, date: "2025-03-02", status: "paid",    method: "Bank" },
  { id: "p11", roomId: "r3", tenantName: "Rajesh Kumar",  amount: 15000, date: "2025-03-12", status: "paid",    method: "Cash" },
  { id: "p12", roomId: "r5", tenantName: "Rahul Verma",  amount: 12500, date: "2025-03-03", status: "paid",    method: "UPI"  },
];

export const revenueSeries = [
  { month: "Nov", revenue: 784000 },
  { month: "Dec", revenue: 812000 },
  { month: "Jan", revenue: 846000 },
  { month: "Feb", revenue: 861000 },
  { month: "Mar", revenue: 889000 },
  { month: "Apr", revenue: 928000 },
];

export const insights: string[] = [
  "3 tenants have pending payments for 5+ days",
  "Room B-11 at Gokuldham Society has the highest electricity usage this month",
  "Revenue increased by 12% compared to last quarter",
  "Sunshine Apartments is 88% occupied — consider new listings",
  "Average payment delay dropped to 1.4 days",
];

export const stats = () => {
  const totalRooms     = rooms.length;
  const occupied       = rooms.filter(r => r.tenants.length > 0).length;
  const pendingCount   = payments.filter(p => p.status !== "paid").length;
  const monthlyRevenue = payments
    .filter(p => p.date.startsWith("2025-04"))
    .reduce((s, p) => s + p.amount, 0);
  return {
    totalBuildings: buildings.length,
    totalRooms,
    occupied,
    pending: pendingCount,
    monthlyRevenue,
  };
};