import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyMembership } from "@/lib/roles.functions";

export function useMembership() {
  const fn = useServerFn(getMyMembership);
  return useQuery({
    queryKey: ["membership"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });
}
