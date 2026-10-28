import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp } from "@/store/useApp";
import { useAuth } from "@/store/useAuth";
import SiteLayout from "@/components/layout/SiteLayout";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import PlaceDetail from "./pages/PlaceDetail";
import Categories from "./pages/Categories";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Contribute from "./pages/Contribute";
import AddPlace from "./pages/AddPlace";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import Submissions from "./pages/admin/Submissions";
import PlacesAdmin from "./pages/admin/PlacesAdmin";
import CategoriesAdmin from "./pages/admin/CategoriesAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import ActivityLog from "./pages/admin/ActivityLog";
import ReviewsAdmin from "./pages/admin/ReviewsAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const ThemeBoot = () => {
  const theme = useApp((s) => s.theme);
  const loadMe = useAuth((s) => s.loadMe);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => {
    loadMe();
  }, [loadMe]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
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
            <Route path="/trips" element={<Trips />} />
            <Route path="/trips/:id" element={<TripDetail />} />
          </Route>
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="submissions" element={<Submissions />} />
            <Route path="places" element={<PlacesAdmin />} />
            <Route path="categories" element={<CategoriesAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
