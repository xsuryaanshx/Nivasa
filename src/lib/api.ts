/**
 * estateApi — central API facade.
 * Wired to Supabase backend.
 */

import { createClient } from "@supabase/supabase-js";
import {
  type Building,
  type Room,
  type Payment,
  type PaymentStatus,
  type Tenant,
} from "./mockData";

const SUPABASE_URL = "https://ehmwvkxxoczoubbsjxvv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobXd2a3h4b2N6b3ViYnNqeHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzc5NjIsImV4cCI6MjA5MjcxMzk2Mn0._1thy8Nq3dsGBvEA8b_FPFbTbCyDk1fbwqxgUULDPG4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = {
  signUp: async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password });
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

// ── Buildings ─────────────────────────────────────────────────────────────────
async function getBuildings(): Promise<(Building & { occupancyRate: number; rooms: number })[]> {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*, units(*)');

    if (error) throw error;

    return (data || []).map(b => {
      const totalUnits = b.units ? b.units.length : 0;
      const occupiedUnits = b.units ? b.units.filter((u: any) => u.status === 'occupied').length : 0;
      const monthlyRevenue = b.units 
        ? b.units.filter((u: any) => u.status === 'occupied').reduce((acc: number, u: any) => acc + (u.rent_amount || 0), 0)
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
      units: (building.units || []).map((u: any) => ({
        id: u.id,
        name: `Room ${u.name || u.number}`,
        number: u.name || u.number,
        status: u.status || "vacant",
        rent_amount: u.rent_amount,
        tenant: tenants ? tenants.find((t: any) => t.room_id === u.id) : null
      })),
      occupancyRate: building.units?.length > 0 
        ? Math.round((building.units.filter((u: any) => u.status === 'occupied').length / building.units.length) * 100) 
        : 0
    };
  } catch (error) {
    console.error("Error in getPropertyDetails:", error);
    throw error;
  }
}

// ── Rooms (Units) ─────────────────────────────────────────────────────────────
async function getRooms(): Promise<Room[]> {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('*, buildings(name), tenants(*)');
    if (error) throw error;

    return (data || []).map((u: any) => ({
      id: u.id,
      number: u.name || u.number,
      buildingId: u.building_id,
      buildingName: u.buildings?.name || "Unknown",
      rent: u.rent_amount || 0,
      status: u.status as PaymentStatus,
      tenant: u.tenants ? u.tenants[0] : null,
      prevReading: u.prev_reading || 0,
      currReading: u.curr_reading || 0,
      ratePerUnit: u.rate_per_unit || 0.18,
      history: [],
      pastTenants: []
    }));
  } catch (error) {
    console.error("Error in getRooms:", error);
    throw error;
  }
}

async function getRoomById(id: string): Promise<Room | null> {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('*, buildings(name), tenants(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      number: data.name || data.number,
      buildingId: data.building_id,
      buildingName: data.buildings?.name || "Unknown",
      rent: data.rent_amount || 0,
      status: data.status as PaymentStatus,
      tenant: data.tenants ? data.tenants[0] : null,
      prevReading: data.prev_reading || 0,
      currReading: data.curr_reading || 0,
      ratePerUnit: data.rate_per_unit || 0.18,
      history: [],
      pastTenants: []
    };
  } catch (error) {
    console.error("Error in getRoomById:", error);
    return null;
  }
}

async function addRoom(input: {
  building_id: string;
  number: string;
  rent: number;
}) {
  try {
    const { data, error } = await supabase
      .from('units')
      .insert([{
        building_id: input.building_id,
        name: input.number,
        rent_amount: input.rent,
        status: 'vacant'
      }])
      .select()
      .single();
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
}) {
  try {
    // 1. Fetch building_id from the room automatically
    const { data: room, error: roomError } = await supabase
      .from('units')
      .select('building_id')
      .eq('id', input.room_id)
      .single();
    
    if (roomError || !room) throw new Error("Room not found");

    // 2. Insert tenant with correct fields
    const payload = {
      name: input.name,
      phone: input.phone,
      whatsapp_number: input.whatsapp_number || input.phone,
      aadhar: input.aadhar,
      room_id: input.room_id,
      building_id: room.building_id,
      joined_at: input.joined_at || new Date().toISOString()
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

    return true;
  } catch (error) {
    console.error("Error in removeTenant:", error);
    throw error;
  }
}

// ── Payments ──────────────────────────────────────────────────────────────────
async function addPayment(input: any) {
  try {
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
export const estateApi = {
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
  addTenant,
  removeTenant,
  addPayment,
  getRecentPayments,
  saveElectricityReading,
  getElectricityRate,
  updateElectricityRate,
  getDashboardStats,
};

export type EstateApi = typeof estateApi;

declare global {
  interface Window { estateApi: EstateApi; }
}
