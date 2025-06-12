// src/components/KitSelector.tsx
import React, { useMemo } from 'react';
import Select, { OnChangeValue } from 'react-select';
import { KitTemplate } from '../types';
import { useDataStore } from '../stores/useDataStore';

interface KitOptionType {
  label: string;
  value: string;
  originalKit: KitTemplate;
}

// FIX: Add the onKitSelected prop to the interface
interface KitSelectorProps {
  onKitSelected: (kit: KitTemplate) => void;
}

const KitSelector: React.FC<KitSelectorProps> = ({ onKitSelected }) => {
  const { allKits, isLoading } = useDataStore();

  const kitOptions: KitOptionType[] = useMemo(() => {
    // The allKits from the store might be the full Kit type, not KitTemplate.
    // Ensure the types are compatible or cast as needed. For now, we assume they are compatible.
    return (allKits || []).map((kit: any) => ({
      label: kit.name,
      value: kit.id,
      originalKit: kit,
    }));
  }, [allKits]);

  const handleChange = (newValue: OnChangeValue<KitOptionType, false>) => {
    if (newValue) {
      onKitSelected(newValue.originalKit);
    }
  };

  return (
    <div className="kit-selector mb-md">
        <label>Add from Kit</label>
        <Select
            isClearable
            isDisabled={isLoading}
            isLoading={isLoading}
            options={kitOptions}
            onChange={handleChange}
            placeholder="Select a kit to add its items..."
        />
    </div>
  );
};

export default KitSelector;