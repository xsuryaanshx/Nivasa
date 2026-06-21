import { createClient } from "@supabase/supabase-js";
import {
  type Building,
  type Room,
  type Payment,
  type PaymentStatus,
  type Tenant,
  type MaintenanceRequest,
} from "./types";
import {
  type OccupancyPriceTier,
  computeRentFromTiers,
  normalizeOccupancyTiers,
  tiersToJsonbPayload,
} from "./rentByOccupancy";
import { calculateTenantShare } from "./utils";
import { getTenantExpenses, getCustomExpenses } from "./expensesStore";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/* SECURITY: Safe logger — never expose raw Supabase errors to browser console in production */
const IS_PROD = import.meta.env.PROD;
function safeLog(context: string, error: unknown) {
  if (IS_PROD) {
    console.error(`[Nivasa] ${context}: An error occurred.`);
  } else {
    console.error(`[Nivasa] ${context}:`, error);
  }
}
const customStorage = {
  getItem: (key: string) => {
    const local = localStorage.getItem(key);
    if (local !== null && local !== undefined) return local;
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (
      sessionStorage.getItem("nivasa_no_remember") === "true" ||
      localStorage.getItem("nivasa_no_remember") === "true"
    ) {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Auth ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const auth = {
  signUp: async (email: string, password: string, fullName: string, selectedPlan: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/confirmed`,
        data: {
          full_name: fullName,
          selected_plan: selectedPlan,
        },
      },
    });
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
  updateProfile: async (updates: { full_name?: string }) => {
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    return data;
  },
};
async function requireAuthUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  
  throw new Error("Sign in is required. Your session may have expired ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sign in again.");
}
/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Buildings ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
async function getBuildings(): Promise<
  (any & { occupancyRate: number; rooms: number })[]
> {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("buildings")
      .select("*, units(*)")
      .eq("user_id", user_id);
    if (error) throw error;
    return (data || []).map((b) => {
      const totalUnits = b.units ? b.units.length : 0;
      const occupiedUnits = b.units
        ? b.units.filter((u: any) => u.status === "occupied").length
        : 0;
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
        occupancyRate:
          totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      };
    });
  } catch (error) {
    safeLog("getBuildings", error);
    throw error;
  }
}
async function addBuilding(input: {
  name: string;
  address: string;
  total_rooms?: number;
}) {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("buildings")
      .insert([{ name: input.name, address: input.address, user_id }])
      .select()
      .single();
    if (error) throw error;
    if (input.total_rooms && input.total_rooms > 0) {
      const unitsToInsert = Array.from({ length: input.total_rooms }).map(
        (_, i) => ({
          building_id: data.id,
          name: `${i + 1}`,
          rent_amount: 0,
          status: "vacant",
          user_id,
        }),
      );
      const { error: unitsError } = await supabase
        .from("units")
        .insert(unitsToInsert);
      if (unitsError)
        console.error("Error inserting auto-generated units:", unitsError);
    }
    return data;
  } catch (error) {
    safeLog("addBuilding", error);
    throw error;
  }
}
async function adjustBuildingRooms(buildingId: string, targetCount: number) {
  /* Supabase mode */
  const user_id = await requireAuthUserId();
  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("id, name, status")
    .eq("building_id", buildingId)
    .eq("user_id", user_id);
  if (unitsError) throw unitsError;
  const currentCount = units.length;
  if (targetCount === currentCount) return;
  if (targetCount > currentCount) {
    const diff = targetCount - currentCount;
    const existingNums = units
      .map((u) => parseInt(u.name.replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    let nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const unitsToInsert = Array.from({ length: diff }).map((_, i) => ({
      building_id: buildingId,
      name: `${nextNum + i}`,
      rent_amount: 0,
      status: "vacant",
      user_id,
    }));
    const { error } = await supabase.from("units").insert(unitsToInsert);
    if (error) throw error;
  } else {
    const diff = currentCount - targetCount;
    /* Check tenants in units */
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("room_id, status")
      .eq("building_id", buildingId)
      .eq("user_id", user_id)
      .neq("status", "vacated");
    if (tenantsError) throw tenantsError;
    const occupiedUnitIds = new Set((tenants || []).map((t) => t.room_id));
    const vacantUnits = units.filter(
      (u) => u.status !== "occupied" && !occupiedUnitIds.has(u.id),
    );
    if (vacantUnits.length < diff) {
      throw new Error(
        `Cannot reduce room count to ${targetCount} because some rooms are occupied. Please vacate rooms first.`,
      );
    }
    const unitsToDelete = vacantUnits.slice(0, diff).map((u) => u.id);
    /* Clean up payments/tenants for deleted vacant units */
    await supabase.from("payments").delete().in("unit_id", unitsToDelete);
    await supabase.from("tenants").delete().in("room_id", unitsToDelete);
    const { error } = await supabase
      .from("units")
      .delete()
      .in("id", unitsToDelete);
    if (error) throw error;
  }
}
async function updateBuilding(
  id: string,
  updates: { 
    name?: string; 
    address?: string; 
    total_rooms?: number;
    is_public?: boolean;
    slug?: string;
    public_description?: string;
    public_amenities?: string[];
    contact_phone?: string;
    cover_image_url?: string;
    images?: string[];
  },
) {
  try {
    /* Whitelist allowed fields */
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.is_public !== undefined) payload.is_public = updates.is_public;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.public_description !== undefined) payload.public_description = updates.public_description;
    if (updates.public_amenities !== undefined) payload.public_amenities = updates.public_amenities;
    if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone;
    if (updates.cover_image_url !== undefined) payload.cover_image_url = updates.cover_image_url;
    if (updates.images !== undefined) payload.images = updates.images;
    
    const targetRooms = updates.total_rooms;
    const user_id = await requireAuthUserId();
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from("buildings")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user_id);
      if (error) throw error;
    }
    if (targetRooms !== undefined) {
      await adjustBuildingRooms(id, targetRooms);
    }
  } catch (error) {
    safeLog("updateBuilding", error);
    throw error;
  }
}
async function deleteRoom(id: string) {
  try {
    /* Supabase mode — enforce ownership */
    const user_id = await requireAuthUserId();
    await supabase
      .from("payments")
      .delete()
      .eq("unit_id", id)
      .eq("user_id", user_id);
    await supabase
      .from("tenants")
      .delete()
      .eq("room_id", id)
      .eq("user_id", user_id);
    const { error } = await supabase
      .from("units")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);
    if (error) throw error;
    return true;
  } catch (error) {
    safeLog("deleteRoom", error);
    throw error;
  }
}
async function deleteBuilding(id: string) {
  try {
    const user_id = await requireAuthUserId();
    /* Enforce ownership on all cascaded deletes */
    await supabase
      .from("payments")
      .delete()
      .eq("building_id", id)
      .eq("user_id", user_id);
    await supabase
      .from("tenants")
      .delete()
      .eq("building_id", id)
      .eq("user_id", user_id);
    await supabase
      .from("units")
      .delete()
      .eq("building_id", id)
      .eq("user_id", user_id);
    const { error } = await supabase
      .from("buildings")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);
    if (error) throw error;
  } catch (error) {
    safeLog("deleteBuilding", error);
    throw error;
  }
}
async function getPropertyDetails(buildingId: string | undefined) {
  if (!buildingId) throw new Error("Building ID required");
  try {
    const user_id = await requireAuthUserId();
    const { data: building, error: bError } = await supabase
      .from("buildings")
      .select("*, units(*)")
      .eq("id", buildingId)
      .eq("user_id", user_id)
      .single();
    if (bError) throw bError;
    const { data: tenants, error: tError } = await supabase
      .from("tenants")
      .select("*")
      .eq("building_id", buildingId)
      .eq("user_id", user_id);
    if (tError) safeLog("getPropertyDetails.tenants", tError);
    return {
      ...building,
      tenants: tenants || [],
      units: (building.units || []).map((u: any) => {
        const unitTenants = tenants
          ? tenants.filter((t: any) => t.room_id === u.id).map(mapTenantFromRow)
          : [];
        const tiers = normalizeOccupancyTiers(u.occupancy_prices);
        const occ = Math.max(1, unitTenants.length);
        const stored = Number(u.rent_amount) || 0;
        const rent_amount =
          tiers.length > 0
            ? computeRentFromTiers(
                tiers,
                stored,
                unitTenants.length > 0 ? occ : 1,
              )
            : stored;
        return {
          id: u.id,
          name: `Room ${u.name || u.number}`,
          number: u.name || u.number,
          status: u.status || "vacant",
          rent_amount,
          capacity: u.capacity ?? 1,
          occupancy_prices: u.occupancy_prices ?? null,
          tenants: unitTenants.filter((t: any) => t.status !== "vacated"),
        };
      }),
      occupancyRate:
        building.units?.length > 0
          ? Math.round(
              (building.units.filter((u: any) => u.status === "occupied")
                .length /
                building.units.length) *
                100,
            )
          : 0,
    };
  } catch (error) {
    safeLog("getPropertyDetails", error);
    throw error;
  }
}
/* ———— Rooms (Units) ————————————————————————————————————————————— */
function mapTenantFromRow(t: any): any {
  return {
    id: t.id,
    name: t.name,
    phone: t.phone,
    whatsapp_number: t.whatsapp_number,
    aadhar: t.aadhar,
    joined_at: t.joined_at,
    occupancy_count:
      t.occupancy_count != null ? Math.max(1, Number(t.occupancy_count)) : 1,
    depositAmount: t.deposit_amount,
    depositMethod: t.deposit_method,
    status: t.status,
    leftAt: t.left_at,
    document_url: t.document_url,
    bed_assignment: t.bed_assignment,
    rent_amount: t.rent_amount != null ? Number(t.rent_amount) : undefined,
  };
}
function mapUnitToRoom(u: any): any {
  const tiers = normalizeOccupancyTiers(u.occupancy_prices);
  const unitTenants =
    u.tenants && Array.isArray(u.tenants)
      ? u.tenants.map(mapTenantFromRow)
      : [];
  const billingOcc = Math.max(1, unitTenants.length);
  const stored = Number(u.rent_amount) || 0;
  const rent =
    tiers.length > 0
      ? computeRentFromTiers(
          tiers,
          stored,
          unitTenants.length > 0 ? billingOcc : 1,
        )
      : stored;
  return {
    id: u.id,
    number: u.name || u.number,
    buildingId: u.building_id,
    buildingName: u.buildings?.name || "Unknown",
    rent,
    occupancyPrices: tiers.length > 0 ? tiers : null,
    capacity: u.capacity ?? 1,
    status: u.status as any,
    tenants: unitTenants.filter((t) => t.status !== "vacated"),
    prevReading: u.prev_reading || 0,
    currReading: u.curr_reading || 0,
    ratePerUnit: u.rate_per_unit || 0.18,
    history: [],
    pastTenants: unitTenants.filter((t) => t.status === "vacated"),
  };
}
async function getRooms(): Promise<any[]> {
  try {
    const user_id = await requireAuthUserId();
    const { data: units, error } = await supabase
      .from("units")
      .select("*, buildings(name)")
      .eq("user_id", user_id);
    if (error) throw error;
    const unitIds = (units || []).map((u) => u.id);
    const { data: tenants } = await supabase
      .from("tenants")
      .select("*")
      .in("room_id", unitIds.length > 0 ? unitIds : ["__none__"]);
    const unitsWithTenants = (units || []).map((u) => ({
      ...u,
      tenants: tenants ? tenants.filter((t: any) => t.room_id === u.id) : [],
    }));
    return unitsWithTenants.map(mapUnitToRoom);
  } catch (error) {
    safeLog("getRooms", error);
    throw error;
  }
}
async function getRoomById(id: string): Promise<any | null> {
  try {
    const user_id = await requireAuthUserId();
    const { data: unit, error } = await supabase
      .from("units")
      .select("*, buildings(name)")
      .eq("id", id)
      .eq("user_id", user_id)
      .single();
    if (error) throw error;
    if (!unit) return null;
    /* SECURITY FIX #3: scope tenant query by user_id to prevent IDOR */
    const { data: tenants } = await supabase
      .from("tenants")
      .select("*")
      .eq("room_id", id)
      .eq("user_id", user_id);
    const unitWithTenants = { ...unit, tenants: tenants || [] };
    return mapUnitToRoom(unitWithTenants);
  } catch (error) {
    safeLog("getRoomById", error);
    return null;
  }
}
async function getTenants(): Promise<any[]> {
  try {
    const user_id = await requireAuthUserId();
    
    // First get all units for this user to ensure we only get their tenants
    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("*, buildings(name)")
      .eq("user_id", user_id);
      
    if (unitsError) throw unitsError;
    const unitIds = (units || []).map((u) => u.id);
    
    // Then get all tenants in these units
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("*")
      .in("room_id", unitIds.length > 0 ? unitIds : ["__none__"]);
      
    if (error) throw error;
    
    const activeTenants = (tenants || []).filter(t => t.status !== "vacated");
    
    return activeTenants.map((t) => {
      const unit = units?.find(u => u.id === t.room_id);
      return {
        ...mapTenantFromRow(t),
        buildingName: unit?.buildings?.name || "Unknown",
        buildingId: unit?.building_id,
        roomId: t.room_id,
        roomNumber: unit?.name || unit?.number || "Unknown",
        roomRent: unit?.rent_amount || 0,
      };
    });
  } catch (error) {
    safeLog("getTenants", error);
    throw error;
  }
}

async function getTenantInvoices(): Promise<any[]> {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase.from("tenant_invoices").select("*");
    if (error) throw error;
    return data || [];
  } catch (error) {
    safeLog("getTenantInvoices", error);
    return [];
  }
}

async function ensureCurrentMonthInvoices(): Promise<void> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const tenants = await getTenants();
    const { data: existing } = await supabase
      .from("tenant_invoices")
      .select("tenant_id")
      .eq("billing_month", currentMonth);
      
    const existingIds = new Set((existing || []).map(e => e.tenant_id));
    const missingTenants = tenants.filter(t => !existingIds.has(t.id));
    
    if (missingTenants.length === 0) return;
    
    const rooms = await getRooms();
    const globalExpenses = getCustomExpenses();
    
    const inserts = missingTenants.map(t => {
      const activeExpenseIds = getTenantExpenses(t.id);
      const activeExpenses = globalExpenses.filter(e => activeExpenseIds.includes(e.id));
      const addonsTotal = activeExpenses.reduce((sum, e) => sum + e.cost, 0);
      
      const room = rooms.find(r => r.id === t.roomId);
      const baseRent = t.rent_amount ? Number(t.rent_amount) : (room ? calculateTenantShare(room) : 0);
      
      return {
        tenant_id: t.id,
        room_id: t.roomId,
        billing_month: currentMonth,
        base_rent: baseRent,
        addons_total: addonsTotal,
        total_amount: baseRent + addonsTotal
      };
    });
    
    if (inserts.length > 0) {
      const { error } = await supabase.from("tenant_invoices").insert(inserts);
      if (error) throw error;
    }
  } catch (error) {
    safeLog("ensureCurrentMonthInvoices", error);
  }
}

/* SECURITY FIX #17: user_id is now REQUIRED — never update without ownership check */
async function syncUnitEffectiveRent(unitId: string, user_id?: string) {
  const effectiveUserId = user_id || (await requireAuthUserId());
  const { data: unit, error } = await supabase
    .from("units")
    .select("rent_amount, occupancy_prices, status")
    .eq("id", unitId)
    .eq("user_id", effectiveUserId)
    .single();
  if (error || !unit) return;
  const { count, error: tError } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", unitId)
    .eq("user_id", effectiveUserId);
  const tiers = normalizeOccupancyTiers(unit.occupancy_prices);
  const occ =
    unit.status === "occupied" && count != null ? Math.max(1, count) : 1;
  const stored = Number(unit.rent_amount) || 0;
  const effective = computeRentFromTiers(tiers, stored, occ);
  if (Math.abs(stored - effective) < 0.005) return;
  await supabase
    .from("units")
    .update({ rent_amount: effective })
    .eq("id", unitId)
    .eq("user_id", effectiveUserId);
}
async function updateRoom(
  id: string,
  updates: {
    number?: string;
    rent_amount?: number;
    occupancy_prices?: OccupancyPriceTier[] | null;
    capacity?: number;
  },
) {
  const payload: Record<string, unknown> = {};
  if (updates.number !== undefined) payload.name = updates.number;
  if (updates.rent_amount !== undefined)
    payload.rent_amount = updates.rent_amount;
  if (updates.occupancy_prices !== undefined) {
    const tiers = normalizeOccupancyTiers(updates.occupancy_prices);
    payload.occupancy_prices = tiersToJsonbPayload(
      tiers.length > 0 ? tiers : null,
    );
  }
  if (updates.capacity !== undefined) {
    payload.capacity = updates.capacity;
  }
  const user_id = await requireAuthUserId();
  const { error } = await supabase
    .from("units")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw error;
  await syncUnitEffectiveRent(id);
}
async function updateTenant(
  tenantId: string,
  updates: {
    occupancy_count?: number;
    name?: string;
    phone?: string;
    whatsapp_number?: string;
    aadhar?: string;
    depositAmount?: number;
    depositMethod?: string;
    document_url?: string;
    bed_assignment?: string;
    rent_amount?: number;
  },
) {
  try {
    const patch: Record<string, unknown> = {};
    if (updates.occupancy_count !== undefined) {
      patch.occupancy_count = Math.max(
        1,
        Math.floor(Number(updates.occupancy_count)),
      );
    }
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.whatsapp_number !== undefined)
      patch.whatsapp_number = updates.whatsapp_number;
    if (updates.aadhar !== undefined) patch.aadhar = updates.aadhar;
    if (updates.depositAmount !== undefined)
      patch.deposit_amount = updates.depositAmount;
    if (updates.depositMethod !== undefined)
      patch.deposit_method = updates.depositMethod;
    if (updates.document_url !== undefined)
      patch.document_url = updates.document_url;
    if (updates.bed_assignment !== undefined)
      patch.bed_assignment = updates.bed_assignment;
    if (updates.rent_amount !== undefined)
      patch.rent_amount = updates.rent_amount;
    if (Object.keys(patch).length === 0) return;
    const user_id = await requireAuthUserId();
    /* Authorize via unit */
    const { data: tenantCheck } = await supabase
      .from("tenants")
      .select("room_id")
      .eq("id", tenantId)
      .single();
    if (!tenantCheck) throw new Error("Tenant not found");
    const { data: unitCheck } = await supabase
      .from("units")
      .select("id")
      .eq("id", tenantCheck.room_id)
      .eq("user_id", user_id)
      .single();
    if (!unitCheck) throw new Error("Unauthorized");
    const { data: row, error } = await supabase
      .from("tenants")
      .update(patch)
      .eq("id", tenantId)
      .select("room_id")
      .single();
    if (error) throw error;
    if (row?.room_id && patch.occupancy_count !== undefined) {
      await syncUnitEffectiveRent(row.room_id);
    }
  } catch (error) {
    safeLog("updateTenant", error);
    throw error;
  }
}
async function addRoom(input: {
  building_id: string;
  number: string;
  rent: number;
  occupancy_prices?: OccupancyPriceTier[] | null;
  capacity?: number;
}) {
  try {
    const user_id = await requireAuthUserId();
    const tiers = normalizeOccupancyTiers(input.occupancy_prices ?? null);
    const hasTiers = tiers.length > 0;
    const rent_amount = hasTiers
      ? computeRentFromTiers(tiers, input.rent, 1)
      : input.rent;
    const row: Record<string, unknown> = {
      building_id: input.building_id,
      name: input.number,
      rent_amount,
      capacity: input.capacity ?? 1,
      status: "vacant",
      user_id,
    };
    if (hasTiers) row.occupancy_prices = tiersToJsonbPayload(tiers);
    const { data, error } = await supabase
      .from("units")
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    safeLog("addRoom", error);
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
/* ———— Tenants ——————————————————————————————————————————————————— */
async function addTenant(input: {
  room_id: string;
  name: string;
  phone: string;
  whatsapp_number?: string;
  aadhar: string;
  joined_at?: string;
  occupancy_count?: number;
  depositAmount?: number;
  depositMethod?: string;
  document_url?: string;
  bed_assignment?: string;
  rent_amount?: number;
}) {
  try {
    /* 1. Fetch building_id — also verify room belongs to this user */
    const user_id = await requireAuthUserId();
    const { data: room, error: roomError } = await supabase
      .from("units")
      .select("building_id, capacity")
      .eq("id", input.room_id)
      .eq("user_id", user_id)
      .single();
    if (roomError || !room) throw new Error("Room not found or access denied");
    const occ =
      input.occupancy_count != null
        ? Math.max(1, Math.floor(Number(input.occupancy_count)))
        : 1;
    /* 2. Insert tenant with correct fields */
    if (!input.aadhar) throw new Error("Aadhar number is required.");
    const payload = {
      name: input.name,
      phone: input.phone,
      whatsapp_number: input.whatsapp_number || input.phone,
      aadhar: input.aadhar,
      room_id: input.room_id,
      building_id: room.building_id,
      user_id,
      joined_at: input.joined_at || new Date().toISOString(),
      occupancy_count: occ,
      deposit_amount: input.depositAmount || 0,
      deposit_method: input.depositMethod || "Cash",
      document_url: input.document_url || null,
      bed_assignment: input.bed_assignment || null,
      rent_amount: input.rent_amount ?? 0,
      status: "active",
    };
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert([payload])
      .select()
      .single();
    if (tenantError) throw tenantError;

    /* 2.1 Auto-log deposit payment if not Pending */
    if (payload.deposit_amount > 0 && payload.deposit_method !== "Pending") {
      await addPayment({
        room_id: input.room_id,
        tenant_id: tenant.id,
        amount: payload.deposit_amount,
        status: "paid",
        method: payload.deposit_method,
        date: payload.joined_at,
        note: "Initial Deposit"
      });
    }

    /* 2.5 Upsert into global trust score table so their name is searchable */
    await supabase.from("tenant_trust_scores").upsert({
      aadhar: input.aadhar,
      name: input.name,
      score: 1000
    }, { onConflict: "aadhar" });
    /* 3. Update room status to 'occupied' only if full */
    const { count, error: countError } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", input.room_id)
      .neq("status", "vacated");
    
    const currentCount = count || 0;
    const capacity = room.capacity || 1;
    
    if (currentCount >= capacity) {
      const { error: updateError } = await supabase
        .from("units")
        .update({ status: "occupied" })
        .eq("id", input.room_id)
        .eq("user_id", user_id); // CRIT-02 fix: enforce ownership on status update
      if (updateError)
        safeLog("addTenant.updateRoomStatus", updateError);
    }
    await syncUnitEffectiveRent(input.room_id);
    return tenant;
  } catch (error) {
    safeLog("addTenant", error);
    throw error;
  }
}
async function removeTenant(roomId: string, tenantId: string) {
  try {
    /* 1. Mark tenant as vacated */
    const user_id = await requireAuthUserId();
    /* Authorize via unit */
    const { data: unitCheck } = await supabase
      .from("units")
      .select("id")
      .eq("id", roomId)
      .eq("user_id", user_id)
      .single();
    if (!unitCheck) throw new Error("Unauthorized");
    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ status: "vacated", left_at: new Date().toISOString() })
      .eq("id", tenantId)
      .eq("room_id", roomId);
    /* Extra ownership check: tenant must belong to this room */
    if (tenantError) throw tenantError;
    /* 2. Update room status to 'vacant' if tenants < capacity */
    const { count, error: checkError } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .neq("status", "vacated");
      
    const { data: unitData } = await supabase.from("units").select("capacity").eq("id", roomId).single();
    const capacity = unitData?.capacity || 1;
      
    if (count != null && count < capacity) {
      const { error: roomError } = await supabase
        .from("units")
        .update({ status: "vacant" })
        .eq("id", roomId)
        .eq("user_id", user_id); // CRIT-03 fix: enforce ownership on status revert
      if (roomError) throw roomError;
    }
    await syncUnitEffectiveRent(roomId);
    return true;
  } catch (error) {
    safeLog("removeTenant", error);
    throw error;
  }
}
/* ———— Payments —————————————————————————————————————————————————— */
async function addPayment(input: any) {
  try {
    const user_id = await requireAuthUserId();
    /* Verify the room belongs to this user before adding a payment */
    const { data: roomCheck } = await supabase
      .from("units")
      .select("id, building_id")
      .eq("id", input.room_id)
      .eq("user_id", user_id)
      .single();
    if (!roomCheck) throw new Error("Room not found or access denied");
    /* Validate status allowlist */
    const validStatuses = ["paid", "pending", "late"];
    const statusNorm = (input.status || "").toLowerCase();
    if (!validStatuses.includes(statusNorm))
      throw new Error("Invalid payment status");
    const payload = {
      building_id: input.building_id || roomCheck.building_id,
      unit_id: input.room_id,
      tenant_id: input.tenant_id,
      user_id,
      amount: input.amount,
      status: statusNorm,
      method: (input.method || "cash").toLowerCase(),
      paid_date: input.date,
      reference_number: input.reference,
      note: input.note,
    };


    const { data, error } = await supabase
      .from("payments")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    
    return data;
  } catch (error) {
    safeLog("addPayment", error);
    throw error;
  }
}
async function getRecentPayments(limit = 10) {
  try {
    const user_id = await requireAuthUserId();
    const { data: unitsAuth } = await supabase
      .from("units")
      .select("id, buildings!inner(user_id)")
      .eq("buildings.user_id", user_id);
    const unitIds = (unitsAuth || []).map((u) => u.id);
    const { data, error } = await supabase
      .from("payments")
      .select(
        `        id, amount, paid_date, created_at, status, method, tenant_id, unit_id,        units (name, buildings (name)),        tenants!tenant_id (name, phone, whatsapp_number)      `,
      )
      .in("unit_id", unitIds.length > 0 ? unitIds : ["__none__"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.id,
      roomId: p.unit_id,
      tenantId: p.tenant_id,
      tenantName: p.tenants?.name || "Unknown",
      tenantPhone: p.tenants?.phone,
      tenantWhatsapp: p.tenants?.whatsapp_number,
      amount: p.amount,
      date: p.paid_date || p.created_at,
      status: p.status as any,
      method: p.method.charAt(0).toUpperCase() + p.method.slice(1),
      /* Capitalize for UI */
      note: p.note,
      reference: p.reference_number,
      roomNumber: p.units?.name,
      buildingName: p.units?.buildings?.name,
    }));
  } catch (error) {
    safeLog("getRecentPayments", error);
    return [];
  }
}
/* ———— Electricity ——————————————————————————————————————————————— */
async function saveElectricityReading(input: {
  room_id: string;
  month: string;
  prev_reading: number;
  curr_reading: number;
  rate_per_unit: number;
}) {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase
      .from("units")
      .update({
        prev_reading: input.prev_reading,
        curr_reading: input.curr_reading,
        rate_per_unit: input.rate_per_unit,
      })
      .eq("id", input.room_id)
      .eq("user_id", user_id);
    if (error) throw error;
    return true;
  } catch (error) {
    safeLog("saveElectricityReading", error);
    throw error;
  }
}
/* SECURITY FIX #16: Electricity rate is now stored per-user in user_settings instead of a shared table */
async function getElectricityRate(): Promise<number> {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user_id)
      .single();
    if (error || !data || !(data as any).electricity_rate) return 0.18;
    return parseFloat((data as any).electricity_rate) || 0.18;
  } catch (error) {
    return 0.18;
  }
}
async function updateElectricityRate(rate: number) {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id, electricity_rate: rate });
    if (error) throw error;
  } catch (error) {
    safeLog("updateElectricityRate", error);
    throw error;
  }
}
/* ———— Dashboard stats ——————————————————————————————————————————— */
async function getDashboardStats() {
  try {
    const user_id = await requireAuthUserId();
    const { data: unitsAuth } = await supabase
      .from("units")
      .select("id")
      .eq("user_id", user_id);
    const unitIds = (unitsAuth || []).map((u) => u.id);
    const [buildings, units, payments] = await Promise.all([
      supabase
        .from("buildings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id),
      supabase.from("units").select("*").eq("user_id", user_id),
      supabase
        .from("payments")
        .select("amount, status, created_at")
        .in("unit_id", unitIds.length > 0 ? unitIds : ["__none__"]),
    ]);
    const totalBuildings = buildings.count || 0;
    const totalRooms = units.data?.length || 0;
    const occupied = units.data
      ? units.data.filter((u: any) => u.status !== "vacant").length
      : 0;
    const pending = units.data
      ? units.data.filter((u: any) => u.status === "pending" || u.status === "late").length
      : 0;
    const thisMonth = new Date().getMonth();
    const monthlyRevenue = (payments.data || [])
      .filter(
        (p: any) =>
          p.status === "paid" &&
          new Date(p.created_at).getMonth() === thisMonth,
      )
      .reduce((sum, p) => sum + p.amount, 0);
    return { totalBuildings, totalRooms, occupied, pending, monthlyRevenue };
  } catch (error) {
    safeLog("getDashboardStats", error); // MED-01 fix: use safeLog to prevent raw error exposure in production
    return {
      totalBuildings: 0,
      totalRooms: 0,
      occupied: 0,
      pending: 0,
      monthlyRevenue: 0,
    };
  }
}

/* — Staff Management —————————————————————————————————————————————— */
async function getStaff() {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("staff")
      .select("*, staff_buildings(buildings(id, name))")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    
    return (data || []).map((s: any) => ({
      ...s,
      allocatedBuildings: s.staff_buildings ? s.staff_buildings.map((sb: any) => sb.buildings?.id).filter(Boolean) : []
    }));
  } catch (error) {
    safeLog("getStaff", error);
    throw error;
  }
}

async function getStaffById(id: string) {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("staff")
      .select("*, staff_buildings(buildings(id, name))")
      .eq("id", id)
      .eq("user_id", user_id)
      .single();
    if (error) throw error;
    return {
      ...data,
      allocatedBuildings: data.staff_buildings ? data.staff_buildings.map((sb: any) => sb.buildings?.id).filter(Boolean) : []
    };
  } catch (error) {
    safeLog("getStaffById", error);
    throw error;
  }
}

/* SECURITY FIX #7: Whitelist allowed fields — never spread raw input */
async function addStaff(input: any) {
  try {
    const user_id = await requireAuthUserId();
    const payload = {
      user_id,
      name: input.name,
      role: input.role,
      phone: input.phone || null,
      monthly_salary: input.monthly_salary || 0,
      status: input.status || "active",
      emergency_contact_name: input.emergency_contact_name || null,
      emergency_contact_phone: input.emergency_contact_phone || null,
      notes: input.notes || null,
      join_date: input.join_date || new Date().toISOString().split('T')[0],
      aadhar: input.aadhar || null,
    };
    const { data, error } = await supabase
      .from("staff")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;

    if (input.allocatedBuildings && input.allocatedBuildings.length > 0) {
      const allocations = input.allocatedBuildings.map((bid: string) => ({
        staff_id: data.id,
        building_id: bid
      }));
      await supabase.from("staff_buildings").insert(allocations);
    }

    return data;
  } catch (error) {
    safeLog("addStaff", error);
    throw error;
  }
}

/* SECURITY FIX #6: Whitelist allowed update fields — never spread raw input */
async function updateStaff(id: string, updates: any) {
  try {
    const user_id = await requireAuthUserId();
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.monthly_salary !== undefined) patch.monthly_salary = updates.monthly_salary;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.emergency_contact_name !== undefined) patch.emergency_contact_name = updates.emergency_contact_name;
    if (updates.emergency_contact_phone !== undefined) patch.emergency_contact_phone = updates.emergency_contact_phone;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.join_date !== undefined) patch.join_date = updates.join_date;
    if (updates.aadhar !== undefined) patch.aadhar = updates.aadhar;
    
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from("staff")
        .update(patch)
        .eq("id", id)
        .eq("user_id", user_id);
      if (error) throw error;
    }

    if (updates.allocatedBuildings !== undefined) {
      await supabase.from("staff_buildings").delete().eq("staff_id", id);
      if (updates.allocatedBuildings.length > 0) {
        const allocations = updates.allocatedBuildings.map((bid: string) => ({
          staff_id: id,
          building_id: bid
        }));
        await supabase.from("staff_buildings").insert(allocations);
      }
    }
  } catch (error) {
    safeLog("updateStaff", error);
    throw error;
  }
}

async function removeStaff(id: string) {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);
    if (error) throw error;
  } catch (error) {
    safeLog("removeStaff", error);
    throw error;
  }
}

/* SECURITY FIX #4: Add auth + verify staff ownership in all staff sub-functions */
async function verifyStaffOwnership(staffId: string, user_id: string): Promise<void> {
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("id", staffId)
    .eq("user_id", user_id)
    .single();
  if (error || !data) throw new Error("Staff not found or access denied");
}

async function getStaffPayments(staffId: string) {
  try {
    const user_id = await requireAuthUserId();
    await verifyStaffOwnership(staffId, user_id);
    const { data, error } = await supabase
      .from("staff_payments")
      .select("*")
      .eq("staff_id", staffId)
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    safeLog("getStaffPayments", error);
    throw error;
  }
}

async function addStaffPayment(input: any) {
  try {
    const user_id = await requireAuthUserId();
    await verifyStaffOwnership(input.staff_id, user_id);
    const payload = {
      staff_id: input.staff_id,
      amount: input.amount,
      payment_date: input.payment_date,
      notes: input.notes || null,
    };
    const { data, error } = await supabase
      .from("staff_payments")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    safeLog("addStaffPayment", error);
    throw error;
  }
}

async function getStaffAttendance(staffId: string) {
  try {
    const user_id = await requireAuthUserId();
    await verifyStaffOwnership(staffId, user_id);
    const { data, error } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    safeLog("getStaffAttendance", error);
    throw error;
  }
}

async function addStaffAttendance(input: any) {
  try {
    const user_id = await requireAuthUserId();
    await verifyStaffOwnership(input.staff_id, user_id);
    const payload = {
      staff_id: input.staff_id,
      date: input.date,
      status: input.status,
      notes: input.notes || null,
    };
    const { data, error } = await supabase
      .from("staff_attendance")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    safeLog("addStaffAttendance", error);
    throw error;
  }
}

async function getStaffDocuments(staffId: string) {
  try {
    const user_id = await requireAuthUserId();
    await verifyStaffOwnership(staffId, user_id);
    const { data, error } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("staff_id", staffId)
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    safeLog("getStaffDocuments", error);
    throw error;
  }
}

async function addStaffDocument(input: any) {
  try {
    const user_id = await requireAuthUserId();
    await verifyStaffOwnership(input.staff_id, user_id);
    const payload = {
      staff_id: input.staff_id,
      document_type: input.document_type,
      document_url: input.document_url,
    };
    const { data, error } = await supabase
      .from("staff_documents")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    safeLog("addStaffDocument", error);
    throw error;
  }
}

async function getUserSettings() {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user_id)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // ignore no rows
    return data;
  } catch (error) {
    safeLog("getUserSettings", error);
    throw error;
  }
}

/* SECURITY FIX #9: Whitelist allowed fields — never spread raw input */
async function updateUserSettings(settings: any) {
  try {
    const user_id = await requireAuthUserId();
    const patch: Record<string, unknown> = { user_id };
    if (settings.rent_collection_date !== undefined) patch.rent_collection_date = settings.rent_collection_date;
    if (settings.electricity_rate !== undefined) patch.electricity_rate = settings.electricity_rate;
    const { error } = await supabase
      .from("user_settings")
      .upsert(patch);
    if (error) throw error;
  } catch (error) {
    safeLog("updateUserSettings", error);
    throw error;
  }
}

async function getInvoices(filter: { roomId?: string, tenantId?: string }) {
  try {
    const user_id = await requireAuthUserId();
    let query = supabase.from("invoices").select("*").eq("user_id", user_id).order("created_at", { ascending: false });
    if (filter.roomId) query = query.eq("room_id", filter.roomId);
    if (filter.tenantId) query = query.eq("tenant_id", filter.tenantId);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    safeLog("getInvoices", error);
    throw error;
  }
}

/* SECURITY FIX #8: Whitelist allowed fields — never spread raw input */
async function createInvoice(invoice: any) {
  try {
    const user_id = await requireAuthUserId();
    const payload = {
      user_id,
      tenant_id: invoice.tenant_id,
      room_id: invoice.room_id,
      month_year: invoice.month_year,
      base_rent: invoice.base_rent || 0,
      electricity_cost: invoice.electricity_cost || 0,
      add_ons: invoice.add_ons || [],
      previous_dues: invoice.previous_dues || 0,
      total_due: invoice.total_due || 0,
    };
    const { data, error } = await supabase
      .from("invoices")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    safeLog("createInvoice", error);
    throw error;
  }
}

/* ─────────────────────────────────────────────────────────────
 * Maintenance Requests
 * ───────────────────────────────────────────────────────────── */
async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as MaintenanceRequest[];
  } catch (error) {
    safeLog("getMaintenanceRequests", error);
    throw error;
  }
}

/* SECURITY FIX #8: Whitelist allowed fields — never spread raw input */
async function addMaintenanceRequest(request: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
  try {
    const user_id = await requireAuthUserId();
    const payload = {
      user_id,
      property_id: request.property_id,
      unit_id: request.unit_id || null,
      title: request.title,
      description: request.description || null,
      status: request.status || "pending",
      priority: request.priority || "medium",
      cost: (request as any).cost || 0,
    };
    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as MaintenanceRequest;
  } catch (error) {
    safeLog("addMaintenanceRequest", error);
    throw error;
  }
}

/* SECURITY FIX #18: Whitelist allowed update fields */
async function updateMaintenanceRequest(id: string, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
  try {
    const user_id = await requireAuthUserId();
    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if ((updates as any).cost !== undefined) patch.cost = (updates as any).cost;
    const { data, error } = await supabase
      .from("maintenance_requests")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user_id)
      .select()
      .single();
    if (error) throw error;
    return data as MaintenanceRequest;
  } catch (error) {
    safeLog("updateMaintenanceRequest", error);
    throw error;
  }
}

async function deleteMaintenanceRequest(id: string): Promise<void> {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase
      .from("maintenance_requests")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);
    if (error) throw error;
  } catch (error) {
    safeLog("deleteMaintenanceRequest", error);
    throw error;
  }
}

async function getProfitStats() {
  try {
    const user_id = await requireAuthUserId();
    const { data: unitsData } = await supabase.from("units").select("id, building_id, status").eq("user_id", user_id);
    const unitIds = (unitsData || []).map((u) => u.id);
    
    const { data: buildingsData } = await supabase.from("buildings").select("id, name").eq("user_id", user_id);
    
    // Fetch staff and their allocations
    const { data: staffData } = await supabase.from("staff").select("id, staff_buildings(building_id)").eq("user_id", user_id);
    
    const staffBuildingMap: Record<string, string[]> = {};
    const staffIds: string[] = [];
    (staffData || []).forEach(s => {
      staffIds.push(s.id);
      staffBuildingMap[s.id] = s.staff_buildings ? s.staff_buildings.map((sb: any) => sb.building_id) : [];
    });

    const [payments, expenses, staffPayments] = await Promise.all([
      supabase.from("payments").select("amount, created_at, building_id").eq("status", "paid").in("unit_id", unitIds.length > 0 ? unitIds : ["__none__"]),
      supabase.from("maintenance_requests").select("property_id, cost, created_at").eq("user_id", user_id),
      supabase.from("staff_payments").select("staff_id, amount, payment_date").in("staff_id", staffIds.length > 0 ? staffIds : ["__none__"])
    ]);

    const totalRevenue = (payments.data || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalMaintenance = (expenses.data || []).reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
    const totalStaffSalaries = (staffPayments.data || []).reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);
    
    const totalExpenses = totalMaintenance + totalStaffSalaries;

    const buildingProfits = (buildingsData || []).map(b => {
      const bPayments = (payments.data || []).filter(p => p.building_id === b.id).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const bMaintenance = (expenses.data || []).filter(e => e.property_id === b.id).reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
      
      const bStaffSalaries = (staffPayments.data || []).reduce((sum, sp) => {
        const allocated = staffBuildingMap[sp.staff_id] || [];
        if (allocated.includes(b.id)) {
          // Divide salary proportionally among the buildings they are assigned to
          return sum + ((Number(sp.amount) || 0) / allocated.length);
        }
        return sum;
      }, 0);
      
      const bExpenses = bMaintenance + bStaffSalaries;
      const bProfit = bPayments - bExpenses;
      const bVacantRooms = (unitsData || []).filter(u => u.building_id === b.id && u.status === 'vacant').length;

      return {
        id: b.id,
        name: b.name,
        revenue: bPayments,
        maintenance: bMaintenance,
        staffSalaries: bStaffSalaries,
        expenses: bExpenses,
        netProfit: bProfit,
        vacantRooms: bVacantRooms
      };
    });

    return {
      totalRevenue,
      totalExpenses,
      totalMaintenance,
      totalStaffSalaries,
      netProfit: totalRevenue - totalExpenses,
      buildingProfits,
      payments: payments.data || [],
      expenses: expenses.data || []
    };
  } catch (error) {
    safeLog("getProfitStats", error);
    return { totalRevenue: 0, totalExpenses: 0, totalMaintenance: 0, totalStaffSalaries: 0, netProfit: 0, buildingProfits: [], payments: [], expenses: [] };
  }
}

/* ─────────────────────────────────────────────────────────────
 * Trust Score
 * ───────────────────────────────────────────────────────────── */
async function getTrustScore(aadhar: string): Promise<{ score: number, name: string | null } | null> {
  try {
    const { data, error } = await supabase
      .from("tenant_trust_scores")
      .select("score, name")
      .eq("aadhar", aadhar)
      .maybeSingle();
    if (error) throw error;
    return data ? { score: data.score, name: data.name } : null;
  } catch (error) {
    safeLog("getTrustScore", error);
    return null;
  }
}

async function getTrustIncidents(aadhar: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("trust_incidents")
      .select("*")
      .eq("tenant_aadhar", aadhar)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    safeLog("getTrustIncidents", error);
    return [];
  }
}

async function reportTrustIncident(payload: {
  tenant_aadhar: string;
  building_id?: string;
  incident_type: string;
  score_change: number;
  description?: string;
}): Promise<void> {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase
      .from("trust_incidents")
      .insert([{
        tenant_aadhar: payload.tenant_aadhar,
        landlord_id: user_id,
        building_id: payload.building_id || null,
        incident_type: payload.incident_type,
        score_change: payload.score_change,
        description: payload.description || null,
      }]);
    if (error) throw error;
  } catch (error) {
    safeLog("reportTrustIncident", error);
    throw error;
  }
}

export async function getPublicBuilding(slug: string) {
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching public building:", error);
    return null;
  }
  return data;
}

export const nivasaApi = {
  getUserSettings,
  updateUserSettings,
  getInvoices,
  createInvoice,
  auth,
  supabase,
  getBuildings,
  addBuilding,
  updateBuilding,
  deleteBuilding,
  getPropertyDetails,
  getRooms,
  getTenants,
  getTenantInvoices,
  ensureCurrentMonthInvoices,
  getRoomById,
  addRoom,
  addUnit,
  updateRoom,
  deleteRoom,
  updateTenant,
  addTenant,
  removeTenant,
  addPayment,
  getRecentPayments,
  saveElectricityReading,
  getElectricityRate,
  updateElectricityRate,
  getDashboardStats,
  getPublicBuilding,
  getStaff,
  getStaffById,
  addStaff,
  updateStaff,
  removeStaff,
  getStaffPayments,
  addStaffPayment,
  getStaffAttendance,
  addStaffAttendance,
  getStaffDocuments,
  addStaffDocument,
  getMaintenanceRequests,
  addMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  getProfitStats,
  getTrustScore,
  getTrustIncidents,
  reportTrustIncident,
};
export type NivasaApi = typeof nivasaApi;
