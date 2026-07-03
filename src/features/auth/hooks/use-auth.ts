"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginInput, SignupInput } from "@/schemas/auth.schema";

/** Hydrates the auth store from the server once on mount (layout-level). */
export function useAuthHydration() {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess) setUser(query.data.user);
    if (query.isError) setUser(null);
  }, [query.isSuccess, query.isError, query.data, setUser]);

  useEffect(() => {
    if (query.isPending) setStatus("loading");
  }, [query.isPending, setStatus]);
}

export function useAuth() {
  return useAuthStore(useShallow((s) => ({ user: s.user, status: s.status })));
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(["auth", "me"], data);
      router.push("/dashboard");
    },
  });
}

export function useSignup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (input: SignupInput) => authApi.signup(input),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(["auth", "me"], data);
      router.push("/dashboard");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      router.push("/login");
    },
  });
}
