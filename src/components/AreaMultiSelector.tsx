// src/components/AreaMultiSelector.tsx
// -------------
// Component using react-select to allow selecting multiple predefined areas
import styles from './AreaMultiSelector.module.css';
// and creating new custom section names.

import React from 'react'; // Ensured React is imported
import CreatableSelect from 'react-select/creatable'; // Use Creatable for adding custom entries
import { ActionMeta, MultiValue, OnChangeValue, StylesConfig } from 'react-select'; // Added StylesConfig
import { Area } from '../types'; // Import the Area type

// Define the structure for react-select options
interface OptionType {
  label: string; // Text displayed to the user
  value: string; // Internal value (usually the area name or ID)
}

// Define the props the component accepts
interface AreaMultiSelectorProps {
  globalAreas: Area[]; // The list of predefined areas fetched from Firestore
  selectedSections: string[]; // The current array of selected section names
  onChange: (selectedSectionNames: string[]) => void; // Callback to update the parent state
  placeholder?: string;
}

// Custom styles for react-select using CSS variables from index.css
const customStyles: StylesConfig<OptionType, true> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--background-color-sections)',
    borderColor: state.isFocused ? 'var(--theme-primary-light-blue)' : 'var(--border-color-input)',
    borderRadius: 'var(--border-radius-md)',
    padding: 'calc(var(--space-xs) / 2)', // Adjusted for react-select control structure
    boxShadow: state.isFocused ? `var(--focus-ring-shadow) rgba(var(--theme-primary-light-blue-rgb), 0.25)` : 'none',
    '&:hover': {
      borderColor: 'var(--theme-primary-light-blue)',
    },
    minHeight: '38px', // To better match standard input height
    fontSize: '1rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: `0 calc(var(--space-sm) - var(--space-xxs))`, // Fine-tuned padding
    gap: 'var(--space-xs)',
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
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--theme-primary-light-blue)',
    borderRadius: 'var(--border-radius-sm)',
    padding: `calc(var(--space-xxs) / 2) var(--space-xxs)`, // Compact padding for pills
    margin: `var(--space-xxs) calc(var(--space-xs) / 2) var(--space-xxs) 0`, // Standard margin
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--theme-primary-white)',
    padding: `var(--space-xxs)`,
    fontSize: '0.875em', // Slightly smaller text in pills
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--theme-primary-white)',
    cursor: 'pointer',
    borderRadius: '0 var(--border-radius-sm) var(--border-radius-sm) 0',
    '&:hover': {
      backgroundColor: 'var(--theme-accent-bright-blue)',
      color: 'var(--theme-primary-white)',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-color-muted)',
    marginLeft: '2px',
    marginRight: '2px',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--text-color-main)',
    margin: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
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
};

function AreaMultiSelector({
  globalAreas,
  selectedSections,
  onChange,
  placeholder = "Select or type Section(s)..."
}: AreaMultiSelectorProps) {

  const areaOptions: OptionType[] = globalAreas.map(area => ({
    label: area.name,
    value: area.name,
  }));

  const selectedOptions: OptionType[] = selectedSections.map(sectionName => ({
    label: sectionName,
    value: sectionName,
  }));

  const handleChange = (
    newValue: OnChangeValue<OptionType, true>
  ) => {
    const selectedNames = newValue ? newValue.map(option => option.value) : [];
    onChange(selectedNames);
  };

  return (
    <div className={styles.areaMultiSelectorContainer}> {/* Updated className */}
      <CreatableSelect
        isMulti
        options={areaOptions}
        value={selectedOptions}
        onChange={handleChange}
        placeholder={placeholder}
        formatCreateLabel={(inputValue) => `Create section: "${inputValue}"`}
        styles={customStyles} // Added styles prop
        // classNamePrefix removed
        // isClearable // Retain if needed, or add to props
      />
    </div>
  );
}

export default AreaMultiSelector;
