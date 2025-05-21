// src/components/MaterialOptionSelector.tsx
// Component to fetch and display options for a specific selected material.
// Refactored to use CSS Modules and shared formatCurrency utility.

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig'; // Adjust path if needed
import { Material, CustomMaterial, MaterialOption } from '../types'; // Adjust path if needed
import { useAuth } from '../contexts/AuthContext'; 

import styles from './MaterialOptionSelector.module.css'; 
// --- IMPORT SHARED UTILITY ---
import { formatCurrency } from '../utils/utils'; // Adjust path if your utils.ts is elsewhere

// Combined type for selectedMaterial prop
type SelectableMaterial = (Material | CustomMaterial) & { isCustom?: boolean };

interface MaterialOptionSelectorProps {
    selectedMaterial: SelectableMaterial | null;
    onSelect: (option: MaterialOption | null) => void; 
    currentOptionId?: string | null; 
}

function MaterialOptionSelector({
    selectedMaterial,
    onSelect,
    currentOptionId,
}: MaterialOptionSelectorProps) {
    const { currentUser } = useAuth(); 
    const [options, setOptions] = useState<MaterialOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedMaterial || !selectedMaterial.optionsAvailable) {
            setOptions([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        const fetchOptions = async () => {
            setIsLoading(true);
            setError(null);
            let collectionPath = '';
            const materialId = selectedMaterial.id; // Ensure selectedMaterial.id is available

            if (!materialId) {
                setError("Selected material is missing an ID.");
                setIsLoading(false);
                setOptions([]);
                return;
            }

            const userIdForPath = (selectedMaterial as CustomMaterial).userId || currentUser?.uid;

            if (selectedMaterial.isCustom) {
                if (!userIdForPath) {
                    setError("Cannot fetch options: User ID missing for custom material path construction.");
                    setIsLoading(false);
                    setOptions([]);
                    return;
                }
                collectionPath = `users/${userIdForPath}/customMaterials/${materialId}/options`;
            } else {
                collectionPath = `materials/${materialId}/options`;
            }

            console.log(`MaterialOptionSelector: Fetching options from: ${collectionPath}`);
            try {
                const optionsRef = collection(db, collectionPath);
                const q = query(optionsRef, orderBy('name_lowercase', 'asc')); 
                const querySnapshot = await getDocs(q);
                const fetchedOptions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialOption));
                setOptions(fetchedOptions);
                console.log(`MaterialOptionSelector: Fetched ${fetchedOptions.length} options for ${selectedMaterial.name}.`);
            } catch (err) {
                console.error(`MaterialOptionSelector: Error fetching options from ${collectionPath}:`, err);
                setError("Failed to load material options.");
                setOptions([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOptions();
    }, [selectedMaterial, currentUser?.uid]); 

    if (!selectedMaterial || !selectedMaterial.optionsAvailable) {
        return null; 
    }
    
    // formatRateModifier uses the imported formatCurrency
    const formatRateModifierDisplay = (modifier?: number) => {
        if (typeof modifier !== 'number') return '';
        return ` (${modifier >= 0 ? '+' : ''}${formatCurrency(modifier)})`;
    };
    
    return (
        <div className={styles.selectorContainer}>
            {isLoading && <p className={styles.loadingText}>Loading options...</p>}
            {error && <p className={styles.errorText}>{error}</p>}

            {!isLoading && !error && (
                <>
                    {options.length > 0 ? (
                        <ul className={styles.optionsList}>
                            {options.map((option) => (
                                <li
                                    key={option.id}
                                    onClick={() => onSelect(option)}
                                    className={`${styles.optionItem} ${currentOptionId === option.id ? styles.optionItemActive : ''}`}
                                    tabIndex={0} 
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(option);}}
                                >
                                    {option.name}
                                    {option.description && <span className={styles.optionDescription}>({option.description})</span>}
                                    {typeof option.rateModifier === 'number' && <span className={styles.rateModifier}>{formatRateModifierDisplay(option.rateModifier)}</span>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.noOptionsText}>No options defined for this material.</p>
                    )}
                    {options.length > 0 && ( 
                         <button onClick={() => onSelect(null)} className={styles.clearButton} type="button">
                            Clear Option Selection
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

export default MaterialOptionSelector;
