import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  /** Alinhado à barra de ferramentas, ao lado de Apresentar. */
  toolbar?: boolean;
  /** Cartão no painel mobile, ao lado de Apresentar. */
  panel?: boolean;
  className?: string;
};

export function AuthMenu({ compact = false, toolbar = false, panel = false, className }: Props) {
  const { user, isLoading, logout, isSubmitting } = useAuth();

  if (isLoading) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {compact ? "…" : "Carregando…"}
      </span>
    );
  }

  if (!user) {
    if (panel) {
      return (
        <Button
          variant="outline"
          className={cn(
            "h-auto min-h-[52px] w-full justify-start gap-2 rounded-xl border bg-card px-3 py-3.5 text-left text-sm font-medium hover:bg-foreground/5",
            className,
          )}
          asChild
        >
          <Link to="/login" title="Entre para acessar a sessão com seus slides salvos">
            <LogIn className="h-5 w-5 shrink-0 text-primary" />
            Entrar
          </Link>
        </Button>
      );
    }

    if (toolbar) {
      return (
        <Button variant="outline" size="default" className={cn("h-9 gap-1.5", className)} asChild>
          <Link to="/login" title="Entre para acessar a sessão com seus slides salvos">
            <LogIn className="h-4 w-4" />
            Entrar
          </Link>
        </Button>
      );
    }

    if (compact) {
      return (
        <Button variant="outline" size="sm" className={cn("h-9 gap-1 px-2.5", className)} asChild>
          <Link to="/login" title="Entrar na sua sessão">
            <LogIn className="h-4 w-4" />
            <span className="text-xs">Entrar</span>
          </Link>
        </Button>
      );
    }

    return (
      <Button variant="outline" size="default" className={className} asChild>
        <Link to="/login">
          <LogIn className="h-4 w-4" />
          Entrar
        </Link>
      </Button>
    );
  }

  const handleLogout = () => {
    logout().catch(() => undefined);
  };

  if (compact || toolbar) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <span
          className="hidden max-w-[88px] truncate text-[10px] text-muted-foreground sm:inline"
          title={user.email}
        >
          {user.email}
        </span>
        <Button
          variant="outline"
          size={toolbar ? "default" : "sm"}
          className={cn(toolbar ? "h-9 gap-1.5" : "h-9 gap-1 px-2.5")}
          onClick={handleLogout}
          disabled={isSubmitting}
          title="Sair da sessão"
        >
          <User className="h-4 w-4" />
          {toolbar ? "Sair" : <span className="text-xs">Sair</span>}
        </Button>
      </div>
    );
  }

  if (panel) {
    return (
      <Button
        variant="outline"
        className={cn(
          "h-auto min-h-[52px] w-full justify-start gap-2 rounded-xl border bg-card px-3 py-3.5 text-left text-sm font-medium hover:bg-foreground/5",
          className,
        )}
        onClick={handleLogout}
        disabled={isSubmitting}
        title={`Sair da sessão (${user.email})`}
      >
        <User className="h-5 w-5 shrink-0 text-primary" />
        <span className="truncate">Sair</span>
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground lg:inline">
        {user.email}
      </span>
      <Button variant="outline" size="sm" onClick={handleLogout} disabled={isSubmitting}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}
