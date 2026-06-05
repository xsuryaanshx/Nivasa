import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
import RoomDetails from "./pages/RoomDetails.tsx";
import Payments from "./pages/Payments.tsx";
import Register from "./pages/Register.tsx";
import Profile from "./pages/Profile.tsx";
import Expenses from "./pages/Expenses.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import BuildingDetails from "./pages/BuildingDetails.tsx";
import { SplashScreen } from "./components/SplashScreen.tsx";

const queryClient = new QueryClient();

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {showSplash && (
            <SplashScreen 
              isReady={true} 
              onFinished={() => setShowSplash(false)} 
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
                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="buildings" element={<Buildings />} />
                  <Route path="buildings/:id" element={<BuildingDetails />} />
                  <Route path="rooms" element={<Rooms />} />
                  <Route path="rooms/:id" element={<RoomDetails />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="expenses" element={<Expenses />} />
                </Route>
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
