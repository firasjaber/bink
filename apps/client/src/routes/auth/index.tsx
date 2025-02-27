import { redirect, createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { signIn, signUp, getGoogleAuthUrl } from "@/eden";
import { useAuthStore } from "@/stores/auth";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";

export const Route = createFileRoute("/auth/")({
  component: Auth,
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) {
      return <FullScreenLoading />;
    }
    if (!context.auth.isLoading && context.auth.isAuth) {
      throw redirect({
        to: "/",
      });
    }
  },
});

function Auth() {
  const [activeTab, setActiveTab] = useState("signin");

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <Toaster richColors />
      <Card className='w-[400px]'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='signin'>Sign In</TabsTrigger>
            <TabsTrigger value='signup'>Sign Up</TabsTrigger>
          </TabsList>
          <CardContent>
            <TabsContent value='signin'>
              <SignInTab />
            </TabsContent>
            <TabsContent value='signup'>
              <SignUpTab />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function SignInTab() {
  const setUser = useAuthStore((state) => state.setUser);

  const navigate = Route.useNavigate();
  // react query mutation
  const { mutate, isPending } = useMutation({
    mutationFn: signIn,
    onSuccess: async (data) => {
      await setUser(data.sessionId);
      navigate({ to: "/" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginFormSchema>) {
    mutate(values);
  }

  const handleGoogleSignIn = async () => {
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (_) {
      toast.error("Failed to initialize Google sign in");
    }
  };

  return (
    <div>
      <div className='my-6'>
        <h3 className='scroll-m-20 text-2xl font-semibold tracking-tight'>
          Login to your account
        </h3>
        <span className='text-md text-muted-foreground'>
          Enter your credentials below
        </span>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='example@email.com' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type='password' placeholder='' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormDescription>
            <a href='/auth' className='underline'>
              Forgot password?
            </a>
          </FormDescription>
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background px-2 text-muted-foreground'>
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant='outline'
            type='button'
            className='w-full'
            onClick={handleGoogleSignIn}
          >
            <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
              <path
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                fill='#4285F4'
              />
              <path
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                fill='#34A853'
              />
              <path
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                fill='#FBBC05'
              />
              <path
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                fill='#EA4335'
              />
            </svg>
            Sign in with Google
          </Button>
          <Button type='submit' className='!mt-4 w-full' disabled={isPending}>
            Sign In
          </Button>
        </form>
      </Form>
    </div>
  );
}

const signUpFormSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function SignUpTab() {
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<z.infer<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const navigate = Route.useNavigate();
  // react query mutation
  const { mutate, isPending } = useMutation({
    mutationFn: signUp,
    onSuccess: async (data) => {
      await setUser(data.sessionId);
      navigate({ to: "/" });
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
      <div className='my-6'>
        <h3 className='scroll-m-20 text-2xl font-semibold tracking-tight'>
          Create an account
        </h3>
        <span className='text-md text-muted-foreground'>
          Enter your details below
        </span>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder='example@email.com' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input placeholder='Firas' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='lastName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input placeholder='Jaber' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name='password'
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type='password' placeholder='' {...field} />
                </FormControl>
                {!fieldState.error && (
                  <FormDescription>
                    Password must be at least 8 characters.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' className='!mt-6 w-full' disabled={isPending}>
            Sign up
          </Button>
        </form>
      </Form>
    </div>
  );
}
