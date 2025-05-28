// src/components/MaterialSelector.tsx
// Uses CreatableSelect to allow selecting existing materials
// or triggering the creation of a new custom material.

import { useState, useEffect, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue, StylesConfig } from 'react-select';
import { collection, query, getDocs, orderBy, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Material, CustomMaterial, CombinedMaterial } from '../types';

// Option structure for react-select
interface MaterialSelectOptionType {
    label: string;
    value: string; // Material ID for existing, or the new name for creation
    __isNew__?: boolean;
    originalMaterial: CombinedMaterial | null;
}

interface MaterialSelectorProps {
    userId: string | null | undefined;
    onSelect: (material: CombinedMaterial | null) => void;
    onCreateCustomMaterial: (materialName: string) => Promise<CombinedMaterial | null>;
    isLoading?: boolean;
    allMaterials: CombinedMaterial[];
    error?: string | null; // Added error prop
    // currentMaterialId?: string | null;
}

// Factory function for react-select custom styles
const getCustomSelectStyles = (error?: string | null): StylesConfig<MaterialSelectOptionType, false> => ({
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--background-color-sections)',
    borderColor: error 
                 ? 'var(--color-error)' 
                 : state.isFocused ? 'var(--theme-primary-light-blue)' : 'var(--border-color-input)',
    borderRadius: 'var(--border-radius-md)',
    padding: 'calc(var(--space-xs) / 2)',
    boxShadow: state.isFocused 
               ? error 
                 ? `0 0 0 0.2rem var(--color-error)` // Using error color for focus ring
                 : `var(--focus-ring-shadow) rgba(var(--theme-primary-light-blue-rgb), 0.25)`
               : 'none',
    '&:hover': {
      borderColor: error ? 'var(--color-error)' : 'var(--theme-primary-light-blue)',
    },
    minHeight: '38px',
    fontSize: '1rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: `0 calc(var(--space-sm) - var(--space-xxs))`,
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--background-color-sections)',
    borderRadius: 'var(--border-radius-md)',
    border: '1px solid var(--border-color)',
    marginTop: 'var(--space-xs)',
    boxShadow: 'var(--box-shadow-lg)',
    zIndex: 'var(--z-index-dropdown)',
    fontSize: '1rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--theme-primary-light-blue)' : state.isFocused ? 'var(--background-color-light)' : 'var(--background-color-sections)',
    color: state.isSelected ? 'var(--theme-primary-white)' : state.isFocused ? 'var(--theme-accent-bright-blue)' : 'var(--text-color-main)',
    padding: 'var(--space-sm) var(--space-md)',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'var(--background-color-light)',
      color: 'var(--theme-accent-bright-blue)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-color-main)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-color-muted)',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--text-color-main)',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'var(--border-color-input)',
    marginTop: 'var(--space-xs)',
    marginBottom: 'var(--space-xs)',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: 'var(--space-xs)',
    color: 'var(--text-color-muted)',
    '&:hover': {
      color: 'var(--theme-primary-light-blue)',
    }
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--text-color-muted)',
    padding: 'var(--space-xs)',
    '&:hover': {
      color: 'var(--theme-accent-bright-blue)',
    }
  }),
});

function MaterialSelector({
    userId,
    onSelect,
    onCreateCustomMaterial,
    isLoading: isLoadingProp,
    allMaterials: materialsFromProps,
    error, // Consuming the error prop
    // currentMaterialId
}: MaterialSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<MaterialSelectOptionType | null>(null);
    const isLoading = isLoadingProp !== undefined ? isLoadingProp : false;

    const materialOptions: MaterialSelectOptionType[] = useMemo(() => {
        return materialsFromProps.map(material => ({
            label: `${material.name}${material.isCustom ? ' (Custom)' : ''}${material.optionsAvailable ? ' (Options)' : ''}`,
            value: material.id,
            originalMaterial: material,
        }));
    }, [materialsFromProps]);

    const handleChange = async (
        newValue: OnChangeValue<MaterialSelectOptionType, false>,
        actionMeta: ActionMeta<MaterialSelectOptionType>
    ) => {
        if (actionMeta.action === 'select-option') {
            const selectedVal = newValue as MaterialSelectOptionType;
            if (selectedVal && selectedVal.originalMaterial) {
                setSelectedOption(selectedVal);
                onSelect(selectedVal.originalMaterial);
            }
        } else if (actionMeta.action === 'create-option') {
            const typedValue = (newValue as MaterialSelectOptionType)?.label || (newValue as any)?.value;
            if (typedValue) {
                const newMaterialName = typedValue;
                const createdMaterial = await onCreateCustomMaterial(newMaterialName);
                if (createdMaterial) {
                    const newOption: MaterialSelectOptionType = {
                        label: `${createdMaterial.name} (Custom)${createdMaterial.optionsAvailable ? ' (Options)' : ''}`,
                        value: createdMaterial.id,
                        originalMaterial: createdMaterial
                    };
                    setSelectedOption(newOption);
                    onSelect(createdMaterial);
                } else {
                    setSelectedOption(null);
                }
            }
        } else if (actionMeta.action === 'clear' || actionMeta.action === 'pop-value' || actionMeta.action === 'remove-value') {
            setSelectedOption(null);
            onSelect(null);
        }
    };
    
    // Added useEffect to clear selection when allMaterials prop is empty or changes significantly,
    // or if the currently selected material is no longer in the list.
    useEffect(() => {
        if (selectedOption && selectedOption.originalMaterial) {
            const stillExists = materialsFromProps.some(m => m.id === selectedOption.originalMaterial?.id);
            if (!stillExists) {
                setSelectedOption(null);
                onSelect(null);
            }
        } else if (materialsFromProps.length === 0 && selectedOption) {
            // Clear selection if options are wiped and something was selected
             setSelectedOption(null);
             onSelect(null);
        }
    }, [materialsFromProps, selectedOption, onSelect]);

    const selectStyles = getCustomSelectStyles(error); // Get styles, passing current error state

    return (
        <div className="material-selector creatable-selector mb-md">
            <label htmlFor="material-select-input">Select or Create Material</label>
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
                styles={selectStyles} // Apply dynamic custom styles
            />
            {error && <p className="text-danger mt-xs">{error}</p>} {/* Display error message */}
        </div>
    );
}

export default MaterialSelector;
