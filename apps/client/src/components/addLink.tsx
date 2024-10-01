import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookmarkPlus } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { createLink } from '@/eden';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';

const formSchema = z.object({
  link: z.string().url('Invalid URL'),
});

export function AddLink() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      link: '',
    },
  });

  const auth = useAuthStore();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { url: string }) => createLink(data, auth.sessionId),
    onSuccess: () => {
      setTimeout(() => form.reset(), 300);
      // invalidate links query
      queryClient.invalidateQueries({ queryKey: ['links'] });
      setOpen(false);
    },
    onError: (error) => {
      form.setError('link', { message: error.message });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutate({ url: data.link });
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
                        className={`${form.formState.errors.link ? 'border-red-500 focus:border-red-500 text-red-500' : 'text-black'}`}
                      />
                      <FormMessage />
                    </FormItem>
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
