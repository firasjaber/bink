import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ExternalLink, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddLink } from "@/components/addLink";
import { linksQueryOptions } from "@/queries/linksQueryOptions";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

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

  const linksQuery = useQuery({ ...linksQueryOptions, refetchInterval: 2000 });
  const links = linksQuery.data;

  if (linksQuery.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className='flex flex-col container mx-auto overflow-auto max-h-[calc(100vh-73px)]'>
      <main className='flex-1 p-4'>
        <div className='flex space-x-2 mb-6'>
          <div className='relative flex-1'>
            <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <Input
              className='pl-10'
              placeholder='Search bookmarks...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <AddLink />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto'>
          {links?.map((link) => <BookmarkCard key={link.id} bookmark={link} />)}
        </div>
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
        <p className='text-sm text-gray-600 mb-4 flex-1 break-words'>
          {bookmark.description ? bookmark.description : bookmark.url}
        </p>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='secondary'>tech</Badge>
          <Badge variant='secondary'>meme</Badge>
        </div>
      </div>
    </div>
  );
}
