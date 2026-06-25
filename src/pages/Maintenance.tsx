import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle, Sparkles, Loader2, FileText } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import type { MaintenanceRequest, Building } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrency, formatMoney } from "@/lib/currency";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { downloadExcel } from "@/lib/export";
import { FileSpreadsheet } from "lucide-react";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const priorityColors = {
  low: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  critical: "bg-red-500 text-white dark:bg-red-600 dark:text-white",
};

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { currency } = useCurrency();
  const { canAccessFeature } = useSubscriptionData();
  const canExport = canAccessFeature("excel_exports");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const scanSteps = [
    "Detecting receipt boundaries...",
    "Optimizing image contrast...",
    "Extracting printed text (OCR)...",
    "AI analyzing merchant & items...",
    "Extracting total amount & predicting category...",
    "Form successfully pre-filled!"
  ];

  const handleScanClick = () => {
    toast("Scan Receipt", {
      description: "AI receipt scanning will be available in an upcoming update."
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStep(0);

    // Simulate scanning steps
    let currentStep = 0;
    const interval = setInterval(async () => {
      currentStep++;
      if (currentStep < scanSteps.length) {
        setScanStep(currentStep);
      } else {
        clearInterval(interval);

        let prefilledData = null;
        const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

        if (GEMINI_API_KEY && GEMINI_API_KEY.trim() !== "") {
          try {
            // Read file to base64
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                const base64String = (reader.result as string).split(",")[1];
                resolve(base64String);
              };
              reader.onerror = (error) => reject(error);
            });

            const makeGeminiRequest = async (modelName: string) => {
              return await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            text: "Analyze this receipt or bill image and extract information."
                          },
                          {
                            inlineData: {
                              mimeType: file.type || "image/png",
                              data: base64Data
                            }
                          }
                        ]
                      }
                    ],
                    safetySettings: [
                      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: {
                      temperature: 0,
                      responseMimeType: "application/json",
                      responseSchema: {
                        type: "OBJECT",
                        properties: {
                          title: { type: "STRING", description: "Short descriptive title of the expense (like merchant name)" },
                          cost: { type: "NUMBER", description: "The total amount paid after taxes" },
                          category: { 
                            type: "STRING", 
                            enum: ["maintenance", "facility", "utility", "other"],
                            description: "The expense category"
                          },
                          description: { type: "STRING", description: "Itemized list of items with individual costs, total, date" }
                        },
                        required: ["title", "cost", "category", "description"]
                      }
                    }
                  })
                }
              );
            };

            let response = await makeGeminiRequest("gemini-2.5-flash-lite");

            // Auto-fallback to gemini-2.5-flash if the lite model is rate-limited or busy/unavailable
            if (!response.ok || response.status === 503 || response.status === 429) {
              console.warn(`Primary model gemini-2.5-flash-lite failed with status ${response.status}. Retrying with gemini-2.5-flash...`);
              const fallbackResponse = await makeGeminiRequest("gemini-2.5-flash");
              if (fallbackResponse.ok) {
                response = fallbackResponse;
              }
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

            const result = await response.json();
            console.log("Full Gemini response (Maintenance):", result);

            const candidate = result.candidates?.[0];
            if (candidate?.finishReason === "SAFETY") {
              throw new Error("The receipt scan was blocked by Gemini safety filters. Please enter details manually.");
            }

            const textResponse = candidate?.content?.parts?.[0]?.text;
            if (textResponse) {
              let jsonStr = textResponse.trim();
              const firstBrace = jsonStr.indexOf("{");
              const lastBrace = jsonStr.lastIndexOf("}");
              if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
              }

              const parsed = JSON.parse(jsonStr);
              prefilledData = {
                title: parsed.title || "Scanned Expense",
                cost: Number(parsed.cost) || 0,
                category: ["maintenance", "facility", "utility", "other"].includes(parsed.category)
                  ? parsed.category
                  : "other",
                description: parsed.description || "Scanned from receipt."
              };
            }
          } catch (error: any) {
            console.error("AI scanning failed:", error);
            toast.error(`Failed to scan receipt: ${error.message || "Unknown error"}. Please check settings.`);
          }
        } else {
          toast.error("AI Receipt Scanner is not configured. If you recently updated your .env file, please restart your Vite development server.");
        }

        setIsScanning(false);

        if (prefilledData) {
          // Set the state
          setNewRequest((prev) => ({
            ...prev,
            ...prefilledData,
          }));

          setIsAddModalOpen(true);
          toast.success("AI scanned receipt successfully!", {
            description: `Prefilled: ${prefilledData.title} (₹${prefilledData.cost.toLocaleString()})`
          });
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }, 900);
  };

  const [newRequest, setNewRequest] = useState<Partial<MaintenanceRequest>>({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    property_id: "",
    unit_id: "none",
    cost: 0,
    category: "maintenance",
  });

  const categoryColors = {
    maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    facility: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    utility: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    other: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: nivasaApi.getMaintenanceRequests,
  });

  const { data: buildings } = useQuery({
    queryKey: ["buildings"],
    queryFn: nivasaApi.getBuildings,
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: nivasaApi.getRooms,
  });

  const availableRooms = (rooms?.filter((r) => r.buildingId === newRequest.property_id) || []).sort((a, b) => {
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });

  const addMutation = useMutation({
    mutationFn: (request: Partial<MaintenanceRequest>) =>
      nivasaApi.addMaintenanceRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setIsAddModalOpen(false);
      setNewRequest({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        property_id: "",
        cost: 0,
        category: "maintenance",
      });
      toast.success("Expense added");
    },
    onError: (error) => {
      toast.error("Failed to add request");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MaintenanceRequest> }) =>
      nivasaApi.updateMaintenanceRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status");
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.title || !newRequest.property_id) {
      toast.error("Title and Property are required");
      return;
    }
    const payload = { ...newRequest };
    if (payload.unit_id === "none") {
      delete payload.unit_id;
    }
    addMutation.mutate(payload);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateMutation.mutate({
      id,
      updates: { status: newStatus as any },
    });
  };

  const handleExport = () => {
    if (!canExport || !requests) return;
    const dataToExport = requests.map(r => ({
      "Title": r.title,
      "Category": r.category || "maintenance",
      "Cost": r.cost,
      "Status": r.status,
      "Date": r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd") : "",
      "Description": r.description || ""
    }));
    downloadExcel(dataToExport, "expenses_export.xlsx");
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Register</h1>
          <p className="text-muted-foreground">Track and manage service requests and facility expenses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,application/pdf" 
            className="hidden" 
          />

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense / Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Property *</label>
                  <Select
                    value={newRequest.property_id}
                    onValueChange={(val) => setNewRequest({ ...newRequest, property_id: val, unit_id: "none" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newRequest.property_id && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Room (Optional)</label>
                    <Select
                      value={newRequest.unit_id}
                      onValueChange={(val) => setNewRequest({ ...newRequest, unit_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific room</SelectItem>
                        {availableRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    placeholder="e.g. Plumbing in Room 101"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Details about the issue..."
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newRequest.category}
                      onValueChange={(val) => setNewRequest({ ...newRequest, category: val as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="facility">Facility (WiFi, etc.)</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cost ({currency.symbol})</label>
                    <Input
                      type="number"
                      min="0"
                      value={newRequest.cost}
                      onChange={(e) => setNewRequest({ ...newRequest, cost: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full mt-4" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button onClick={handleScanClick} variant="outline" className="gap-2 border-brand/25 bg-card hover:bg-secondary">
            <Sparkles className="h-4 w-4 text-brand animate-pulse" />
            Scan Receipt
          </Button>

          {canExport && (
            <Button onClick={handleExport} variant="secondary" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
          )}
        </div>
    </div>

    {requests?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No maintenance requests</h3>
          <p className="text-muted-foreground mt-1">All properties are in good condition.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests?.map((request) => {
            const building = buildings?.find((b) => b.id === request.property_id);
            return (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{request.title}</CardTitle>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    {building?.name || "Unknown Property"}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className={`capitalize ${categoryColors[(request.category || "maintenance") as keyof typeof categoryColors]}`}>
                      {request.category || "Maintenance"}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {formatMoney(request.cost || 0, currency, { decimals: 0 })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                    {request.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">

                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(request.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scanning Progress Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 text-center animate-fade-in">
          <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-card border border-border shadow-2xl max-w-sm w-full">
            <div className="relative flex items-center justify-center mb-6 h-16 w-16 rounded-2xl bg-brand/10 text-brand">
              <Loader2 className="h-8 w-8 animate-spin" />
              <FileText className="h-4 w-4 absolute animate-pulse" />
            </div>

            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-1.5 justify-center">
              <Sparkles className="h-4 w-4 text-brand animate-pulse" />
              AI Receipt Scanner
            </h3>
            
            <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden mb-4">
              <div 
                className="bg-brand h-full transition-all duration-500 rounded-full" 
                style={{ width: `${((scanStep + 1) / scanSteps.length) * 100}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground font-semibold min-h-[16px] animate-pulse">
              {scanSteps[scanStep]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
