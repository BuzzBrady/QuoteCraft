// src/hooks/useUserProfile.ts

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

/**
 * Manages the real-time fetching and updating of the current user's profile document.
 * Creates a default profile if one doesn't exist upon first update.
 * @returns An object with the user's profile, loading state, error state, and an updateProfile function.
 */
export const useUserProfile = (): UseProfileResult => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', currentUser.uid);

    // onSnapshot listens for real-time updates to the document.
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Optional: Create a default profile if one doesn't exist
        console.log("No user profile found, consider creating one.");
        setProfile(null); 
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setError(err.message);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error("No user is signed in.");
    
    const docRef = doc(db, 'users', currentUser.uid);
    try {
      // Use updateDoc which is safer than setDoc with merge as it fails if doc doesn't exist
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
        // If the document doesn't exist, create it.
        if (e.code === 'not-found') {
            await setDoc(docRef, {
                ...data,
                email: currentUser.email, // Pre-fill email
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } else {
            throw e;
        }
    }
  };

  return { profile, loading, error, updateProfile };
};