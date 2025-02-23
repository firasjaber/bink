import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ExternalLink, Edit, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddLink } from "@/components/addLink";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { getLinks, updateLinkEmbeddings } from "@/eden";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) {
      return <div>Loading...</div>;
    }
    if (!context.auth.isLoading && !context.auth.isAuth) {
      throw redirect({
        to: "/auth",
      });
    }
  },
});

function Index() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const {
    mutateAsync: updateLinkEmbeddingsMutation,
    isPending: isUpdatingEmbeddings,
  } = useMutation({
    mutationFn: () => updateLinkEmbeddings(),
  });

  const handleSmartSearchToggle = async () => {
    if (!isSmartSearch) {
      await updateLinkEmbeddingsMutation();
    }
    setIsSmartSearch(!isSmartSearch);
    setSearchTerm("");
  };

  const linksQuery = useInfiniteQuery({
    queryKey: ["links", debouncedSearch],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      getLinks(pageParam, debouncedSearch, isSmartSearch),
    initialPageParam: null,
    getNextPageParam: (lastPage, _) => lastPage.nextCursor,
  });

  const links = linksQuery.data?.pages.flatMap((page) => page.data);

  return (
    <div className='flex flex-col container mx-auto overflow-auto max-h-[calc(100vh-73px)] mb-10'>
      <main className='flex-1 p-4'>
        <div className='flex space-x-2'>
          <div className='relative flex-1 flex items-center'>
            <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <Input
              className='pl-10'
              placeholder='Search bookmarks...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className='absolute right-2 flex items-center space-x-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center space-x-2 cursor-pointer'>
                      <div
                        className={cn(
                          " transition-colors duration-500 flex items-center space-x-2",
                          isSmartSearch ? "text-purple-500" : "text-gray-400",
                          isUpdatingEmbeddings && "animate-pulse"
                        )}
                      >
                        <Sparkles className='w-4 h-4' />
                        <span className='text-sm'>Smart Search</span>
                      </div>
                      <Switch
                        checked={isSmartSearch}
                        onCheckedChange={handleSmartSearchToggle}
                        disabled={isUpdatingEmbeddings}
                        className={`${isUpdatingEmbeddings ? "opacity-50 cursor-wait" : ""}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Smart search will use AI for context aware and similarity
                      search capabilities
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <AddLink />
        </div>
        <div className='text-sm text-gray-500 my-4'>
          {linksQuery.isLoading && "Loading..."}
          {linksQuery.data &&
            `Showing ${links?.length} out of ${linksQuery.data?.pages[0].total} bookmarks`}
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto'>
          {linksQuery.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className='w-full h-40' />
              ))
            : links?.map((link) => (
                <BookmarkCard key={link?.id} bookmark={link} />
              ))}
        </div>
        {linksQuery.hasNextPage && (
          <div className='flex justify-center mt-4'>
            <Button
              onClick={() => linksQuery.fetchNextPage()}
              disabled={linksQuery.isFetchingNextPage}
            >
              {linksQuery.isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function BookmarkCard({
  bookmark,
}: {
  bookmark: {
    title: string | null;
    image: string | null;
    url: string;
    id: string;
    description: string | null;
    tags: { name: string; color: string }[];
  };
}) {
  const isProcessing = !bookmark.title;

  return (
    <div
      className={`relative group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isProcessing ? "opacity-50 cursor-not-allowed" : ""
      } ${bookmark.image ? "flex flex-col" : ""}`}
    >
      <div className='relative'>
        {bookmark.image ? (
          <img
            src={bookmark.image}
            alt={bookmark.title || ""}
            className={`w-full h-40 object-cover ${
              !isProcessing
                ? "transition-all duration-300 group-hover:blur-sm group-hover:brightness-80 group-hover:scale-105"
                : ""
            }`}
          />
        ) : (
          <div
            className={`w-full h-40 bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center ${
              !isProcessing
                ? "transition-all duration-300 group-hover:blur-sm group-hover:brightness-80 group-hover:scale-105"
                : ""
            }`}
          >
            <span className='text-white text-xl font-bold'>
              {bookmark.title ? bookmark.title.charAt(0) : "Processing..."}
            </span>
          </div>
        )}
        {!isProcessing && (
          <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
            <Link to={bookmark.url} target='_blank'>
              <Button variant='secondary' className='mr-2' size='sm'>
                <ExternalLink className='w-4 h-4 mr-2' />
                Visit
              </Button>
            </Link>
            <Link to={`/link/${bookmark.id}`}>
              <Button variant='secondary' size='sm'>
                <Edit className='w-4 h-4 mr-2' />
                Edit
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className='p-4 flex-1 flex flex-col'>
        <h3 className='font-semibold text-lg mb-2'>
          {bookmark.title || "Processing..."}
        </h3>
        <p className='text-sm text-gray-600 mb-4 flex-1 break-words line-clamp-3'>
          {bookmark.description ? bookmark.description : bookmark.url}
        </p>
        <div className='flex flex-wrap gap-2'>
          {bookmark.tags.map((tag) => (
            <Badge
              key={tag.name}
              className={`bg-[${tag.color}] border-2 border-[${tag.color}]/80 text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center`}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
