import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Buildings from "./pages/Buildings.tsx";
import Rooms from "./pages/Rooms.tsx";
import Tenants from "./pages/Tenants.tsx";
import RoomDetails from "./pages/RoomDetails.tsx";
import Payments from "./pages/Payments.tsx";
import Register from "./pages/Register.tsx";
import Profile from "./pages/Profile.tsx";
import Expenses from "./pages/Expenses.tsx";
import ProfitPage from "./pages/ProfitPage.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import BuildingDetails from "./pages/BuildingDetails.tsx";
import { SplashScreen } from "./components/SplashScreen.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import SubscriptionPage from "./pages/Subscription.tsx";
import PublicListing from "./pages/PublicListing.tsx";
import ConfirmedEmail from "./pages/ConfirmedEmail.tsx";
import Staff from "./pages/Staff.tsx";
import StaffDetails from "./pages/StaffDetails.tsx";
import Maintenance from "./pages/Maintenance.tsx";
import { FeatureGate } from "./components/FeatureGate.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,           // MED-04: Reduce from default 3 to avoid hammering expired sessions
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof (window as any).gtag === 'function') {
      // MED-06: Strip sensitive query params before sending to GA
      // to prevent token or ID leakage to third-party analytics servers.
      const url = new URL(window.location.href);
      ['access_token', 'token', 'refresh_token', 'code'].forEach((p) =>
        url.searchParams.delete(p)
      );
      (window as any).gtag('event', 'page_view', {
        page_path: url.pathname + url.search,
      });
    }
  }, [location]);

  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem("nivasa:splash-shown");
    } catch {
      return true;
    }
  });

  const handleSplashFinished = useCallback(() => {
    setShowSplash(false);
    try {
      sessionStorage.setItem("nivasa:splash-shown", "true");
    } catch (e) {
      console.warn("sessionStorage is not available:", e);
    }
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {showSplash && (
            <SplashScreen 
              isReady={true} 
              onFinished={handleSplashFinished} 
            />
          )}
          <Toaster />
          <Sonner />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full min-h-screen"
          >
            <BrowserRouter>
              <AnalyticsTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/confirmed" element={<ConfirmedEmail />} />
                <Route path="/app" element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="buildings" element={<Buildings />} />
                    <Route path="buildings/:id" element={<BuildingDetails />} />
                    <Route path="tenants" element={<Tenants />} />
                    <Route path="rooms" element={<Rooms />} />
                    <Route path="rooms/:id" element={<RoomDetails />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="staff" element={<FeatureGate featureKey="staff_management" title="Staff Management Locked" description="Upgrade to Platinum to manage your staff and assign roles."><Staff /></FeatureGate>} />
                    <Route path="staff/:id" element={<FeatureGate featureKey="staff_management"><StaffDetails /></FeatureGate>} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="profit" element={<ProfitPage />} />
                    <Route path="expenses" element={<FeatureGate featureKey="expense_management" title="Expense Tracking Locked" description="Upgrade to Gold or Platinum to track property expenses."><Expenses /></FeatureGate>} />
                    <Route path="maintenance" element={<FeatureGate featureKey="maintenance_tracking" title="Maintenance Tracking Locked" description="Upgrade to Gold or Platinum to manage maintenance requests."><Maintenance /></FeatureGate>} />
                    <Route path="subscription" element={<SubscriptionPage />} />
                  </Route>
                </Route>
                <Route path="/p/:slug" element={<PublicListing />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </motion.div>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
