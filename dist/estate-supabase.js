/**
 * ESTATE - Advanced Supabase Integration Layer (v2.0)
 * Pure JavaScript, no imports. Designed for a Property -> Unit hierarchy.
 * Includes: Electricity Metering, Analytics, and Tenant Assignment.
 */

(function () {
    // --- CONFIGURATION ---
    const SUPABASE_URL = window.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
    const SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

        // --- BUILDINGS (PROPERTIES) ---
        getBuildings: async () => {
            const { data, error } = await supabase
                .from('buildings')
                .select('*, units(*)');

            if (error) throw error;

            return data.map(b => {
                const totalUnits = b.units ? b.units.length : 0;
                const occupiedUnits = b.units ? b.units.filter(u => u.status === 'occupied').length : 0;
                const monthlyRevenue = b.units 
                    ? b.units.filter(u => u.status === 'occupied').reduce((acc, u) => acc + (u.rent_amount || 0), 0)
                    : 0;

                return {
                    ...b,
                    rooms: totalUnits,
                    occupied: occupiedUnits,
                    monthlyRevenue: monthlyRevenue,
                    occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
                };
            });
        },

        getPropertyDetails: async (propertyId) => {
            const { data: building, error: bError } = await supabase
                .from('buildings')
                .select('*, units(*)')
                .eq('id', propertyId)
                .single();
            if (bError) throw bError;

            // Enrich units with current tenant names if possible
            const { data: tenants, error: tError } = await supabase
                .from('tenants')
                .select('*')
                .eq('building_id', propertyId);
            
            return {
                ...building,
                tenants: tenants || [],
                units: building.units.map(u => ({
                    ...u,
                    tenant: tenants ? tenants.find(t => t.unit_id === u.id) : null
                }))
            };
        },

        updateBuilding: async (id, data) => {
            const { error } = await supabase
                .from('buildings')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            return true;
        },

        deleteBuilding: async (id) => {
            const { error } = await supabase
                .from('buildings')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        },

        // --- UNITS (ROOMS) ---
        getUnits: async (buildingId = null) => {
            let query = supabase.from('units').select('*, buildings(name), tenants(*)');
            if (buildingId) query = query.eq('building_id', buildingId);

            const { data, error } = await query;
            if (error) throw error;

            return data.map(u => ({
                ...u,
                buildingName: u.buildings ? u.buildings.name : 'Unknown',
                tenantName: u.tenants ? u.tenants.name : 'Vacant'
            }));
        },

        addUnit: async (unitData) => {
            const { data, error } = await supabase
                .from('units')
                .insert([unitData])
                .select();
            if (error) throw error;
            return data[0];
        },

        // --- ELECTRICITY METERING ---
        recordMeterReading: async (unitId, newReading) => {
            // 1. Get current state
            const { data: unit, error: fError } = await supabase.from('units').select('*').eq('id', unitId).single();
            if (fError) throw fError;

            const prevReading = unit.curr_reading || 0;
            const usage = newReading - prevReading;
            const rate = unit.rate_per_unit || 10; // Default rate if not set
            const utilityCost = usage * rate;

            // 2. Update unit readings
            const { error: uError } = await supabase
                .from('units')
                .update({ 
                    prev_reading: prevReading, 
                    curr_reading: newReading 
                })
                .eq('id', unitId);
            if (uError) throw uError;

            // 3. Create a utility payment record if tenant exists
            if (unit.tenant_id && utilityCost > 0) {
                await supabase.from('payments').insert([{
                    unit_id: unitId,
                    tenant_id: unit.tenant_id,
                    amount: utilityCost,
                    status: 'pending',
                    note: `Electricity Bill: ${usage} units @ ${rate}`,
                    due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString() // Due 5th of next month
                }]);
            }

            return { usage, utilityCost };
        },

        // --- TENANTS ---
        assignTenantToUnit: async (tenantId, unitId) => {
            // Get unit to find building_id
            const { data: unit, error: uError } = await supabase.from('units').select('building_id').eq('id', unitId).single();
            if (uError) throw uError;

            // Update unit
            const { error: unitUpdateErr } = await supabase
                .from('units')
                .update({ status: 'occupied', tenant_id: tenantId })
                .eq('id', unitId);
            if (unitUpdateErr) throw unitUpdateErr;

            // Update tenant
            const { error: tenantUpdateErr } = await supabase
                .from('tenants')
                .update({ unit_id: unitId, building_id: unit.building_id })
                .eq('id', tenantId);
            if (tenantUpdateErr) throw tenantUpdateErr;

            return { success: true };
        },

        // --- PAYMENTS & ANALYTICS ---
        getPayments: async (filter = 'all') => {
            let query = supabase.from('payments').select('*, units(name, buildings(name)), tenants(name)');
            
            if (filter === 'overdue') {
                query = query.eq('status', 'pending').lt('due_date', new Date().toISOString());
            } else if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query.order('due_date', { ascending: false });
            if (error) throw error;
            return data;
        },

        getAnalytics: async () => {
            const [units, payments] = await Promise.all([
                supabase.from('units').select('status, rent_amount'),
                supabase.from('payments').select('amount, status, due_date, paid_date')
            ]);

            const totalUnits = units.data ? units.data.length : 0;
            const occupied = units.data ? units.data.filter(u => u.status === 'occupied').length : 0;
            
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Expected Rent (from units)
            const expectedRent = units.data 
                ? units.data.filter(u => u.status === 'occupied').reduce((sum, u) => sum + (u.rent_amount || 0), 0)
                : 0;

            // Collected Rent (from payments this month)
            const collectedRent = payments.data
                ? payments.data
                    .filter(p => p.status === 'paid' && new Date(p.paid_date).getMonth() === currentMonth)
                    .reduce((sum, p) => sum + p.amount, 0)
                : 0;

            // Overdue Count
            const overdue = payments.data
                ? payments.data.filter(p => p.status === 'pending' && new Date(p.due_date) < now).length
                : 0;

            return {
                occupancyRate: totalUnits > 0 ? (occupied / totalUnits) * 100 : 0,
                expectedRent,
                collectedRent,
                overdueCount: overdue
            };
        },

        // --- AUTO-BILLING ENGINE ---
        generateMonthlyInvoices: async () => {
            const { data: activeUnits, error } = await supabase
                .from('units')
                .select('*')
                .eq('status', 'occupied');
            
            if (error) throw error;

            const invoices = activeUnits.map(unit => ({
                unit_id: unit.id,
                tenant_id: unit.tenant_id,
                amount: unit.rent_amount,
                status: 'pending',
                due_date: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString(), // Due 5th of current month
                note: `Monthly Rent - ${new Date().toLocaleString('default', { month: 'long' })}`
            }));

            const { data, error: iError } = await supabase.from('payments').insert(invoices).select();
            if (iError) throw iError;
            return data;
        },
        // --- COMPATIBILITY ALIASES (For existing React components) ---
        getDashboardStats: async () => {
            const [buildings, units, payments] = await Promise.all([
                supabase.from('buildings').select('*', { count: 'exact', head: true }),
                supabase.from('units').select('*', { count: 'exact' }),
                supabase.from('payments').select('amount, status, due_date')
            ]);

            const totalBuildings = buildings.count || 0;
            const totalRooms = units.count || 0;
            const occupied = units.data ? units.data.filter(u => u.status === 'occupied').length : 0;
            
            const pending = payments.data ? payments.data.filter(p => p.status === 'pending').length : 0;
            const monthlyRevenue = payments.data 
                ? payments.data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
                : 0;

            return {
                totalBuildings,
                totalRooms,
                occupied,
                pending,
                monthlyRevenue
            };
        },

        getRecentPayments: async (limit = 10) => {
            const { data, error } = await supabase
                .from('payments')
                .select('*, units(name, buildings(name)), tenants(name)')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) return [];
            return data.map(p => ({
                id: p.id,
                tenantName: p.tenants ? p.tenants.name : 'Unknown',
                amount: p.amount,
                date: p.paid_date || p.due_date,
                status: p.status,
                note: p.note
            }));
        },

        getRooms: async (buildingId = null) => {
            return window.estateApi.getUnits(buildingId);
        }
    };

    console.log("Estate: API v2.0 Loaded with Electricity & Analytics.");
})();
