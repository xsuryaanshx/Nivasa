import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Room, Tenant, PaymentStatus } from "./types";
import { computeRentFromTiers } from "./rentByOccupancy";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateTenantShare(room: Room): number {
  const activeTenants = room.tenants?.filter(t => t.status !== "vacated")?.length || 1;
  const occupants = Math.max(1, activeTenants);
  const totalRent = computeRentFromTiers(room.occupancyPrices, room.rent, occupants);
  return totalRent / occupants;
}

export function getTenantPaymentStatus(
  tenant: Tenant, 
  roomPayments: any[], 
  tenantInvoices?: any[]
): PaymentStatus {
  // Check the most recent payment for this tenant in the current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  if (tenantInvoices) {
    const invoicesForTenant = tenantInvoices.filter(i => i.tenant_id === tenant.id);
    const currentInvoice = invoicesForTenant.find(i => i.billing_month === currentMonth);
    
    // Sum up historical invoices (base_rent + addons_total) and their electricity_cost column
    let totalDueHistorical = invoicesForTenant.reduce(
      (sum, i) => sum + (Number(i.total_amount) || 0) + (Number(i.electricity_cost) || 0), 
      0
    );
    
    // Add deposit amount to the total due
    totalDueHistorical += Number(tenant.depositAmount || tenant.deposit_amount || 0);
    
    // If current invoice hasn't generated, assume they owe at least this month's base rent
    if (!currentInvoice) {
      totalDueHistorical += Number(tenant.rent_amount || 0);
    }
    
    const allTenantPayments = roomPayments.filter(p => p.tenantId === tenant.id && p.status === "paid");
    const totalPaidHistorical = allTenantPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const netBalance = totalDueHistorical - totalPaidHistorical;
    
    if (netBalance <= 0) {
      return "paid";
    }
    
    // If they have an outstanding balance, check if they are late or pending
    const dayOfMonth = new Date().getDate();
    return dayOfMonth > 10 ? "late" : "pending";
  }

  const recentPayment = roomPayments.find(p => p.tenantId === tenant.id && p.date.startsWith(currentMonth));
  
  if (recentPayment) {
    return recentPayment.status;
  }
  
  // If no payment found for this month, assume pending/late based on date
  const dayOfMonth = new Date().getDate();
  return dayOfMonth > 10 ? "late" : "pending";
}

export function maskAadhar(aadhar: string | undefined | null): string {
  if (!aadhar) return "-";
  const clean = aadhar.replace(/\D/g, "");
  if (clean.length < 4) return clean;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

export function getAssetUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/${cleanPath}`;
}
