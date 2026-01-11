import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createLink } from '@/eden';
import { useAuthStore } from '@/stores/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  link: z.string().url('Invalid URL'),
  autoTagging: z.boolean().default(false),
});

export function AddLink() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore((state) => state);
  const isFreeAccount = Boolean(user && !user.isPro && !user.hasOpenAiKey);
  const hasAiAccess = Boolean(
    user && (user.isPro || user.hasOpenAiKey || user.aiTrialsRemaining > 0),
  );
  const autoTagTooltip = !hasAiAccess
    ? 'AI access requires a Pro account or your own OpenAI key.'
    : 'Auto-tagging will use AI to suggest tags.';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      link: '',
      autoTagging: false,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { url: string; autoTagging?: boolean }) => createLink(data),
    onSuccess: (_data, variables) => {
      setTimeout(() => form.reset(), 300);
      queryClient.invalidateQueries({ queryKey: ['links'] });
      setOpen(false);

      if (variables.autoTagging && isFreeAccount) {
        toast.success(
          `Auto-tagging queued. ${user?.aiTrialsRemaining ?? 0} free trial${
            (user?.aiTrialsRemaining ?? 0) !== 1 ? 's' : ''
          } remaining.`,
        );
      }
    },
    onError: (error) => {
      form.setError('link', { message: error.message });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutate({ url: data.link, autoTagging: data.autoTagging });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button>
          <BookmarkPlus className="mr-2 h-4 w-4" /> Add Link
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Bink</AlertDialogTitle>
          <AlertDialogDescription>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <Input
                        {...field}
                        type="text"
                        placeholder="https://bink.firrj.com"
                        className={`${form.formState.errors.link ? 'border-red-500 focus:border-red-500 text-red-500' : 'text-secondary-foreground'}`}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoTagging"
                  render={({ field }) => (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm text-muted-foreground">
                              Auto-tag with AI
                            </Label>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              onPointerDown={(e) => e.stopPropagation()}
                              disabled={!hasAiAccess}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{autoTagTooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                />
              </form>
            </Form>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setTimeout(() => form.reset(), 300)}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={form.formState.isSubmitting || !form.formState.isValid || isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
