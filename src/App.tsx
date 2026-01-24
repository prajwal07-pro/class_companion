import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import FaceRegistration from "@/pages/FaceRegistration";
import Classes from "@/pages/Classes";
import Attendance from "@/pages/Attendance";
import Timetable from "@/pages/Timetable";
import Assignments from "@/pages/Assignments";
import BusTracking from "@/pages/BusTracking";
import GatePass from "@/pages/GatePass";
import Events from "@/pages/Events";
import Announcements from "@/pages/Announcements";
import Chat from "@/pages/Chat";
import Complaints from "@/pages/Complaints";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isFullyAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!isFullyAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/register-face" element={<FaceRegistration />} />

            {/* Protected Routes (Wrapped in AppLayout) */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/bus-tracking" element={<BusTracking />} />
              <Route path="/gate-pass" element={<GatePass />} />
              <Route path="/events" element={<Events />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;