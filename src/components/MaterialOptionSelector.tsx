// src/components/MaterialOptionSelector.tsx

import React from 'react';
import Select, { OnChangeValue } from 'react-select';
import { CombinedMaterial, MaterialOption } from '../types';

interface OptionType {
    label: string;
    value: string;
    originalOption: MaterialOption;
}

// FIX: Add 'selectedOption' to the props interface
interface MaterialOptionSelectorProps {
    selectedMaterial: CombinedMaterial;
    selectedOption: MaterialOption | null;
    onSelect: (option: MaterialOption | null) => void;
}

const MaterialOptionSelector: React.FC<MaterialOptionSelectorProps> = ({ selectedMaterial, selectedOption, onSelect }) => {
    
    const options: OptionType[] = (selectedMaterial.options || []).map(opt => ({
        label: opt.name,
        value: opt.id,
        originalOption: opt
    }));

    const currentValue = options.find(opt => opt.value === selectedOption?.id) || null;

    const handleChange = (newValue: OnChangeValue<OptionType, false>) => {
        onSelect(newValue ? newValue.originalOption : null);
    };

    return (
        <div className="form-group">
            <label>Select Option for {selectedMaterial.name}</label>
            <Select
                options={options}
                value={currentValue}
                onChange={handleChange}
                isClearable
                placeholder="Select an option..."
            />
        </div>
    );
};

export default MaterialOptionSelector;