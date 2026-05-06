import { useState, useEffect } from "react";
import { estateApi } from "@/lib/api";

export const useAppInitialization = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. Auth check
        const { data: { session } } = await estateApi.supabase.auth.getSession();
        
        // 2. Initial Data fetch (Dashboard stats or similar)
        // This pre-warms the cache
        if (session) {
          await estateApi.getDashboardStats();
        }

        // 3. Theme & Font check (mocked for now, but hookable)
        await new Promise(resolve => setTimeout(resolve, 500)); // Small buffer for layout

        setIsReady(true);
      } catch (err) {
        console.error("Initialization failed:", err);
        setError(err as Error);
        // Fallback: mark as ready anyway so user isn't stuck
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  return { isReady, error };
};
