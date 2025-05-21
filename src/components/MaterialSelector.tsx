// src/components/MaterialSelector.tsx
// Uses CreatableSelect to allow selecting existing materials
// or triggering the creation of a new custom material.

import { useState, useEffect, useMemo } from 'react'; // Added React import
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue } from 'react-select';
import { collection, query, getDocs, orderBy, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig'; // Adjust path if needed
import { Material, CustomMaterial } from '../types'; // Adjust path if needed

// Option structure for react-select
interface MaterialSelectOptionType { // Renamed for clarity within this component
    label: string;
    value: string; // Material ID for existing, or the new name for creation
    __isNew__?: boolean; 
    originalMaterial: CombinedMaterial | null; // Store the full material object
}

// Combine Material types with a flag
type CombinedMaterial = (Material | CustomMaterial) & { isCustom?: boolean };

interface MaterialSelectorProps {
    userId: string | null | undefined;
    onSelect: (material: CombinedMaterial | null) => void; // Allow null for clearing selection
    onCreateCustomMaterial: (materialName: string) => Promise<CombinedMaterial | null>; 
    isLoading?: boolean; 
    // currentMaterialId?: string | null; // Optional: For controlled selection from parent
}

function MaterialSelector({ 
    userId, 
    onSelect, 
    onCreateCustomMaterial, 
    isLoading: isLoadingProp,
    // currentMaterialId 
}: MaterialSelectorProps) {
    const [allMaterials, setAllMaterials] = useState<CombinedMaterial[]>([]);
    const [isLoadingInternal, setIsLoadingInternal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedOption, setSelectedOption] = useState<MaterialSelectOptionType | null>(null);

    const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingInternal;

    useEffect(() => {
        if (!userId) { 
            setAllMaterials([]); 
            // If userId becomes null/undefined after being set, clear selection
            // setSelectedOption(null); 
            // onSelect(null);
            return; 
        }
        const fetchMaterials = async () => {
            setIsLoadingInternal(true); setError(null);
            try {
                const globalMaterialsRef = collection(db, 'materials');
                const globalQuery = query(globalMaterialsRef, orderBy('name_lowercase'));
                const globalPromise = getDocs(globalQuery);

                const customMaterialsRef = collection(db, `users/${userId}/customMaterials`);
                const customQuery = query(customMaterialsRef, orderBy('name_lowercase'));
                const customPromise = getDocs(customQuery);

                const [globalSnapshot, customSnapshot] = await Promise.all([globalPromise, customPromise]);
                const fetchedMaterials: CombinedMaterial[] = [];

                globalSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                    fetchedMaterials.push({ id: doc.id, ...doc.data(), isCustom: false } as CombinedMaterial);
                });
                customSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                    fetchedMaterials.push({ id: doc.id, ...doc.data(), isCustom: true } as CombinedMaterial);
                });

                fetchedMaterials.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
                setAllMaterials(fetchedMaterials);

            } catch (err: any) {
                console.error("MaterialSelector: Error fetching materials:", err);
                setError(err.code === 'permission-denied' ? "Permission denied fetching materials." : "Failed to load materials.");
                setAllMaterials([]);
            } finally {
                setIsLoadingInternal(false);
            }
        };
        fetchMaterials();
    }, [userId]);

    // // Effect to set selectedOption if currentMaterialId changes from parent
    // useEffect(() => {
    //     if (currentMaterialId) {
    //         const material = allMaterials.find(m => m.id === currentMaterialId);
    //         if (material) {
    //             setSelectedOption({
    //                 label: `${material.name}${material.isCustom ? ' (Custom)' : ''}${material.optionsAvailable ? ' (Options)' : ''}`,
    //                 value: material.id,
    //                 originalMaterial: material,
    //             });
    //         } else {
    //             setSelectedOption(null);
    //         }
    //     } else {
    //         setSelectedOption(null);
    //     }
    // }, [currentMaterialId, allMaterials]);


    const materialOptions: MaterialSelectOptionType[] = useMemo(() => {
        return allMaterials.map(material => ({
            label: `${material.name}${material.isCustom ? ' (Custom)' : ''}${material.optionsAvailable ? ' (Options)' : ''}`,
            value: material.id,
            originalMaterial: material,
        }));
    }, [allMaterials]);

    const handleChange = async (
        newValue: OnChangeValue<MaterialSelectOptionType, false>, // react-select type for single select
        actionMeta: ActionMeta<MaterialSelectOptionType>
    ) => {
        console.log("MaterialSelector handleChange:", actionMeta.action, newValue); // For debugging

        if (actionMeta.action === 'select-option') {
            const selectedVal = newValue as MaterialSelectOptionType; // newValue is not null here
            if (selectedVal && selectedVal.originalMaterial) {
                console.log("Selected existing material:", selectedVal.originalMaterial);
                setSelectedOption(selectedVal);
                onSelect(selectedVal.originalMaterial);
            } else { // Should not happen if originalMaterial is always set for existing options
                setSelectedOption(null);
                onSelect(null);
            }
        } else if (actionMeta.action === 'create-option') {
            const typedValue = (newValue as MaterialSelectOptionType)?.label || (newValue as any)?.value; // Creatable can pass it as value sometimes
            if (typedValue) {
                const newMaterialName = typedValue;
                console.log("Attempting to create new material:", newMaterialName);
                
                setIsLoadingInternal(true); // Indicate loading during creation
                try {
                    const createdMaterial = await onCreateCustomMaterial(newMaterialName);
                    if (createdMaterial) {
                        const newOption: MaterialSelectOptionType = {
                            label: `${createdMaterial.name} (Custom)${createdMaterial.optionsAvailable ? ' (Options)' : ''}`,
                            value: createdMaterial.id,
                            originalMaterial: createdMaterial
                        };
                        // Add to local list for immediate display in dropdown (optional, parent might refresh anyway)
                        setAllMaterials(prev => [...prev, createdMaterial].sort((a,b) => (a.name ?? '').localeCompare(b.name ?? '')));
                        setSelectedOption(newOption);
                        onSelect(createdMaterial);
                    } else {
                        // Creation was cancelled or failed in parent (e.g., modal closed)
                        console.log("Material creation cancelled or failed for:", newMaterialName);
                        setSelectedOption(null); // Clear any optimistic selection
                        // Optionally, inform parent that creation didn't complete if onSelect(null) isn't enough
                    }
                } catch (creationError) {
                    console.error("Error during onCreateCustomMaterial call:", creationError);
                    setError(`Failed to initiate creation for "${newMaterialName}".`);
                    setSelectedOption(null);
                } finally {
                    setIsLoadingInternal(false);
                }
            }
        } else if (actionMeta.action === 'clear') {
            console.log("Material selection cleared");
            setSelectedOption(null);
            onSelect(null); // Notify parent that selection is cleared
        } else if (actionMeta.action === 'pop-value' || actionMeta.action === 'remove-value') {
             setSelectedOption(null);
             onSelect(null);
        }
    };

    return (
        <div className="material-selector creatable-selector">
            <label htmlFor="material-select-input">Select or Create Material</label> {/* Changed id to avoid conflict if multiple instances */}
            <CreatableSelect
                inputId="material-select-input"
                isClearable
                isDisabled={isLoading}
                isLoading={isLoading}
                options={materialOptions}
                value={selectedOption}
                onChange={handleChange}
                placeholder="Type or select a material..."
                formatCreateLabel={(inputValue) => `Create material: "${inputValue}"`}
                styles={{ // Basic error styling example
                    control: (base, state) => ({ 
                        ...base, 
                        borderColor: error ? 'red' : state.isFocused ? '#80bdff' : '#ced4da',
                        boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0,123,255,.25)' : base.boxShadow,
                        '&:hover': {
                            borderColor: state.isFocused ? '#80bdff' : '#adb5bd'
                        }
                    }),
                }}
            />
            {error && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }}>{error}</p>}
        </div>
    );
}

export default MaterialSelector;
