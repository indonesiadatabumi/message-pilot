// src/services/user-service.ts
import type { ObjectId } from 'mongodb';

/**
 * Represents a user account.
 */
export interface User {
    _id?: ObjectId | string; // Use ObjectId or string for ID flexibility
    username: string;
    passwordHash?: string; // Store hash, not plain password
    isAdmin: boolean;
    createdAt: Date;
}

// NOTE: Functions related to user management (getUsers, registerUser, etc.)
// should be implemented in Server Actions (e.g., src/actions/user-actions.ts)
// that interact with the database.
