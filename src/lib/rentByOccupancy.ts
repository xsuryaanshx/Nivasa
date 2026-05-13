/** Occupancy-based monthly rent tiers for a room (members → total rent). */

export type OccupancyPriceTier = { members: number; amount: number };

export function normalizeOccupancyTiers(raw: unknown): OccupancyPriceTier[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      arr = Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  } else return [];

  const out: OccupancyPriceTier[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const m = Number((row as { members?: unknown }).members);
    const a = Number((row as { amount?: unknown }).amount);
    if (!Number.isFinite(m) || m < 1 || !Number.isFinite(a) || a < 0) continue;
    out.push({ members: Math.floor(m), amount: a });
  }
  return out.sort((x, y) => x.members - y.members);
}

/** Total rent for a billing occupancy count; falls back to flat rent when no tiers. */
export function computeRentFromTiers(
  tiers: OccupancyPriceTier[] | null | undefined,
  flatRent: number,
  billingOccupancy: number,
): number {
  const list = tiers?.length ? normalizeOccupancyTiers(tiers) : [];
  if (!list.length) return flatRent;
  const o = Math.max(1, Math.floor(billingOccupancy));
  let best = list[0].amount;
  for (const t of list) {
    if (o >= t.members) best = t.amount;
  }
  return best;
}

/** Build tier rows from base rent (1 person) + each additional member. */
export function buildTiersFromBaseAndPerAdditional(
  baseOneMember: number,
  perAdditionalMember: number,
  maxMembers: number,
): OccupancyPriceTier[] {
  const cap = Math.min(24, Math.max(1, Math.floor(maxMembers)));
  const tiers: OccupancyPriceTier[] = [];
  for (let m = 1; m <= cap; m++) {
    const amount = baseOneMember + perAdditionalMember * (m - 1);
    tiers.push({ members: m, amount: Math.max(0, Math.round(amount * 100) / 100) });
  }
  return tiers;
}

export function tiersToJsonbPayload(tiers: OccupancyPriceTier[] | null): unknown {
  if (!tiers?.length) return null;
  return normalizeOccupancyTiers(tiers);
}
