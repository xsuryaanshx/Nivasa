import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar, ShieldCheck, LogOut, CheckCircle2, Home, Receipt, AlertCircle, Loader2 } from "lucide-react";
import { NivasaLogo } from "@/components/NivasaLogo";

export default function TenantDashboard() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session?.user;
      if (!user) return;

      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant profile not found in account metadata");
        setLoading(false);
        return;
      }

      // 1. Link account on first load if tenant_user_id is not set
      await supabase
        .from("tenants")
        .update({ tenant_user_id: user.id })
        .eq("id", tenantId)
        .is("tenant_user_id", null);

      // 2. Fetch tenant profile details including room and building info
      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          status,
          rent_amount,
          joined_at,
          room:room_id (id, name, rent_amount),
          building:buildings!tenants_building_id_fkey (id, name, address, upi_id, contact_phone, user_id)
        `)
        .eq("id", tenantId)
        .single();

      if (tenantErr) throw tenantErr;
      setTenant(tenantData);

      // 3. Fetch Invoices
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from("tenant_invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("billing_month", { ascending: false });

      if (invoiceErr) throw invoiceErr;
      setInvoices(invoiceData || []);

      // 4. Fetch Payments
      const { data: paymentData, error: paymentErr } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("paid_date", { ascending: false });

      if (paymentErr) throw paymentErr;
      setPayments(paymentData || []);

    } catch (error: any) {
      console.error("Error loading tenant data:", error);
      toast.error(error.message || "Failed to load portal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <NivasaLogo className="h-16 w-auto animate-pulse" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
            <p className="text-sm text-muted-foreground font-medium">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get active unpaid invoice
  const unpaidInvoices = invoices.filter(inv => {
    // If there's no payment in payments matching this invoice's billing_month
    const isPaid = payments.some(p => {
      const pMonth = p.paid_date ? p.paid_date.slice(0, 7) : "";
      return pMonth === inv.billing_month && p.status === "paid";
    });
    return !isPaid;
  });

  const activeInvoice = unpaidInvoices[0];

  const handlePayClick = (invoice: any) => {
    const upiId = tenant?.building?.upi_id || "payment@nivasa"; // fallback placeholder
    const landlordName = tenant?.building?.name || "Nivasa Landlord";
    const amount = invoice.total_amount || invoice.base_rent || 0;
    const purpose = `${invoice.billing_month}_Rent_Payment`;

    // Redirect to secure pay page
    window.location.href = `/pay?pa=${upiId}&pn=${encodeURIComponent(landlordName)}&am=${amount}&tn=${encodeURIComponent(purpose)}&t=${Date.now()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NivasaLogo className="h-8 w-auto" />
            <span className="font-bold tracking-tight text-foreground">Nivasa Portal</span>
          </div>

          <Button onClick={signOut} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-card/50 p-6 rounded-2xl border border-border shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Welcome back, {tenant?.name || "Resident"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your room residency and payments here.</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20 py-1.5 px-3 self-start sm:self-center gap-1.5 rounded-full font-medium">
            <CheckCircle2 className="h-4 w-4" /> Active Residency
          </Badge>
        </div>

        {/* Room & Building Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card shadow-sm border-border rounded-xl">
            <CardHeader className="flex flex-row items-center gap-3.5 pb-2">
              <div className="p-2 rounded-lg bg-brand/10 text-brand">
                <Home className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">Room Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold text-foreground">{tenant?.room?.name || "Not Assigned"}</div>
              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Assigned Room Unit</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border rounded-xl">
            <CardHeader className="flex flex-row items-center gap-3.5 pb-2">
              <div className="p-2 rounded-lg bg-brand/10 text-brand">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">Building Association</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-lg font-bold text-foreground truncate">{tenant?.building?.name || "Not Found"}</div>
              <p className="text-xs text-muted-foreground truncate">{tenant?.building?.address || "No Address"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Payment Card */}
        {activeInvoice ? (
          <Card className="border-dashed border-brand/40 bg-brand/5 shadow-md shadow-brand/5 rounded-2xl overflow-hidden">
            <CardHeader className="bg-brand/10 border-b border-brand/10 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-brand flex items-center gap-1.5">
                <Receipt className="h-4 w-4" /> Outstanding Rent Invoice
              </CardTitle>
              <Badge className="bg-brand text-brand-foreground font-semibold">
                {activeInvoice.billing_month}
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-baseline">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Amount Due</div>
                  <div className="text-3xl font-extrabold text-foreground mt-0.5">
                    ₹{(activeInvoice.total_amount || 0).toLocaleString()}
                  </div>
                </div>
                <Button onClick={() => handlePayClick(activeInvoice)} className="bg-brand hover:bg-brand/90 text-brand-foreground rounded-full px-6 py-5 font-semibold text-sm">
                  Pay Instantly via UPI
                </Button>
              </div>

              <div className="h-px bg-border/50 my-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Base Rent</span>
                  <span className="font-semibold text-foreground">₹{(activeInvoice.base_rent || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Utility/Addons</span>
                  <span className="font-semibold text-foreground">₹{(activeInvoice.addons_total || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">All Settled!</h3>
                <p className="text-xs text-muted-foreground mt-0.5">No outstanding invoices due. You are all paid up for this month.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Payment History and Invoices */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand" /> Payment History
          </h2>

          {payments.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-10 text-center border-border">
              <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No past payment receipts found.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {payments.map((p) => {
                const isPaid = p.status === "paid";
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-soft">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2 rounded-lg shrink-0 ${isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">₹{p.amount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">{p.note || "Rent Payment"} • {p.method}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-medium">{p.paid_date || p.created_at?.slice(0, 10)}</div>
                      <Badge className={`mt-1 text-[10px] uppercase font-bold py-0.5 px-2 rounded-full ${isPaid ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10 border-yellow-500/20'}`}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
