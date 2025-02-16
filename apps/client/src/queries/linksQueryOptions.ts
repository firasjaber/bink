import { infiniteQueryOptions } from "@tanstack/react-query";
import { getLinks } from "@/eden";

export const linksQueryOptions = infiniteQueryOptions({
  queryKey: ["links"],
  queryFn: ({ pageParam }: { pageParam: string | null }) => getLinks(pageParam),
  initialPageParam: null,
  getNextPageParam: (lastPage, _) => lastPage.nextCursor,
});
