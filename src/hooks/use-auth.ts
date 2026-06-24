import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AuthUser = {
  id: string;
  email: string;
};

export type SessionInfo = {
  user: AuthUser | null;
  sessionId: string;
};

const AUTH_QUERY_KEY = ["auth", "me"] as const;

async function fetchSessionInfo(): Promise<SessionInfo> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Não foi possível carregar a sessão.");
  }
  const body = await response.json();
  return {
    user: body.user ?? null,
    sessionId: body.sessionId ?? "",
  };
}

export function useAuth() {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchSessionInfo,
    staleTime: 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Falha ao entrar.");
      return { user: body.user as AuthUser, sessionId: body.sessionId as string };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Falha ao criar conta.");
      return { user: body.user as AuthUser, sessionId: body.sessionId as string };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json();
      return { user: null, sessionId: body.sessionId as string };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });

  const session = sessionQuery.data;

  return {
    user: session?.user ?? null,
    sessionId: session?.sessionId ?? null,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: !!session?.user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isSubmitting:
      loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending,
  };
}
