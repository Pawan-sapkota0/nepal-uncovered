import { Link } from "react-router-dom";
import { Mountain, Github, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-gradient-warm mt-24">
      <div className="container py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-mountain text-primary-foreground grid place-items-center">
              <Mountain className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-semibold">Hidden Nepal</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
            A community-curated atlas of Nepal's most beautiful, lesser-known places — built so the next traveller arrives prepared, respectful and inspired.
          </p>
          <p className="mt-4 font-display italic text-sm text-foreground/70">
            "Discover Nepal beyond the obvious."
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/explore" className="hover:text-foreground">All places</Link></li>
            <li><Link to="/categories" className="hover:text-foreground">Categories</Link></li>
            <li><Link to="/explore?hidden=true" className="hover:text-foreground">Hidden gems</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Contribute</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth?mode=signup" className="hover:text-foreground">Become a contributor</Link></li>
            <li><Link to="/contribute/new" className="hover:text-foreground">Submit a place</Link></li>
            <li><Link to="/contribute" className="hover:text-foreground">My submissions</Link></li>
          </ul>
          <div className="flex items-center gap-3 mt-5 text-muted-foreground">
            <a href="#" aria-label="Twitter" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="hover:text-foreground"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="GitHub" className="hover:text-foreground"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Hidden Nepal. Made with care in the Himalaya.</span>
          <span>All imagery for demo use.</span>
        </div>
      </div>
    </footer>
  );
}
