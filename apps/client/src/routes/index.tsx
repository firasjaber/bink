import { useAuthStore } from '@/stores/auth';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Link as LinkIcon, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AddLink } from '@/components/addLink';
import { linksQueryOptions } from '@/queries/linksQueryOptions';
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const [searchTerm, setSearchTerm] = useState('');

  const linksQuery = useQuery(linksQueryOptions);
  const links = linksQuery.data;

  if (linksQuery.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen container mx-auto">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <LinkIcon className="h-6 w-6" />
          <span className="text-xl font-bold">Bink</span>
        </div>
        <UserAvatar />
      </header>
      <main className="flex-1 p-4">
        <div className="flex space-x-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <AddLink />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto">
          {links?.map((link) => (
            <BookmarkCard key={link.id} bookmark={link} />
          ))}
        </div>
      </main>
    </div>
  );
}

function BookmarkCard({ bookmark }) {
  return (
    <div
      className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${bookmark.image ? 'flex flex-col' : ''}`}
    >
      {bookmark.image ? (
        <img src={bookmark.image} alt={bookmark.title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center">
          <span className="text-white text-xl font-bold">
            {bookmark.title ? bookmark.title.charAt(0) : 'Processing...'}
          </span>
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-2">
          {bookmark.title ? bookmark.title : 'Processing...'}
        </h3>
        <p className="text-sm text-gray-600 mb-4 flex-1">{bookmark.description}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">tech</Badge>
          <Badge variant="secondary">meme</Badge>
        </div>
      </div>
    </div>
  );
}

function UserAvatar() {
  const { user } = useAuthStore((state) => state);
  if (user) {
    return (
      <Link to="/profile/$id" params={{ id: user.id }}>
        <Avatar>
          <AvatarImage
            src="https://i.pinimg.com/736x/9d/4a/49/9d4a49b2b2b9392d3f844c4dbcff52d6.jpg"
            alt="@shadcn"
          />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </Link>
    );
  }
  <Link className="underline" to="/auth">
    Sign in
  </Link>;
}
