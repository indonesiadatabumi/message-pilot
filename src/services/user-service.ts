// src/services/user-service.ts
import type { ObjectId } from 'mongodb';

/**
 * Represents a user account.
 */
export interface User {
    _id: ObjectId | string; // Ensure _id is always present after creation
    username: string;
    passwordHash?: string; // Store hash, not plain password
    isAdmin: boolean;
    createdAt: Date;
    userId?: string; // Optional: string representation of _id for convenience in actions
}

// NOTE: Functions related to user management (getUsers, registerUser, etc.)
// should be implemented in Server Actions (e.g., src/actions/user-actions.ts)
// that interact with the database.
