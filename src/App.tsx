import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp } from "@/store/useApp";
import SiteLayout from "@/components/layout/SiteLayout";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import PlaceDetail from "./pages/PlaceDetail";
import Categories from "./pages/Categories";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Contribute from "./pages/Contribute";
import AddPlace from "./pages/AddPlace";
import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import Submissions from "./pages/admin/Submissions";
import PlacesAdmin from "./pages/admin/PlacesAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ThemeBoot = () => {
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeBoot />
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/place/:slug" element={<PlaceDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/about" element={<About />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/contribute/new" element={<AddPlace />} />
          </Route>
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="submissions" element={<Submissions />} />
            <Route path="places" element={<PlacesAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
