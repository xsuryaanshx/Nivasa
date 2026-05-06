import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SplashScreen } from "./components/SplashScreen.tsx";
import { useAppInitialization } from "./hooks/useAppInitialization.ts";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Buildings from "./pages/Buildings.tsx";
import Rooms from "./pages/Rooms.tsx";
import RoomDetails from "./pages/RoomDetails.tsx";
import Payments from "./pages/Payments.tsx";
import Register from "./pages/Register.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import BuildingDetails from "./pages/BuildingDetails.tsx";

const queryClient = new QueryClient();

const App = () => {
  const { isReady } = useAppInitialization();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          
          <AnimatePresence mode="wait">
            {showSplash ? (
              <SplashScreen 
                key="splash"
                isReady={isReady} 
                onFinished={() => setShowSplash(false)} 
              />
            ) : (
              <motion.div
                key="app"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="h-screen w-full overflow-hidden"
              >
                <BrowserRouter>
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
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </motion.div>
            )}
          </AnimatePresence>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
