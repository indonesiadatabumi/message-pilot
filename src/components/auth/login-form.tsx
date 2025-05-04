"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation'; // Use next/navigation

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast"; // Correct import path

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // TODO: Replace with actual API call and JWT handling
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Login attempt with:", values);

    // --- Mock Login Logic ---
    // In a real app, you would send `values` to your backend API,
    // verify credentials, receive a JWT, and store it (e.g., in localStorage or context).
    // For now, we just simulate success and redirect.
    const mockLoginSuccess = true; // Simulate successful login

    if (mockLoginSuccess) {
      toast({
        title: "Login Successful",
        description: "Redirecting to dashboard...",
      });
      // Simulate storing token (replace with actual token storage)
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', 'mock-jwt-token'); // Example token storage
      }
      router.push('/dashboard'); // Redirect to dashboard on success
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid username or password.",
      });
      form.setError("password", { type: "manual", message: "Invalid credentials" });
    }
    // --- End Mock Login Logic ---
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} />
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
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          Login
        </Button>
      </form>
    </Form>
  );
}
