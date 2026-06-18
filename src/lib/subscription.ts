import { supabase } from "./api";

export interface Plan {
  id: string;
  plan_name: string;
  display_name: string;
  monthly_price: number;
  yearly_price: number;
  is_active: boolean;
  sort_order: number;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  feature_value: string;
  enabled: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "trial" | "active" | "expired" | "cancelled" | "suspended";
  billing_cycle: "monthly" | "yearly";
  start_date: string;
  expiry_date: string | null;
  payment_provider: string;
  subscription_source: string;
  created_at: string;
  updated_at: string;
  plans?: Plan & { plan_features?: PlanFeature[] };
}

export interface UserUsage {
  user_id: string;
  rooms_count: number;
  tenants_count: number;
  properties_count: number;
  staff_count: number;
}

export interface FeatureOverride {
  id: string;
  user_id: string;
  feature_key: string;
  feature_value: string;
  enabled: boolean;
  expiry_date: string | null;
}

// Default/fallback plans for offline/fallback mode
export const DEFAULT_PLANS: Record<string, Plan & { features: Record<string, string> }> = {
  silver: {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    plan_name: "silver",
    display_name: "Silver",
    monthly_price: 499,
    yearly_price: 4990,
    is_active: true,
    sort_order: 1,
    features: {
      room_limit: "10",
      tenant_limit: "50",
      rent_management: "true",
      payment_tracking: "true",
      basic_analytics: "true",
      whatsapp_reminders: "true",
      email_support: "true",
    },
  },
  gold: {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    plan_name: "gold",
    display_name: "Gold",
    monthly_price: 899,
    yearly_price: 8990,
    is_active: true,
    sort_order: 2,
    features: {
      room_limit: "50",
      tenant_limit: "300",
      rent_management: "true",
      payment_tracking: "true",
      basic_analytics: "true",
      whatsapp_reminders: "true",
      email_support: "true",
      expense_management: "true",
      maintenance_tracking: "true",
      advanced_analytics: "true",
      tenant_notes: "true",
      pdf_exports: "true",
      excel_exports: "true",
      priority_support: "true",
    },
  },
  platinum: {
    id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    plan_name: "platinum",
    display_name: "Platinum",
    monthly_price: 1199,
    yearly_price: 11990,
    is_active: true,
    sort_order: 3,
    features: {
      room_limit: "unlimited",
      tenant_limit: "unlimited",
      rent_management: "true",
      payment_tracking: "true",
      basic_analytics: "true",
      whatsapp_reminders: "true",
      email_support: "true",
      expense_management: "true",
      maintenance_tracking: "true",
      advanced_analytics: "true",
      tenant_notes: "true",
      pdf_exports: "true",
      excel_exports: "true",
      priority_support: "true",
      multi_property: "true",
      staff_management: "true",
      advanced_reports: "true",
      automated_reminders: "true",
      custom_branding: "true",
      dedicated_support: "true",
    },
  },
};

/**
 * Fetch current user's subscription details.
 */
export async function getCurrentSubscription(userId: string): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plans(*, plan_features(*))")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    // Return a default/fallback Silver (most restrictive) subscription if none exists in DB
    // SECURITY: Never default to Platinum/unlimited — always fail to the safest option
    return {
      id: "fallback-sub-id",
      user_id: userId,
      plan_id: DEFAULT_PLANS.silver.id,
      status: "trial",
      billing_cycle: "monthly",
      start_date: new Date().toISOString(),
      expiry_date: null,
      payment_provider: "manual",
      subscription_source: "fallback",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plans: {
        ...DEFAULT_PLANS.silver,
        plan_features: Object.entries(DEFAULT_PLANS.silver.features).map(([k, v]) => ({
          id: `feat-${k}`,
          plan_id: DEFAULT_PLANS.silver.id,
          feature_key: k,
          feature_value: v,
          enabled: true,
        })),
      },
    } as unknown as Subscription;
  }

  return data as unknown as Subscription;
}

/**
 * Fetch usage statistics for the user.
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const { data, error } = await supabase
    .from("user_usage")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    // If cache table fails/is empty, count directly from resources as fallback
    const [buildingsRes, unitsRes, tenantsRes] = await Promise.all([
      supabase.from("buildings").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("units").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("tenants").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "vacated"),
    ]);

    return {
      user_id: userId,
      rooms_count: unitsRes.count || 0,
      tenants_count: tenantsRes.count || 0,
      properties_count: buildingsRes.count || 0,
      staff_count: 0,
    };
  }

  return data as UserUsage;
}

/**
 * Fetch feature overrides.
 */
export async function getFeatureOverrides(userId: string): Promise<FeatureOverride[]> {
  const { data, error } = await supabase
    .from("feature_overrides")
    .select("*")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data as FeatureOverride[];
}

/**
 * Aggregates features and limits from subscription and active overrides.
 */
export function getPlanLimits(
  subscription: Subscription | null,
  overrides: FeatureOverride[] = []
): {
  roomLimit: number; // -1 for unlimited
  tenantLimit: number; // -1 for unlimited
  features: Record<string, { enabled: boolean; value: string }>;
} {
  const featuresMap: Record<string, { enabled: boolean; value: string }> = {};

  // 1. Load from Plan Features
  if (subscription?.plans?.plan_features) {
    subscription.plans.plan_features.forEach((feat) => {
      featuresMap[feat.feature_key] = {
        enabled: feat.enabled,
        value: feat.feature_value,
      };
    });
  } else {
    // Offline/no-auth defaults: use Silver features
    Object.entries(DEFAULT_PLANS.silver.features).forEach(([k, v]) => {
      featuresMap[k] = { enabled: true, value: v };
    });
  }

  // 2. Load and Apply Overrides
  overrides.forEach((ov) => {
    // Check override expiry
    if (ov.expiry_date && new Date(ov.expiry_date) < new Date()) {
      return; // Skip expired override
    }
    featuresMap[ov.feature_key] = {
      enabled: ov.enabled,
      value: ov.feature_value,
    };
  });

  // Parse Limits
  const parseLimit = (val: string | undefined): number => {
    if (!val || val.toLowerCase() === "unlimited") return -1;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  return {
    roomLimit: parseLimit(featuresMap.room_limit?.value),
    tenantLimit: parseLimit(featuresMap.tenant_limit?.value),
    features: featuresMap,
  };
}

// Centralized evaluation helpers
export function canCreateRoom(usageCount: number, roomLimit: number): boolean {
  if (roomLimit === -1) return true;
  return usageCount < roomLimit;
}

export function canCreateTenant(usageCount: number, tenantLimit: number): boolean {
  if (tenantLimit === -1) return true;
  return usageCount < tenantLimit;
}

export function canCreateProperty(usageCount: number, hasMultiProperty: boolean): boolean {
  if (hasMultiProperty) return true;
  return usageCount < 1; // Default to single property (1 building)
}

export function canAddStaff(hasStaffManagement: boolean): boolean {
  return hasStaffManagement;
}

export function canAccessFeature(
  featureKey: string,
  featuresMap: Record<string, { enabled: boolean; value: string }>,
  status: string = "active"
): boolean {
  // Suspend/Expired subscriptions block all paid features
  if (status === "expired" || status === "suspended") {
    // Only basic tools allowed? Standard practice is block premium.
    return false;
  }
  const feat = featuresMap[featureKey];
  return !!(feat && feat.enabled && (feat.value === "true" || feat.value !== "false"));
}
