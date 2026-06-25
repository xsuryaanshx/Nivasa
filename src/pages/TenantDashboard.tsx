import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar, ShieldCheck, LogOut, CheckCircle2, Home, Receipt, AlertCircle, Loader2 } from "lucide-react";
import { NivasaLogo } from "@/components/NivasaLogo";
// Gemini Vision is used for OCR — no tesseract import needed
import { motion } from "framer-motion";

export default function TenantDashboard() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // OCR state variables
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrConfirmOpen, setOcrConfirmOpen] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    amount?: number;
    utr?: string;
    date?: string;
    file?: File;
  } | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualUtr, setManualUtr] = useState("");
  const [manualDate, setManualDate] = useState("");

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
      let tenantData = null;
      let { data: firstTryData, error: tenantErr } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          status,
          rent_amount,
          joined_at,
          room:room_id (id, name, rent_amount),
          building:buildings!tenants_building_id_fkey (id, name, address, upi_id, contact_phone, user_id, landlord_name)
        `)
        .eq("id", tenantId)
        .single();

      if (tenantErr && tenantErr.code === "42703") {
        // Fallback without landlord_name if database migration has not been executed yet
        const { data: fallbackData, error: fallbackErr } = await supabase
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
        if (fallbackErr) throw fallbackErr;
        tenantData = fallbackData;
      } else if (tenantErr) {
        throw tenantErr;
      } else {
        tenantData = firstTryData;
      }

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

  // Derived state helpers
  const unpaidInvoices = invoices.filter(inv => {
    const totalDue = Number(inv.total_amount || 0) + Number(inv.electricity_cost || 0);
    const paidForMonth = payments
      .filter(p => {
        const pMonth = p.paid_date ? p.paid_date.slice(0, 7) : "";
        return pMonth === inv.billing_month && p.status === "paid";
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return paidForMonth < totalDue;
  });
  
  const activeInvoice = unpaidInvoices[0];

  const activeInvoicePaid = useMemo(() => {
    if (!activeInvoice) return 0;
    return payments
      .filter(p => {
        const pMonth = p.paid_date ? p.paid_date.slice(0, 7) : "";
        return pMonth === activeInvoice.billing_month && p.status === "paid";
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [activeInvoice, payments]);

  const activeInvoiceTotal = useMemo(() => {
    if (!activeInvoice) return 0;
    return Number(activeInvoice.total_amount || 0) + Number(activeInvoice.electricity_cost || 0);
  }, [activeInvoice]);

  const activeInvoiceRemaining = Math.max(0, activeInvoiceTotal - activeInvoicePaid);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("OCR Scanner Version: 2.1 (With Safety override & robust brace parser)");

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }

    setOcrLoading(true);
    try {
      // Convert the image file to base64 for Gemini Vision API
      const toBase64 = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      const base64Image = await toBase64(file);
      const mimeType = file.type || "image/jpeg";

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "") {
        throw new Error("Gemini API Key is missing. If you recently updated your .env file, you MUST stop your terminal server and run 'npm run dev' again to restart it.");
      }

      const prompt = `You are a UPI payment receipt parser. Analyze this payment screenshot carefully and extract these fields:
1. "amount": The rupee amount paid (number, e.g. 2000.00). Look for the ₹ symbol or "Rs." followed by a number.
2. "utr": The 12-digit transaction reference number (string). Labeled as UTR, Ref No, Transaction ID, UPI Ref, or similar.
3. "date": The payment date in YYYY-MM-DD format.

Return ONLY a raw JSON object (no conversational text, no markdown fences):
{"amount": 2000.00, "utr": "612345678901", "date": "2026-06-25"}`;

      console.log("Base64 Image length:", base64Image.length);

      const makeGeminiRequest = async (modelName: string) => {
        return await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Image } }
                ]
              }],
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ],
              generationConfig: { 
                temperature: 0, 
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    amount: { type: "NUMBER", description: "The rupee amount paid (e.g. 1.00)" },
                    utr: { type: "STRING", description: "The 12-digit UPI transaction reference number / UTR" },
                    date: { type: "STRING", description: "The payment date in YYYY-MM-DD format" }
                  },
                  required: []
                }
              }
            })
          }
        );
      };

      let response = await makeGeminiRequest("gemini-2.5-flash");

      // Auto-fallback to gemini-2.5-flash-lite if the primary model is busy/rate-limited or down
      if (!response.ok || response.status === 503 || response.status === 429) {
        console.warn(`Primary model gemini-2.5-flash failed with status ${response.status}. Retrying with gemini-2.5-flash-lite...`);
        const fallbackResponse = await makeGeminiRequest("gemini-2.5-flash-lite");
        if (fallbackResponse.ok) {
          response = fallbackResponse;
        }
      }

      if (response.status === 429) {
        throw new Error("RATE_LIMITED");
      }
      if (!response.ok) {
        const errorText = await response.text();
        let apiErrorMsg = response.statusText;
        try {
          const errJson = JSON.parse(errorText);
          apiErrorMsg = errJson.error?.message || apiErrorMsg;
        } catch (_) {}
        throw new Error(`Gemini API returned status ${response.status}: ${apiErrorMsg}`);
      }

      const geminiData = await response.json();
      console.log("Full Gemini response:", geminiData);

      const candidate = geminiData.candidates?.[0];
      if (candidate?.finishReason === "SAFETY") {
        throw new Error("The receipt scan was blocked by Gemini safety filters. Please enter details manually.");
      }

      const rawText = candidate?.content?.parts?.[0]?.text || "{}";
      console.log("Gemini Vision response:", rawText);

      // Robustly extract the JSON object by finding the first '{' and last '}'
      let jsonStr = rawText.trim();
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      } else {
        throw new SyntaxError("No JSON braces found in Gemini response");
      }

      const parsed = JSON.parse(jsonStr);

      const detectedAmount: number | undefined = parsed.amount != null && parsed.amount > 0 ? Number(parsed.amount) : undefined;
      const detectedUtr: string | undefined = parsed.utr ? String(parsed.utr) : undefined;
      const detectedDate: string = parsed.date || new Date().toISOString().slice(0, 10);

      setOcrResult({ amount: detectedAmount, utr: detectedUtr, date: detectedDate, file });
      setManualAmount(detectedAmount != null ? String(detectedAmount) : "");
      setManualUtr(detectedUtr || "");
      setManualDate(detectedDate);
      setOcrConfirmOpen(true);

    } catch (err: any) {
      console.error("OCR Scan failed:", err);
      if (err.message === "RATE_LIMITED") {
        toast.error("Too many scans — please wait a moment and try again.");
      } else if (err instanceof SyntaxError) {
        toast.info("Could not auto-detect details from the image. Please enter them manually.");
      } else {
        toast.error(`Scan failed: ${err.message || "Unknown error"}. Please check your settings.`);
      }
      setOcrResult({ file });
      setManualAmount("");
      setManualUtr("");
      setManualDate(new Date().toISOString().slice(0, 10));
      setOcrConfirmOpen(true);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleConfirmOcrPayment = async () => {
    if (!ocrResult?.file) return;
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    try {
      setLoading(true);
      const fileExt = ocrResult.file.name.split('.').pop();
      const filePath = `receipts/receipt_${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, ocrResult.file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const cleanDate = manualDate || new Date().toISOString().slice(0, 10);
      const { error: insertErr } = await supabase
        .from('payments')
        .insert([{
          building_id: tenant?.building?.id,
          unit_id: tenant?.room?.id,
          tenant_id: tenant?.id,
          user_id: tenant?.building?.user_id,
          amount: amt,
          method: 'upi',
          status: 'paid',
          paid_date: cleanDate,
          reference_number: manualUtr || null,
          note: `Auto-verified via UPI Screenshot OCR. Receipt: ${publicUrl}`
        }]);

      if (insertErr) throw insertErr;

      toast.success("Receipt verified! Payment recorded successfully.");
      setOcrConfirmOpen(false);
      setOcrResult(null);
      fetchTenantData();
      
    } catch (err: any) {
      console.error("Failed to submit payment receipt:", err);
      toast.error("Submission failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  // Derived state helpers are now defined at the top of the component body.

  const handlePayClick = (invoice: any) => {
    const upiId = tenant?.building?.upi_id || "amishatiwari100@oksbi"; 
    const landlordName = tenant?.building?.landlord_name || "Amisha";
    
    const paidForInvoice = payments
      .filter(p => {
        const pMonth = p.paid_date ? p.paid_date.slice(0, 7) : "";
        return pMonth === invoice.billing_month && p.status === "paid";
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const totalDue = Number(invoice.total_amount || 0) + Number(invoice.electricity_cost || 0);
    const amount = Math.max(0, totalDue - paidForInvoice);
    
    // Construct transaction note (purpose) containing the building name
    const buildingNameSafe = (tenant?.building?.name || "Maduvan").replace(/\s+/g, "_");
    const purpose = `${buildingNameSafe}_${invoice.billing_month}_Rent_Payment`;

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
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    {activeInvoicePaid > 0 ? "Remaining Balance Due" : "Total Amount Due"}
                  </div>
                  <div className="text-3xl font-extrabold text-foreground mt-0.5">
                    ₹{activeInvoiceRemaining.toLocaleString()}
                  </div>
                  {activeInvoicePaid > 0 && (
                    <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ₹{activeInvoicePaid.toLocaleString()} paid this month
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col xs:flex-row gap-2">
                  <Button onClick={() => handlePayClick(activeInvoice)} className="bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl px-5 h-10 font-semibold text-xs shrink-0">
                    Pay Instantly via UPI
                  </Button>
                  
                  <label className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-brand/20 bg-brand/5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-all duration-200 px-4 h-10 text-center shrink-0">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleScreenshotUpload} 
                      className="hidden" 
                    />
                    Upload Screenshot (Auto-Verify)
                  </label>
                </div>
              </div>

              <div className="h-px bg-border/50 my-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Base Rent</span>
                  <span className="font-semibold text-foreground">₹{(activeInvoice.base_rent || 0).toLocaleString()}</span>
                </div>
                {Number(activeInvoice.electricity_cost || 0) > 0 && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Electricity</span>
                    <span className="font-semibold text-foreground">₹{(activeInvoice.electricity_cost || 0).toLocaleString()}</span>
                  </div>
                )}
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

      {/* OCR Scanning Loader Modal */}
      {ocrLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center space-y-4"
          >
            <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto" />
            <h3 className="font-semibold text-lg text-foreground">Scanning Payment Receipt</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We are scanning your UPI screenshot to extract the amount, date, and reference numbers automatically. This may take a few seconds...
            </p>
          </motion.div>
        </div>
      )}

      {/* OCR Details Verification Dialog */}
      {ocrConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand" />
                  Verify Payment Details
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm the details scanned from your screenshot.
                </p>
              </div>
              <button
                onClick={() => setOcrConfirmOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {ocrResult?.amount === activeInvoiceRemaining ? (
                <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Exact match found for your outstanding balance!
                </div>
              ) : (
                <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Please verify or update the details if the scan wasn't fully accurate.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Paid (₹)</label>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-brand"
                  placeholder="2000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Ref / UTR (12 digits)</label>
                <input
                  type="text"
                  value={manualUtr}
                  onChange={(e) => setManualUtr(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-brand font-mono"
                  placeholder="612345678901"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="p-5 border-t border-border/50 bg-secondary/10 flex items-center justify-end gap-2">
              <Button onClick={() => setOcrConfirmOpen(false)} variant="ghost" className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleConfirmOcrPayment} className="bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl">
                Confirm & Submit Payment
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
