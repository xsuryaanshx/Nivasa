import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  getCurrentSubscription,
  getUserUsage,
  getFeatureOverrides,
  getPlanLimits,
  canCreateRoom,
  canCreateTenant,
  canCreateProperty,
  canAddStaff,
  canAccessFeature,
} from "@/lib/subscription";

export function useSubscriptionData() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: subscription = null,
    isLoading: isSubLoading,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => (userId ? getCurrentSubscription(userId) : null),
    enabled: !!userId,
  });

  const {
    data: usage = { rooms_count: 0, tenants_count: 0, properties_count: 0, staff_count: 0, user_id: "" },
    isLoading: isUsageLoading,
    refetch: refetchUsage,
  } = useQuery({
    queryKey: ["usage", userId],
    queryFn: () => (userId ? getUserUsage(userId) : null),
    enabled: !!userId,
  });

  const {
    data: overrides = [],
    isLoading: isOverridesLoading,
    refetch: refetchOverrides,
  } = useQuery({
    queryKey: ["overrides", userId],
    queryFn: () => (userId ? getFeatureOverrides(userId) : []),
    enabled: !!userId,
  });

  const isLoading = isSubLoading || isUsageLoading || isOverridesLoading;

  const limits = getPlanLimits(subscription, overrides);

  const refetchAll = async () => {
    await Promise.all([refetchSub(), refetchUsage(), refetchOverrides()]);
  };

  const hasMultiProperty = !!limits.features.multi_property?.enabled;
  const hasStaffManagement = !!limits.features.staff_management?.enabled;

  const expiryDate = subscription?.expiry_date ? new Date(subscription.expiry_date) : null;
  const isTrial = subscription?.status === "trial";
  const isExpired = subscription?.status === "expired" || 
    (isTrial && expiryDate && expiryDate < new Date());

  return {
    subscription,
    usage,
    overrides,
    limits,
    isLoading,
    isExpired,
    refetch: refetchAll,
    
    // Helper checks
    canCreateRoom: !isExpired && canCreateRoom(usage.rooms_count, limits.roomLimit),
    canCreateTenant: !isExpired && canCreateTenant(usage.tenants_count, limits.tenantLimit),
    canCreateProperty: !isExpired && canCreateProperty(usage.properties_count, hasMultiProperty),
    canAddStaff: !isExpired && canAddStaff(hasStaffManagement),
    canAccessFeature: (featureKey: string) =>
      !isExpired && canAccessFeature(featureKey, limits.features, subscription?.status),
  };
}

