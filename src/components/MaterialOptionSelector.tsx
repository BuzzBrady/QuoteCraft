// src/components/MaterialOptionSelector.tsx
// Component to fetch and display options for a specific selected material.

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Material, CustomMaterial, MaterialOption } from '../types';
import { useAuth } from '../contexts/AuthContext';
import styles from './MaterialOptionSelector.module.css';
import { formatCurrency } from '../utils/utils';

type SelectableMaterial = (Material | CustomMaterial) & { isCustom?: boolean };

interface MaterialOptionSelectorProps {
    selectedMaterial: SelectableMaterial | null;
    onSelect: (option: MaterialOption | null) => void;
    currentOptionId?: string | null;
    initialSelectedOptionId?: string | null; 

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
            const materialId = selectedMaterial.id;

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

    const formatRateModifierDisplay = (modifier?: number) => {
        if (typeof modifier !== 'number') return '';
        return ` (${modifier >= 0 ? '+' : ''}${formatCurrency(modifier)})`;
    };

    return (
        <div className={styles.selectorContainer}>
            {/* Use module style for loading text if it provides specific layout beyond text color */}
            {isLoading && <p className={styles.loadingMessage || styles.loadingText || 'text-muted'}>Loading options...</p>}
            {error && <p className="text-danger">{error}</p>} {/* Use global text-danger */}

            {!isLoading && !error && (
                <>
                    {options.length > 0 ? (
                        <ul className={styles.optionsList}>
                            {options.map((option) => (
                                <li
                                    key={option.id}
                                    onClick={() => onSelect(option)}
                                    // Retain module styles for interactive items
                                    className={`${styles.optionItem} ${currentOptionId === option.id ? styles.optionItemActive : ''} ${styles.optionButton}`}
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(option); }}
                                >
                                    {option.name}
                                    {option.description && <span className={styles.optionDescription || styles.optionDetails}>({option.description})</span>}
                                    {typeof option.rateModifier === 'number' && <span className={styles.rateModifier}>{formatRateModifierDisplay(option.rateModifier)}</span>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        // Use module style for no options text if it provides specific layout
                        <p className={styles.noOptionsMessage || styles.noOptionsText || 'text-muted'}>No options defined for this material.</p>
                    )}
                    {options.length > 0 && (
                        <button 
                            onClick={() => onSelect(null)} 
                            // Use global button styles
                            className="btn btn-outline-secondary btn-sm mt-sm" 
                            type="button"
                        >
                            Clear Option Selection
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

export default MaterialOptionSelector;
