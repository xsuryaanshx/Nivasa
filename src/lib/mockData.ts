// Mock data for the Estate rental management app.
// API_PLACEHOLDER: Replace these with Supabase queries when wiring backend.

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
  surname?: string;
  phone: string;
  whatsapp?: string;
  aadhar?: string;
  joinedAt: string;
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
  status: PaymentStatus;
  tenant: Tenant | null;
  prevReading: number;
  currReading: number;
  ratePerUnit: number;
  meterStartDate?: string;
  history: ElectricityReading[];
  pastTenants: Tenant[];
}

export const buildings: Building[] = [
  { id: "b1", name: "Aurora Heights",   address: "12 Linden Ave, North Quarter", rooms: 18, occupied: 16, monthlyRevenue: 24800 },
  { id: "b2", name: "Cedar Court",      address: "44 Maple Street, Old Town",     rooms: 12, occupied: 11, monthlyRevenue: 18200 },
  { id: "b3", name: "Marigold Residences", address: "9 Oak Lane, Riverside",       rooms: 24, occupied: 20, monthlyRevenue: 31600 },
  { id: "b4", name: "Stillwater Lofts", address: "201 Bay Drive, Harbor",         rooms: 8,  occupied: 7,  monthlyRevenue: 14400 },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lastSixMonths = () => {
  const now = new Date().getMonth();
  return Array.from({ length: 6 }, (_, i) => months[(now - 5 + i + 12) % 12]);
};

const seedReadings = (base: number) =>
  lastSixMonths().map((m, i) => ({ month: m, units: Math.round(base + Math.sin(i) * 18 + i * 3) }));

export const rooms: Room[] = [
  { id: "r1",  number: "101", buildingId: "b1", buildingName: "Aurora Heights", rent: 1400, status: "paid",
    tenant: { id: "t1", name: "Amelia Hart",  phone: "+1 415 555 0102", joinedAt: "2024-03-12" },
    prevReading: 4820, currReading: 4956, ratePerUnit: 0.18, history: seedReadings(120), pastTenants: [] },
  { id: "r2",  number: "102", buildingId: "b1", buildingName: "Aurora Heights", rent: 1400, status: "pending",
    tenant: { id: "t2", name: "Noah Carter",  phone: "+1 415 555 0144", joinedAt: "2024-08-01" },
    prevReading: 3120, currReading: 3289, ratePerUnit: 0.18, history: seedReadings(140), pastTenants: [] },
  { id: "r3",  number: "201", buildingId: "b1", buildingName: "Aurora Heights", rent: 1500, status: "late",
    tenant: { id: "t3", name: "Sofia Reyes",  phone: "+1 415 555 0177", joinedAt: "2023-11-20" },
    prevReading: 5621, currReading: 5840, ratePerUnit: 0.18, history: seedReadings(180),
    pastTenants: [{ id: "tp1", name: "Marcus Lee", phone: "+1 415 555 0011", joinedAt: "2022-01-05" }] },
  { id: "r4",  number: "12",  buildingId: "b2", buildingName: "Cedar Court",    rent: 1250, status: "paid",
    tenant: { id: "t4", name: "Eli Brooks",   phone: "+1 415 555 0188", joinedAt: "2024-06-15" },
    prevReading: 2100, currReading: 2310, ratePerUnit: 0.18, history: seedReadings(200), pastTenants: [] },
  { id: "r5",  number: "14",  buildingId: "b2", buildingName: "Cedar Court",    rent: 1250, status: "paid",
    tenant: { id: "t5", name: "Iris Tanaka",  phone: "+1 415 555 0199", joinedAt: "2024-02-08" },
    prevReading: 1800, currReading: 1932, ratePerUnit: 0.18, history: seedReadings(110), pastTenants: [] },
  { id: "r6",  number: "07",  buildingId: "b3", buildingName: "Marigold Residences", rent: 1300, status: "pending",
    tenant: { id: "t6", name: "Jonas Weber",  phone: "+1 415 555 0211", joinedAt: "2024-09-22" },
    prevReading: 2980, currReading: 3094, ratePerUnit: 0.18, history: seedReadings(105), pastTenants: [] },
  { id: "r7",  number: "08",  buildingId: "b3", buildingName: "Marigold Residences", rent: 1300, status: "paid",
    tenant: { id: "t7", name: "Maya Patel",   phone: "+1 415 555 0222", joinedAt: "2023-12-01" },
    prevReading: 4501, currReading: 4612, ratePerUnit: 0.18, history: seedReadings(98),  pastTenants: [] },
  { id: "r8",  number: "11",  buildingId: "b3", buildingName: "Marigold Residences", rent: 1350, status: "late",
    tenant: { id: "t8", name: "Owen Fischer", phone: "+1 415 555 0233", joinedAt: "2024-04-17" },
    prevReading: 3340, currReading: 3580, ratePerUnit: 0.18, history: seedReadings(160), pastTenants: [] },
  { id: "r9",  number: "3A",  buildingId: "b4", buildingName: "Stillwater Lofts",   rent: 1800, status: "paid",
    tenant: { id: "t9", name: "Lina Kowalski", phone: "+1 415 555 0244", joinedAt: "2024-01-10" },
    prevReading: 6010, currReading: 6122, ratePerUnit: 0.18, history: seedReadings(90),  pastTenants: [] },
  { id: "r10", number: "3B",  buildingId: "b4", buildingName: "Stillwater Lofts",   rent: 1800, status: "pending",
    tenant: null, prevReading: 0, currReading: 0, ratePerUnit: 0.18, history: seedReadings(60), pastTenants: [] },
];

export const payments: Payment[] = [
  { id: "p1",  roomId: "r1", tenantName: "Amelia Hart",  amount: 1400, date: "2025-04-02", status: "paid",    method: "Bank" },
  { id: "p2",  roomId: "r2", tenantName: "Noah Carter",  amount: 1400, date: "2025-04-18", status: "pending", method: "UPI"  },
  { id: "p3",  roomId: "r3", tenantName: "Sofia Reyes",  amount: 1500, date: "2025-04-12", status: "late",    method: "Cash" },
  { id: "p4",  roomId: "r4", tenantName: "Eli Brooks",   amount: 1250, date: "2025-04-04", status: "paid",    method: "Bank" },
  { id: "p5",  roomId: "r5", tenantName: "Iris Tanaka",  amount: 1250, date: "2025-04-03", status: "paid",    method: "UPI"  },
  { id: "p6",  roomId: "r6", tenantName: "Jonas Weber",  amount: 1300, date: "2025-04-20", status: "pending", method: "Bank" },
  { id: "p7",  roomId: "r7", tenantName: "Maya Patel",   amount: 1300, date: "2025-04-01", status: "paid",    method: "UPI"  },
  { id: "p8",  roomId: "r8", tenantName: "Owen Fischer", amount: 1350, date: "2025-04-09", status: "late",    method: "Cash" },
  { id: "p9",  roomId: "r9", tenantName: "Lina Kowalski",amount: 1800, date: "2025-04-05", status: "paid",    method: "Bank" },
  { id: "p10", roomId: "r1", tenantName: "Amelia Hart",  amount: 1400, date: "2025-03-02", status: "paid",    method: "Bank" },
  { id: "p11", roomId: "r3", tenantName: "Sofia Reyes",  amount: 1500, date: "2025-03-12", status: "paid",    method: "Cash" },
  { id: "p12", roomId: "r5", tenantName: "Iris Tanaka",  amount: 1250, date: "2025-03-03", status: "paid",    method: "UPI"  },
];

export const revenueSeries = [
  { month: "Nov", revenue: 78400 },
  { month: "Dec", revenue: 81200 },
  { month: "Jan", revenue: 84600 },
  { month: "Feb", revenue: 86100 },
  { month: "Mar", revenue: 88900 },
  { month: "Apr", revenue: 92800 },
];

export const insights: string[] = [
  "3 tenants have pending payments for 5+ days",
  "Room 11 at Marigold has the highest electricity usage this month",
  "Revenue increased by 12% compared to last quarter",
  "Stillwater Lofts is 88% occupied — consider new listings",
  "Average payment delay dropped to 1.4 days",
];

export const stats = () => {
  const totalRooms     = rooms.length;
  const occupied       = rooms.filter(r => r.tenant).length;
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