import { AddLink } from '@/components/addLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FullScreenLoading } from '@/components/ui/full-screen-loading';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAllUserTags, getLinks, updateLinkEmbeddings } from '@/eden';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  ExternalLink,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/')({
  component: Index,
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) {
      return <FullScreenLoading />;
    }
    if (!context.auth.isLoading && !context.auth.isAuth) {
      throw redirect({
        to: '/auth',
      });
    }
  },
});

function Index() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [hasInitializedTags, setHasInitializedTags] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { mutateAsync: updateLinkEmbeddingsMutation, isPending: isUpdatingEmbeddings } =
    useMutation({
      mutationFn: () => updateLinkEmbeddings(),
    });

  const { data: allTags, isLoading: isLoadingTags } = useQuery({
    queryKey: ['userTags'],
    queryFn: () => getAllUserTags(),
  });

  // Initialize with all tags selected when tags are loaded
  useEffect(() => {
    if (allTags && !hasInitializedTags) {
      setSelectedTagIds(new Set(allTags.map((tag) => tag.id)));
      setHasInitializedTags(true);
    }
  }, [allTags, hasInitializedTags]);

  const handleSmartSearchToggle = async () => {
    if (!isSmartSearch) {
      await updateLinkEmbeddingsMutation();
    }
    setIsSmartSearch(!isSmartSearch);
    setSearchTerm('');
  };

  const handleTagToggle = (tagId: string) => {
    const newSelectedTags = new Set(selectedTagIds);
    if (newSelectedTags.has(tagId)) {
      newSelectedTags.delete(tagId);
    } else {
      newSelectedTags.add(tagId);
    }
    setSelectedTagIds(newSelectedTags);
  };

  const handleSelectAllTags = () => {
    if (allTags) {
      setSelectedTagIds(new Set(allTags.map((tag) => tag.id)));
    }
  };

  const handleClearAllTags = () => {
    setSelectedTagIds(new Set());
  };

  // Determine what to pass as tagIds based on selection
  const getTagIdsForQuery = () => {
    if (!allTags) return undefined;

    const allTagIds = new Set(allTags.map((tag) => tag.id));
    const isAllSelected =
      allTagIds.size === selectedTagIds.size &&
      Array.from(allTagIds).every((id) => selectedTagIds.has(id));

    if (isAllSelected) {
      // All tags selected - don't filter by tags (return undefined)
      return undefined;
    } else if (selectedTagIds.size === 0) {
      // No tags selected - use special indicator for "no tags"
      return ['__NO_TAGS__'];
    } else {
      // Some tags selected
      return Array.from(selectedTagIds);
    }
  };

  // Generate button text based on selection
  const getButtonText = () => {
    if (!allTags) return 'Search across all tags';

    const allTagIds = new Set(allTags.map((tag) => tag.id));
    const isAllSelected =
      allTagIds.size === selectedTagIds.size &&
      Array.from(allTagIds).every((id) => selectedTagIds.has(id));

    if (isAllSelected) {
      return 'Search across all tags';
    } else if (selectedTagIds.size === 0) {
      return 'No tags selected';
    } else {
      return `${selectedTagIds.size} tag${selectedTagIds.size !== 1 ? 's' : ''} selected`;
    }
  };

  const tagIdsForQuery = getTagIdsForQuery();

  const linksQuery = useInfiniteQuery({
    queryKey: ['links', debouncedSearch, isSmartSearch, Array.from(selectedTagIds)],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      getLinks(pageParam, debouncedSearch, isSmartSearch, tagIdsForQuery),
    initialPageParam: null,
    getNextPageParam: (lastPage, _) => lastPage.nextCursor,
  });

  const links = linksQuery.data?.pages.flatMap((page) => page.data);

  return (
    <div className="flex flex-col container mx-auto overflow-auto max-h-[calc(100vh-73px)] mb-10 px-1 sm:px-[2rem]">
      <main className="flex-1 p-4">
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <div className="relative w-full sm:flex-1 flex items-center">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute right-2 flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <div
                        className={cn(
                          ' transition-colors duration-500 flex items-center space-x-2',
                          isSmartSearch ? 'text-purple-500' : 'text-gray-400',
                          isUpdatingEmbeddings && 'animate-pulse',
                        )}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm">Smart Search</span>
                      </div>
                      <Switch
                        checked={isSmartSearch}
                        onCheckedChange={handleSmartSearchToggle}
                        disabled={isUpdatingEmbeddings}
                        className={`${isUpdatingEmbeddings ? 'opacity-50 cursor-wait' : ''}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Smart search will use AI for context aware and similarity search capabilities
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <AddLink />
        </div>

        {/* Tag Filter Section */}
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="text-sm text-gray-500 hover:text-gray-700 p-0 h-auto font-normal"
          >
            {getButtonText()}
            {showTagFilter ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>

          {showTagFilter && (
            <div className="mt-3 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Filter by tags</h3>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllTags}
                    className="text-xs h-6 px-2"
                  >
                    Select all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllTags}
                    className="text-xs h-6 px-2"
                  >
                    Clear all
                  </Button>
                </div>
              </div>

              {isLoadingTags ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-6 w-16" />
                  ))}
                </div>
              ) : allTags && allTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTagIds.has(tag.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTagToggle(tag.id)}
                      className={cn(
                        'h-6 px-2 text-xs transition-all duration-200',
                        selectedTagIds.has(tag.id)
                          ? `bg-[${tag.color}] hover:bg-[${tag.color}]/80 text-white border-[${tag.color}]`
                          : `border-[${tag.color}] text-[${tag.color}] hover:bg-[${tag.color}]/10`,
                      )}
                    >
                      {selectedTagIds.has(tag.id) && <Check className="w-3 h-3 mr-1" />}
                      {tag.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No tags available</p>
              )}

              {selectedTagIds.size > 0 && selectedTagIds.size < (allTags?.length || 0) && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {selectedTagIds.size} tag{selectedTagIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllTags}
                      className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 my-4">
          {linksQuery.isLoading && 'Loading...'}
          {linksQuery.data &&
            `Showing ${links?.length} out of ${linksQuery.data?.pages[0].total} bookmarks`}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto">
          {linksQuery.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="w-full h-40" />
              ))
            : links?.map((link) => (link ? <BookmarkCard key={link.id} bookmark={link} /> : null))}
        </div>
        {linksQuery.hasNextPage && (
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => linksQuery.fetchNextPage()}
              disabled={linksQuery.isFetchingNextPage}
            >
              {linksQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
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
    state?: 'processing' | 'processed' | 'failed';
  };
}) {
  const isProcessing = !bookmark.title;

  return (
    <div
      className={`relative group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isProcessing ? 'opacity-50 cursor-not-allowed' : ''
      } ${bookmark.image ? 'flex flex-col' : ''}`}
    >
      <div className="relative">
        {bookmark.image ? (
          <img
            src={bookmark.image}
            alt={bookmark.title || ''}
            className={`w-full h-40 object-cover ${
              !isProcessing
                ? 'transition-all duration-300 group-hover:blur-sm group-hover:brightness-80 group-hover:scale-105'
                : ''
            }`}
          />
        ) : (
          <div
            className={`w-full h-40 bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center ${
              !isProcessing
                ? 'transition-all duration-300 group-hover:blur-sm group-hover:brightness-80 group-hover:scale-105'
                : ''
            }`}
          >
            <span className="text-white text-xl font-bold">
              {bookmark.title ? bookmark.title.charAt(0) : 'Processing...'}
            </span>
          </div>
        )}
        {!isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Link to={bookmark.url} target="_blank">
              <Button variant="secondary" className="mr-2" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </Link>
            <Link to="/link/$id" params={{ id: bookmark.id }}>
              <Button variant="secondary" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-2">{bookmark.title || 'Processing...'}</h3>
        <p className="text-sm text-gray-600 mb-4 flex-1 break-words line-clamp-3 max-h-16">
          {bookmark.description ? bookmark.description : bookmark.url}
        </p>
        <div className="flex flex-wrap gap-2">
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
