import { useState, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"overview" | "buildings" | "rooms" | "tenants">("overview");
  const [users, setUsers] = useState<any[]>([]);
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
    const isUserAdmin = user.user_metadata?.is_admin === true;
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
      
      const isUserAdmin = data.user?.user_metadata?.is_admin === true;
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
              { id: "tenants", label: "Tenants", icon: Users }
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
                                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                    isPaused ? "text-amber-550" : "text-emerald-550"
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isPaused ? "bg-amber-500" : "bg-emerald-500"}`} />
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
                </section>
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
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
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
    </div>
  );
}
