// src/components/TaskSelector.tsx
// -------------
// UPDATED: Uses CreatableSelect to allow selecting existing tasks
// or triggering the creation of a new custom task.

import { useState, useEffect, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue, StylesConfig } from 'react-select'; // Added StylesConfig
// Removed unused Firestore imports as allTasks is now a prop
import { CombinedTask } from '../types';

interface TaskOptionType {
  label: string;
  value: string; 
  __isNew__?: boolean;
  originalTask: CombinedTask | null;
}

interface TaskSelectorProps {
    userId: string | null | undefined; // Still needed for onCreateCustomTask context
    allTasks: CombinedTask[]; // Tasks are passed as a prop
    onSelect: (task: CombinedTask | null) => void;
    onCreateCustomTask: (taskName: string) => Promise<CombinedTask | null>;
    isLoading?: boolean; // Loading state for the select itself (e.g., during creation)
    error?: string | null; // Error messages specific to this selector's operation
}

// Factory function for react-select custom styles (similar to MaterialSelector)
const getCustomSelectStyles = (error?: string | null): StylesConfig<TaskOptionType, false> => ({
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
                 ? `0 0 0 0.2rem var(--color-error)`
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

function TaskSelector({ 
    userId, 
    allTasks, // Use prop directly
    onSelect, 
    onCreateCustomTask, 
    isLoading: isLoadingProp, 
    error: errorProp 
}: TaskSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<TaskOptionType | null>(null);
    // isLoading now primarily driven by prop, but internal state for creation could be added if needed
    const isLoading = isLoadingProp !== undefined ? isLoadingProp : false;
    // Error is now primarily driven by prop
    const error = errorProp;

    const taskOptions: TaskOptionType[] = useMemo(() => {
        return allTasks.map(task => ({
            label: `${task.name}${task.isCustom ? ' (Custom)' : ''}`,
            value: task.id,
            originalTask: task,
        }));
    }, [allTasks]);

    const handleChange = async (
        newValue: OnChangeValue<TaskOptionType, false>,
        actionMeta: ActionMeta<TaskOptionType>
    ) => {
        if (actionMeta.action === 'select-option' && newValue?.originalTask) {
            setSelectedOption(newValue);
            onSelect(newValue.originalTask);
        } else if (actionMeta.action === 'create-option' && newValue?.label) {
            // Consider parent managing isLoading during creation
            const createdTask = await onCreateCustomTask(newValue.label);
            if (createdTask) {
                const newOption: TaskOptionType = {
                    label: `${createdTask.name} (Custom)`,
                    value: createdTask.id,
                    originalTask: createdTask
                };
                setSelectedOption(newOption);
                onSelect(createdTask); 
            } else {
                setSelectedOption(null); 
            }
        } else if (actionMeta.action === 'clear' || actionMeta.action === 'pop-value' || actionMeta.action === 'remove-value') {
            setSelectedOption(null);
            onSelect(null);
        }
    };
    
    // Effect to clear selection if the selected task is no longer in allTasks or allTasks is empty
    useEffect(() => {
        if (selectedOption && selectedOption.originalTask) {
            const stillExists = allTasks.some(t => t.id === selectedOption.originalTask?.id);
            if (!stillExists) {
                setSelectedOption(null);
                onSelect(null);
            }
        } else if (allTasks.length === 0 && selectedOption) {
             setSelectedOption(null);
             onSelect(null);
        }
    }, [allTasks, selectedOption, onSelect]);

    const selectStyles = getCustomSelectStyles(error); // Get styles, passing current error state

    return (
        <div className="task-selector creatable-selector mb-md"> {/* Added mb-md for spacing */}
            <label htmlFor="task-select">Select or Create Task</label>
            <CreatableSelect
                id="task-select" // Changed from inputId to id for the outer element if needed, or use inputId for the input itself.
                inputId="task-select-input" // Specific ID for the actual input element for accessibility
                isClearable
                isDisabled={isLoading}
                isLoading={isLoading}
                options={taskOptions}
                value={selectedOption}
                onChange={handleChange}
                placeholder="Type or select a task..."
                formatCreateLabel={(inputValue) => `Create task: "${inputValue}"`}
                styles={selectStyles} // Apply dynamic custom styles
            />
            {error && <p className="text-danger mt-xs">{error}</p>} {/* Display error message from prop */}
        </div>
    );
}

export default TaskSelector;
