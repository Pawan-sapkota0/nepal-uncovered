import { Link, NavLink as RRNavLink, useLocation, useNavigate } from "react-router-dom";
import { Mountain, Menu, Search, Sun, Moon, User as UserIcon, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useApp } from "@/store/useApp";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/explore", label: "Explore" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About" },
];

export function Navbar() {
  const { currentUser, logout, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = isHome && !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        transparent ? "bg-transparent" : "glass border-b border-border/60"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-mountain text-primary-foreground shadow-soft transition-transform group-hover:scale-105",
          )}>
            <Mountain className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className={cn("font-display text-lg font-semibold", transparent && "text-primary-foreground drop-shadow-sm")}>
              Hidden Nepal
            </div>
            <div className={cn("text-[10px] uppercase tracking-[0.18em]", transparent ? "text-primary-foreground/70" : "text-muted-foreground")}>
              Discover beyond the obvious
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <RRNavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  transparent
                    ? "text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/10"
                    : "text-foreground/80 hover:text-foreground hover:bg-muted",
                  isActive && (transparent ? "text-primary-foreground bg-white/15" : "text-foreground bg-muted")
                )
              }
            >
              {l.label}
            </RRNavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/explore")}
            className={cn(transparent && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}
            aria-label="Search places"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn("hidden sm:inline-flex", transparent && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={cn("gap-2", transparent && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}>
                  <div className="h-7 w-7 rounded-full bg-gradient-sunset text-accent-foreground grid place-items-center text-xs font-semibold">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline text-sm">{currentUser.name.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{currentUser.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/contribute")}>
                  <LayoutDashboard className="h-4 w-4 mr-2" /> My contributions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/contribute/new")}>
                  <UserIcon className="h-4 w-4 mr-2" /> Add a place
                </DropdownMenuItem>
                {(currentUser.role === "admin" || currentUser.role === "moderator") && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Admin dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
                className={cn(transparent && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}
              >
                Login
              </Button>
              <Button variant="hero" size="sm" onClick={() => navigate("/auth?mode=signup")}>
                Contribute
              </Button>
            </div>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("md:hidden", transparent && "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-1">
                {links.map((l) => (
                  <RRNavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      cn(
                        "px-3 py-3 rounded-md text-base font-medium",
                        isActive ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted"
                      )
                    }
                  >
                    {l.label}
                  </RRNavLink>
                ))}
                <div className="h-px bg-border my-3" />
                {currentUser ? (
                  <>
                    <RRNavLink to="/contribute" className="px-3 py-3 rounded-md text-base hover:bg-muted">My contributions</RRNavLink>
                    <RRNavLink to="/contribute/new" className="px-3 py-3 rounded-md text-base hover:bg-muted">Add a place</RRNavLink>
                    {(currentUser.role === "admin" || currentUser.role === "moderator") && (
                      <RRNavLink to="/admin" className="px-3 py-3 rounded-md text-base hover:bg-muted">Admin</RRNavLink>
                    )}
                    <Button variant="outline" onClick={logout} className="mt-2">Sign out</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate("/auth")}>Login</Button>
                    <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>Contribute</Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
