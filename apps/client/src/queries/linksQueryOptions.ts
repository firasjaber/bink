import { getLinks } from '@/eden';
import { infiniteQueryOptions } from '@tanstack/react-query';

export const linksQueryOptions = infiniteQueryOptions({
  queryKey: ['links'],
  queryFn: ({ pageParam }: { pageParam: string | null }) => getLinks(pageParam),
  initialPageParam: null,
  getNextPageParam: (lastPage, _) => lastPage.nextCursor,
});
