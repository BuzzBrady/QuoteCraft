// src/components/TaskSelector.tsx
// -------------
// UPDATED: Uses CreatableSelect to allow selecting existing tasks
// or triggering the creation of a new custom task.

import { useState, useEffect, useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { ActionMeta, OnChangeValue, OptionsOrGroups, GroupBase } from 'react-select';
import { collection, query, getDocs, orderBy, QuerySnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig'; // Adjust path if needed
import { Task, CustomTask } from '../types'; // Adjust path if needed

// Option structure for react-select
interface TaskOptionType {
  label: string;
  value: string; // Typically the task ID for existing tasks
  __isNew__?: boolean; // Flag added by CreatableSelect for new options
  // Store the original task object for easy access on selection
  originalTask: CombinedTask | null;
}

// Combine Task types with a flag
type CombinedTask = (Task | CustomTask) & { isCustom?: boolean };

// Define the props the component accepts
interface TaskSelectorProps {
    userId: string | null | undefined;
    onSelect: (task: CombinedTask) => void; // Callback for selecting an EXISTING task
    onCreateCustomTask: (taskName: string) => Promise<CombinedTask | null>; // Callback to CREATE a new task, returns the created task or null
    isLoading?: boolean; // Optional: Pass loading state from parent if needed
}

function TaskSelector({ userId, onSelect, onCreateCustomTask, isLoading: isLoadingProp }: TaskSelectorProps) {
    const [allTasks, setAllTasks] = useState<CombinedTask[]>([]);
    // Internal loading state, can be overridden by prop
    const [isLoadingInternal, setIsLoadingInternal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // State to hold the currently selected option in the dropdown
    const [selectedOption, setSelectedOption] = useState<TaskOptionType | null>(null);

    // Use passed loading state if available, otherwise internal
    const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingInternal;

    // Effect to fetch tasks
    useEffect(() => {
        if (!userId) { setAllTasks([]); return; }
        const fetchTasks = async () => {
            setIsLoadingInternal(true); setError(null);
            try {
                const globalTasksRef = collection(db, 'tasks');
                const globalQuery = query(globalTasksRef, orderBy('name_lowercase'));
                const globalPromise = getDocs(globalQuery);

                const customTasksRef = collection(db, `users/${userId}/customTasks`);
                const customQuery = query(customTasksRef, orderBy('name_lowercase'));
                const customPromise = getDocs(customQuery);

                const [globalSnapshot, customSnapshot] = await Promise.all([globalPromise, customPromise]);
                const fetchedTasks: CombinedTask[] = [];

                globalSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                    fetchedTasks.push({ id: doc.id, ...doc.data(), isCustom: false } as CombinedTask);
                });
                customSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                    fetchedTasks.push({ id: doc.id, ...doc.data(), isCustom: true } as CombinedTask);
                });

                // Sort combined list (optional, but nice)
                fetchedTasks.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

                setAllTasks(fetchedTasks);
            } catch (err: any) {
                console.error("TaskSelector: Error fetching tasks:", err);
                setError(err.code === 'permission-denied' ? "Permission denied fetching tasks." : "Failed to load tasks.");
                setAllTasks([]);
            } finally {
                setIsLoadingInternal(false);
            }
        };
        fetchTasks();
    }, [userId]);

    // Convert fetched tasks into options for react-select
    const taskOptions: TaskOptionType[] = useMemo(() => {
        return allTasks.map(task => ({
            label: `${task.name}${task.isCustom ? ' (Custom)' : ''}`,
            value: task.id, // Use Firestore ID as the value
            originalTask: task, // Keep the original object
        }));
    }, [allTasks]);

    // Handle selection or creation from the dropdown
    const handleChange = async (
        newValue: OnChangeValue<TaskOptionType, false>, // isMulti is false, so it's OptionType | null
        actionMeta: ActionMeta<TaskOptionType>
    ) => {
        if (actionMeta.action === 'select-option' && newValue?.originalTask) {
            // User selected an EXISTING option from the list
            console.log("Selected existing task:", newValue.originalTask);
            setSelectedOption(newValue); // Update local state for display
            onSelect(newValue.originalTask); // Call the parent's onSelect handler
        } else if (actionMeta.action === 'create-option' && newValue?.label) {
            // User selected the "Create..." option for a NEW task name
            console.log("Attempting to create new task:", newValue.label);
            setIsLoadingInternal(true); // Show loading while saving
            setError(null);
            // Call the creation handler passed from the parent
            const createdTask = await onCreateCustomTask(newValue.label);
            setIsLoadingInternal(false);

            if (createdTask) {
                // If creation was successful, select the newly created task
                const newOption: TaskOptionType = {
                    label: `${createdTask.name} (Custom)`,
                    value: createdTask.id,
                    originalTask: createdTask
                };
                setSelectedOption(newOption); // Update local state
                onSelect(createdTask); // Also call onSelect for the parent
            } else {
                // Handle creation failure (e.g., show error message)
                setError(`Failed to create custom task "${newValue.label}".`);
                setSelectedOption(null); // Clear selection on failure
            }
        } else if (actionMeta.action === 'clear') {
            // Handle clearing the selection
             console.log("Task selection cleared");
             setSelectedOption(null);
             // Optionally call onSelect with null if the parent needs to know about deselection
             // onSelect(null); // Depends on how you want QuoteBuilder to react
        }
    };

    return (
        <div className="task-selector creatable-selector"> {/* Add classes */}
            <label htmlFor="task-select">Select or Create Task</label>
            <CreatableSelect
                id="task-select"
                isClearable // Allow clearing the selection
                isDisabled={isLoading} // Disable while loading
                isLoading={isLoading}
                options={taskOptions}
                value={selectedOption} // Controlled component value
                onChange={handleChange}
                placeholder="Type or select a task..."
                formatCreateLabel={(inputValue) => `Create task: "${inputValue}"`}
                // Add basic styles or use CSS classes
                styles={{
                    control: (base) => ({ ...base, borderColor: error ? 'red' : '#ccc' }),
                    // Add more styles if needed
                }}
            />
            {error && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }}>{error}</p>}
        </div>
    );
}

export default TaskSelector;
