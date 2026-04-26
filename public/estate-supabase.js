/**
 * ESTATE - Supabase Integration Layer
 * Pure JavaScript, no imports.
 * 
 * Instructions:
 * 1. Add <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> to your index.html
 * 2. Add <script src="/estate-supabase.js"></script> after it.
 * 3. Replace the SUPABASE_URL and SUPABASE_ANON_KEY with your own.
 */

(function () {
    // --- CONFIGURATION ---
    // Replace these with your project's details from Supabase Dashboard -> Settings -> API
    const SUPABASE_URL = "https://ehmwvkxxoczoubbsjxvv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobXd2a3h4b2N6b3ViYnNqeHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzc5NjIsImV4cCI6MjA5MjcxMzk2Mn0._1thy8Nq3dsGBvEA8b_FPFbTbCyDk1fbwqxgUULDPG4";

    if (SUPABASE_URL === "YOUR_SUPABASE_URL") {
        console.warn("Estate: Please set your SUPABASE_URL and SUPABASE_ANON_KEY in estate-supabase.js");
    }

    // Initialize Supabase client
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- API EXPOSURE ---
    window.estateApi = {
        supabase: supabase,

        // --- AUTH ---
        auth: {
            signUp: (email, password) => supabase.auth.signUp({ email, password }),
            signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
            signOut: () => supabase.auth.signOut(),
            getUser: () => supabase.auth.getUser(),
            onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
        },

        // --- BUILDINGS ---
        getBuildings: async () => {
            const { data, error } = await supabase
                .from('buildings')
                .select('*, rooms(*)');
            
            if (error) {
                console.error("Estate Error [getBuildings]:", error);
                throw error;
            }
            
            return data.map(b => ({
                ...b,
                rooms: b.rooms ? b.rooms.length : 0,
                occupied: b.rooms ? b.rooms.filter(r => r.status === 'paid').length : 0,
                monthlyRevenue: b.rooms ? b.rooms.reduce((acc, r) => acc + (r.status === 'paid' ? r.rent : 0), 0) : 0
            }));
        },

        // --- ROOMS ---
        getRooms: async (buildingId = null) => {
            let query = supabase.from('rooms').select('*, buildings(name), tenants(*)');
            if (buildingId) query = query.eq('building_id', buildingId);

            const { data, error } = await query;
            if (error) {
                console.error("Estate Error [getRooms]:", error);
                throw error;
            }

            return data.map(r => ({
                id: r.id,
                number: r.number,
                buildingId: r.building_id,
                buildingName: r.buildings.name,
                rent: r.rent,
                status: r.status,
                tenant: r.tenants[0] || null,
                prevReading: r.prev_reading,
                currReading: r.curr_reading,
                ratePerUnit: r.rate_per_unit,
                history: [], // Fetch separately if needed
                pastTenants: []
            }));
        },

        // --- PAYMENTS ---
        getRecentPayments: async (limit = 10) => {
            const { data, error } = await supabase
                .from('payments')
                .select('*, rooms(number, buildings(name)), tenants(name)')
                .order('date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data.map(p => ({
                id: p.id,
                roomId: p.room_id,
                tenantName: p.tenants ? p.tenants.name : 'Unknown',
                amount: p.amount,
                date: p.date,
                status: p.status,
                method: p.method,
                note: p.note
            }));
        },

        addPayment: async (paymentData) => {
            const { data, error } = await supabase
                .from('payments')
                .insert([paymentData])
                .select();
            if (error) throw error;
            return data[0];
        },

        // --- TENANTS ---
        addTenant: async (tenantData) => {
            const { data, error } = await supabase
                .from('tenants')
                .insert([tenantData])
                .select();
            if (error) throw error;

            // If room_id is provided, update room status to 'paid' (or whatever logic)
            if (tenantData.room_id) {
                await supabase.from('rooms').update({ status: 'paid' }).eq('id', tenantData.room_id);
            }

            return data[0];
        },

        // --- STATS ---
        getDashboardStats: async () => {
            // Complex stats often better done via multiple queries or an RPC
            // For now, let's just fetch everything needed for basic dashboard
            const [buildings, rooms, payments] = await Promise.all([
                supabase.from('buildings').select('*', { count: 'exact' }),
                supabase.from('rooms').select('*', { count: 'exact' }),
                supabase.from('payments').select('amount, status, date')
            ]);

            const totalBuildings = buildings.count || 0;
            const totalRooms = rooms.count || 0;
            const occupied = rooms.data ? rooms.data.filter(r => r.status !== 'empty').length : 0; // Simple logic

            const now = new Date();
            const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

            const monthlyRevenue = payments.data
                ? payments.data
                    .filter(p => p.status === 'paid' && p.date.startsWith(currentMonthStr))
                    .reduce((sum, p) => sum + p.amount, 0)
                : 0;

            const pending = payments.data
                ? payments.data.filter(p => p.status !== 'paid').length
                : 0;

            return {
                totalBuildings,
                totalRooms,
                occupied,
                pending,
                monthlyRevenue
            };
        }
    };

    console.log("Estate: API Layer loaded successfully.");
})();
