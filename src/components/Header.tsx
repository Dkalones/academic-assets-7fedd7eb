import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-lg bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-[var(--shadow-card)] group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Profa. Luana</h1>
            <p className="text-xs text-muted-foreground leading-tight">Materiais didáticos</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant={!isAdmin ? "secondary" : "ghost"} size="sm">
            <Link to="/">Materiais</Link>
          </Button>
          <Button asChild variant={isAdmin ? "secondary" : "ghost"} size="sm">
            <Link to="/admin">
              <Lock className="h-4 w-4 mr-1.5" />
              Admin
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};
