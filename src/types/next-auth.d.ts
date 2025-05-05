// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT as NextAuthJWT } from "next-auth/jwt" // Use alias for clarity

// Extend the built-in session/user/token types

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session extends DefaultSession {
        user: {
            /** The user's MongoDB ID. */
            id: string;
            isAdmin: boolean;
        } & DefaultSession["user"]; // Keep other default user properties like name, email, image
        error?: string; // Optional error field
    }

    /** Represents the user object stored in the database or returned by profile function */
    interface User extends DefaultUser {
        // We store id, username, isAdmin in the JWT token, not the full User object from DB usually
        // So, these might not be needed directly on the User type unless your adapter returns them
        id: string;
        isAdmin: boolean;
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT extends NextAuthJWT {
        /** OpenID ID Token */
        idToken?: string;
        /** User's MongoDB ID */
        id: string;
        isAdmin: boolean;
        // Add other custom fields you want in the token
    }
}
