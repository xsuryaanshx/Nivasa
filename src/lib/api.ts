/**
 * estateApi — central API facade.
 * All pages reference (window as any).estateApi.
 * When Supabase is wired, swap mock implementations below with real queries.
 */

import {
  buildings as mockBuildings,
  rooms as mockRooms,
  payments as mockPayments,
  type Building,
  type Room,
  type Payment,
  type PaymentStatus,
} from "./mockData";

// ── in-memory stores (mirrors Supabase tables) ────────────────────────────────
let _buildings = [...mockBuildings];
let _rooms = [...mockRooms];
let _payments = [...mockPayments];

// ── Auth ──────────────────────────────────────────────────────────────────────
let _session: { user: { id: string; email: string; fullName: string } } | null = null;

const auth = {
  signUp: async (email: string, password: string, fullName?: string) => {
    if (!email || !password) throw new Error("Email and password are required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    _session = { user: { id: "u_" + Date.now().toString(36), email, fullName: fullName || email.split("@")[0] } };
    return { data: _session, error: null };
  },
  signIn: async (email: string, password: string) => {
    if (!email || !password) throw new Error("Email and password are required");
    // Demo: accept any credentials
    const storedName = localStorage.getItem("estate_user_name") || email.split("@")[0];
    _session = { user: { id: "u_demo", email, fullName: storedName } };
    return { data: _session, error: null };
  },
  signOut: async () => {
    _session = null;
    localStorage.removeItem("estate_user_name");
    return { error: null };
  },
  getSession: () => _session,
};

// ── Buildings ─────────────────────────────────────────────────────────────────
async function getBuildings(): Promise<(Building & { occupancyRate: number; rooms: number })[]> {
  return _buildings.map((b) => {
    const bRooms = _rooms.filter((r) => r.buildingId === b.id);
    const occupied = bRooms.filter((r) => r.tenant).length;
    const occupancyRate = bRooms.length > 0 ? Math.round((occupied / bRooms.length) * 100) : 0;
    return { ...b, rooms: bRooms.length, occupied, occupancyRate };
  });
}

async function addBuilding(input: { name: string; address: string; total_rooms?: number }) {
  const building: Building = {
    id: "b_" + Date.now().toString(36),
    name: input.name,
    address: input.address,
    rooms: input.total_rooms || 0,
    occupied: 0,
    monthlyRevenue: 0,
  };
  _buildings = [..._buildings, building];
  return building;
}

async function updateBuilding(id: string, updates: { name?: string; address?: string; total_rooms?: number }) {
  _buildings = _buildings.map((b) =>
    b.id === id ? { ...b, ...updates, rooms: updates.total_rooms ?? b.rooms } : b
  );
}

async function deleteBuilding(id: string) {
  _buildings = _buildings.filter((b) => b.id !== id);
  _rooms = _rooms.filter((r) => r.buildingId !== id);
}

async function getPropertyDetails(buildingId: string | undefined) {
  if (!buildingId) throw new Error("Building ID required");
  const building = _buildings.find((b) => b.id === buildingId);
  if (!building) throw new Error("Building not found");
  const bRooms = _rooms.filter((r) => r.buildingId === buildingId);
  const occupied = bRooms.filter((r) => r.tenant).length;
  const occupancyRate = bRooms.length > 0 ? Math.round((occupied / bRooms.length) * 100) : 0;
  const tenants = bRooms.flatMap((r) => (r.tenant ? [r.tenant] : []));
  // Map to the "units" shape used by BuildingDetails page
  const units = bRooms.map((r) => ({
    id: r.id,
    name: `Room ${r.number}`,
    number: r.number,
    status: r.tenant ? "occupied" : "vacant",
    tenant: r.tenant,
    rent_amount: r.rent,
  }));
  return { ...building, units, tenants, occupancyRate, user_id: "u_demo" };
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
async function getRooms(): Promise<Room[]> {
  return _rooms.map((r) => {
    const building = _buildings.find((b) => b.id === r.buildingId);
    return { ...r, buildingName: building?.name || r.buildingName };
  });
}

async function addRoom(input: {
  building_id: string;
  number: string;
  rent: number;
}) {
  const building = _buildings.find((b) => b.id === input.building_id);
  const room: Room = {
    id: "r_" + Date.now().toString(36),
    number: input.number,
    buildingId: input.building_id,
    buildingName: building?.name || "Unknown",
    rent: input.rent,
    status: "pending",
    tenant: null,
    prevReading: 0,
    currReading: 0,
    ratePerUnit: 0.18,
    history: [],
    pastTenants: [],
  };
  _rooms = [..._rooms, room];
  return room;
}

// Legacy alias used by BuildingDetails (still uses "unit" terminology in API call)
async function addUnit(input: {
  building_id: string;
  name: string;
  rent_amount: number;
  status?: string;
  user_id?: string;
}) {
  return addRoom({
    building_id: input.building_id,
    number: input.name,
    rent: input.rent_amount,
  });
}

// ── Tenants ───────────────────────────────────────────────────────────────────
async function addTenant(input: {
  room_id: string;
  name: string;
  surname: string;
  phone: string;
  whatsapp?: string;
  aadhar?: string;
  joined_at?: string;
}) {
  const room = _rooms.find((r) => r.id === input.room_id);
  if (!room) throw new Error("Room not found");
  const tenant = {
    id: "t_" + Date.now().toString(36),
    name: `${input.name} ${input.surname}`.trim(),
    surname: input.surname,
    phone: input.phone,
    whatsapp: input.whatsapp || input.phone,
    aadhar: input.aadhar,
    joinedAt: input.joined_at || new Date().toISOString().slice(0, 10),
  };
  // Move existing tenant to past tenants
  if (room.tenant) room.pastTenants.unshift(room.tenant);
  room.tenant = tenant;
  room.status = "pending";
  return tenant;
}

// ── Payments ──────────────────────────────────────────────────────────────────
async function addPayment(input: {
  room_id: string;
  tenant_id?: string | null;
  amount: number;
  method: "Bank" | "UPI" | "Cash";
  status: PaymentStatus;
  date: string;
  note?: string;
  reference?: string;
}) {
  const room = _rooms.find((r) => r.id === input.room_id);
  const payment: Payment = {
    id: "p_" + Date.now().toString(36),
    roomId: input.room_id,
    tenantName: room?.tenant?.name || "Unknown",
    amount: input.amount,
    date: input.date,
    status: input.status,
    method: input.method,
    note: input.note || input.reference,
  };
  _payments = [payment, ..._payments];
  // Update room status
  if (room) room.status = input.status;
  return payment;
}

async function getRecentPayments(limit = 10): Promise<(Payment & { roomNumber?: string; buildingName?: string })[]> {
  return _payments
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((p) => {
      const room = _rooms.find((r) => r.id === p.roomId);
      return { ...p, roomNumber: room?.number, buildingName: room?.buildingName };
    });
}

// ── Electricity ───────────────────────────────────────────────────────────────
async function saveElectricityReading(input: {
  room_id: string;
  month: string;          // "YYYY-MM"
  prev_reading: number;
  curr_reading: number;
  rate_per_unit: number;
}) {
  const room = _rooms.find((r) => r.id === input.room_id);
  if (!room) throw new Error("Room not found");
  room.prevReading = input.prev_reading;
  room.currReading = input.curr_reading;
  room.ratePerUnit = input.rate_per_unit;
  // Append to history
  const units = Math.max(0, input.curr_reading - input.prev_reading);
  const monthLabel = new Date(input.month + "-01").toLocaleDateString("en-US", { month: "short" });
  room.history = [...room.history.slice(-11), { month: monthLabel, units }];
  return room;
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
async function getDashboardStats() {
  const totalBuildings = _buildings.length;
  const totalRooms = _rooms.length;
  const occupied = _rooms.filter((r) => r.tenant).length;
  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const pending = _payments.filter((p) => p.status !== "paid").length;
  const monthlyRevenue = _payments
    .filter((p) => p.date.startsWith(thisMonth))
    .reduce((s, p) => s + p.amount, 0);
  return { totalBuildings, totalRooms, occupied, pending, monthlyRevenue };
}

// ── Supabase pass-through (for EditBuildingModal which calls api.supabase.from) ──
const supabase = {
  from: (table: string) => ({
    update: (data: any) => ({
      eq: async (_col: string, id: string) => {
        if (table === "buildings") await updateBuilding(id, data);
        return { data, error: null };
      },
    }),
    insert: (data: any) => ({ data, error: null }),
    select: () => ({ data: [], error: null }),
  }),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const estateApi = {
  auth,
  supabase,
  // Buildings
  getBuildings,
  addBuilding,
  updateBuilding,
  deleteBuilding,
  getPropertyDetails,
  // Rooms
  getRooms,
  addRoom,
  addUnit,        // legacy alias
  // Tenants
  addTenant,
  // Payments
  addPayment,
  getRecentPayments,
  // Electricity
  saveElectricityReading,
  // Dashboard
  getDashboardStats,
};

export type EstateApi = typeof estateApi;

// Register globally
declare global {
  interface Window { estateApi: EstateApi; }
}
