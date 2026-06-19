import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Register</h1>
          <p className="text-muted-foreground">Track and manage service requests and facility expenses.</p>
        </div>

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
                    <Badge variant="outline" className={`capitalize h-7 px-2.5 text-xs border-0 ${statusColors[request.status as keyof typeof statusColors]}`}>
                      {request.status.replace("_", " ")}
                    </Badge>
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
    </div>
  );
}
