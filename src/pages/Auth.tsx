import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mountain, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/store/useApp";
import { toast } from "sonner";

const Auth = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useApp();
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast.error("Please fill in all fields");
      return;
    }
    login(email, "contributor");
    toast.success(mode === "signup" ? "Welcome to Hidden Nepal!" : "Welcome back");
    navigate("/contribute");
  };

  const quickLogin = (role: "contributor" | "admin") => {
    if (role === "admin") {
      login("admin@hiddennepal.app", "admin");
      toast.success("Signed in as admin");
      navigate("/admin");
    } else {
      login("aanya@hiddennepal.app", "contributor");
      toast.success("Signed in as contributor");
      navigate("/contribute");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-mountain">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--saffron)/0.3),transparent_50%)]" />
        <div className="relative m-auto p-12 text-primary-foreground max-w-lg">
          <div className="flex items-center gap-2 mb-12">
            <div className="h-10 w-10 rounded-lg bg-white/15 backdrop-blur grid place-items-center">
              <Mountain className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-semibold">Hidden Nepal</span>
          </div>
          <h1 className="font-display text-5xl font-semibold leading-tight text-balance">
            Help us map the Nepal you love.
          </h1>
          <p className="mt-6 text-primary-foreground/80 text-lg leading-relaxed">
            Every contributor adds another piece of the atlas. Sign up, share a place, and become part of a community that travels with care.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 pt-24 lg:pt-8">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-lg bg-gradient-mountain text-primary-foreground grid place-items-center">
              <Mountain className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">Hidden Nepal</span>
          </Link>

          <h2 className="font-display text-3xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground mt-2 mb-8">
            {mode === "login" ? "Sign in to manage your contributions." : "Start sharing the places you love."}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Shrestha" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full">
              <Mail className="h-4 w-4" /> {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground text-center">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </div>

          <div className="mt-10 rounded-xl border border-dashed border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Demo shortcuts</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => quickLogin("contributor")}>Sign in as contributor</Button>
              <Button variant="outline" size="sm" onClick={() => quickLogin("admin")}>Sign in as admin</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Mock auth — no backend yet. Connect Lovable Cloud later for real accounts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
