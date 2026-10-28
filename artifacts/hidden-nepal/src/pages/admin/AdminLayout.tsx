import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { useQuery } from "@tanstack/react-query";
import { admin } from "@/lib/api";
import { LayoutDashboard, Inbox, MapPin, Users, ShieldCheck, Mountain, ArrowLeft, Tag, ClipboardList, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/submissions", label: "Submissions", icon: Inbox },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/places", label: "Places", icon: MapPin },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/activity", label: "Activity Log", icon: ClipboardList },
];

const AdminLayout = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const isAdminOrMod = currentUser?.roles?.some((r) => r === "admin" || r === "moderator") ?? false;

  useEffect(() => {
    if (currentUser === null) {
      navigate("/auth");
      return;
    }
    if (currentUser !== undefined && !isAdminOrMod) {
      navigate("/");
    }
  }, [currentUser, isAdminOrMod, navigate]);

  const { data: pendingSubmissions } = useQuery({
    queryKey: ["admin-submissions", "pending"],
    queryFn: () => admin.submissions("pending"),
    enabled: isAdminOrMod,
    staleTime: 30_000,
  });

  if (!currentUser || !isAdminOrMod) return null;

  const pending = pendingSubmissions?.length ?? 0;

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border flex flex-col transition-all",
        open ? "w-60" : "w-16"
      )}>
        <div className="h-16 flex items-center px-3 border-b border-sidebar-border gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 rounded-lg bg-gradient-mountain text-primary-foreground grid place-items-center shrink-0"
            aria-label="Toggle sidebar"
          >
            <Mountain className="h-5 w-5" />
          </button>
          {open && (
            <div className="leading-tight overflow-hidden">
              <div className="font-display font-semibold text-sm truncate">Hidden Nepal</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Admin
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {adminLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              )}
            >
              <l.icon className="h-4 w-4 shrink-0" />
              {open && <span className="flex-1">{l.label}</span>}
              {open && l.to === "/admin/submissions" && pending > 0 && (
                <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-semibold">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border">
          <Link
            to="/"
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 transition")}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {open && <span>Back to site</span>}
          </Link>
          {open && (
            <div className="mt-3 px-3 py-2 rounded-md bg-sidebar-accent/40">
              <div className="text-xs font-medium truncate">{currentUser.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{currentUser.roles?.join(", ")}</div>
            </div>
          )}
        </div>
      </aside>

      <div className={cn("flex-1 transition-all", open ? "ml-60" : "ml-16")}>
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
