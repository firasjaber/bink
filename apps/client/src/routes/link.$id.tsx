import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import {
  Pencil,
  Plus,
  X,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Save,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { getLink } from "../eden";

export const Route = createFileRoute("/link/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["link", id],
    queryFn: () => getLink(id),
  });
  console.log(id);
  console.log(data);

  const [title, setTitle] = useState("Example Bookmark Title");
  const [description, setDescription] = useState(
    "This is a sample description for the bookmarked link."
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [selectedTags, setSelectedTags] = useState(["React", "JavaScript"]);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [ogImage, setOgImage] = useState(
    "/placeholder.svg?height=200&width=300"
  );
  const [editingImage, setEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [url, setUrl] = useState("https://example.com");
  const [editingUrl, setEditingUrl] = useState(false);

  const allTags = [
    "React",
    "JavaScript",
    "CSS",
    "HTML",
    "TypeScript",
    "Node.js",
    "Next.js",
  ];

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags((prev) => [...prev, newTag]);
      setNewTag("");
    }
  };

  const handleImageUpdate = () => {
    if (newImageUrl) {
      setOgImage(newImageUrl);
      setNewImageUrl("");
      setEditingImage(false);
    }
  };

  // const handleSave = () => {
  //   toast({
  //     title: "Changes saved",
  //     description: "Your bookmark has been updated successfully.",
  //   });
  // };

  // const handleDelete = () => {
  //   toast({
  //     title: "Bookmark deleted",
  //     description: "Your bookmark has been removed.",
  //     variant: "destructive",
  //   });
  // };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className='mx-auto p-4 sm:p-6 container sm:px-12'>
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='icon'>
          <ArrowLeft className='w-4 h-4' />
        </Button>
        <span className='text-lg font-semibold'>Edit Bookmark</span>
      </div>
      <div className='flex flex-col md:flex-row gap-6 md:gap-8 mt-2 sm:mt-6'>
        <div className='flex-grow space-y-2'>
          {editingTitle ? (
            <Input
              value={data.title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              className='text-xl sm:text-2xl font-bold'
              autoFocus
            />
          ) : (
            <div className='flex items-center justify-between'>
              <h1 className='text-xl sm:text-2xl font-bold break-words'>
                {data.title}
              </h1>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setEditingTitle(true)}
              >
                <Pencil className='h-4 w-4' />
                <span className='sr-only'>Edit title</span>
              </Button>
            </div>
          )}

          {editingUrl ? (
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
              <Input
                value={data.url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setEditingUrl(false)}
                className='flex-grow'
                autoFocus
              />
            </div>
          ) : (
            <div className='flex items-center justify-between text-sm '>
              <a
                href={data.url}
                target='_blank'
                rel='noopener noreferrer'
                className='hover:underline break-all text-muted-foreground'
              >
                {data.url}
              </a>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setEditingUrl(true)}
              >
                <Pencil className='h-4 w-4 flex-shrink-0' />
                <span className='sr-only'>Edit URL</span>
              </Button>
            </div>
          )}

          {editingDescription ? (
            <Textarea
              value={data.description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setEditingDescription(false)}
              className='w-full'
              rows={3}
              autoFocus
            />
          ) : (
            <div className='flex items-start justify-between'>
              <p className='text-gray-600 break-words'>{data.description}</p>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setEditingDescription(true)}
              >
                <Pencil className='h-4 w-4 flex-shrink-0' />
                <span className='sr-only'>Edit description</span>
              </Button>
            </div>
          )}

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Tags</h2>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setEditingTags(!editingTags)}
              >
                {editingTags ? "Done" : "Edit Tags"}
              </Button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {selectedTags.length === 0 && (
                <span className='text-muted-foreground'>No tags</span>
              )}
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className='bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center'
                >
                  {tag}
                  {editingTags && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-4 w-4 ml-1'
                      onClick={() => handleTagToggle(tag)}
                    >
                      <X className='h-3 w-3' />
                      <span className='sr-only'>Remove tag</span>
                    </Button>
                  )}
                </span>
              ))}
              {editingTags && (
                <>
                  {allTags
                    .filter((tag) => !selectedTags.includes(tag))
                    .map((tag) => (
                      <Button
                        key={tag}
                        variant='outline'
                        size='sm'
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  <div className='flex items-center w-full sm:w-auto'>
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder='New tag'
                      className='w-full sm:w-24 h-8 text-sm'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={handleAddNewTag}
                    >
                      <Plus className='h-4 w-4' />
                      <span className='sr-only'>Add new tag</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className='md:w-1/4 flex-shrink-0 space-y-2'>
          <div className='aspect-video w-full bg-gray-200 rounded-lg overflow-hidden relative group'>
            <img
              src={data.image}
              alt='OG Image'
              className='w-full h-full object-cover'
            />
            <Button
              variant='secondary'
              size='icon'
              className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'
              onClick={() => setEditingImage(true)}
            >
              <Pencil className='h-4 w-4' />
              <span className='sr-only'>Edit image</span>
            </Button>
          </div>
          {editingImage && (
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder='Enter new image URL'
                className='flex-grow'
              />
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' onClick={handleImageUpdate}>
                  Update
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setEditingImage(false)}
                >
                  <X className='h-4 w-4' />
                  <span className='sr-only'>Cancel</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='border-t pt-2 mt-6'>
        <h2 className='text-lg font-semibold mb-4'>Notes</h2>
        <div className='bg-gray-100 p-4 rounded-lg text-gray-500 text-center'>
          Coming soon...
        </div>
      </div>

      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6'>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='default'
            onClick={() => {
              console.log("save");
            }}
          >
            <Save className='w-4 h-4 mr-2' />
            Save Changes
          </Button>
          <Button variant='outline' asChild>
            <a href={url} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='w-4 h-4 mr-2' />
              Visit
            </a>
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='destructive'>
              <Trash2 className='w-4 h-4 mr-2' />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className='sm:max-w-[425px]'>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this bookmark?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                bookmark.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='sm:justify-start'>
              <Button
                variant='outline'
                onClick={() => {
                  console.log("cancel");
                }}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={() => {
                  console.log("delete");
                }}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
