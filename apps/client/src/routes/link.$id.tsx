import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  X,
  ExternalLink,
  Trash2,
  Save,
  ArrowLeft,
  EarthIcon,
  Check,
  Loader2,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteLink, getLink, updateLink } from "../eden";
import { toast, Toaster } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/link/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["link", id],
    queryFn: () => getLink(id),
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [selectedTags, setSelectedTags] = useState(["React", "JavaScript"]);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [editingImage, setEditingImage] = useState(false);
  const [url, setUrl] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);

  useEffect(() => {
    if (data) {
      setTitle(data?.title || "");
      setDescription(data?.description || "");
      setOgImage(data?.image || "");
      setUrl(data?.url || "");
    }
  }, [data]);

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

  const dataIsUpdated =
    title !== data?.title ||
    description !== data?.description ||
    ogImage !== data?.image ||
    url !== data?.url;

  const handleDelete = useMutation({
    mutationFn: () => deleteLink(id),
    onSuccess: () => {
      setDeleteModalOpen(false);
      toast.success("Bookmark deleted");
      navigate({ to: "/" });
    },
    onError: (error) => {
      setDeleteModalOpen(false);
      toast.error(error.message);
    },
  });

  const handleUpdate = useMutation({
    mutationFn: () =>
      updateLink(id, { title, description, image: ogImage, url }),
    onSuccess: () => {
      toast.success("Bookmark updated");
      queryClient.invalidateQueries({ queryKey: ["link", id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading || !data) {
    return <div>Loading...</div>;
  }

  return (
    <div className='mx-auto p-4 sm:p-6 container sm:px-12'>
      <Toaster richColors />
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className='w-4 h-4' />
        </Button>
        {editingTitle ? (
          <Input
            value={title || ""}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            className='text-xl sm:text-2xl font-bold'
            autoFocus
          />
        ) : (
          <div className='flex items-center justify-between space-x-2'>
            <h1 className='text-xl sm:text-2xl font-bold break-words'>
              {title || "Untitled"}
            </h1>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setEditingTitle(true)}
            >
              <Pencil
                className={cn(
                  "h-4 w-4",
                  data?.title !== title
                    ? "text-orange-400"
                    : "text-muted-foreground"
                )}
              />
              <span className='sr-only'>Edit title</span>
            </Button>
          </div>
        )}
      </div>
      <div className='flex flex-col md:flex-row gap-6 md:gap-8 mt-2'>
        <div className='flex-grow space-y-2'>
          {editingUrl ? (
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setEditingUrl(false)}
                className='flex-grow'
                autoFocus
              />
            </div>
          ) : (
            <div className='flex items-center justify-between text-sm'>
              <div className='flex items-center gap-2'>
                <EarthIcon className='w-4 h-4' />
                <a
                  href={url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hover:underline break-all text-muted-foreground flex-grow'
                >
                  {url}
                </a>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setEditingUrl(true)}
              >
                <Pencil
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    data?.url !== url
                      ? "text-orange-400"
                      : "text-muted-foreground"
                  )}
                />
                <span className='sr-only'>Edit URL</span>
              </Button>
            </div>
          )}

          {editingDescription ? (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setEditingDescription(false)}
              className='w-full'
              rows={3}
              autoFocus
            />
          ) : (
            <div className='flex items-start justify-between'>
              <p className='text-gray-600 break-words'>{description}</p>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='w-10!'
                  onClick={() => setEditingDescription(true)}
                >
                  <Pencil
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      data?.description !== description
                        ? "text-orange-400"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className='sr-only'>Edit description</span>
                </Button>
              </div>
            </div>
          )}

          <div className='space-y-2'>
            <div className='flex items-center space-x-2'>
              <h2 className='text-lg font-semibold'>Tags</h2>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setEditingTags(!editingTags)}
              >
                {editingTags ? (
                  <Check className='w-4 h-4' />
                ) : (
                  <Pencil className='w-4 h-4' />
                )}
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
              src={ogImage}
              alt='OG Image'
              className='w-full h-full object-cover'
            />
            <Button
              variant='secondary'
              size='icon'
              className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'
              onClick={() => setEditingImage(true)}
            >
              <Pencil
                className={cn(
                  "h-4 w-4",
                  data?.image !== ogImage
                    ? "text-orange-400"
                    : "text-muted-foreground"
                )}
              />
              <span className='sr-only'>Edit image</span>
            </Button>
          </div>
          {editingImage && (
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
              <Input
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder='Enter new image URL'
                onBlur={() => setEditingImage(false)}
                className='flex-grow'
                autoFocus
              />
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
              handleUpdate.mutate();
            }}
            disabled={!dataIsUpdated || handleUpdate.isPending}
          >
            {handleUpdate.isPending ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Save className='w-4 h-4 mr-2' />
            )}
            {handleUpdate.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant='outline' asChild>
            <a href={url} target='_blank' rel='noopener noreferrer'>
              <ExternalLink className='w-4 h-4 mr-2' />
              Visit
            </a>
          </Button>
        </div>
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogTrigger asChild>
            <Button variant='destructive'>
              <Trash2 className='w-4 h-4 mr-2' />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className='sm:max-w-[425px]'>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bookmark</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this bookmark?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='sm:justify-end'>
              <Button
                variant='outline'
                onClick={() => {
                  setDeleteModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={() => {
                  handleDelete.mutate();
                }}
                disabled={handleDelete.isPending}
              >
                {handleDelete.isPending ? (
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                ) : (
                  "Delete"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
