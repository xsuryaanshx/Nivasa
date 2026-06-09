import { describe, it, expect } from "vitest";
import {
  getPlanLimits,
  canCreateRoom,
  canCreateTenant,
  canCreateProperty,
  canAccessFeature,
  Subscription,
  FeatureOverride,
  DEFAULT_PLANS,
} from "../lib/subscription";

describe("Subscription Feature Gating System", () => {
  const mockSubscription = {
    id: "sub-123",
    user_id: "user-123",
    plan_id: DEFAULT_PLANS.silver.id,
    status: "active",
    plans: {
      ...DEFAULT_PLANS.silver,
      plan_features: [
        { feature_key: "room_limit", feature_value: "10", enabled: true },
        { feature_key: "tenant_limit", feature_value: "50", enabled: true },
        { feature_key: "basic_analytics", feature_value: "true", enabled: true },
        { feature_key: "advanced_reports", feature_value: "false", enabled: true },
      ],
    },
  } as unknown as Subscription;

  describe("getPlanLimits", () => {
    it("should extract limits from plan features", () => {
      const { roomLimit, tenantLimit, features } = getPlanLimits(mockSubscription, []);
      expect(roomLimit).toBe(10);
      expect(tenantLimit).toBe(50);
      expect(features.basic_analytics.value).toBe("true");
      expect(features.advanced_reports.value).toBe("false");
    });

    it("should override limits when active overrides exist", () => {
      const overrides: FeatureOverride[] = [
        {
          id: "ov-1",
          user_id: "user-123",
          feature_key: "room_limit",
          feature_value: "20",
          enabled: true,
          expiry_date: null,
        },
        {
          id: "ov-2",
          user_id: "user-123",
          feature_key: "advanced_reports",
          feature_value: "true",
          enabled: true,
          expiry_date: null,
        },
      ];

      const { roomLimit, tenantLimit, features } = getPlanLimits(mockSubscription, overrides);
      expect(roomLimit).toBe(20); // overridden
      expect(tenantLimit).toBe(50); // unchanged
      expect(features.advanced_reports.value).toBe("true"); // overridden
    });

    it("should ignore expired overrides", () => {
      const overrides: FeatureOverride[] = [
        {
          id: "ov-1",
          user_id: "user-123",
          feature_key: "room_limit",
          feature_value: "20",
          enabled: true,
          expiry_date: new Date(Date.now() - 3600000).toISOString(), // expired 1 hour ago
        },
      ];

      const { roomLimit } = getPlanLimits(mockSubscription, overrides);
      expect(roomLimit).toBe(10); // remains default
    });
  });

  describe("canCreateRoom", () => {
    it("should allow creation when count is below limit", () => {
      expect(canCreateRoom(5, 10)).toBe(true);
    });

    it("should deny creation when count is equal to limit", () => {
      expect(canCreateRoom(10, 10)).toBe(false);
    });

    it("should allow creation when limit is unlimited (-1)", () => {
      expect(canCreateRoom(999, -1)).toBe(true);
    });
  });

  describe("canCreateTenant", () => {
    it("should allow creation when count is below limit", () => {
      expect(canCreateTenant(45, 50)).toBe(true);
    });

    it("should deny creation when count is equal or above limit", () => {
      expect(canCreateTenant(50, 50)).toBe(false);
      expect(canCreateTenant(55, 50)).toBe(false);
    });
  });

  describe("canCreateProperty", () => {
    it("should only allow 1 property when multi property is not enabled", () => {
      expect(canCreateProperty(0, false)).toBe(true);
      expect(canCreateProperty(1, false)).toBe(false);
    });

    it("should allow unlimited properties when multi property is enabled", () => {
      expect(canCreateProperty(1, true)).toBe(true);
      expect(canCreateProperty(50, true)).toBe(true);
    });
  });

  describe("canAccessFeature", () => {
    it("should deny access when subscription is expired or suspended", () => {
      const features = {
        advanced_analytics: { enabled: true, value: "true" },
      };
      expect(canAccessFeature("advanced_analytics", features, "expired")).toBe(false);
      expect(canAccessFeature("advanced_analytics", features, "suspended")).toBe(false);
    });

    it("should allow access when enabled is true and value is true/enabled", () => {
      const features = {
        advanced_analytics: { enabled: true, value: "true" },
        pdf_exports: { enabled: true, value: "true" },
      };
      expect(canAccessFeature("advanced_analytics", features, "active")).toBe(true);
      expect(canAccessFeature("pdf_exports", features, "trial")).toBe(true);
    });
  });
});
