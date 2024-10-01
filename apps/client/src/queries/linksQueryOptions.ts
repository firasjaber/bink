import { queryOptions } from '@tanstack/react-query';
import { getLinks } from '@/eden';

export const linksQueryOptions = queryOptions({
  queryKey: ['links'],
  queryFn: () => getLinks(),
});
