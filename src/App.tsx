import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import MyEvents from "./pages/MyEvents";
import OrganizeEvent from "./pages/OrganizeEvent";
import JudgePanel from "./pages/JudgePanel";
import DemoJudgePanel from "./pages/DemoJudgePanel";
import JudgeEventAccess from "./pages/JudgeEventAccess";
import Settings from "./pages/Settings";
import Networking from "./pages/Networking";
import Submissions from "./pages/Submissions";
import Certificates from "./pages/Certificates";
import NotFound from "./pages/NotFound";
import EventRegistration from "./components/EventRegistration";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner richColors closeButton position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="/organize-event" element={<OrganizeEvent />} />
            <Route path="/demo-judge" element={<DemoJudgePanel />} />
            <Route path="/judge-panel" element={<JudgePanel />} />
            <Route path="/judge-access" element={<JudgeEventAccess />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/networking" element={<Networking />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/events/:eventId/register" element={<EventRegistration />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
