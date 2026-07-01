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

const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/** Sanitize and mathematically validate Indian Aadhar (12 digits) using Verhoeff algorithm. */
export function isValidAadhar(s: string) {
  const cleaned = s.replace(/\s+/g, "");
  if (!/^\d{12}$/.test(cleaned)) return false;
  
  let c = 0;
  let invertedArray = cleaned.split("").map(Number).reverse();

  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }
  return c === 0;
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