// src/actions/user-actions.ts
'use server';

import type { User } from '@/services/user-service';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { ObjectId, WithId } from 'mongodb';
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
            username: user.username, // Include username
            isAdmin: user.isAdmin,   // Include isAdmin
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

        const userDocument: WithId<User> | null = await db.collection<User>('users').findOne({ username });

        let user: User | null = null;
        if (userDocument) { user = userDocument; }

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
                        const userDocument: WithId<User> | null = await db.collection<User>('users').findOne({ _id: insertResult.insertedId });

                        let user: User | null = null;
                        if (userDocument) { user = userDocument; }


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
                _id: user._id!.toString(),
                username: user.username,
                isAdmin: user.isAdmin,
            },
        };

    } catch (error: any) {
        console.error("[Action Error] Error during user authentication:", error);
        return { success: false, error: "An internal server error occurred during login." };
    }
}


// --- Update User Action ---
const UpdateUserSchema = z.object({
    _id: z.string().refine(val => ObjectId.isValid(val), {
        message: "Invalid user ID format."
    }),
    username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(50)
        // Prevent changing username to the default admin username
        .refine(username => username.toLowerCase() !== DEFAULT_ADMIN_USERNAME, {
            message: `Cannot change username to '${DEFAULT_ADMIN_USERNAME}'.`,
        }).optional(), // Make username optional for update if not always changed
    password: z.string().min(6, { message: "Password must be at least 6 characters." }).max(100).optional().or(z.literal('')), // Allow empty string for no password change
    isAdmin: z.boolean().optional(),
});

type UpdateUserResult = { success: true; user: User } | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateUser(formData: unknown): Promise<UpdateUserResult> {
    console.log("[Action] Attempting to update user in DB...", formData);

    const validatedFields = UpdateUserSchema.safeParse(formData);
    if (!validatedFields.success) {
        console.error("[Action Error] Update Validation Failed:", validatedFields.error.flatten());
        return {
            success: false,
            error: "Validation failed. Please check the form fields.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { _id, username, password, isAdmin } = validatedFields.data;
    const userId = new ObjectId(_id);

    try {
        const db = await getDb();

        // If username is being updated, check for uniqueness (case-insensitive)
        if (username !== undefined) {
            // Find user by ID to get current username
            const currentUser = await db.collection<User>('users').findOne({ _id: userId });
            // Check if the new username is different from the current one
            if (currentUser && currentUser.username.toLowerCase() !== username.toLowerCase()) {
                const existingUser = await db.collection('users').findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
                if (existingUser && !existingUser._id.equals(userId)) { // Ensure it's not the same user
                    console.warn(`[Action Warn] Update failed: Username "${username}" already exists.`);
                    return { success: false, error: "Username already exists.", fieldErrors: { username: ["Username is taken."] } };
                }
            }
        }

        const updateDoc: any = {};
        if (username !== undefined) updateDoc.username = username;
        if (isAdmin !== undefined) updateDoc.isAdmin = isAdmin;
        if (password !== undefined && password !== '') {
            updateDoc.passwordHash = await bcrypt.hash(password, 10); // Hash new password
        }

        if (Object.keys(updateDoc).length === 0) {
            console.log("[Action] No fields to update for user ID:", _id);
            // Fetch and return the current user data if no changes were made
            const updatedUser = await db.collection<User>('users').findOne({ _id: userId }, { projection: { passwordHash: 0 } });
            if (updatedUser) {
                return { success: true, user: { ...updatedUser, _id: updatedUser._id.toString() } };
            } else {
                return { success: false, error: "User not found after attempted update (no changes)." };
            }
        }

        console.log(`[Action] Updating user ID: ${_id} with`, updateDoc);
        const result = await db.collection<User>('users').updateOne(
            { _id: userId },
            { $set: updateDoc }
        );

        // For simplicity, let's just revalidate the path. A more complex app might fetch the updated user.
        console.log(`[Action] User ID: ${_id} updated successfully. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        revalidatePath('/admin/users');
        // Return a success message, frontend might need to re-fetch or update state
        // Returning a placeholder User object for now, you might adjust this
        return { success: true, user: { _id, username: username || '', isAdmin: isAdmin ?? false, createdAt: new Date() } }; // Return updated fields or placeholder
    } catch (error: any) {
        console.error("[Action Error] Error updating user:", error);
        return { success: false, error: error.message || "Database error occurred during user update." };
    }
}

// --- TODO: Implement Delete User Action ---
// export async function deleteUser(...) { ... }

// --- TODO: Implement Register User Action ---
// export async function registerUser(...) { ... }