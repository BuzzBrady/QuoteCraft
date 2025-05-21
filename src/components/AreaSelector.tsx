// src/components/AreaSelector.tsx
// -------------
// Component using react-select/creatable to allow selecting a single predefined area
import styles from './AreaSelector.module.css';
// or creating a new custom section name.

import  'react'; // React is needed for JSX even if not explicitly used
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue } from 'react-select';
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

function AreaSelector({
  globalAreas,
  activeSection,
  onChange,
  placeholder = "Select or type Section/Area...",
  isLoading = false // Default isLoading to false
}: AreaSelectorProps) {

  // Convert the globalAreas array into the format react-select expects
  const areaOptions: OptionType[] = globalAreas.map(area => ({
    label: area.name,
    value: area.name, // Use the name as the value for simplicity
  }));

  // Determine the current value for the select component
  // It should be an OptionType object or null
  const currentValue: OptionType | null = activeSection
    ? { label: activeSection, value: activeSection }
    : null;

  // Handle changes from the react-select component
  const handleChange = (
    newValue: OnChangeValue<OptionType, false> // isMulti is false
  ) => {
    // newValue will be a single OptionType object or null if cleared
    if (newValue) {
        // If an option is selected or created, pass its value (the name string)
        onChange(newValue.value);
    } else {
        // If the selection is cleared, pass an empty string or handle as needed
        onChange(''); // Or maybe keep the previous value? Depends on desired UX.
    }
  };


  return (
    <div className="area-selector creatable-selector"> {/* Wrapper class */}
      <CreatableSelect
        // isMulti={false} // Default is false, explicitly stating for clarity
        isClearable // Allow clearing the selection
        options={areaOptions} // Provide predefined areas
        value={currentValue} // Current selected value object
        onChange={handleChange} // Handle changes
        placeholder={placeholder}
        isDisabled={isLoading} // Disable while areas might be loading
        isLoading={isLoading}
        // Allows creating new options (custom sections) directly by typing
        formatCreateLabel={(inputValue) => `Use custom section: "${inputValue}"`}
        // Basic styling example
        classNamePrefix={styles.areaSelector}
        // Ensure input value clears on blur if needed, or manage input value state separately
        // See react-select docs for more advanced control if required
      />
    </div>
  );
}

export default AreaSelector;
