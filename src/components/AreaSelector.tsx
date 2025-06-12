// src/components/AreaSelector.tsx
// Component using react-select/creatable to allow selecting a single predefined area
// or creating a new custom section name.

import { useMemo } from 'react';
import { Area } from '../types';
import CreatableSelect from 'react-select/creatable';
import { OnChangeValue, StylesConfig } from 'react-select';
import { useDataStore } from '../stores/useDataStore';
import styles from './AreaSelector.module.css';

// Define the structure for react-select options
interface AreaOptionType {
  label: string;
  value: string;
  originalArea?: Area; // Make originalArea optional for newly created options
}

// Define the props the component accepts
interface AreaSelectorProps {
  activeSection: string;
  onChange: (selectedSectionName: string) => void;
  placeholder?: string;
  className?: string; // Allow parent to pass a custom class
}

// FIX 1: Use the correctly defined 'AreaOptionType' in the StylesConfig generic.
const customStyles: StylesConfig<AreaOptionType, false> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--background-color-sections)',
    borderColor: state.isFocused ? 'var(--theme-primary-light-blue)' : 'var(--border-color-input)',
    borderRadius: 'var(--border-radius-md)',
    padding: 'calc(var(--space-xs) / 2)',
    boxShadow: state.isFocused ? `var(--focus-ring-shadow) rgba(var(--theme-primary-light-blue-rgb), 0.25)` : 'none',
    '&:hover': {
      borderColor: 'var(--theme-primary-light-blue)',
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
  singleValue: (base) => ({ ...base, color: 'var(--text-color-main)' }),
  placeholder: (base) => ({ ...base, color: 'var(--text-color-muted)' }),
  input: (base) => ({ ...base, color: 'var(--text-color-main)', margin: '0px' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--border-color-input)', marginTop: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }),
  dropdownIndicator: (base) => ({ ...base, padding: 'var(--space-xs)', color: 'var(--text-color-muted)', '&:hover': { color: 'var(--theme-primary-light-blue)' } }),
  clearIndicator: (base) => ({ ...base, padding: 'var(--space-xs)', color: 'var(--text-color-muted)', '&:hover': { color: 'var(--theme-accent-bright-blue)' } }),
}; 

function AreaSelector({
  activeSection,
  onChange,
  placeholder = "Select or type Section/Area...",
  className = ''
}: AreaSelectorProps) {
  const { allAreas, isLoading } = useDataStore((state) => ({
    allAreas: state.allAreas,
    isLoading: state.isLoading,
  }));

  const areaOptions: AreaOptionType[] = useMemo(() => {
    return (allAreas || []).map(area => ({
      label: area.name,
      value: area.name,
      originalArea: area
    }));
  }, [allAreas]);

  // FIX 2: Find the full option object from our list instead of creating an incomplete one.
  // This ensures the value passed to the Select component is a valid AreaOptionType.
  const currentValue = areaOptions.find(opt => opt.value === activeSection) || null;

  // FIX 3: Use the correctly defined 'AreaOptionType' in the OnChangeValue generic.
  const handleChange = (newValue: OnChangeValue<AreaOptionType, false>) => {
    // If the user selects the "Create..." option, newValue will have a __isNew__ property.
    // If they select an existing option, it will be a full AreaOptionType.
    // In either case, we just want to pass the string value up to the parent.
    onChange(newValue ? newValue.value : '');
  };

  const containerClasses = `${styles.areaSelectorContainer} ${className}`.trim();

  return (
    <div className={containerClasses}>
      <CreatableSelect
        isClearable
        options={areaOptions}
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={isLoading}
        isLoading={isLoading}
        formatCreateLabel={(inputValue) => `Use custom section: "${inputValue}"`}
        styles={customStyles}
      />
    </div>
  );
}

export default AreaSelector;