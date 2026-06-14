$content = Get-Content "d:\Nivasa\src\lib\api.ts" -Raw
$headIndex = $content.IndexOf("<<<<<<< HEAD")
$bottomIndex = $content.IndexOf("export type NivasaApi")

if ($headIndex -ge 0 -and $bottomIndex -ge 0) {
    $before = $content.Substring(0, $headIndex)
    $after = $content.Substring($bottomIndex)
    $merged = @"
/* ── Staff ───────────────────────────────────────────────────────────────────── */
async function getStaff(): Promise<any[]> {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("staff")
      .select("*, staff_allocations(building_id)")
      .eq("user_id", user_id);
    if (error) throw error;
    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      phone: s.phone,
      allocatedBuildings: s.staff_allocations ? s.staff_allocations.map((a: any) => a.building_id) : [],
    }));
  } catch (error) {
    console.error("Error in getStaff:", error);
    throw error;
  }
}

async function getStaffById(id: string) {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("staff")
      .select("*, buildings(name)")
      .eq("id", id)
      .eq("user_id", user_id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in getStaffById:", error);
    throw error;
  }
}

async function addStaff(input: { name: string; role: string; phone?: string; allocatedBuildings: string[] }) {
  try {
    const user_id = await requireAuthUserId();
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .insert([{ name: input.name, role: input.role, phone: input.phone, user_id }])
      .select()
      .single();
    if (staffError) throw staffError;

    if (input.allocatedBuildings && input.allocatedBuildings.length > 0) {
      const allocations = input.allocatedBuildings.map(bid => ({ staff_id: staff.id, building_id: bid }));
      const { error: allocError } = await supabase.from("staff_allocations").insert(allocations);
      if (allocError) console.error("Error inserting allocations:", allocError);
    }
    return staff;
  } catch (error) {
    console.error("Error in addStaff:", error);
    throw error;
  }
}

async function updateStaff(id: string, updates: { name?: string; role?: string; phone?: string; allocatedBuildings?: string[] }) {
  try {
    const user_id = await requireAuthUserId();
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.phone !== undefined) payload.phone = updates.phone;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from("staff").update(payload).eq("id", id).eq("user_id", user_id);
      if (error) throw error;
    }

    if (updates.allocatedBuildings !== undefined) {
      const { error: delError } = await supabase.from("staff_allocations").delete().eq("staff_id", id);
      if (delError) throw delError;

      if (updates.allocatedBuildings.length > 0) {
        const allocations = updates.allocatedBuildings.map(bid => ({ staff_id: id, building_id: bid }));
        const { error: allocError } = await supabase.from("staff_allocations").insert(allocations);
        if (allocError) throw allocError;
      }
    }
  } catch (error) {
    console.error("Error in updateStaff:", error);
    throw error;
  }
}

async function removeStaff(id: string) {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase.from("staff").delete().eq("id", id).eq("user_id", user_id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in removeStaff:", error);
    throw error;
  }
}

async function getStaffPayments(staffId: string) {
  try {
    const { data, error } = await supabase
      .from("staff_payments")
      .select("*")
      .eq("staff_id", staffId)
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getStaffPayments:", error);
    throw error;
  }
}

async function addStaffPayment(input: any) {
  try {
    const { data, error } = await supabase
      .from("staff_payments")
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addStaffPayment:", error);
    throw error;
  }
}

async function getStaffAttendance(staffId: string) {
  try {
    const { data, error } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getStaffAttendance:", error);
    throw error;
  }
}

async function addStaffAttendance(input: any) {
  try {
    const { data, error } = await supabase
      .from("staff_attendance")
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addStaffAttendance:", error);
    throw error;
  }
}

async function getStaffDocuments(staffId: string) {
  try {
    const { data, error } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("staff_id", staffId)
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getStaffDocuments:", error);
    throw error;
  }
}

async function addStaffDocument(input: any) {
  try {
    const { data, error } = await supabase
      .from("staff_documents")
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addStaffDocument:", error);
    throw error;
  }
}

export const nivasaApi = {
  auth,
  supabase,
  getBuildings,
  addBuilding,
  updateBuilding,
  deleteBuilding,
  getPropertyDetails,
  getRooms,
  getTenants,
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
};
"@
    [IO.File]::WriteAllText("d:\Nivasa\src\lib\api.ts", ($before + $merged + "`n" + $after))
}
