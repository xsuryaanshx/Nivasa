import { useState, useEffect } from "react";
import { 
  Shield, 
  Users, 
  Building2, 
  Layers, 
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
  AlertTriangle 
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

  // Dashboard state
  const [users, setUsers] = useState<any[]>([]);
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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminStatus(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen to auth state changes
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
      // 1. Fetch subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");
      if (subsError) throw subsError;

      // 2. Fetch user usages
      const { data: usagesData, error: usagesError } = await supabase
        .from("user_usage")
        .select("*");
      if (usagesError) throw usagesError;

      // 3. Try to fetch user profiles/details via our helper if deployed
      let usersDetailsMap: Record<string, { email: string; full_name: string }> = {};
      try {
        const { data: rpcUsers, error: rpcError } = await supabase.rpc("get_admin_users_list");
        if (!rpcError && rpcUsers) {
          rpcUsers.forEach((u: any) => {
            usersDetailsMap[u.id] = { email: u.email, full_name: u.full_name };
          });
        }
      } catch (e) {
        console.warn("RPC function get_admin_users_list not available, falling back to IDs.");
      }

      // Aggregate stats
      const totalRooms = usagesData?.reduce((acc, curr) => acc + (curr.rooms_count || 0), 0) || 0;
      const activeSubs = subsData?.filter(s => s.status === "active").length || 0;
      const pausedSubs = subsData?.filter(s => s.status === "paused").length || 0;

      // Map subscriptions to plans to estimate revenue
      let revenue = 0;
      const mappedUsers = (subsData || []).map((sub: any) => {
        const plan = PLANS.find(p => p.id === sub.plan_id) || PLANS[0];
        const usage = usagesData?.find(u => u.user_id === sub.user_id) || { rooms_count: 0, tenants_count: 0, properties_count: 0 };
        const details = usersDetailsMap[sub.user_id] || { email: `User ID: ${sub.user_id.substring(0, 8)}...`, full_name: "Landlord" };

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
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setDbLoading(false);
    }
  };

  // Change Subscription Plan
  const handleUpdatePlan = async (userId: string, subId: string, currentPlanId: string) => {
    // Find next plan (silver -> gold -> platinum -> silver)
    const currentIndex = PLANS.findIndex(p => p.id === currentPlanId);
    const nextIndex = (currentIndex + 1) % PLANS.length;
    const nextPlan = PLANS[nextIndex];

    setActionLoading(subId);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          plan_id: nextPlan.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", subId);

      if (error) throw error;

      // Log subscription event
      await supabase.from("subscription_events").insert({
        user_id: userId,
        subscription_id: subId,
        event_type: "plan_change",
        metadata: {
          old_plan_id: currentPlanId,
          new_plan_id: nextPlan.id,
          reason: "super_admin_upgrade"
        }
      });

      await fetchDashboardData();
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

      // Log event
      await supabase.from("subscription_events").insert({
        user_id: userId,
        subscription_id: subId,
        event_type: nextStatus === "paused" ? "subscription_paused" : "subscription_resumed",
        metadata: {
          reason: "super_admin_toggle"
        }
      });

      await fetchDashboardData();
    } catch (err) {
      console.error("Error toggling pause:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === "all" || u.planName === planFilter;
    return matchesSearch && matchesPlan;
  });

  // Chart Data preparation
  const chartData = [
    { name: "Jan", revenue: stats.estimatedRevenue * 0.7 },
    { name: "Feb", revenue: stats.estimatedRevenue * 0.8 },
    { name: "Mar", revenue: stats.estimatedRevenue * 0.85 },
    { name: "Apr", revenue: stats.estimatedRevenue * 0.9 },
    { name: "May", revenue: stats.estimatedRevenue * 0.95 },
    { name: "Jun", revenue: stats.estimatedRevenue }
  ];

  const planStats = PLANS.map(p => ({
    name: p.displayName,
    count: users.filter(u => u.planName === p.name).length,
    color: p.name === "platinum" ? "#818cf8" : p.name === "gold" ? "#fbbf24" : "#94a3b8"
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md overflow-hidden rounded-2xl glass-panel p-8 shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4 shadow-lg shadow-indigo-500/5">
              <Shield className="h-7 w-7 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Nivasa Control Tower</h1>
            <p className="text-sm text-slate-400 mt-1">Super-Admin Authentication</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Admin Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@nivasa.app"
                className="w-full rounded-xl px-4 py-3 text-sm glass-input"
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
                className="w-full rounded-xl px-4 py-3 text-sm glass-input"
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
    <div className="min-h-screen pb-12">
      {/* Navigation bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Shield className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide">NIVASA</span>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded ml-2 uppercase tracking-widest">Control Tower</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchDashboardData}
              disabled={dbLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${dbLoading ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            <div className="h-8 w-px bg-white/10" />

            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              Lock Tower
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Landlords", value: stats.totalUsers, icon: Users, color: "from-blue-500 to-indigo-500", text: "Registered landlords" },
            { label: "Active Subscriptions", value: stats.activeSubs, icon: Check, color: "from-emerald-500 to-teal-500", text: `${stats.pausedSubs} paused account(s)` },
            { label: "Managed Rooms", value: stats.totalRooms, icon: Building2, color: "from-amber-500 to-orange-500", text: "Across all landlord accounts" },
            { label: "Estimated Revenue", value: `₹${stats.estimatedRevenue}`, icon: IndianRupee, color: "from-pink-500 to-rose-500", text: "Monthly recurring estimation" }
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div 
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl glass-panel p-6 shadow-lg shadow-black/10 relative overflow-hidden"
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-xl`} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">{card.label}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    <Icon className="h-4.5 w-4.5 text-slate-300" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white tracking-tight">{card.value}</span>
                  <p className="text-xs text-slate-500 mt-1.5">{card.text}</p>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Analytics Charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Revenue Growth Projection */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  Monthly Recurring Revenue (MRR)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Historical estimated trajectory</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Live Projection
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscriptions Plan Distribution */}
          <div className="rounded-2xl glass-panel p-6 shadow-lg">
            <h2 className="text-base font-bold text-white mb-1">Plan Distribution</h2>
            <p className="text-xs text-slate-400 mb-6">Proportion of Silver, Gold, Platinum plans</p>

            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planStats}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }} 
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
                    <span className="text-slate-300 font-medium">{stat.name}</span>
                  </div>
                  <span className="text-white font-bold">{stat.count} accounts</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Users Management */}
        <section className="rounded-2xl glass-panel shadow-lg overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Landlord Accounts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage subscription layers and feature limitations</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search landlords..."
                  className="rounded-xl pl-10 pr-4 py-2 text-xs glass-input w-48 focus:w-60 transition-all"
                />
              </div>

              {/* Plan Filter */}
              <select 
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="rounded-xl px-3 py-2 text-xs glass-input focus:border-indigo-500"
              >
                <option value="all">All Plans</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Landlord details</th>
                  <th className="px-6 py-4">Plan tier</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Managed assets</th>
                  <th className="px-6 py-4">Registered date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                <AnimatePresence>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No landlord accounts found matching current query/filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isPaused = u.status === "paused";
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{u.fullName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                              u.planName === "platinum" 
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                : u.planName === "gold"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                            }`}>
                              {u.planDisplayName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                              isPaused ? "text-amber-400" : "text-emerald-400"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isPaused ? "bg-amber-400" : "bg-emerald-400"}`} />
                              {u.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-4 text-xs">
                              <div>
                                <span className="font-bold text-white">{u.propertiesCount}</span>
                                <span className="text-slate-500 ml-1">Properties</span>
                              </div>
                              <div className="h-3.5 w-px bg-white/10" />
                              <div>
                                <span className="font-bold text-white">{u.roomsCount}</span>
                                <span className="text-slate-500 ml-1">Rooms</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">{u.startDate}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* Cycle Plan Button */}
                              <button
                                onClick={() => handleUpdatePlan(u.user_id, u.id, u.planId)}
                                disabled={actionLoading === u.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition active:scale-95 disabled:opacity-50"
                              >
                                {actionLoading === u.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Layers className="h-3 w-3" />
                                    Change Plan
                                  </>
                                )}
                              </button>

                              {/* Pause / Resume Button */}
                              <button
                                onClick={() => handleTogglePause(u.user_id, u.id, u.status)}
                                disabled={actionLoading === u.id}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                                  isPaused 
                                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
                                    : "border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10"
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
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
