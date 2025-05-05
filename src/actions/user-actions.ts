// src/actions/user-actions.ts
'use server';

import type { User } from '@/services/user-service';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import bcrypt from 'bcryptjs'; // For password hashing

// Default Admin Credentials (use environment variables in a real app for password)
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'Dbi@2020'; // Store securely, e.g., env variable

// Schema for registration (should match form schema)
const RegisterUserSchema = z.object({
    username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(50)
        // Prevent registering the default admin username manually
        .refine(username => username.toLowerCase() !== DEFAULT_ADMIN_USERNAME, {
            message: `Cannot register username '${DEFAULT_ADMIN_USERNAME}'.`,
        }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }).max(100),
    isAdmin: z.boolean().default(false).optional(), // Keep optional from form
});

// --- Get All Users ---
export async function getUsers(): Promise<User[]> {
    console.log("[Action] Fetching users from DB...");
    try {
        const db = await getDb();
        // Fetch users, explicitly exclude passwordHash, sort by username
        const users = await db.collection<User>('users')
            .find({})
            .project({ passwordHash: 0 }) // Exclude password hash
            .sort({ username: 1 })
            .toArray();

        // Convert ObjectId to string for client-side compatibility
        return users.map(user => ({
            ...user,
            _id: user._id.toString(),
            createdAt: new Date(user.createdAt), // Ensure createdAt is a Date object
        }));
    } catch (error) {
        console.error("[Action Error] Error fetching users:", error);
        return [];
    }
}

// --- Register User ---
type RegisterUserResult = { success: true; user: User } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function registerUser(formData: unknown): Promise<RegisterUserResult> {
    console.log("[Action] Attempting to register user in DB...", formData);

    const validatedFields = RegisterUserSchema.safeParse(formData);
    if (!validatedFields.success) {
        console.error("[Action Error] Registration Validation Failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { username, password, isAdmin } = validatedFields.data;

    try {
        const db = await getDb();
        // Check if username already exists (case-insensitive check for robustness)
        const existingUser = await db.collection('users').findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
        if (existingUser) {
            console.warn(`[Action Warn] Registration failed: Username "${username}" already exists.`);
            return { success: false, error: "Username already exists.", fieldErrors: { username: ["Username is taken."] } };
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10); // Hash password with salt rounds

        // Prepare new user document (ensure isAdmin is boolean, default false if undefined)
        const newUser: Omit<User, '_id'> = {
            username,
            passwordHash,
            isAdmin: isAdmin ?? false, // Ensure boolean, default to false
            createdAt: new Date()
        };

        console.log(`[Action] Inserting new user "${username}" into DB...`);
        // Insert the new user into the database
        const result = await db.collection<Omit<User, '_id'>>('users').insertOne(newUser);

        if (!result.insertedId) {
            throw new Error('Failed to insert user into database.');
        }

        // Prepare the user object to return (without password hash)
        const createdUser: User = {
            ...newUser,
            _id: result.insertedId.toString(),
            passwordHash: undefined, // Explicitly remove hash before returning
        };

        console.log(`[Action] User "${username}" (ID: ${createdUser._id}) registered successfully.`);
        revalidatePath('/admin/users'); // Revalidate the admin users page cache
        return { success: true, user: createdUser };

    } catch (error: any) {
        console.error("[Action Error] Error registering user:", error);
        return { success: false, error: error.message || "Database error occurred during registration." };
    }
}

// --- Authenticate User ---
const LoginSchema = z.object({
    username: z.string().min(1, { message: "Username is required." }),
    password: z.string().min(1, { message: "Password is required." }),
});

type AuthenticateUserResult =
    | { success: true; user: { _id: string; username: string; isAdmin: boolean } }
    | { success: false; error: string };

export async function authenticateUser(credentials: unknown): Promise<AuthenticateUserResult> {
    console.log("[Action] Attempting to authenticate user...", credentials);
    const validatedFields = LoginSchema.safeParse(credentials);

    if (!validatedFields.success) {
        console.error("[Action Error] Login Validation Failed:", validatedFields.error.flatten());
        return { success: false, error: "Invalid username or password." }; // Generic error for security
    }

    const { username, password } = validatedFields.data;

    try {
        const db = await getDb();
        console.log(`[Action] Fetching user "${username}" from DB for authentication...`);
        // Find user by username, explicitly request passwordHash
        let user = await db.collection<User>('users').findOne({ username });

        // --- Default Admin Creation Logic ---
        if (!user && username === DEFAULT_ADMIN_USERNAME) {
            console.log(`[Action] Default admin user "${DEFAULT_ADMIN_USERNAME}" not found. Attempting to create...`);
            try {
                // Check again to prevent race conditions if multiple requests hit simultaneously
                const existingAdmin = await db.collection('users').findOne({ username: DEFAULT_ADMIN_USERNAME });
                if (!existingAdmin) {
                    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
                    const defaultAdmin: Omit<User, '_id'> = {
                        username: DEFAULT_ADMIN_USERNAME,
                        passwordHash: passwordHash,
                        isAdmin: true,
                        createdAt: new Date(),
                    };
                    const insertResult = await db.collection<Omit<User, '_id'>>('users').insertOne(defaultAdmin);
                    if (insertResult.insertedId) {
                        console.log(`[Action] Default admin user "${DEFAULT_ADMIN_USERNAME}" created successfully.`);
                        // Fetch the newly created user to continue authentication
                        user = await db.collection<User>('users').findOne({ _id: insertResult.insertedId });
                    } else {
                        console.error("[Action Error] Failed to insert default admin user.");
                        // Continue without user, will result in login failure below
                    }
                } else {
                    console.log(`[Action] Default admin user "${DEFAULT_ADMIN_USERNAME}" found during creation attempt (race condition likely avoided).`);
                    user = existingAdmin; // Use the existing admin found
                }
            } catch (creationError: any) {
                console.error("[Action Error] Error creating default admin user:", creationError);
                // Proceed without user, leading to login failure
            }
        }
        // --- End Default Admin Creation Logic ---


        if (!user || !user.passwordHash) {
            console.warn(`[Action Warn] Authentication failed: User "${username}" not found or has no password hash.`);
            return { success: false, error: "Invalid username or password." };
        }

        console.log(`[Action] Comparing provided password for user "${username}" with stored hash...`);
        // Compare the provided password with the stored hash
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            console.warn(`[Action Warn] Authentication failed: Invalid password for user "${username}".`);
            return { success: false, error: "Invalid username or password." };
        }

        // Authentication successful
        console.log(`[Action] Authentication successful for user "${username}". isAdmin: ${user.isAdmin}`);
        return {
            success: true,
            user: {
                _id: user._id.toString(),
                username: user.username,
                isAdmin: user.isAdmin,
            },
        };

    } catch (error: any) {
        console.error("[Action Error] Error during user authentication:", error);
        return { success: false, error: "An internal server error occurred during login." };
    }
}


// --- TODO: Implement Update User Action ---
// export async function updateUser(...) { ... }

// --- TODO: Implement Delete User Action ---
// export async function deleteUser(...) { ... }
