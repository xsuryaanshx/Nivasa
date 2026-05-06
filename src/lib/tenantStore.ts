// Lightweight in-memory tenant assignment store.
// API_PLACEHOLDER: replace with Supabase mutations when wiring backend.
import { rooms, type Tenant } from "./mockData";

type Listener = () => void;
const listeners = new Set<Listener>();

export interface NewTenantInput {
  name: string;
  mobile: string;
  whatsapp_number?: string;
  aadhar: string;
  joined_at?: string;
}

export function assignTenantToRoom(roomId: string, input: NewTenantInput): Tenant {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error("Room not found");

  const tenant: Tenant = {
    id: `t_${Date.now().toString(36)}`,
    name: input.name.trim(),
    phone: input.mobile.trim(),
    whatsapp_number: (input.whatsapp_number ?? input.mobile).trim(),
    aadhar: input.aadhar.replace(/\s+/g, ""),
    joined_at: input.joined_at ?? new Date().toISOString().slice(0, 10),
  };

  // Move existing tenant to past tenants if present.
  if (room.tenant) room.pastTenants.unshift(room.tenant);
  room.tenant = tenant;
  if (room.status === "late" || room.status === "pending") {
    // Fresh start: leave status as pending until first payment.
    room.status = "pending";
  }
  listeners.forEach((fn) => fn());
  return tenant;
}

export function subscribeTenants(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Sanitize and validate Indian Aadhar (12 digits). */
export function isValidAadhar(s: string) {
  return /^\d{12}$/.test(s.replace(/\s+/g, ""));
}

/** Loose mobile validation: at least 7 digits, allow + and spaces. */
export function isValidMobile(s: string) {
  return /^[+]?[\d\s\-()]{7,}$/.test(s.trim());
}