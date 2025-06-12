// src/components/MaterialSelector.tsx

import React, { useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { OnChangeValue } from 'react-select';
import { CombinedMaterial, Material } from '../types';
import { useDataStore } from '../stores/useDataStore';
import { useUserCollection } from '../hooks/useUserCollection';

interface MaterialSelectorProps {
    onSelect: (material: CombinedMaterial | null) => void;
    onCreateCustomMaterial: (materialName: string) => Promise<CombinedMaterial | null>;
}

interface MaterialOptionType {
  label: string;
  value: string;
  originalMaterial: CombinedMaterial;
}

const MaterialSelector: React.FC<MaterialSelectorProps> = ({ onSelect, onCreateCustomMaterial }) => {
    const { allMaterials: globalMaterials, isLoading: isLoadingGlobals } = useDataStore();
    const { data: customMaterials, isLoading: isLoadingCustoms } = useUserCollection<Material>('customMaterials');

    const isLoading = isLoadingGlobals || isLoadingCustoms;

    const allMaterials = useMemo(() => {
        const combined = [
            ...globalMaterials.map(m => ({ ...m, isCustom: false })),
            ...customMaterials.map(m => ({ ...m, isCustom: true }))
        ];
        const uniqueMaterials = Array.from(new Map(combined.map(material => [material.id, material])).values());
        return uniqueMaterials.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [globalMaterials, customMaterials]);

    const materialOptions: MaterialOptionType[] = useMemo(() =>
        allMaterials.map(material => ({
            label: `${material.name}${material.isCustom ? ' (Custom)' : ''}`,
            value: material.id,
            originalMaterial: material,
        })), [allMaterials]);

    const handleChange = async (newValue: OnChangeValue<MaterialOptionType, false>) => {
        if (newValue) {
            if ((newValue as any).__isNew__) {
                const createdMaterial = await onCreateCustomMaterial(newValue.label);
                if (createdMaterial) {
                    onSelect(createdMaterial);
                }
            } else {
                onSelect(newValue.originalMaterial);
            }
        } else {
            onSelect(null);
        }
    };

    return (
        <CreatableSelect
            isClearable
            isDisabled={isLoading}
            isLoading={isLoading}
            options={materialOptions}
            onChange={handleChange}
            placeholder="Type or select a material..."
            formatCreateLabel={(inputValue) => `Create custom material: "${inputValue}"`}
        />
    );
}

export default MaterialSelector;