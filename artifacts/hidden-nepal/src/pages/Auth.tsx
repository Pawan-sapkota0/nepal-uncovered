import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mountain, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/useAuth";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

const Auth = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email, password, name);
        toast.success("Welcome to Hidden Nepal!");
        navigate("/contribute");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
        const returnTo = params.get("returnTo") ?? "/contribute";
        navigate(returnTo);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "invalid_credentials") toast.error("Invalid email or password");
        else if (err.code === "email_taken") toast.error("Email already registered — try logging in");
        else if (err.code === "account_disabled") toast.error("This account has been disabled");
        else toast.error(err.message ?? "Something went wrong");
      } else {
        toast.error("Cannot reach the server. Please try again.");
      }
    } finally {
      setLoading(false);
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
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Shrestha" disabled={loading} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {mode === "login" ? "Sign in" : "Create account"}
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

        </div>
      </div>
    </div>
  );
};

export default Auth;
