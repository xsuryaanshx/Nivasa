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

export function getTenantPaymentStatus(tenant: Tenant, roomPayments: any[]): PaymentStatus {
  // Check the most recent payment for this tenant in the current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const recentPayment = roomPayments.find(p => p.tenantId === tenant.id && p.date.startsWith(currentMonth));
  
  if (recentPayment) {
    return recentPayment.status;
  }
  
  // If no payment found for this month, assume pending/late based on date
  const dayOfMonth = new Date().getDate();
  return dayOfMonth > 10 ? "late" : "pending";
}
