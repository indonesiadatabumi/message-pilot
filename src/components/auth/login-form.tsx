
"use client";

import * as React from "react"; // Ensure React is imported
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
import { authenticateUser } from "@/actions/user-actions"; // Import the server action

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

  const [isLoading, setIsLoading] = React.useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    form.clearErrors(); // Clear previous errors
    console.log("[LoginForm] Attempting login with:", values.username);

    try {
      // Call the authenticateUser server action
      const result = await authenticateUser(values);

      if (result.success) {
        const isAdmin = result.user.isAdmin;
        const successMessage = isAdmin ? "Admin Login Successful" : "Login Successful";
        const toastDescription = "Redirecting..."; // Updated description

        toast({
          title: successMessage,
          description: toastDescription,
        });

        // Store token and admin status in cookies/localStorage for client-side access and middleware
        if (typeof window !== 'undefined') {
          console.log("[LoginForm] Login successful. Setting auth state...");
          // Simulate token generation (in real app, this token comes from backend)
          const mockToken = `mock-jwt-token-for-${result.user.username}-${Date.now()}`;
          localStorage.setItem('authToken', mockToken);
          // Ensure localStorage value is also string 'true'/'false' for consistency
          localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
          console.log(`[LoginForm] localStorage set: authToken=${mockToken}, isAdmin=${isAdmin}`);

          // Set cookies for middleware
          // Use SameSite=Lax for better security defaults
          const cookieOptions = `path=/; max-age=3600; SameSite=Lax`; // Expires in 1 hour
          document.cookie = `authToken=${mockToken}; ${cookieOptions}`;
          document.cookie = `isAdmin=${isAdmin ? 'true' : 'false'}; ${cookieOptions}`;
          console.log(`[LoginForm] Cookies set: authToken=${mockToken}, isAdmin=${isAdmin}`);
          // Optional: Verify cookie immediately after setting
          console.log('[LoginForm] Current document.cookie:', document.cookie);

        } else {
          console.warn("[LoginForm] Cannot set auth state: window is undefined.");
        }

        // Instead of router.push, use router.refresh()
        // This re-fetches server components and re-runs middleware with the new cookies.
        console.log("[LoginForm] Calling router.refresh()...");
        router.refresh();
        console.log("[LoginForm] router.refresh() called.");

        // Keep isLoading true until refresh completes navigation or throws error
        // Don't manually set isLoading(false) here on success.

      } else {
        console.warn(`[LoginForm] Authentication failed for ${values.username}:`, result.error);
        // Handle authentication failure
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.error || "Invalid username or password.",
        });
        // Set error on password field for feedback
        form.setError("password", { type: "manual", message: result.error || "Invalid credentials" });
        setIsLoading(false); // Set loading false only on failure
      }
    } catch (error) {
      // Handle unexpected errors during the action call
      console.error("[LoginForm] Error during login action:", error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
      });
      setIsLoading(false); // Also set loading false on unexpected error
    }
    // Removed finally block for isLoading, manage it in success/error paths
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
                <Input placeholder="Enter your username" {...field} disabled={isLoading} />
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
                <Input type="password" placeholder="Enter your password" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
        {/* Keep the hint for initial setup */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          (Hint: Use 'admin' / 'Dbi@2020' or register a user)
        </p>
      </form>
    </Form>
  );
}
