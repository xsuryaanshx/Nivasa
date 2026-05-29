/**
 * nivasaApi — central API facade.
 * Wired to Supabase backend.
 */

import { createClient } from "@supabase/supabase-js";
import {
  buildings as mockBuildings,
  rooms as mockRooms,
  payments as mockPayments,
  stats as mockStats,
  type Building,
  type Room,
  type Payment,
  type PaymentStatus,
  type Tenant,
} from "./mockData";
import {
  type OccupancyPriceTier,
  computeRentFromTiers,
  normalizeOccupancyTiers,
  tiersToJsonbPayload,
} from "./rentByOccupancy";

const SUPABASE_URL = "https://ehmwvkxxoczoubbsjxvv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobXd2a3h4b2N6b3ViYnNqeHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzc5NjIsImV4cCI6MjA5MjcxMzk2Mn0._1thy8Nq3dsGBvEA8b_FPFbTbCyDk1fbwqxgUULDPG4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = {
  signUp: async (email: string, password: string, fullName: string) => {
    return await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  },
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};

/** Required for rows (e.g. `units.user_id`) scoped to the logged-in Supabase user. */
async function requireAuthUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user?.id) {
    throw new Error("Sign in is required. Your session may have expired — sign in again, then add the room.");
  }
  return user.id;
}

// ── Buildings ─────────────────────────────────────────────────────────────────
async function getBuildings(): Promise<(Building & { occupancyRate: number; rooms: number })[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return mockBuildings.map(b => ({
        ...b,
        occupancyRate: b.rooms > 0 ? Math.round((b.occupied / b.rooms) * 100) : 0
      }));
    }

    const { data, error } = await supabase
      .from('buildings')
      .select('*, units(*)');

    if (error) throw error;

    return (data || []).map(b => {
      const totalUnits = b.units ? b.units.length : 0;
      const occupiedUnits = b.units ? b.units.filter((u: any) => u.status === 'occupied').length : 0;
      const monthlyRevenue = b.units
        ? b.units
            .filter((u: any) => u.status === "occupied")
            .reduce((acc: number, u: any) => acc + (u.rent_amount || 0), 0)
        : 0;

      return {
        id: b.id,
        name: b.name,
        address: b.address,
        rooms: totalUnits,
        occupied: occupiedUnits,
        monthlyRevenue: monthlyRevenue,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
      };
    });
  } catch (error) {
    console.error("Error in getBuildings:", error);
    throw error;
  }
}

async function addBuilding(input: { name: string; address: string; total_rooms?: number }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const b = { id: `b${Date.now()}`, name: input.name, address: input.address, rooms: input.total_rooms || 0, occupied: 0, monthlyRevenue: 0 };
      mockBuildings.push(b);
      return b;
    }

    const { data, error } = await supabase
      .from('buildings')
      .insert([{ name: input.name, address: input.address }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addBuilding:", error);
    throw error;
  }
}

async function updateBuilding(id: string, updates: any) {
  try {
    const { error } = await supabase
      .from('buildings')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in updateBuilding:", error);
    throw error;
  }
}

async function deleteBuilding(id: string) {
  try {
    const { error } = await supabase.from('buildings').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteBuilding:", error);
    throw error;
  }
}

async function getPropertyDetails(buildingId: string | undefined) {
  if (!buildingId) throw new Error("Building ID required");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const b = mockBuildings.find(x => x.id === buildingId);
      if (!b) throw new Error("Building not found");
      const bRooms = mockRooms.filter(r => r.buildingId === buildingId);
      return {
        ...b,
        tenants: bRooms.map(r => r.tenant).filter(Boolean),
        units: bRooms.map(r => ({
          id: r.id,
          name: `Room ${r.number}`,
          number: r.number,
          status: r.status,
          rent_amount: r.rent,
          occupancy_prices: r.occupancyPrices,
          tenant: r.tenant,
        })),
        occupancyRate: bRooms.length > 0 ? Math.round((bRooms.filter(r => r.tenant).length / bRooms.length) * 100) : 0
      };
    }

    const { data: building, error: bError } = await supabase
      .from('buildings')
      .select('*, units(*)')
      .eq('id', buildingId)
      .single();
    if (bError) throw bError;

    const { data: tenants, error: tError } = await supabase
      .from('tenants')
      .select('*')
      .eq('building_id', buildingId);
    
    if (tError) console.error("Error fetching tenants:", tError);

    return {
      ...building,
      tenants: tenants || [],
      units: (building.units || []).map((u: any) => {
        const tenant = tenants ? tenants.find((t: any) => t.room_id === u.id) : null;
        const tiers = normalizeOccupancyTiers(u.occupancy_prices);
        const occ =
          tenant?.occupancy_count != null ? Math.max(1, Number(tenant.occupancy_count)) : 1;
        const stored = Number(u.rent_amount) || 0;
        const rent_amount =
          tiers.length > 0
            ? computeRentFromTiers(tiers, stored, tenant && u.status === "occupied" ? occ : 1)
            : stored;
        return {
          id: u.id,
          name: `Room ${u.name || u.number}`,
          number: u.name || u.number,
          status: u.status || "vacant",
          rent_amount,
          occupancy_prices: u.occupancy_prices ?? null,
          tenant,
        };
      }),
      occupancyRate: building.units?.length > 0
        ? Math.round(
            (building.units.filter((u: any) => u.status === "occupied").length / building.units.length) * 100,
          )
        : 0,
    };
  } catch (error) {
    console.error("Error in getPropertyDetails:", error);
    throw error;
  }
}

// ── Rooms (Units) ─────────────────────────────────────────────────────────────

function mapTenantFromRow(t: any): Tenant {
  return {
    id: t.id,
    name: t.name,
    phone: t.phone,
    whatsapp_number: t.whatsapp_number,
    aadhar: t.aadhar,
    joined_at: t.joined_at,
    occupancy_count: t.occupancy_count != null ? Math.max(1, Number(t.occupancy_count)) : 1,
  };
}

function mapUnitToRoom(u: any): Room {
  const tiers = normalizeOccupancyTiers(u.occupancy_prices);
  const rawTenant =
    u.tenants && Array.isArray(u.tenants) && u.tenants.length ? u.tenants[0] : null;
  const tenant = rawTenant ? mapTenantFromRow(rawTenant) : null;
  const billingOcc = tenant?.occupancy_count ?? 1;
  const stored = Number(u.rent_amount) || 0;
  const rent =
    tiers.length > 0
      ? computeRentFromTiers(tiers, stored, u.status === "occupied" && tenant ? billingOcc : 1)
      : stored;

  return {
    id: u.id,
    number: u.name || u.number,
    buildingId: u.building_id,
    buildingName: u.buildings?.name || "Unknown",
    rent,
    occupancyPrices: tiers.length > 0 ? tiers : null,
    status: u.status as PaymentStatus,
    tenant,
    prevReading: u.prev_reading || 0,
    currReading: u.curr_reading || 0,
    ratePerUnit: u.rate_per_unit || 0.18,
    history: [],
    pastTenants: [],
  };
}

async function getRooms(): Promise<Room[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return mockRooms;

    const { data, error } = await supabase
      .from('units')
      .select('*, buildings(name), tenants!fk_room(*)');
    if (error) throw error;

    return (data || []).map(mapUnitToRoom);
  } catch (error) {
    console.error("Error in getRooms:", error);
    throw error;
  }
}

async function getRoomById(id: string): Promise<Room | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return mockRooms.find(r => r.id === id) || null;

    const { data, error } = await supabase
      .from('units')
      .select('*, buildings(name), tenants!fk_room(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;

    return mapUnitToRoom(data);
  } catch (error) {
    console.error("Error in getRoomById:", error);
    return null;
  }
}

async function syncUnitEffectiveRent(unitId: string) {
  const { data: unit, error } = await supabase
    .from("units")
    .select("rent_amount, occupancy_prices, status")
    .eq("id", unitId)
    .single();
  if (error || !unit) return;

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("occupancy_count")
    .eq("room_id", unitId)
    .maybeSingle();

  const tiers = normalizeOccupancyTiers(unit.occupancy_prices);
  const occ =
    unit.status === "occupied" && tenantRow
      ? Math.max(1, Number(tenantRow.occupancy_count ?? 1))
      : 1;
  const stored = Number(unit.rent_amount) || 0;
  const effective = computeRentFromTiers(tiers, stored, occ);
  if (Math.abs(stored - effective) < 0.005) return;
  await supabase.from("units").update({ rent_amount: effective }).eq("id", unitId);
}

async function updateRoom(
  id: string,
  updates: {
    number?: string;
    rent_amount?: number;
    occupancy_prices?: OccupancyPriceTier[] | null;
  },
) {
  const payload: Record<string, unknown> = {};
  if (updates.number !== undefined) payload.name = updates.number;
  if (updates.rent_amount !== undefined) payload.rent_amount = updates.rent_amount;
  if (updates.occupancy_prices !== undefined) {
    const tiers = normalizeOccupancyTiers(updates.occupancy_prices);
    payload.occupancy_prices = tiersToJsonbPayload(tiers.length > 0 ? tiers : null);
  }
  const { error } = await supabase.from("units").update(payload).eq("id", id);
  if (error) throw error;
  await syncUnitEffectiveRent(id);
}

async function updateTenant(tenantId: string, updates: { occupancy_count?: number }) {
  const patch: Record<string, unknown> = {};
  if (updates.occupancy_count !== undefined) {
    patch.occupancy_count = Math.max(1, Math.floor(Number(updates.occupancy_count)));
  }
  if (Object.keys(patch).length === 0) return;

  const { data: row, error } = await supabase
    .from("tenants")
    .update(patch)
    .eq("id", tenantId)
    .select("room_id")
    .single();
  if (error) throw error;
  if (row?.room_id) await syncUnitEffectiveRent(row.room_id);
}

async function addRoom(input: {
  building_id: string;
  number: string;
  rent: number;
  occupancy_prices?: OccupancyPriceTier[] | null;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const b = mockBuildings.find(b => b.id === input.building_id);
      const r: Room = {
        id: `r${Date.now()}`,
        number: input.number,
        buildingId: input.building_id,
        buildingName: b?.name || "Unknown",
        rent: input.rent,
        status: "vacant" as PaymentStatus,
        tenant: null,
        prevReading: 0,
        currReading: 0,
        ratePerUnit: 8.5,
        history: [],
        pastTenants: []
      };
      mockRooms.push(r);
      return r;
    }

    const user_id = await requireAuthUserId();
    const tiers = normalizeOccupancyTiers(input.occupancy_prices ?? null);
    const hasTiers = tiers.length > 0;
    const rent_amount = hasTiers ? computeRentFromTiers(tiers, input.rent, 1) : input.rent;
    const row: Record<string, unknown> = {
      building_id: input.building_id,
      name: input.number,
      rent_amount,
      status: "vacant",
      user_id,
    };
    if (hasTiers) row.occupancy_prices = tiersToJsonbPayload(tiers);

    const { data, error } = await supabase.from("units").insert([row]).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addRoom:", error);
    throw error;
  }
}

async function addUnit(input: any) {
  return addRoom({
    building_id: input.building_id,
    number: input.name,
    rent: input.rent_amount,
    occupancy_prices: input.occupancy_prices,
  });
}

// ── Tenants ───────────────────────────────────────────────────────────────────
async function addTenant(input: {
  room_id: string;
  name: string;
  phone: string;
  whatsapp_number?: string;
  aadhar?: string;
  joined_at?: string;
  occupancy_count?: number;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const r = mockRooms.find(x => x.id === input.room_id);
      if (r) {
        r.tenant = {
          id: `t${Date.now()}`,
          name: input.name,
          phone: input.phone,
          whatsapp_number: input.whatsapp_number,
          aadhar: input.aadhar,
          joined_at: input.joined_at || new Date().toISOString(),
          occupancy_count: input.occupancy_count || 1
        };
        r.status = 'occupied' as any;
      }
      return r?.tenant;
    }

    // 1. Fetch building_id from the room automatically
    const { data: room, error: roomError } = await supabase
      .from('units')
      .select('building_id')
      .eq('id', input.room_id)
      .single();
    
    if (roomError || !room) throw new Error("Room not found");

    const occ =
      input.occupancy_count != null ? Math.max(1, Math.floor(Number(input.occupancy_count))) : 1;

    // 2. Insert tenant with correct fields
    const payload = {
      name: input.name,
      phone: input.phone,
      whatsapp_number: input.whatsapp_number || input.phone,
      aadhar: input.aadhar,
      room_id: input.room_id,
      building_id: room.building_id,
      joined_at: input.joined_at || new Date().toISOString(),
      occupancy_count: occ,
    };

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([payload])
      .select()
      .single();
    
    if (tenantError) throw tenantError;

    // 3. Update room status to 'occupied'
    const { error: updateError } = await supabase
      .from('units')
      .update({ status: 'occupied' })
      .eq('id', input.room_id);

    if (updateError) console.error("Failed to update room status:", updateError);

    await syncUnitEffectiveRent(input.room_id);

    return tenant;
  } catch (error) {
    console.error("Error in addTenant:", error);
    throw error;
  }
}

async function removeTenant(roomId: string, tenantId: string) {
  try {
    // 1. Delete tenant
    const { error: tenantError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);
    
    if (tenantError) throw tenantError;

    // 2. Update room status to 'vacant'
    const { error: roomError } = await supabase
      .from('units')
      .update({ status: 'vacant' })
      .eq('id', roomId);

    if (roomError) throw roomError;

    await syncUnitEffectiveRent(roomId);

    return true;
  } catch (error) {
    console.error("Error in removeTenant:", error);
    throw error;
  }
}

// ── Payments ──────────────────────────────────────────────────────────────────
async function addPayment(input: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const r = mockRooms.find(x => x.id === input.room_id);
      const p: Payment = {
        id: `p${Date.now()}`,
        roomId: input.room_id,
        tenantName: r?.tenant?.name || "Unknown",
        amount: input.amount,
        date: input.date,
        status: input.status as PaymentStatus,
        method: input.method as any,
        note: input.note
      };
      mockPayments.unshift(p);
      if (input.status.toLowerCase() === 'paid' && r) {
        r.status = 'paid';
      }
      return p;
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        building_id: input.building_id,
        unit_id: input.room_id,
        tenant_id: input.tenant_id,
        amount: input.amount,
        status: input.status.toLowerCase(),
        method: input.method.toLowerCase(),
        paid_date: input.date,
        reference_number: input.reference,
        note: input.note
      }])
      .select()
      .single();
    if (error) throw error;

    // Update unit status if it was paid
    if (input.status.toLowerCase() === 'paid') {
      await supabase.from('units').update({ status: 'paid' }).eq('id', input.room_id);
    }

    return data;
  } catch (error) {
    console.error("Error in addPayment:", error);
    throw error;
  }
}

async function getRecentPayments(limit = 10) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return mockPayments.slice(0, limit).map(p => {
        const r = mockRooms.find(x => x.id === p.roomId);
        return {
          ...p,
          tenantPhone: r?.tenant?.phone,
          tenantWhatsapp: r?.tenant?.whatsapp_number,
          roomNumber: r?.number,
          buildingName: r?.buildingName
        };
      });
    }

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        units (name, buildings (name)),
        tenants!tenant_id (name, phone, whatsapp_number)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      roomId: p.unit_id,
      tenantName: p.tenants?.name || 'Unknown',
      tenantPhone: p.tenants?.phone,
      tenantWhatsapp: p.tenants?.whatsapp_number,
      amount: p.amount,
      date: p.paid_date || p.created_at,
      status: p.status as PaymentStatus,
      method: p.method.charAt(0).toUpperCase() + p.method.slice(1), // Capitalize for UI
      note: p.note,
      reference: p.reference_number,
      roomNumber: p.units?.name,
      buildingName: p.units?.buildings?.name
    }));
  } catch (error) {
    console.error("Error in getRecentPayments:", error);
    return [];
  }
}

// ── Electricity ───────────────────────────────────────────────────────────────
async function saveElectricityReading(input: {
  room_id: string;
  month: string;
  prev_reading: number;
  curr_reading: number;
  rate_per_unit: number;
}) {
  try {
    const { error } = await supabase
      .from('units')
      .update({
        prev_reading: input.prev_reading,
        curr_reading: input.curr_reading,
        rate_per_unit: input.rate_per_unit
      })
      .eq('id', input.room_id);
    
    if (error) throw error;

    // Optional: add to a history table if it exists
    return true;
  } catch (error) {
    console.error("Error in saveElectricityReading:", error);
    throw error;
  }
}

async function getElectricityRate(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'electricity_rate')
      .single();
    
    if (error || !data) return 0.18; // Default
    return parseFloat(data.value);
  } catch (error) {
    return 0.18;
  }
}

async function updateElectricityRate(rate: number) {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'electricity_rate', value: rate.toString() }, { onConflict: 'key' });
    if (error) throw error;
  } catch (error) {
    console.error("Error in updateElectricityRate:", error);
    throw error;
  }
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
async function getDashboardStats() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return mockStats();

    const [buildings, units, payments] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('units').select('*'),
      supabase.from('payments').select('amount, status, created_at')
    ]);

    const totalBuildings = buildings.count || 0;
    const totalRooms = units.data?.length || 0;
    const occupied = units.data ? units.data.filter((u: any) => u.status === 'occupied').length : 0;
    
    const pending = payments.data ? payments.data.filter((p: any) => p.status === 'pending').length : 0;
    
    const thisMonth = new Date().getMonth();
    const monthlyRevenue = (payments.data || [])
      .filter((p: any) => p.status === 'paid' && new Date(p.created_at).getMonth() === thisMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    return { totalBuildings, totalRooms, occupied, pending, monthlyRevenue };
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    return { totalBuildings: 0, totalRooms: 0, occupied: 0, pending: 0, monthlyRevenue: 0 };
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
export const nivasaApi = {
  auth,
  supabase,
  getBuildings,
  addBuilding,
  updateBuilding,
  deleteBuilding,
  getPropertyDetails,
  getRooms,
  getRoomById,
  addRoom,
  addUnit,
  updateRoom,
  updateTenant,
  addTenant,
  removeTenant,
  addPayment,
  getRecentPayments,
  saveElectricityReading,
  getElectricityRate,
  updateElectricityRate,
  getDashboardStats,
};

export type NivasaApi = typeof nivasaApi;

declare global {
  interface Window { nivasaApi: NivasaApi; }
}
