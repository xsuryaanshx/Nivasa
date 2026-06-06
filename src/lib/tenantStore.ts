// Lightweight validation utilities for tenant data.

type Listener = () => void;
const listeners = new Set<Listener>();

export interface NewTenantInput {
  name: string;
  mobile: string;
  whatsapp_number?: string;
  aadhar: string;
  joined_at?: string;
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

/**
 * Validate Indian mobile number.
 * Accepts 10-digit numbers, optionally prefixed with +91 or 0.
 * Examples: 9876543210, +919876543210, 09876543210
 */
export function isValidMobile(s: string) {
  const cleaned = s.replace(/[\s\-().]/g, "");
  // Strip country code prefix if present
  const normalized = cleaned.replace(/^\+91|^0/, "");
  return /^[6-9]\d{9}$/.test(normalized);
}