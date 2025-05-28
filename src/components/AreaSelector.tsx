// src/components/AreaSelector.tsx
// -------------
// Component using react-select/creatable to allow selecting a single predefined area
import styles from './AreaSelector.module.css';
// or creating a new custom section name.

import React from 'react'; // React is needed for JSX even if not explicitly used
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue, StylesConfig } from 'react-select'; // Added StylesConfig
import { Area } from '../types'; // Import the Area type

// Define the structure for react-select options
interface OptionType {
  label: string; // Text displayed to the user (Area name)
  value: string; // Internal value (Area name)
  __isNew__?: boolean; // Flag added by CreatableSelect for new options
}

// Define the props the component accepts
interface AreaSelectorProps {
  globalAreas: Area[]; // The list of predefined areas fetched from Firestore
  activeSection: string; // The currently active section name (string)
  onChange: (selectedSectionName: string) => void; // Callback to update the parent state
  placeholder?: string;
  isLoading?: boolean; // Optional loading state from parent
}

// Custom styles for react-select using CSS variables from index.css
const customStyles: StylesConfig<OptionType, false> = {
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
  // SingleValue style for the selected item in the control
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-color-main)',
    marginLeft: '2px', // Default values, adjust as needed
    marginRight: '2px',
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
  // Add styles for createable input part if needed, though often covered by input and control
}; 

function AreaSelector({
  globalAreas,
  activeSection,
  onChange,
  placeholder = "Select or type Section/Area...",
  isLoading = false
}: AreaSelectorProps) {

  const areaOptions: OptionType[] = globalAreas.map(area => ({
    label: area.name,
    value: area.name,
  }));

  const currentValue: OptionType | null = activeSection
    ? { label: activeSection, value: activeSection }
    : null;

  const handleChange = (
    newValue: OnChangeValue<OptionType, false>
  ) => {
    if (newValue) {
        onChange(newValue.value);
    } else {
        onChange(''); 
    }
  };

  return (
    <div className={styles.areaSelectorContainer}> {/* Updated className */}
      <CreatableSelect
        isClearable
        options={areaOptions}
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={isLoading}
        isLoading={isLoading}
        formatCreateLabel={(inputValue) => `Use custom section: "${inputValue}"`}
        styles={customStyles} // Added styles prop
        // classNamePrefix removed
      />
    </div>
  );
}

export default AreaSelector;
