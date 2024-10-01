import {
  createLazyFileRoute,
  useNavigate,
  redirect,
  createFileRoute,
} from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { signIn, signUp } from '@/eden';
import { useAuthStore } from '@/stores/auth';

export const Route = createFileRoute('/auth')({
  component: Auth,
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) {
      return <div>Loading...</div>;
    }
    if (!context.auth.isLoading && context.auth.isAuth) {
      throw redirect({
        to: '/',
      });
    }
  },
});

function Auth() {
  const [activeTab, setActiveTab] = useState('signin');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Toaster richColors />
      <Card className="w-[400px]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <CardContent>
            <TabsContent value="signin">
              <SignInTab />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpTab />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function SignInTab() {
  const setUser = useAuthStore((state) => state.setUser);

  const navigate = Route.useNavigate();
  // react query mutation
  const { mutate, isPending } = useMutation({
    mutationFn: signIn,
    onSuccess: async (data) => {
      await setUser(data.sessionId);
      navigate({ to: '/' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(values: z.infer<typeof loginFormSchema>) {
    mutate(values);
  }
  return (
    <div>
      <div className="my-6">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Login to your account</h3>
        <span className="text-md text-muted-foreground">Enter your credentials below</span>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="example@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormDescription>
            <a href="/auth" className="underline">
              Forgot password?
            </a>
          </FormDescription>
          <Button type="submit" className="!mt-4 w-full" disabled={isPending}>
            Sign In
          </Button>
        </form>
      </Form>
    </div>
  );
}

const signUpFormSchema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function SignUpTab() {
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<z.infer<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  const navigate = Route.useNavigate();
  // react query mutation
  const { mutate, isPending } = useMutation({
    mutationFn: signUp,
    onSuccess: async (data) => {
      await setUser(data.sessionId);
      navigate({ to: '/' });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(values: z.infer<typeof signUpFormSchema>) {
    mutate(values);
  }
  return (
    <div>
      <div className="my-6">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Create an account</h3>
        <span className="text-md text-muted-foreground">Enter your details below</span>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="example@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input placeholder="Firas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jaber" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                {!fieldState.error && (
                  <FormDescription>Password must be at least 8 characters</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="!mt-6 w-full" disabled={isPending}>
            Sign up
          </Button>
        </form>
      </Form>
    </div>
  );
}
