"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';

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
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { toast } from "@/hooks/use-toast";
import { registerUser } from "@/actions/user-actions"; // Use the actual action

// Schema for user registration (should match server action schema)
const formSchema = z.object({
    username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(50),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }).max(100),
    isAdmin: z.boolean().default(false).optional(), // Add isAdmin field
});

type RegisterFormValues = z.infer<typeof formSchema>;

export function RegisterUserForm() {
    const [isLoading, setIsLoading] = React.useState(false);
    const router = useRouter();
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            isAdmin: false,
        },
    });

    const onSubmit = async (values: RegisterFormValues) => {
        setIsLoading(true);
        form.clearErrors(); // Clear previous errors
        console.log("Attempting to register user:", values);

        try {
            // Call the registerUser server action
            const result = await registerUser(values);

            if (result.success) {
                toast({
                    title: "User Registered",
                    description: `User "${result.user.username}" created successfully.`,
                });
                form.reset(); // Clear form on success
                router.refresh(); // Refresh the user list on the page
            } else {
                // Handle validation errors from action
                if (result.fieldErrors) {
                    Object.entries(result.fieldErrors).forEach(([field, messages]) => {
                        if (messages && messages.length > 0) {
                            form.setError(field as keyof RegisterFormValues, {
                                type: 'server',
                                message: messages[0],
                            });
                        }
                    });
                    toast({
                        variant: "destructive",
                        title: "Registration Failed",
                        description: result.error || "Please check the form fields.",
                    });
                } else {
                    // Handle general errors
                    toast({
                        variant: "destructive",
                        title: "Registration Failed",
                        description: result.error || "An unexpected error occurred.",
                    });
                }
            }
        } catch (error) {
            console.error("Error during user registration:", error);
            toast({
                variant: "destructive",
                title: "Registration Error",
                description: "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-md border bg-card p-4 shadow-sm">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Username</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter username" {...field} disabled={isLoading} />
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
                                <Input type="password" placeholder="Enter password" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="isAdmin"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                            <FormControl>
                                <Checkbox
                                    // Ensure checked state reflects the boolean value, handling potential undefined during initialization
                                    checked={!!field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isLoading}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Administrator Privileges
                                </FormLabel>
                                <FormDescription>
                                    Grant admin access to this user.
                                </FormDescription>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                    {isLoading ? "Registering..." : "Register User"}
                </Button>
            </form>
        </Form>
    );
}
