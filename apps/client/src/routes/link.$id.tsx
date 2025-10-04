import NoteEditor from '@/components/editor/Editor';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn, debounce } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowLeft,
  Check,
  EarthIcon,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { JSONContent } from 'novel';
import { useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { deleteLink, getLink, getLinkTags, updateLink, updateLinkTags } from '../eden';

export const Route = createFileRoute('/link/$id')({
  component: Page,
});

const tagColors = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
];

// Default notes state when no notes exist
const DEFAULT_NOTES: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Add your note here, type / to see commands' }],
    },
  ],
};

function Page() {
  useEffect(() => {
    document.title = 'Bink - Edit Link';
  }, []);

  const { id } = Route.useParams();
  const navigate = Route.useNavigate();

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['link', id],
    queryFn: () => getLink(id),
  });

  const { data: tags } = useQuery({
    queryKey: ['linkTags', id],
    queryFn: () => getLinkTags(id),
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [selectedTags, setSelectedTags] = useState<
    Map<string, { id: string; name: string; color: string; isSystem: boolean }>
  >(new Map());
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [editingImage, setEditingImage] = useState(false);
  const [url, setUrl] = useState('');
  const [editingUrl, setEditingUrl] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  const colorPickerRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes] = useState<JSONContent | undefined>(undefined);

  useEffect(() => {
    if (data) {
      setTitle(data?.title || '');
      setDescription(data?.description || '');
      setOgImage(data?.image || '');
      setUrl(data?.url || '');
      if (data.notes) {
        setNotes(data.notes);
      } else {
        setNotes(DEFAULT_NOTES);
      }
    }
  }, [data]);

  useEffect(() => {
    if (tags && tags.linkTags.length > 0) {
      const tagMap = new Map(tags.linkTags.map((tag) => [tag.id, tag]));
      setSelectedTags(tagMap);
    }
  }, [tags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showColorPicker]);

  const handleTagToggle = (tag: {
    id: string;
    name: string;
    color: string;
    isSystem: boolean;
  }) => {
    setSelectedTags((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(tag.id)) {
        newMap.delete(tag.id);
      } else {
        newMap.set(tag.id, tag);
      }
      return newMap;
    });
  };

  const handleAddNewTag = () => {
    if (newTag && !Array.from(selectedTags.values()).some((t) => t.name === newTag)) {
      const newTagObj = {
        id: `new-${newTag}`,
        name: newTag,
        color: selectedColor,
        isSystem: false,
      };
      setSelectedTags((prev) => new Map(prev).set(newTagObj.id, newTagObj));
      setNewTag('');
      setSelectedColor('#3B82F6');
      setShowColorPicker(false);
    }
  };

  // Update the comparison to handle undefined notes
  const dataIsUpdated =
    title !== data?.title ||
    description !== data?.description ||
    ogImage !== data?.image ||
    url !== data?.url ||
    JSON.stringify(notes) !== JSON.stringify(data?.notes || DEFAULT_NOTES);

  const tagsUpdated = () => {
    const currentTagIds = new Set(Array.from(selectedTags.keys()));
    const originalTagIds = new Set(tags?.linkTags.map((tag) => tag.id));

    if (currentTagIds.size !== originalTagIds.size) return true;
    return Array.from(currentTagIds).some((id) => !originalTagIds.has(id));
  };

  const handleDelete = useMutation({
    mutationFn: () => deleteLink(id),
    onSuccess: () => {
      setDeleteModalOpen(false);
      toast.success('Bookmark deleted');
      navigate({ to: '/' });
    },
    onError: (error) => {
      setDeleteModalOpen(false);
      toast.error(error.message);
    },
  });

  const handleUpdate = useMutation({
    mutationFn: () =>
      updateLink(id, {
        title,
        description,
        image: ogImage,
        url,
        notes,
      }),
    onSuccess: () => {
      toast.success('Bookmark updated');
      queryClient.invalidateQueries({ queryKey: ['link', id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpdateTags = useMutation({
    mutationFn: () =>
      updateLinkTags(id, {
        tags: Array.from(selectedTags.values()).map((tag) => ({
          id: tag.id.startsWith('new-') ? undefined : tag.id,
          name: tag.name,
          color: tag.color,
        })),
      }),
    onSuccess: () => {
      toast.success('Links tags updated');
      queryClient.invalidateQueries({ queryKey: ['link', id] });
      queryClient.invalidateQueries({ queryKey: ['linkTags', id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveChanges = () => {
    if (dataIsUpdated) {
      handleUpdate.mutate();
    }
    if (tagsUpdated()) {
      handleUpdateTags.mutate();
    }
  };

  if (isLoading || !data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto p-4 sm:p-6 container sm:px-12">
      <Toaster richColors />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {editingTitle ? (
          <Input
            value={title || ''}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            className="text-xl sm:text-2xl font-bold"
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{title || 'Untitled'}</h1>
            <Button variant="ghost" size="icon" onClick={() => setEditingTitle(true)}>
              <Pencil
                className={cn(
                  'h-4 w-4',
                  data?.title !== title ? 'text-orange-400' : 'text-muted-foreground',
                )}
              />
              <span className="sr-only">Edit title</span>
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 mt-2">
        <div className="flex-grow space-y-2">
          {editingUrl ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setEditingUrl(false)}
                className="flex-grow"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <EarthIcon className="w-4 h-4" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline break-all text-muted-foreground flex-grow"
                >
                  {url}
                </a>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingUrl(true)}>
                <Pencil
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    data?.url !== url ? 'text-orange-400' : 'text-muted-foreground',
                  )}
                />
                <span className="sr-only">Edit URL</span>
              </Button>
            </div>
          )}

          {editingDescription ? (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setEditingDescription(false)}
              className="w-full"
              rows={3}
              autoFocus
            />
          ) : (
            <div className="flex items-start justify-between">
              <p className="text-gray-600 break-words">{description}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10!"
                  onClick={() => setEditingDescription(true)}
                >
                  <Pencil
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      data?.description !== description
                        ? 'text-orange-400'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span className="sr-only">Edit description</span>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">Tags</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingTags(!editingTags)}>
                {editingTags ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Pencil
                    className={cn(
                      'w-4 h-4',
                      tagsUpdated() ? 'text-orange-400' : 'text-muted-foreground',
                    )}
                  />
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags?.linkTags.length === 0 && selectedTags.size === 0 && !editingTags && (
                <span className="text-muted-foreground">No tags</span>
              )}
              {Array.from(selectedTags.values()).map((tag) => (
                <span
                  key={tag.id}
                  className={`h-[34px] text-primary-foreground px-2 py-1 rounded-sm text-sm flex items-center bg-[${tag.color}]`}
                >
                  {tag.name}
                  {editingTags && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => handleTagToggle(tag)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove tag</span>
                    </Button>
                  )}
                </span>
              ))}
              {editingTags && (
                <>
                  {tags?.otherAvailableTags
                    .filter(
                      (tag) => !Array.from(selectedTags.values()).some((t) => t.id === tag.id),
                    )
                    .map((tag) => (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        className={cn(
                          selectedTags.has(tag.id)
                            ? `h-[34px] text-primary-foreground bg-[${tag.color}]`
                            : 'h-[34px] bg-muted text-muted-foreground',
                        )}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag.name}
                      </Button>
                    ))}
                  <div className="flex items-center w-full sm:w-auto -mt-0.5 relative">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="add tag"
                      className="w-full sm:w-20 h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-1"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      style={{ color: selectedColor }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedColor }}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleAddNewTag}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add new tag</span>
                    </Button>

                    {showColorPicker && (
                      <div
                        ref={colorPickerRef}
                        className="absolute top-full mt-1 p-2 bg-white rounded-md shadow-lg z-10 flex gap-1 flex-wrap max-w-[200px]"
                      >
                        {tagColors.map((color) => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setSelectedColor(color);
                              setShowColorPicker(false);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="md:w-1/4 flex-shrink-0 space-y-2">
          <div className="aspect-video w-full bg-gray-200 rounded-lg overflow-hidden relative group">
            <img src={ogImage} alt="OG Image" className="w-full h-full object-cover" />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingImage(true)}
            >
              <Pencil
                className={cn(
                  'h-4 w-4',
                  data?.image !== ogImage ? 'text-orange-400' : 'text-muted-foreground',
                )}
              />
              <span className="sr-only">Edit image</span>
            </Button>
          </div>
          {editingImage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Input
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder="Enter new image URL"
                onBlur={() => setEditingImage(false)}
                className="flex-grow"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-6 mt-4">
        <h2 className="text-lg font-semibold mb-4">Notes</h2>
        {notes ? (
          <NoteEditor initialValue={notes} onChange={(value) => setNotes(value)} />
        ) : (
          <Skeleton className="h-[300px] w-full" />
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={handleSaveChanges}
            disabled={
              (!dataIsUpdated && !tagsUpdated()) ||
              handleUpdate.isPending ||
              handleUpdateTags.isPending
            }
          >
            {handleUpdate.isPending || handleUpdateTags.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {handleUpdate.isPending || handleUpdateTags.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit
            </a>
          </Button>
        </div>
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bookmark</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this bookmark?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete.mutate();
                }}
                disabled={handleDelete.isPending}
              >
                {handleDelete.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  'Delete'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
