// src/components/AreaMultiSelector.tsx
// -------------
// Component using react-select to allow selecting multiple predefined areas
import styles from './AreaMultiSelector.module.css';
// and creating new custom section names.

import 'react';
import CreatableSelect from 'react-select/creatable'; // Use Creatable for adding custom entries
import { ActionMeta, MultiValue, OnChangeValue } from 'react-select';
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

function AreaMultiSelector({
  globalAreas,
  selectedSections,
  onChange,
  placeholder = "Select or type Section(s)..."
}: AreaMultiSelectorProps) {

  // Convert the globalAreas array into the format react-select expects
  const areaOptions: OptionType[] = globalAreas.map(area => ({
    label: area.name, // Display the area name
    value: area.name, // Use the area name as the value for simplicity
  }));

  // Convert the selectedSection string array into OptionType array for the component's value
  const selectedOptions: OptionType[] = selectedSections.map(sectionName => ({
    label: sectionName,
    value: sectionName,
  }));

  // Handle changes from the react-select component
  const handleChange = (
    newValue: OnChangeValue<OptionType, true> // OnChangeValue<OptionType, true> indicates MultiValue<OptionType> | null
    // We expect MultiValue<OptionType> because isMulti is true
  ) => {
    // newValue will be an array of OptionType objects or null if cleared
    // Extract just the 'value' (the section name string) from each selected option
    const selectedNames = newValue ? newValue.map(option => option.value) : [];
    onChange(selectedNames); // Pass the array of names back to the parent
  };





  return (
    <div className="area-multi-selector"> {/* Wrapper class */}
      <CreatableSelect
        isMulti // Allow selecting multiple options
        options={areaOptions} // Provide predefined areas
        value={selectedOptions} // Current selected values
        onChange={handleChange} // Handle changes
        placeholder={placeholder}
        // Allows creating new options (custom sections) directly by typing
        formatCreateLabel={(inputValue) => `Create section: "${inputValue}"`}
        // Basic styling example
        classNamePrefix={styles.areaMultiSelector}
        // You can add more props like isClearable, etc.
        // isClearable
      />
    </div>
  );
}

export default AreaMultiSelector;
