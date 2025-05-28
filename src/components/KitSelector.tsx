// src/components/KitSelector.tsx
// -------------
// Component to fetch and display global and user-specific kit templates,
// allowing selection via an onSelect callback.

import styles from './KitSelector.module.css';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { KitTemplate } from '../types';

interface KitSelectorProps {
    userId: string | null | undefined;
    onSelect: (kit: KitTemplate) => void;
}

type CombinedKit = KitTemplate & { isCustom?: boolean };

type KitQuerySnapshots = [
    QuerySnapshot, 
    QuerySnapshot | null 
];

function KitSelector({ userId, onSelect }: KitSelectorProps) {
    const [allKits, setAllKits] = useState<CombinedKit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchKits = async () => {
            setIsLoading(true);
            setError(null);
            console.log("KitSelector: Fetching kits...");

            try {
                const globalKitsRef = collection(db, 'kitTemplates');
                const globalQuery = query(globalKitsRef, where('isGlobal', '==', true), orderBy('name_lowercase'));
                const globalPromise = getDocs(globalQuery);

                const customPromise = userId
                    ? getDocs(query(collection(db, `users/${userId}/kitTemplates`), orderBy('name_lowercase')))
                    : Promise.resolve(null);

                const [globalSnapshot, customSnapshot] = await Promise.all([
                    globalPromise,
                    customPromise
                ]) as KitQuerySnapshots;

                const fetchedKits: CombinedKit[] = [];

                globalSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                    fetchedKits.push({
                        id: doc.id,
                        ...doc.data(),
                        isCustom: false
                    } as CombinedKit );
                });

                if (customSnapshot) {
                    customSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                        fetchedKits.push({
                            id: doc.id,
                            ...doc.data(),
                            isCustom: true
                        } as CombinedKit );
                    });
                }

                fetchedKits.sort((a, b) => {
                    if (a.isCustom !== b.isCustom) {
                        return a.isCustom ? 1 : -1;
                    }
                    return (a.name ?? '').localeCompare(b.name ?? '');
                });

                setAllKits(fetchedKits);
                console.log(`KitSelector: Fetched ${fetchedKits.length} total kits.`);

            } catch (err: any) {
                console.error("KitSelector: Error fetching kits:", err);
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

    const filteredKits = useMemo(() => {
        if (!searchTerm) {
            return allKits;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return allKits.filter(kit => {
            const nameMatch = kit.name_lowercase?.toLowerCase().includes(lowerCaseSearchTerm) ||
                              (kit.name ?? '').toLowerCase().includes(lowerCaseSearchTerm);
            const tagMatch = kit.tags?.some(tag =>
                tag.toLowerCase().includes(lowerCaseSearchTerm)
            );
            return nameMatch || tagMatch;
        });
    }, [allKits, searchTerm]);

    return (
        <div className={styles.kitSelectorContainer}> {/* Use module style for container */}
            <h4 className="mb-md">Select Kit / Assembly</h4> {/* Add margin utility */}
            <input
                type="text"
                placeholder="Search kits by name or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                // Assuming global input styles apply; module style can add specifics if needed.
                className={styles.input} 
            />

            {isLoading && <p>Loading kits...</p>}
            {error && <p className="text-danger">{error}</p>} {/* Use global text-danger */}

            {!isLoading && !error && (
                 <ul className={styles.kitList}>
                    {filteredKits.length > 0 ? (
                        filteredKits.map((kit) => (
                            <li key={kit.id} onClick={() => onSelect(kit)} className={styles.kitItem}>
                                <span className={`${styles.kitName} ${kit.isCustom ? styles.isCustom : ''}`}>
                                    {kit.name ?? 'Unnamed Kit'}
                                    {kit.isCustom && <span className={styles.customMark}>(Custom)</span>}
                                </span>
                                {kit.tags && kit.tags.length > 0 && (<div className={styles.tagsContainer}>Tags: {kit.tags.join(', ')}</div>)}
                            </li>
                        ))
                    ) : (
                        // Use module style for no kits message if available and suitable, or global text utility
                        <li className={styles.noKitsMessage || 'text-muted p-md'}>No kits found.</li>
                    )}
                </ul>
            )}
        </div>
    );
}

export default KitSelector;
