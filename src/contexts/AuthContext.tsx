// src/contexts/AuthContext.tsx
// --- TEMPLATE / EXAMPLE ---
// Merge this with your existing logic or adapt as needed.
// Ensure you export AuthContext and define AuthContextType correctly.
// UPDATED: Added logout function to the context value.

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'; // Added React import
import { onAuthStateChanged, User, signOut } from 'firebase/auth'; // <-- IMPORT signOut
import { auth } from '../config/firebaseConfig'; // Adjust path if needed
import { AuthContextType } from '../types'; // Adjust path if needed

// Create the context with a default undefined value but typed correctly
// Make sure it is EXPORTED
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context (optional but convenient)
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Define the Provider component props
interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingAuthState, setLoadingAuthState] = useState<boolean>(true); // Track initial loading

    useEffect(() => {
        // Subscribe to auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoadingAuthState(false); // Loading finished once first check completes
            console.log("Auth State Changed: User:", user?.uid ?? 'None');
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, []); // Empty dependency array means this runs once on mount

    // --- ADDED LOGOUT FUNCTION ---
    const logout = (): Promise<void> => {
        return signOut(auth);
    };
    // --- END ADDED LOGOUT FUNCTION ---

    // Prepare the value to be provided by the context
    const value: AuthContextType = {
        currentUser,
        loadingAuthState,
        logout, // <-- INCLUDE logout IN THE CONTEXT VALUE
    };

    // Provide the context value to children components
    // Don't render children until the initial auth state is loaded
    return (
        <AuthContext.Provider value={value}>
            {!loadingAuthState && children}
        </AuthContext.Provider>
    );
}