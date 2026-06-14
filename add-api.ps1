$content = Get-Content "d:\Nivasa\src\lib\api.ts" -Raw
$splitText = "export const nivasaApi = {"

$newFunctions = @"
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
    console.error("Error in getUserSettings:", error);
    throw error;
  }
}

async function updateUserSettings(settings: any) {
  try {
    const user_id = await requireAuthUserId();
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id, ...settings });
    if (error) throw error;
  } catch (error) {
    console.error("Error in updateUserSettings:", error);
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
    console.error("Error in getInvoices:", error);
    throw error;
  }
}

async function createInvoice(invoice: any) {
  try {
    const user_id = await requireAuthUserId();
    const { data, error } = await supabase
      .from("invoices")
      .insert([{ user_id, ...invoice }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in createInvoice:", error);
    throw error;
  }
}

"@

$parts = $content -split [regex]::Escape($splitText)

$newExport = @"
export const nivasaApi = {
  getUserSettings,
  updateUserSettings,
  getInvoices,
  createInvoice,
"@

$finalContent = $parts[0] + $newFunctions + $newExport + $parts[1]
[IO.File]::WriteAllText("d:\Nivasa\src\lib\api.ts", $finalContent)
