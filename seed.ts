import { createClient } from "@supabase/supabase-js";
import { buildings, rooms, payments } from "./src/lib/mockData.ts";

const SUPABASE_URL = "https://ehmwvkxxoczoubbsjxvv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobXd2a3h4b2N6b3ViYnNqeHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzc5NjIsImV4cCI6MjA5MjcxMzk2Mn0._1thy8Nq3dsGBvEA8b_FPFbTbCyDk1fbwqxgUULDPG4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seed() {
  console.log("Signing up or signing in demo@nivasa.app...");
  let { data: authData, error: authErr } = await supabase.auth.signUp({
    email: "demo@nivasa.app",
    password: "demo123Password!",
    options: { data: { full_name: "Demo User" } }
  });

  if (authErr && authErr.message.includes("already registered")) {
    console.log("User already exists, signing in...");
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: "demo@nivasa.app",
      password: "demo123Password!",
    });
    if (signInErr) throw signInErr;
    authData = signInData;
  } else if (authErr) {
    throw authErr;
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error("No user ID");

  console.log("Logged in as user:", userId);

  // 1. Insert buildings
  const buildingIdMap = new Map();
  for (const b of buildings) {
    console.log("Inserting building:", b.name);
    const { data, error } = await supabase.from("buildings").insert({
      name: b.name,
      address: b.address
    }).select().single();
    if (error) console.error("Error building:", error);
    if (data) buildingIdMap.set(b.id, data.id);
  }

  // 2. Insert rooms and tenants
  const roomIdMap = new Map();
  const tenantIdMap = new Map();
  for (const r of rooms) {
    const realBuildingId = buildingIdMap.get(r.buildingId);
    if (!realBuildingId) continue;

    console.log("Inserting room:", r.number);
    const { data: roomData, error: roomError } = await supabase.from("units").insert({
      building_id: realBuildingId,
      name: r.number,
      rent_amount: r.rent,
      status: r.status,
      user_id: userId,
      rate_per_unit: r.ratePerUnit,
      prev_reading: r.prevReading,
      curr_reading: r.currReading
    }).select().single();

    if (roomError) console.error("Error room:", roomError);
    if (roomData) {
      roomIdMap.set(r.id, roomData.id);
      
      // Insert tenant if exists
      if (r.tenant) {
        console.log("Inserting tenant:", r.tenant.name);
        const { data: tenantData, error: tenantError } = await supabase.from("tenants").insert({
          name: r.tenant.name,
          phone: r.tenant.phone,
          whatsapp_number: r.tenant.phone,
          room_id: roomData.id,
          building_id: realBuildingId,
          joined_at: r.tenant.joined_at,
          occupancy_count: 1
        }).select().single();
        if (tenantError) console.error("Error tenant:", tenantError);
        if (tenantData) tenantIdMap.set(r.tenant.id, tenantData.id);
      }
    }
  }

  // 3. Insert payments
  for (const p of payments) {
    const realRoomId = roomIdMap.get(p.roomId);
    if (!realRoomId) continue;

    const mockRoom = rooms.find(r => r.id === p.roomId);
    const realBuildingId = buildingIdMap.get(mockRoom?.buildingId);
    const mockTenant = mockRoom?.tenant;
    const realTenantId = mockTenant ? tenantIdMap.get(mockTenant.id) : null;

    console.log("Inserting payment for:", p.tenantName);
    const { error: payError } = await supabase.from("payments").insert({
      building_id: realBuildingId,
      unit_id: realRoomId,
      tenant_id: realTenantId,
      amount: p.amount,
      status: p.status,
      method: p.method.toLowerCase(),
      paid_date: p.date
    });
    if (payError) console.error("Error payment:", payError);
  }

  console.log("Demo data successfully seeded to Supabase!");
}

seed().catch(console.error);
