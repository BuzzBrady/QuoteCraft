// src/components/KitSelector.tsx
// -------------
// Component to fetch and display global and user-specific kit templates,
// allowing selection via an onSelect callback.
// (Includes TypeScript fixes for errors shown in screenshot)

// Removed unused 'React' import
import styles from './KitSelector.module.css';
import { useState, useEffect, useMemo } from 'react';
// Added QueryDocumentSnapshot for explicit typing, removed unused DocumentData
import { collection, query, where, getDocs, orderBy, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig'; // Adjust path if needed
import { KitTemplate } from '../types'; // Adjust path if needed

// Define the props the component accepts
interface KitSelectorProps {
    userId: string | null | undefined; // ID of the logged-in user
    onSelect: (kit: KitTemplate) => void; // Callback function when a kit is selected
}

// Add isCustom flag for easier handling internally
type CombinedKit = KitTemplate & { isCustom?: boolean };

// Define a type for the snapshot results to handle the conditional custom fetch
type KitQuerySnapshots = [
    QuerySnapshot, // Always expect global snapshot
    QuerySnapshot | null // Custom snapshot might be null if no userId
];


function KitSelector({ userId, onSelect }: KitSelectorProps) {
    const [allKits, setAllKits] = useState<CombinedKit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Effect to fetch kits when the component mounts or userId changes
    useEffect(() => {
        const fetchKits = async () => {
            setIsLoading(true);
            setError(null);
            console.log("KitSelector: Fetching kits...");

            try {
                // --- Define Promises ---
                const globalKitsRef = collection(db, 'kitTemplates');
                const globalQuery = query(globalKitsRef, where('isGlobal', '==', true), orderBy('name_lowercase'));
                const globalPromise = getDocs(globalQuery);

                // Initialize customPromise correctly based on userId presence
                const customPromise = userId
                    ? getDocs(query(collection(db, `users/${userId}/kitTemplates`), orderBy('name_lowercase')))
                    : Promise.resolve(null); // Resolve to null if no userId

                // --- Wait for queries ---
                // Explicitly type the result of Promise.all
                const [globalSnapshot, customSnapshot] = await Promise.all([
                    globalPromise,
                    customPromise
                ]) as KitQuerySnapshots; // Assert the type here

                // --- Process Results ---
                const fetchedKits: CombinedKit[] = [];

                // Process Global Results
                globalSnapshot.forEach((doc: QueryDocumentSnapshot) => { // Added type for doc
                    fetchedKits.push({
                        id: doc.id,
                        ...doc.data(),
                        isCustom: false
                    } as CombinedKit );
                });

                // Process Custom Results (if fetched - customSnapshot won't be 'never' now)
                if (customSnapshot) {
                    customSnapshot.forEach((doc: QueryDocumentSnapshot) => { // Added type for doc
                        fetchedKits.push({
                            id: doc.id,
                            ...doc.data(),
                            isCustom: true
                        } as CombinedKit );
                    });
                }

                // Simple sort putting global before custom, then by name
                fetchedKits.sort((a, b) => {
                    if (a.isCustom !== b.isCustom) {
                        return a.isCustom ? 1 : -1; // Sort custom after global
                    }
                    // Ensure names exist before comparing
                    return (a.name ?? '').localeCompare(b.name ?? '');
                });


                setAllKits(fetchedKits);
                console.log(`KitSelector: Fetched ${fetchedKits.length} total kits.`);

            } catch (err: any) { // Keep 'any' here for general error handling
                console.error("KitSelector: Error fetching kits:", err);
                // Check if it's a permission error specifically
                if (err.code === 'permission-denied') {
                     setError("Permission denied fetching kits. Check Firestore rules.");
                } else {
                     setError("Failed to load kits. Please try again.");
                }
                setAllKits([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchKits();

    }, [userId]);

    // Filter kits based on search term (checking name and tags)
    const filteredKits = useMemo(() => {
        if (!searchTerm) {
            return allKits;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return allKits.filter(kit => {
            const nameMatch = kit.name_lowercase?.toLowerCase().includes(lowerCaseSearchTerm) ||
                              (kit.name ?? '').toLowerCase().includes(lowerCaseSearchTerm); // Add null check for name
            // Check if any tag includes the search term
            const tagMatch = kit.tags?.some(tag =>
                tag.toLowerCase().includes(lowerCaseSearchTerm)
            );
            return nameMatch || tagMatch;
        });
    }, [allKits, searchTerm]);

    // --- Render ---
    return (
        <div className="kit-selector"> {/* Add class for styling */}
            <h4>Select Kit / Assembly</h4>
            <input
                type="text"
                placeholder="Search kits by name or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.input}
            />

            {isLoading && <p>Loading kits...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!isLoading && !error && (
                 <ul className={styles.kitList}>
                    {filteredKits.length > 0 ? (
                        filteredKits.map((kit) => (
                            <li key={kit.id} onClick={() => onSelect(kit)} className={`${styles.kitItem} kit-selector-item`}>
                                <span className={`${styles.kitName} ${kit.isCustom ? styles.isCustom : ''}`}>
                                    {kit.name ?? 'Unnamed Kit'} {/* Add fallback for name */}
                                    {kit.isCustom && <span className={styles.customMark}>(Custom)</span>}
                                </span>
                                {kit.tags && kit.tags.length > 0 && (<div className={styles.tagsContainer}>Tags: {kit.tags.join(', ')}</div>)}
                            </li>
                        ))
                    ) : (
                        <li style={{ padding: '8px 10px', color: '#777' }}>No kits found.</li>
                    )}
                </ul>
            )}
        </div>
    );
}

export default KitSelector;
