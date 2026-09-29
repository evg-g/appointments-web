import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { api } from "../client";
import { unwrap } from "../http";
import { queryKeys } from "../query-keys";
import type { UserCreate, UserOut } from "../types";

export function useUser(id: string): UseQueryResult<UserOut, unknown> {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    enabled: id !== "",
    queryFn: async () =>
      unwrap(await api.GET("/api/v1/users/{user_id}", { params: { path: { user_id: id } } })),
  });
}

/** Create a user account. Used by admin flows that need a user to attach a clinician to. */
export function useCreateUser() {
  return useMutation<UserOut, unknown, UserCreate>({
    mutationFn: async (body) => unwrap(await api.POST("/api/v1/users", { body })),
  });
}
