// src/components/TaskSelector.tsx

import React, { useMemo } from 'react';
import CreatableSelect from 'react-select/creatable';
import { OnChangeValue } from 'react-select';
import { CombinedTask, Task } from '../types';
import { useDataStore } from '../stores/useDataStore';
import { useUserCollection } from '../hooks/useUserCollection';

interface TaskSelectorProps {
    onSelect: (task: CombinedTask | null) => void;
    onCreateCustomTask: (taskName: string) => Promise<CombinedTask | null>;
}

interface TaskOptionType {
  label: string;
  value: string;
  originalTask: CombinedTask;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ onSelect, onCreateCustomTask }) => {
    const { allTasks: globalTasks, isLoading: isLoadingGlobals } = useDataStore();
    const { data: customTasks, isLoading: isLoadingCustoms } = useUserCollection<Task>('customTasks');

    const isLoading = isLoadingGlobals || isLoadingCustoms;

    const allTasks = useMemo(() => {
        const combined = [
            ...globalTasks.map(t => ({ ...t, isCustom: false })),
            ...customTasks.map(t => ({ ...t, isCustom: true }))
        ];
        const uniqueTasks = Array.from(new Map(combined.map(task => [task.id, task])).values());
        return uniqueTasks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [globalTasks, customTasks]);

    const taskOptions: TaskOptionType[] = useMemo(() =>
        allTasks.map(task => ({
            label: `${task.name}${task.isCustom ? ' (Custom)' : ''}`,
            value: task.id,
            originalTask: task,
        })), [allTasks]);

    const handleChange = async (newValue: OnChangeValue<TaskOptionType, false>) => {
        if (newValue) {
            if ((newValue as any).__isNew__) {
                const createdTask = await onCreateCustomTask(newValue.label);
                if (createdTask) {
                    onSelect(createdTask);
                }
            } else {
                onSelect(newValue.originalTask);
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
            options={taskOptions}
            onChange={handleChange}
            placeholder="Type or select a task..."
            formatCreateLabel={(inputValue) => `Create custom task: "${inputValue}"`}
        />
    );
}

export default TaskSelector;