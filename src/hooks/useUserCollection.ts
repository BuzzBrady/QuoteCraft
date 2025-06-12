// src/hooks/useUserCollection.ts

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit, QueryOrderByConstraint, OrderByDirection } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

interface FetchResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches a collection specific to the currently logged-in user.
 * It is flexible and can be used for any user-subcollection.
 * @param collectionName The name of the sub-collection under /users/{userId}/.
 * @param orderByField (Optional) The field to order the results by.
 * @param direction (Optional) The direction to order by ('asc' or 'desc'). Defaults to 'asc'.
 * @param queryLimit (Optional) The maximum number of documents to retrieve.
 * @returns An object containing the fetched data, loading state, error state, and a refetch function.
 */
export const useUserCollection = <T>(
  collectionName: string, 
  orderByField?: string,
  direction: OrderByDirection = 'asc',
  queryLimit?: number // <-- NEW: Added queryLimit parameter
): FetchResult<T> => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggerFetch, setTriggerFetch] = useState(0);
  const { currentUser } = useAuth();

  const refetch = useCallback(() => setTriggerFetch(prev => prev + 1), []);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const path = `users/${currentUser.uid}/${collectionName}`;
        
        // Build query constraints dynamically
        const queryConstraints = [];
        if (orderByField) {
            queryConstraints.push(orderBy(orderByField, direction));
        }
        if (queryLimit) { // <-- NEW: Add limit constraint if provided
            queryConstraints.push(limit(queryLimit));
        }

        const q = query(collection(db, path), ...queryConstraints);
        const snapshot = await getDocs(q);
        const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(fetchedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser, collectionName, orderByField, direction, queryLimit, triggerFetch]);

  return { data, isLoading, error, refetch };
};