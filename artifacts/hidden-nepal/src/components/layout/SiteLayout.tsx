import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export default function SiteLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 ${isHome ? "" : "pt-16"}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
