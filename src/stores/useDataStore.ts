// src/stores/useDataStore.ts

import { create } from 'zustand';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Task, Material, KitTemplate, Area } from '../types';

// This interface defines the "shape" of our store.
// It holds the data, loading/error states, and actions.
interface DataStoreState {
  allTasks: Task[];
  allMaterials: Material[];
  allKits: KitTemplate[];
  allAreas: Area[];
  isLoading: boolean;
  error: string | null;
  fetchInitialData: () => Promise<void>;
}

export const useDataStore = create<DataStoreState>((set) => ({
  // 1. Initial State: These are the default values before anything is loaded.
  allTasks: [],
  allMaterials: [],
  allKits: [],
  allAreas: [],
  isLoading: false,
  error: null,

  // 2. The Action: This is a function we'll call to fetch all our global data.
  fetchInitialData: async () => {
    // Immediately set loading to true so other components can show a spinner.
    set({ isLoading: true, error: null });
    try {
      // Define references to the top-level collections we need.
      const tasksCollectionRef = collection(db, 'tasks');
      const materialsCollectionRef = collection(db, 'materials');
      const kitsCollectionRef = collection(db, 'kits');

      // Use Promise.all to fetch all collections concurrently for better performance.
      const [tasksSnapshot, materialsSnapshot, kitsSnapshot] = await Promise.all([
        getDocs(tasksCollectionRef),
        getDocs(materialsCollectionRef),
        getDocs(kitsCollectionRef),
      ]);

      // Map the document snapshots to our defined TypeScript types.
      const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      const materialsData = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      const kitsData = kitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KitTemplate));

      // Set the store's state with the newly fetched data.
      set({
        allTasks: tasksData,
        allMaterials: materialsData,
        allKits: kitsData,
        isLoading: false
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error fetching initial data:", errorMessage);
      // If an error occurs, save the message to the store.
      set({ error: errorMessage, isLoading: false });
    }
  },
}));