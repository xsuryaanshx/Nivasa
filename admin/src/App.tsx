import { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  Users, 
  Building2, 
  IndianRupee, 
  TrendingUp, 
  Play, 
  Pause, 
  ArrowUpRight, 
  LogOut, 
  Lock, 
  Search, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Sun,
  Moon,
  X,
  Calendar,
  Home,
  UserCheck,
  CreditCard,
  Upload,
  Sparkles,
  Activity,
  Zap,
  FileText,
  FileSpreadsheet,
  Wrench,
  Scale,
  ChevronsUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { supabase } from "./supabase";

// Plan specifications
const PLANS = [
  { id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", name: "silver", displayName: "Silver", price: 499 },
  { id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e", name: "gold", displayName: "Gold", price: 899 },
  { id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f", name: "platinum", displayName: "Platinum", price: 1199 }
];

interface CSVTenantRow {
  building_name: string;
  building_address: string;
  room_number: string;
  rent_amount: number;
  tenant_name: string;
  tenant_phone: string;
  whatsapp_number: string;
  aadhar: string;
  joined_at: string;
  occupancy_count: number;
  deposit_amount: number;
  deposit_method: string;
  errors?: string[];
}

// Pure TypeScript CSV parser
function parseCSV(text: string): Record<string, string>[] {
  const results: string[][] = [];
  let currentVal = "";
  let inQuotes = false;
  let currentRow: string[] = [];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        currentVal += char;
      } else {
        currentRow.push(currentVal);
        currentVal = "";
      }
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        currentVal += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentVal);
        currentVal = "";
        
        if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0].trim() !== "")) {
          results.push(currentRow);
        }
        currentRow = [];
      }
    } else {
      currentVal += char;
    }
  }
  
  // Push the final value and row if there's any left
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0].trim() !== "")) {
      results.push(currentRow);
    }
  }
  
  if (results.length < 2) return [];
  
  const headers = results[0].map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ''));
  const mappedRows: Record<string, string>[] = [];
  
  for (let i = 1; i < results.length; i++) {
    const values = results[i];
    // Skip completely empty lines
    if (values.length === 1 && values[0].trim() === "") continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        row[header] = (values[index] || "").trim();
      }
    });
    mappedRows.push(row);
  }
  
  return mappedRows;
}

function normalizeRow(row: Record<string, string>): CSVTenantRow {
  const getVal = (keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
    }
    return "";
  };

  const building_name = getVal(["buildingname", "propertyname", "building", "property"]);
  const building_address = getVal(["buildingaddress", "propertyaddress", "address"]);
  const room_number = getVal(["roomnumber", "roomname", "unitname", "room", "number", "unit"]);
  const rent_amount = parseFloat(getVal(["rentamount", "rent"])) || 0;
  const tenant_name = getVal(["tenantname", "name", "tenant"]);
  const tenant_phone = getVal(["tenantphone", "phone", "mobile"]);
  const whatsapp_number = getVal(["whatsappnumber", "whatsapp"]) || tenant_phone;
  const aadhar = getVal(["aadhar", "aadharcard", "aadharnumber"]);
  const joined_at = getVal(["joinedat", "joiningdate", "startdate", "date", "joined"]) || new Date().toISOString().split('T')[0];
  const occupancy_count = parseInt(getVal(["occupancycount", "occupancy"]), 10) || 1;
  const deposit_amount = parseFloat(getVal(["depositamount", "deposit"])) || 0;
  const deposit_method = getVal(["depositmethod", "method"]) || "Cash";

  return {
    building_name,
    building_address,
    room_number,
    rent_amount,
    tenant_name,
    tenant_phone,
    whatsapp_number,
    aadhar,
    joined_at,
    occupancy_count,
    deposit_amount,
    deposit_method
  };
}

function validateTenantRow(tenant: CSVTenantRow): string[] {
  const errors: string[] = [];
  if (!tenant.building_name) errors.push(`Property/Building name is missing.`);
  if (!tenant.room_number) errors.push(`Room/Unit number is missing.`);
  if (!tenant.tenant_name) errors.push(`Tenant name is missing.`);
  if (!tenant.tenant_phone) {
    errors.push(`Tenant phone is missing.`);
  } else {
    const cleanPhone = tenant.tenant_phone.replace(/[-+\s()]/g, "");
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      errors.push(`Phone number '${tenant.tenant_phone}' must be 10-15 digits.`);
    }
  }
  return errors;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"overview" | "buildings" | "rooms" | "tenants" | "features">("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [featureEvents, setFeatureEvents] = useState<any[]>([]);
  const [allBuildings, setAllBuildings] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  
  // Detailed Landlord state
  const [selectedLandlord, setSelectedLandlord] = useState<any | null>(null);
  const [landlordPayments, setLandlordPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubs: 0,
    pausedSubs: 0,
    totalRooms: 0,
    estimatedRevenue: 0
  });
  
  const [dbLoading, setDbLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  // Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedTenants, setParsedTenants] = useState<CSVTenantRow[]>([]);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importProgress, setImportProgress] = useState(0);
  const [importingStatus, setImportingStatus] = useState("");
  const [importResults, setImportResults] = useState<{ successCount: number; failedCount: number; errors: string[] } | null>(null);

  // Load and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("admin-theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("admin-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminStatus(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdminStatus(session.user);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = (user: any) => {
    const isUserAdmin = user.app_metadata?.is_admin === true;
    setIsAdmin(isUserAdmin);
    setLoading(false);
    if (isUserAdmin) {
      fetchDashboardData();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const isUserAdmin = data.user?.app_metadata?.is_admin === true;
      if (!isUserAdmin) {
        await supabase.auth.signOut();
        setAuthError("Access denied. This account does not have administrator privileges.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Invalid login credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const fetchDashboardData = async () => {
    setDbLoading(true);
    try {
      const { data: subsData, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");
      if (subsError) throw subsError;

      const { data: usagesData, error: usagesError } = await supabase
        .from("user_usage")
        .select("*");
      if (usagesError) throw usagesError;

      const { data: buildingsData, error: bError } = await supabase
        .from("buildings")
        .select("*");
      if (bError) console.error("Error fetching buildings:", bError);

      const { data: roomsData, error: rError } = await supabase
        .from("units")
        .select("*");
      if (rError) console.error("Error fetching rooms:", rError);

      const { data: tenantsData, error: tError } = await supabase
        .from("tenants")
        .select("*");
      if (tError) console.error("Error fetching tenants:", tError);

      let eventsData: any[] = [];
      try {
        const { data: fEvents, error: fError } = await supabase
          .from("feature_usage_events")
          .select("*")
          .order("created_at", { ascending: false });
        if (fError) {
          console.warn("Error fetching feature_usage_events:", fError.message);
        } else if (fEvents) {
          eventsData = fEvents;
        }
      } catch (e) {
        console.warn("Could not fetch feature_usage_events, table may not exist yet.", e);
      }

      // Retrieve Landlord profile details securely
      let usersDetailsMap: Record<string, { email: string; full_name: string }> = {};
      try {
        const { data: rpcUsers, error: rpcError } = await supabase.rpc("get_admin_users_list");
        if (rpcError) {
          console.error("Error calling get_admin_users_list:", rpcError);
        }
        if (!rpcError && rpcUsers) {
          rpcUsers.forEach((u: any) => {
            usersDetailsMap[u.id] = { email: u.email, full_name: u.full_name };
          });
        }
      } catch (e) {
        console.warn("RPC function get_admin_users_list not available, using fallback mapping.", e);
      }

      // Aggregate stats
      const totalRooms = usagesData?.reduce((acc, curr) => acc + (curr.rooms_count || 0), 0) || 0;
      const activeSubs = subsData?.filter(s => s.status === "active").length || 0;
      const pausedSubs = subsData?.filter(s => s.status === "paused").length || 0;

      let revenue = 0;
      const mappedUsers = (subsData || []).map((sub: any) => {
        const plan = PLANS.find(p => p.id === sub.plan_id) || PLANS[0];
        const usage = usagesData?.find(u => u.user_id === sub.user_id) || { rooms_count: 0, tenants_count: 0, properties_count: 0 };
        
        const isCurrentUser = session?.user && sub.user_id === session.user.id;
        const currentUserName = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Super Admin";
        const currentUserEmail = session?.user?.email || "—";

        const details = usersDetailsMap[sub.user_id] || (isCurrentUser ? {
          email: currentUserEmail,
          full_name: currentUserName
        } : {
          email: "—",
          full_name: `Landlord (${sub.user_id.slice(0, 8)})`
        });

        if (sub.status === "active") {
          revenue += plan.price;
        }

        return {
          id: sub.id,
          user_id: sub.user_id,
          email: details.email,
          fullName: details.full_name,
          planName: plan.name,
          planDisplayName: plan.displayName,
          planId: plan.id,
          price: plan.price,
          status: sub.status,
          roomsCount: usage.rooms_count,
          tenantsCount: usage.tenants_count,
          propertiesCount: usage.properties_count,
          startDate: new Date(sub.start_date).toLocaleDateString()
        };
      });

      setUsers(mappedUsers);
      setStats({
        totalUsers: mappedUsers.length,
        activeSubs,
        pausedSubs,
        totalRooms,
        estimatedRevenue: revenue
      });

      const resolveLandlordName = (userId: string) => {
        const found = mappedUsers.find(u => u.user_id === userId);
        return found ? found.fullName : `Landlord (${userId.slice(0, 8)})`;
      };

      if (buildingsData) {
        setAllBuildings(buildingsData.map(b => ({
          ...b,
          landlordName: resolveLandlordName(b.user_id),
          roomsCount: (roomsData || []).filter(r => r.building_id === b.id).length
        })));
      }

      if (roomsData) {
        setAllRooms(roomsData.map(r => ({
          ...r,
          landlordName: resolveLandlordName(r.user_id),
          buildingName: (buildingsData || []).find(b => b.id === r.building_id)?.name || "Unknown Property"
        })));
      }

      if (tenantsData) {
        setAllTenants(tenantsData.map(t => ({
          ...t,
          landlordName: resolveLandlordName(t.user_id),
          buildingName: (buildingsData || []).find(b => b.id === t.building_id)?.name || "Unknown Property",
          roomNumber: (roomsData || []).find(r => r.id === t.room_id)?.name || "—"
        })));
      }

      setFeatureEvents(eventsData.map(e => {
        const landlord = mappedUsers.find(u => u.user_id === e.user_id);
        return {
          ...e,
          landlordName: landlord ? landlord.fullName : `Landlord (${e.user_id.slice(0, 8)})`,
          landlordEmail: landlord ? landlord.email : "—",
          landlordPlan: landlord ? landlord.planName : "silver"
        };
      }));

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setDbLoading(false);
    }
  };

  // Change Subscription Plan via Dropdown
  const handleSelectPlan = async (userId: string, subId: string, targetPlanId: string) => {
    const currentSub = users.find(u => u.id === subId);
    if (!currentSub || currentSub.planId === targetPlanId) return;

    setActionLoading(subId);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          plan_id: targetPlanId,
          updated_at: new Date().toISOString()
        })
        .eq("id", subId);

      if (error) throw error;

      // Log event
      await supabase.from("subscription_events").insert({
        user_id: userId,
        subscription_id: subId,
        event_type: "plan_change",
        metadata: {
          old_plan_id: currentSub.planId,
          new_plan_id: targetPlanId,
          reason: "super_admin_dropdown"
        }
      });

      await fetchDashboardData();
      
      if (selectedLandlord && selectedLandlord.user_id === userId) {
        const nextPlan = PLANS.find(p => p.id === targetPlanId)!;
        setSelectedLandlord((prev: any) => ({
          ...prev,
          planId: targetPlanId,
          planName: nextPlan.name,
          planDisplayName: nextPlan.displayName
        }));
      }
    } catch (err) {
      console.error("Error updating plan:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Pause/Resume
  const handleTogglePause = async (userId: string, subId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "paused" ? "active" : "paused";
    setActionLoading(subId);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", subId);

      if (error) throw error;

      await supabase.from("subscription_events").insert({
        user_id: userId,
        subscription_id: subId,
        event_type: nextStatus === "paused" ? "subscription_paused" : "subscription_resumed",
        metadata: {
          reason: "super_admin_dropdown"
        }
      });

      await fetchDashboardData();

      if (selectedLandlord && selectedLandlord.user_id === userId) {
        setSelectedLandlord((prev: any) => ({
          ...prev,
          status: nextStatus
        }));
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Load landlord payment logs
  const handleViewLandlordProfile = async (landlord: any) => {
    setSelectedLandlord(landlord);
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*, units(name), buildings(name)")
        .eq("user_id", landlord.user_id)
        .order("paid_date", { ascending: false });
      
      if (error) throw error;
      setLandlordPayments(data || []);
    } catch (e) {
      console.error("Error fetching payments:", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processCSVFile(file);
    }
  };

  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const rawRows = parseCSV(text);
        const normalized = rawRows.map(normalizeRow);
        
        // Validate each row
        const validated = normalized.map((row) => {
          const rowErrors = validateTenantRow(row);
          return {
            ...row,
            errors: rowErrors
          };
        });
        
        setParsedTenants(validated);
        setImportStep(2);
      } catch (err: any) {
        alert("Error parsing CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportData = async (landlordUserId: string) => {
    setImportStep(3);
    setImportProgress(0);
    setImportingStatus("Preparing import...");
    
    const validRows = parsedTenants.filter(t => !t.errors || t.errors.length === 0);
    const total = validRows.length;
    
    if (total === 0) {
      setImportResults({ successCount: 0, failedCount: 0, errors: ["No valid tenants to import"] });
      return;
    }
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    const buildingMap: Record<string, string> = {};
    const roomMap: Record<string, string> = {};

    for (let i = 0; i < total; i++) {
      const tenant = validRows[i];
      const rowNum = i + 1;
      
      setImportProgress(Math.round((i / total) * 100));
      setImportingStatus(`Importing tenant ${rowNum} of ${total}: ${tenant.tenant_name}...`);

      try {
        // 1. Resolve Building ID
        const bNameKey = tenant.building_name.trim().toLowerCase();
        let buildingId = buildingMap[bNameKey];
        
        if (!buildingId) {
          const { data: existingB, error: findBError } = await supabase
            .from("buildings")
            .select("id")
            .eq("name", tenant.building_name.trim())
            .eq("user_id", landlordUserId)
            .maybeSingle();
            
          if (findBError) throw new Error(`Failed to query building: ${findBError.message}`);
          
          if (existingB) {
            buildingId = existingB.id;
          } else {
            const { data: newB, error: createBError } = await supabase
              .from("buildings")
              .insert({
                name: tenant.building_name.trim(),
                address: tenant.building_address || "",
                user_id: landlordUserId
              })
              .select("id")
              .single();
              
            if (createBError) throw new Error(`Failed to create building: ${createBError.message}`);
            buildingId = newB.id;
          }
          buildingMap[bNameKey] = buildingId;
        }

        // 2. Resolve Room (Unit) ID
        const rKey = `${buildingId}-${tenant.room_number.trim().toLowerCase()}`;
        let roomId = roomMap[rKey];
        
        if (!roomId) {
          const { data: existingR, error: findRError } = await supabase
            .from("units")
            .select("id")
            .eq("building_id", buildingId)
            .eq("name", tenant.room_number.trim())
            .eq("user_id", landlordUserId)
            .maybeSingle();
            
          if (findRError) throw new Error(`Failed to query room: ${findRError.message}`);
          
          if (existingR) {
            roomId = existingR.id;
            const { error: updateRError } = await supabase
              .from("units")
              .update({
                status: "occupied",
                rent_amount: tenant.rent_amount
              })
              .eq("id", roomId);
              
            if (updateRError) throw new Error(`Failed to update room: ${updateRError.message}`);
          } else {
            const { data: newR, error: createRError } = await supabase
              .from("units")
              .insert({
                building_id: buildingId,
                name: tenant.room_number.trim(),
                rent_amount: tenant.rent_amount,
                status: "occupied",
                user_id: landlordUserId
              })
              .select("id")
              .single();
              
            if (createRError) throw new Error(`Failed to create room: ${createRError.message}`);
            roomId = newR.id;
          }
          roomMap[rKey] = roomId;
        }

        // 3. Create Tenant
        const { error: createTenantError } = await supabase
          .from("tenants")
          .insert({
            name: tenant.tenant_name.trim(),
            phone: tenant.tenant_phone.trim(),
            whatsapp_number: (tenant.whatsapp_number || tenant.tenant_phone).trim(),
            aadhar: tenant.aadhar ? tenant.aadhar.trim() : null,
            room_id: roomId,
            building_id: buildingId,
            user_id: landlordUserId,
            joined_at: tenant.joined_at || new Date().toISOString(),
            occupancy_count: tenant.occupancy_count || 1,
            deposit_amount: tenant.deposit_amount || 0,
            deposit_method: tenant.deposit_method || "Cash",
            status: "active"
          });
          
        if (createTenantError) throw new Error(`Failed to insert tenant: ${createTenantError.message}`);

        successCount++;
      } catch (err: any) {
        console.error(`Error importing tenant ${tenant.tenant_name}:`, err);
        failedCount++;
        errors.push(`Tenant "${tenant.tenant_name}": ${err.message || err}`);
      }
    }
    
    // Also count the skipped invalid rows in the failed count
    const invalidCount = parsedTenants.length - total;
    if (invalidCount > 0) {
      failedCount += invalidCount;
      parsedTenants.forEach((t, i) => {
        if (t.errors && t.errors.length > 0) {
          errors.push(`Row ${i + 1} (${t.tenant_name || "Unknown"}): Skipped due to validation errors (${t.errors.join(", ")})`);
        }
      });
    }

    setImportProgress(100);
    setImportingStatus("Import completed!");
    setImportResults({
      successCount,
      failedCount,
      errors
    });
    
    // Refresh the dashboard data
    await fetchDashboardData();
  };

  // Filtered Lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === "all" || u.planName === planFilter;
    return matchesSearch && matchesPlan;
  });

  const filteredBuildings = allBuildings.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.landlordName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = allRooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.buildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.landlordName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTenants = allTenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.landlordName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chart configs
  const chartData = [
    { name: "Jan", revenue: stats.estimatedRevenue * 0.7 },
    { name: "Feb", revenue: stats.estimatedRevenue * 0.8 },
    { name: "Mar", revenue: stats.estimatedRevenue * 0.82 },
    { name: "Apr", revenue: stats.estimatedRevenue * 0.9 },
    { name: "May", revenue: stats.estimatedRevenue * 0.96 },
    { name: "Jun", revenue: stats.estimatedRevenue }
  ];

  const planStats = PLANS.map(p => ({
    name: p.displayName,
    count: users.filter(u => u.planName === p.name).length,
    color: p.name === "platinum" ? "#6366f1" : p.name === "gold" ? "#fbbf24" : "#94a3b8"
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Admin login screen
  if (!session || !isAdmin) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4 bg-slate-950">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4 shadow-lg shadow-indigo-500/5">
              <Shield className="h-7 w-7 text-indigo-450" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Nivasa Control Tower</h1>
            <p className="text-sm text-slate-400 mt-1">Super-Admin Authentication</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-white">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Admin Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@nivasa.app"
                className="w-full rounded-xl px-4 py-3 text-sm bg-slate-900 border border-white/10 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Secret Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm bg-slate-900 border border-white/10 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <AnimatePresence>
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition active:scale-[0.98] disabled:opacity-50"
            >
              {loginLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Unlock Tower
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      
      {/* Navigation bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Shield className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <span className="font-bold tracking-wide text-slate-900 dark:text-white">NIVASA</span>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-indigo-600 dark:text-indigo-450 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded ml-2 uppercase tracking-widest">Control Tower</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-95"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-450" /> : <Moon className="h-4 w-4 text-indigo-650" />}
            </button>

            <button 
              onClick={fetchDashboardData}
              disabled={dbLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${dbLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-zinc-800" />

            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-4.5 py-2 text-xs font-semibold text-red-650 dark:text-red-400 hover:bg-red-500/10 transition active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Metric Cards Grid */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Total Landlords", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-indigo-500", text: "Verified managers" },
            { label: "Active Subscriptions", value: stats.activeSubs, icon: Check, color: "from-emerald-500 to-teal-500", text: `${stats.pausedSubs} paused` },
            { label: "Managed Rooms", value: stats.totalRooms, icon: Home, color: "from-amber-500 to-orange-500", text: "Across properties" },
            { label: "Estimated Revenue", value: `₹${stats.estimatedRevenue}`, icon: IndianRupee, color: "from-pink-500 to-rose-500", text: "Monthly MRR projection" }
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div 
                key={card.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-6 shadow-sm relative overflow-hidden transition-shadow hover:shadow-md cursor-default"
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-xl`} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">{card.label}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <Icon className="h-4.5 w-4.5 text-slate-650 dark:text-zinc-300" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{card.value}</span>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{card.text}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.section>

        {/* Global Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max pb-2 sm:pb-0 pt-1">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "buildings", label: "Properties", icon: Building2 },
              { id: "rooms", label: "Rooms", icon: Home },
              { id: "tenants", label: "Tenants", icon: Users },
              { id: "features", label: "Feature Usage", icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all ${
                    active 
                      ? "border-indigo-500 text-indigo-650 dark:text-indigo-400" 
                      : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pb-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="rounded-xl pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 w-full sm:w-48 sm:focus:w-60 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition-all"
              />
            </div>

            {activeTab === "overview" && (
              <select 
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-slate-850 dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Plans</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Analytics Charts */}
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-3"
                >
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-base font-bold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-indigo-500" />
                          Monthly Recurring Revenue (MRR)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Estimated growth trajectory</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Live Estimate
                      </span>
                    </div>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ background: theme === "dark" ? "#18181b" : "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", color: theme === "dark" ? "white" : "black" }} 
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <h2 className="text-base font-bold mb-1">Plan Distribution</h2>
                    <p className="text-xs text-slate-400 mb-6 font-medium">Proportion of Silver, Gold, Platinum plans</p>

                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={planStats}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                            contentStyle={{ background: theme === "dark" ? "#18181b" : "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", color: theme === "dark" ? "white" : "black" }} 
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {planStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 space-y-2">
                      {planStats.map(stat => (
                        <div key={stat.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                            <span className="font-semibold">{stat.name}</span>
                          </div>
                          <span className="font-bold">{stat.count} accounts</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.section>

                {/* Landlords Accounts Table */}
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
                >
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                          <th className="px-6 py-4">Landlord</th>
                          <th className="px-6 py-4">Plan Tier</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-center">Managed assets</th>
                          <th className="px-6 py-4">Registered Date</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              No landlord accounts found.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => {
                            const isPaused = u.status === "paused";
                            return (
                              <tr key={u.id} className="hover:bg-slate-100/20 dark:hover:bg-zinc-900/20 transition">
                                <td 
                                  className="px-6 py-4 cursor-pointer font-medium"
                                  onClick={() => handleViewLandlordProfile(u)}
                                >
                                  <div className="font-bold text-slate-900 dark:text-white hover:underline flex items-center gap-1.5">
                                    {u.fullName}
                                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-450" />
                                  </div>
                                  <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{u.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="relative inline-flex">
                                    <select
                                      value={u.planId}
                                      onChange={(e) => handleSelectPlan(u.user_id, u.id, e.target.value)}
                                      disabled={actionLoading === u.id}
                                      className={`text-xs font-semibold uppercase tracking-wider rounded-lg border px-3 py-1.5 focus:outline-none appearance-none pr-8 cursor-pointer ${
                                        u.planName === "platinum" 
                                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" 
                                          : u.planName === "gold"
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                                      }`}
                                    >
                                      {PLANS.map(p => (
                                        <option key={p.id} value={p.id}>{p.displayName}</option>
                                      ))}
                                    </select>
                                    <ChevronsUpDown className="h-3 w-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold border ${
                                    u.status === "active"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : u.status === "paused"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                      : u.status === "trial"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      u.status === "active"
                                        ? "bg-emerald-500"
                                        : u.status === "paused"
                                        ? "bg-amber-500"
                                        : u.status === "trial"
                                        ? "bg-blue-500"
                                        : "bg-rose-500"
                                    }`} />
                                    {u.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-4 text-xs font-semibold">
                                    <div>
                                      <span className="font-bold">{u.propertiesCount}</span>
                                      <span className="text-slate-400 ml-1">Properties</span>
                                    </div>
                                    <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800" />
                                    <div>
                                      <span className="font-bold">{u.roomsCount}</span>
                                      <span className="text-slate-400 ml-1">Rooms</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-450 text-xs">{u.startDate}</td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => handleTogglePause(u.user_id, u.id, u.status)}
                                    disabled={actionLoading === u.id}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                                      isPaused 
                                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10"
                                        : "border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10"
                                    }`}
                                  >
                                    {actionLoading === u.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : isPaused ? (
                                      <>
                                        <Play className="h-3 w-3" />
                                        Resume
                                      </>
                                    ) : (
                                      <>
                                        <Pause className="h-3 w-3" />
                                        Pause
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.section>
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === "buildings" && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
              >
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Property Name</th>
                        <th className="px-6 py-4">Address</th>
                        <th className="px-6 py-4">Landlord</th>
                        <th className="px-6 py-4 text-center">Managed Rooms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
                      {filteredBuildings.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                            No properties found.
                          </td>
                        </tr>
                      ) : (
                        filteredBuildings.map(b => (
                          <tr key={b.id} className="hover:bg-slate-100/20 dark:hover:bg-zinc-900/20 transition">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{b.name}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-zinc-405">{b.address || "—"}</td>
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-zinc-300">{b.landlordName}</td>
                            <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{b.roomsCount} Rooms</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}

            {/* Rooms Tab */}
            {activeTab === "rooms" && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
              >
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Room No.</th>
                        <th className="px-6 py-4">Property</th>
                        <th className="px-6 py-4">Landlord</th>
                        <th className="px-6 py-4">Rent Amount</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
                      {filteredRooms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            No rooms found.
                          </td>
                        </tr>
                      ) : (
                        filteredRooms.map(r => (
                          <tr key={r.id} className="hover:bg-slate-100/20 dark:hover:bg-zinc-900/20 transition">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">Room {r.name}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">{r.buildingName}</td>
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-zinc-300">{r.landlordName}</td>
                            <td className="px-6 py-4 font-semibold text-indigo-650 dark:text-indigo-400">₹{r.rent_amount}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                r.status === "occupied"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-450 border-slate-500/20"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}

            {/* Tenants Tab */}
            {activeTab === "tenants" && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
              >
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Tenant Name</th>
                        <th className="px-6 py-4">Room / Property</th>
                        <th className="px-6 py-4">Landlord</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Lease Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-sm">
                      {filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            No tenants found.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map(t => (
                          <tr key={t.id} className="hover:bg-slate-100/20 dark:hover:bg-zinc-900/20 transition">
                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                              Room {t.roomNumber} ({t.buildingName})
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-zinc-300">{t.landlordName}</td>
                            <td className="px-6 py-4 text-xs font-mono">{t.phone || "—"}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                t.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}

            {/* Feature Usage Tab */}
            {activeTab === "features" && (
              <FeatureUsageView 
                featureEvents={featureEvents} 
                theme={theme} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Landlord Detailed Profile Slide-Over Panel */}
      <AnimatePresence>
        {selectedLandlord && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedLandlord(null)}
            />

            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Landlord Profile</h3>
                    <p className="text-xs text-slate-400">Account # {selectedLandlord.user_id.substring(0, 8)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLandlord(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selectedLandlord.fullName}</h4>
                      <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{selectedLandlord.email}</p>
                    </div>

                    <div className="relative inline-flex">
                      <select
                        value={selectedLandlord.planId}
                        onChange={(e) => handleSelectPlan(selectedLandlord.user_id, selectedLandlord.id, e.target.value)}
                        disabled={actionLoading === selectedLandlord.id}
                        className={`text-xs font-semibold uppercase tracking-wider rounded-lg border px-3 py-1.5 focus:outline-none appearance-none pr-8 cursor-pointer ${
                          selectedLandlord.planName === "platinum" 
                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" 
                            : selectedLandlord.planName === "gold"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-slate-500/10 text-slate-655 dark:text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {PLANS.map(p => (
                          <option key={p.id} value={p.id}>{p.displayName}</option>
                        ))}
                      </select>
                      <ChevronsUpDown className="h-3 w-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-zinc-800" />

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>Joined: {selectedLandlord.startDate}</span>
                    </div>

                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-slate-500">Status:</span>
                      <span className={selectedLandlord.status === "paused" ? "text-amber-500" : "text-emerald-500"}>
                        {selectedLandlord.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Properties", value: selectedLandlord.propertiesCount, icon: Building2 },
                    { label: "Rooms", value: selectedLandlord.roomsCount, icon: Home },
                    { label: "Tenants", value: selectedLandlord.tenantsCount, icon: UserCheck }
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/60 p-4 rounded-xl text-center">
                        <Icon className="h-4.5 w-4.5 text-indigo-500 mx-auto mb-1.5" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">{stat.value}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{stat.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border border-indigo-500/20 bg-indigo-500/5 p-4.5 rounded-2xl space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Tenant Data Management</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                      Bulk-import tenant records from a CSV file directly into this landlord's profile. New properties and rooms will be generated automatically.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setImportStep(1);
                      setParsedTenants([]);
                      setImportResults(null);
                      setIsImportModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 text-xs font-semibold shadow-md shadow-indigo-600/10 hover:shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Bulk Import Tenants
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-500" />
                    Landlord Payment History
                  </h4>

                  {loadingPayments ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                    </div>
                  ) : landlordPayments.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                      No payments recorded yet under this landlord account.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {landlordPayments.map((p: any) => {
                        const isPaid = p.status === "paid";
                        return (
                          <div key={p.id} className="border border-slate-200 dark:border-zinc-800 p-3 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-zinc-950 transition">
                            <div>
                              <span className="font-bold block text-slate-900 dark:text-white">
                                Room {p.units?.name || "—"} ({p.buildings?.name || "Property"})
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Paid date: {p.paid_date ? new Date(p.paid_date).toLocaleDateString() : "—"}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="font-bold block text-indigo-650 dark:text-indigo-400">₹{p.amount}</span>
                              <span className={`inline-flex items-center gap-0.5 font-semibold text-[10px] uppercase ${
                                isPaid ? "text-emerald-500" : "text-amber-500"
                              }`}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleTogglePause(selectedLandlord.user_id, selectedLandlord.id, selectedLandlord.status)}
                  disabled={actionLoading === selectedLandlord.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                    selectedLandlord.status === "paused" 
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10"
                      : "border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10"
                  }`}
                >
                  {actionLoading === selectedLandlord.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : selectedLandlord.status === "paused" ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Activate Account
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause Account
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedLandlord(null)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition active:scale-95"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk Import Tenants Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col max-h-[85vh] text-slate-900 dark:text-zinc-100"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Bulk Import Tenants</h3>
                  <p className="text-xs text-slate-400">Target Landlord: {selectedLandlord?.fullName}</p>
                </div>
              </div>
              {importStep !== 3 && (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Step 1: Upload Instructions & Dropzone */}
              {importStep === 1 && (
                <div className="space-y-6">
                  <div className="text-xs text-slate-500 dark:text-zinc-400 space-y-2">
                    <p className="font-semibold text-slate-700 dark:text-zinc-300">CSV Data Format Instructions:</p>
                    <p>Make sure your CSV contains the following headers. Other names (like "property" or "address") will be auto-normalized.</p>
                    <div className="overflow-x-auto border border-slate-200 dark:border-zinc-800 rounded-lg max-h-40">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                            <th className="p-2 font-bold">Column Header</th>
                            <th className="p-2 font-bold">Type</th>
                            <th className="p-2 font-bold">Status</th>
                            <th className="p-2 font-bold">Example</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 font-mono">
                          <tr>
                            <td className="p-2 font-bold text-indigo-600 dark:text-indigo-400">building_name</td>
                            <td className="p-2 text-slate-400">Text</td>
                            <td className="p-2 text-amber-600">Required</td>
                            <td className="p-2 text-slate-400">Gokul Dham</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-indigo-600 dark:text-indigo-400">room_number</td>
                            <td className="p-2 text-slate-400">Text/No.</td>
                            <td className="p-2 text-amber-600">Required</td>
                            <td className="p-2 text-slate-400">101</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-indigo-600 dark:text-indigo-400">tenant_name</td>
                            <td className="p-2 text-slate-400">Text</td>
                            <td className="p-2 text-amber-600">Required</td>
                            <td className="p-2 text-slate-400">Jethalal Gada</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-bold text-indigo-600 dark:text-indigo-400">tenant_phone</td>
                            <td className="p-2 text-slate-400">Text/No.</td>
                            <td className="p-2 text-amber-600">Required</td>
                            <td className="p-2 text-slate-400">9876543210</td>
                          </tr>
                          <tr>
                            <td className="p-2">rent_amount</td>
                            <td className="p-2 text-slate-400">Number</td>
                            <td className="p-2 text-slate-400">Optional</td>
                            <td className="p-2 text-slate-400">15000</td>
                          </tr>
                          <tr>
                            <td className="p-2">whatsapp_number</td>
                            <td className="p-2 text-slate-400">Number</td>
                            <td className="p-2 text-slate-400">Optional</td>
                            <td className="p-2 text-slate-400">9876543210</td>
                          </tr>
                          <tr>
                            <td className="p-2">aadhar</td>
                            <td className="p-2 text-slate-400">Number</td>
                            <td className="p-2 text-slate-400">Optional</td>
                            <td className="p-2 text-slate-400">123456789012</td>
                          </tr>
                          <tr>
                            <td className="p-2">joined_at</td>
                            <td className="p-2 text-slate-400">YYYY-MM-DD</td>
                            <td className="p-2 text-slate-400">Optional</td>
                            <td className="p-2 text-slate-400">2026-06-01</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Sample CSV Content Template:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `building_name,building_address,room_number,rent_amount,tenant_name,tenant_phone,whatsapp_number,aadhar,joined_at,occupancy_count,deposit_amount,deposit_method\nGokul Dham,"Powai, Mumbai",101,15000,Jethalal Gada,9876543210,9876543210,123456789012,2026-06-01,1,30000,UPI\nGokul Dham,"Powai, Mumbai",102,12000,Daya Gada,9876543211,9876543211,,2026-06-05,2,24000,Cash`
                          );
                        }}
                        className="text-[10px] text-indigo-500 hover:underline cursor-pointer"
                      >
                        Copy Template
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 text-[10px] font-mono overflow-x-auto text-slate-500 dark:text-zinc-400 select-all">
{`building_name,building_address,room_number,rent_amount,tenant_name,tenant_phone,whatsapp_number,aadhar,joined_at,occupancy_count,deposit_amount,deposit_method
Gokul Dham,"Powai, Mumbai",101,15000,Jethalal Gada,9876543210,9876543210,123456789012,2026-06-01,1,30000,UPI
Gokul Dham,"Powai, Mumbai",102,12000,Daya Gada,9876543211,9876543211,,2026-06-05,2,24000,Cash`}
                    </pre>
                  </div>

                  <div 
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition rounded-2xl p-8 text-center cursor-pointer relative group bg-slate-50/20 dark:bg-zinc-900/10"
                    onClick={() => document.getElementById("csv-file-input")?.click()}
                  >
                    <input 
                      type="file" 
                      id="csv-file-input" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition duration-300">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">Drag & drop your CSV file here</p>
                        <p className="text-xs text-slate-400 mt-1">or click to browse from files</p>
                      </div>
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">Accepts CSV only</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Preview & Validation */}
              {importStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Data Validation Preview</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Parsed {parsedTenants.length} rows. Please review below before committing.
                      </p>
                    </div>
                    <div className="text-xs font-semibold">
                      <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                        {parsedTenants.filter(t => !t.errors || t.errors.length === 0).length} Valid
                      </span>
                      {parsedTenants.filter(t => t.errors && t.errors.length > 0).length > 0 && (
                        <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded-md ml-2">
                          {parsedTenants.filter(t => t.errors && t.errors.length > 0).length} Invalid
                        </span>
                      )}
                    </div>
                  </div>

                  {parsedTenants.filter(t => t.errors && t.errors.length > 0).length > 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-450">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Some rows have validation issues.</span>
                        <span className="mt-1 block">You can proceed with the import, but invalid rows will be skipped automatically. Please correct any critical errors before proceeding.</span>
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-500">
                          <th className="p-3">Row</th>
                          <th className="p-3">Tenant / Phone</th>
                          <th className="p-3">Property / Room</th>
                          <th className="p-3">Rent</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-905 dark:text-zinc-100">
                        {parsedTenants.map((row, idx) => {
                          const hasErrors = row.errors && row.errors.length > 0;
                          return (
                            <tr key={idx} className={`hover:bg-slate-50/50 dark:hover:bg-zinc-950/50 ${hasErrors ? 'bg-red-500/5' : ''}`}>
                              <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-sans">
                                <span className="font-bold text-slate-900 dark:text-white block">{row.tenant_name || "—"}</span>
                                <span className="text-[10px] text-slate-450 dark:text-zinc-400 block mt-0.5">{row.tenant_phone || "—"}</span>
                              </td>
                              <td className="p-3 font-sans">
                                <span className="font-semibold block text-slate-900 dark:text-white">{row.building_name || "—"}</span>
                                <span className="text-[10px] text-slate-450 dark:text-zinc-400 block mt-0.5">Room {row.room_number || "—"}</span>
                              </td>
                              <td className="p-3 font-mono">₹{row.rent_amount}</td>
                              <td className="p-3">
                                {hasErrors ? (
                                  <div className="group relative inline-block">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded cursor-help">
                                      <AlertTriangle className="h-3 w-3" />
                                      Error
                                    </span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 scale-0 group-hover:scale-100 bg-slate-900 text-white p-2 rounded-lg text-[10px] shadow-xl z-20 transition duration-150">
                                      {row.errors?.map((e: string, i: number) => (
                                        <div key={i}>{e}</div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    <Check className="h-3 w-3" />
                                    Ready
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Progress & Success */}
              {importStep === 3 && (
                <div className="flex flex-col items-center py-8 text-center space-y-6">
                  {!importResults ? (
                    <>
                      <RefreshCw className="h-12 w-12 animate-spin text-indigo-500" />
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">Importing Tenant Records...</h4>
                        <p className="text-xs text-slate-400">{importingStatus}</p>
                      </div>
                      <div className="w-full max-w-xs bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-500">{importProgress}% Completed</span>
                    </>
                  ) : (
                    <>
                      {importResults.failedCount === 0 ? (
                        <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                          <Check className="h-8 w-8" />
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-500">
                          <AlertTriangle className="h-8 w-8" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">Bulk Import Finished</h4>
                        <p className="text-xs text-slate-400 text-center">
                          Successfully imported <span className="font-bold text-emerald-500">{importResults.successCount}</span> tenants.
                          {importResults.failedCount > 0 && (
                            <> Failed/skipped <span className="font-bold text-red-500">{importResults.failedCount}</span> rows.</>
                          )}
                        </p>
                      </div>

                      {importResults.errors.length > 0 && (
                        <div className="w-full text-left space-y-2 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50 dark:bg-zinc-950 max-h-48 overflow-y-auto">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Errors / Skipped rows summary:</span>
                          <div className="space-y-1 text-xs font-mono text-red-500 dark:text-red-400">
                            {importResults.errors.map((err, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="shrink-0">•</span>
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-zinc-900/50">
              {importStep === 1 && (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {importStep === 2 && (
                <>
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition active:scale-95 cursor-pointer"
                  >
                    Back to Upload
                  </button>
                  <button
                    onClick={() => handleImportData(selectedLandlord.user_id)}
                    disabled={parsedTenants.filter(t => !t.errors || t.errors.length === 0).length === 0}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/15 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Import Valid Records ({parsedTenants.filter(t => !t.errors || t.errors.length === 0).length})
                  </button>
                </>
              )}

              {importStep === 3 && importResults && (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/15 transition active:scale-95 cursor-pointer"
                >
                  Close Importer
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Feature Usage Analytics Dashboard View Component
// ─────────────────────────────────────────────────────────────

const FEATURE_NAMES: Record<string, string> = {
  payment_tracking: "Payment Tracking",
  whatsapp_reminders: "WhatsApp Reminders",
  pdf_exports: "PDF Exports",
  excel_exports: "Excel Exports",
  expense_management: "Expense Management",
  maintenance_tracking: "Maintenance Tracking",
  staff_management: "Staff Management",
  tenant_trust_score: "Tenant Trust Score"
};

const FEATURE_ICONS: Record<string, any> = {
  payment_tracking: IndianRupee,
  whatsapp_reminders: Zap,
  pdf_exports: FileText,
  excel_exports: FileSpreadsheet,
  expense_management: CreditCard,
  maintenance_tracking: Wrench,
  staff_management: Users,
  tenant_trust_score: Scale
};

const PLAN_COLORS: Record<string, string> = {
  platinum: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  gold: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  silver: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
};

interface FeatureUsageViewProps {
  featureEvents: any[];
  theme: "light" | "dark";
}

function GlassTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/80 p-4 rounded-2xl shadow-xl">
        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-indigo-655 dark:text-indigo-400 mt-1">
          {payload[0].value} <span className="text-xs font-normal text-slate-500">actions</span>
        </p>
      </div>
    );
  }
  return null;
}

function FeatureUsageView({ featureEvents, theme }: FeatureUsageViewProps) {
  const [selectedFeature, setSelectedFeature] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Summary stats
  const totalEvents = featureEvents.length;

  const activeUsers30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const uniqueUsers = new Set(
      featureEvents
        .filter(e => e.created_at && new Date(e.created_at) > thirtyDaysAgo)
        .map(e => e.user_id)
    );
    return uniqueUsers.size;
  }, [featureEvents]);

  const popularityData = useMemo(() => {
    const counts: Record<string, number> = {
      payment_tracking: 0,
      whatsapp_reminders: 0,
      pdf_exports: 0,
      excel_exports: 0,
      expense_management: 0,
      maintenance_tracking: 0,
      staff_management: 0,
      tenant_trust_score: 0
    };

    featureEvents.forEach(e => {
      if (counts[e.feature_key] !== undefined) {
        counts[e.feature_key]++;
      }
    });

    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        name: FEATURE_NAMES[key] || key,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [featureEvents]);

  const mostPopular = popularityData[0]?.count > 0 ? popularityData[0].name : "None yet";

  const growthRate = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const thisWeek = featureEvents.filter(e => e.created_at && new Date(e.created_at) > sevenDaysAgo).length;
    const lastWeek = featureEvents.filter(e => e.created_at && new Date(e.created_at) > fourteenDaysAgo && new Date(e.created_at) <= sevenDaysAgo).length;

    if (lastWeek === 0) return thisWeek > 0 ? "+100%" : "0%";
    const pct = ((thisWeek - lastWeek) / lastWeek) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  }, [featureEvents]);

  // Group events by date for line/area chart (last 14 days)
  const dailyTrends = useMemo(() => {
    const datesMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      datesMap[dateStr] = 0;
    }

    featureEvents.forEach(e => {
      if (e.created_at) {
        const dateStr = new Date(e.created_at).toISOString().split("T")[0];
        if (datesMap[dateStr] !== undefined) {
          datesMap[dateStr]++;
        }
      }
    });

    return Object.entries(datesMap).map(([date, count]) => {
      const formattedDate = new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
      });
      return { name: formattedDate, count };
    });
  }, [featureEvents]);

  // Filtered logs
  const filteredEvents = useMemo(() => {
    return featureEvents
      .filter(e => {
        const matchesFeature = selectedFeature === "all" || e.feature_key === selectedFeature;
        const matchesPlan = selectedPlan === "all" || e.landlordPlan === selectedPlan;
        
        const term = search.toLowerCase();
        const matchesSearch = !search || 
          e.landlordName.toLowerCase().includes(term) ||
          e.landlordEmail.toLowerCase().includes(term) ||
          (e.action && e.action.toLowerCase().includes(term));

        return matchesFeature && matchesPlan && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [featureEvents, selectedFeature, selectedPlan, search, sortOrder]);

  const handleExportCSV = () => {
    const csvRows = [
      ["Date", "Landlord Name", "Email", "Plan", "Feature", "Action", "Details"]
    ];

    filteredEvents.forEach(e => {
      csvRows.push([
        new Date(e.created_at).toLocaleString(),
        e.landlordName,
        e.landlordEmail,
        e.landlordPlan,
        FEATURE_NAMES[e.feature_key] || e.feature_key,
        e.action || "—",
        JSON.stringify(e.metadata || {})
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nivasa_feature_usage_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 relative">
      {/* Decorative blurred iOS gradient circles in background */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl pointer-events-none -z-10 animate-pulse duration-5000" />
      <div className="absolute top-2/3 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl pointer-events-none -z-10 animate-pulse duration-7000" />

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Feature Actions", value: totalEvents, sub: `${growthRate} this week`, color: "from-blue-600/20 to-indigo-600/20", icon: Activity },
          { label: "Active Landlords (30d)", value: activeUsers30Days, sub: "Unique landlords active", color: "from-purple-600/20 to-pink-600/20", icon: Users },
          { label: "Most Popular Feature", value: mostPopular, sub: "Highest cumulative usage", color: "from-amber-600/20 to-orange-600/20", icon: Sparkles },
          { label: "Retention Growth", value: growthRate, sub: "Week over week activity", color: "from-emerald-600/20 to-teal-600/20", icon: TrendingUp }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel glass-panel-hover rounded-3xl p-6 relative overflow-hidden group border border-white/20 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 shadow-xl"
            >
              <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${card.color} opacity-40 blur-2xl group-hover:scale-125 transition-transform duration-500`} />
              <div className="flex justify-between items-start z-10 relative">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{card.label}</span>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                    {card.value}
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 mt-1">{card.sub}</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-white dark:bg-zinc-950 flex items-center justify-center shadow-soft border border-slate-100 dark:border-zinc-800">
                  <Icon className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 bg-white/40 dark:bg-zinc-900/40 border border-white/20 dark:border-zinc-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-805 dark:text-zinc-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Feature Usage Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Daily occurrences over the last 14 days</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              Live Monitor
            </span>
          </div>

          <div className="h-64">
            {totalEvents === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 text-xs">
                No events recorded yet to plot trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends}>
                  <defs>
                    <linearGradient id="colorFeatureUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<GlassTooltip theme={theme} />} />
                  <Area type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFeatureUsage)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Feature Breakdown Bar Chart */}
        <div className="glass-panel rounded-3xl p-6 bg-white/40 dark:bg-zinc-900/40 border border-white/20 dark:border-zinc-800/80 shadow-xl">
          <div>
            <h2 className="text-base font-bold text-slate-805 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Popularity Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium mb-6">Distribution by feature category</p>
          </div>

          <div className="h-64">
            {totalEvents === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 text-xs">
                No feature events logged
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularityData} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                    contentStyle={{ 
                      background: theme === "dark" ? "rgba(24, 24, 27, 0.8)" : "rgba(255, 255, 255, 0.8)", 
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)", 
                      borderRadius: "16px",
                      fontSize: "11px",
                      color: theme === "dark" ? "white" : "black" 
                    }} 
                  />
                  <Bar dataKey="count" fill="#a78bfa" radius={[0, 6, 6, 0]} barSize={14}>
                    {popularityData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#6366f1" : index === 1 ? "#818cf8" : index === 2 ? "#a78bfa" : "#c084fc"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Logs and Filters Card */}
      <div className="glass-panel rounded-3xl bg-white/40 dark:bg-zinc-900/40 border border-white/20 dark:border-zinc-800/80 shadow-xl overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-6 border-b border-white/10 dark:border-zinc-800/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/10 dark:bg-zinc-950/10">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/60 rounded-2xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition"
              />
            </div>

            {/* Feature Filter */}
            <select
              value={selectedFeature}
              onChange={e => setSelectedFeature(e.target.value)}
              className="px-3 py-2 bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/60 rounded-2xl text-xs text-slate-700 dark:text-zinc-300 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Features</option>
              {Object.entries(FEATURE_NAMES).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>

            {/* Plan Filter */}
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="px-3 py-2 bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/60 rounded-2xl text-xs text-slate-700 dark:text-zinc-300 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(order => order === "desc" ? "asc" : "desc")}
              className="px-3 py-2 bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/60 rounded-2xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
            >
              Sort: {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredEvents.length === 0}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-550 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold rounded-2xl shadow-lg shadow-indigo-600/15 transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV ({filteredEvents.length})
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 dark:bg-zinc-950/20 border-b border-white/10 dark:border-zinc-800/50 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4">Landlord</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Feature</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Metadata</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 dark:divide-zinc-800/50 text-xs">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 dark:text-zinc-500 font-medium">
                    No matching activity events found
                  </td>
                </tr>
              ) : (
                filteredEvents.map(e => {
                  const Icon = FEATURE_ICONS[e.feature_key] || Activity;
                  const dateStr = new Date(e.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit"
                  });

                  return (
                    <tr key={e.id} className="hover:bg-white/5 dark:hover:bg-zinc-850/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{e.landlordName}</div>
                        <div className="text-[10px] text-slate-405 mt-0.5">{e.landlordEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border capitalize ${PLAN_COLORS[e.landlordPlan] || PLAN_COLORS.silver}`}>
                          {e.landlordPlan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200/50 dark:border-zinc-700/50">
                            <Icon className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-zinc-300">
                            {FEATURE_NAMES[e.feature_key] || e.feature_key}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px]">
                          {e.action || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate font-mono text-[10px] text-slate-400 dark:text-zinc-500">
                        {e.metadata ? JSON.stringify(e.metadata) : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-450 dark:text-zinc-400 font-medium">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
