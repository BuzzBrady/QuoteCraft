// src/utils/utils.ts

import { Timestamp } from 'firebase/firestore';
// FIX: Changed CustomTask and CustomMaterial to their base types
import { UserRateTemplate, QuoteLine, Task, Material } from '../types';

export function formatCurrency(amount: number | null | undefined): string {
    if (typeof amount !== 'number') {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
    }).format(amount);
}

export function formatFirestoreTimestamp(
    timestamp: Timestamp | undefined, 
    formatType: 'short' | 'medium' | 'long' = 'short'
): string {
    if (!timestamp) return 'N/A';

    const date = timestamp.toDate();
    const options: Intl.DateTimeFormatOptions = {};

    if (formatType === 'short') {
        options.day = '2-digit';
        options.month = '2-digit';
        options.year = 'numeric';
    } else if (formatType === 'medium') {
        options.day = 'numeric';
        options.month = 'short';
        options.year = 'numeric';
    } else if (formatType === 'long') {
        options.day = 'numeric';
        options.month = 'long';
        options.year = 'numeric';
    }

    return new Intl.DateTimeFormat('en-AU', options).format(date);
}

export const findMatchingRate = (
    rates: UserRateTemplate[],
    taskId: string | null,
    materialId: string | null,
    optionId: string | null
): UserRateTemplate | undefined => {
    // Exact match: Task + Material + Option
    if (taskId && materialId && optionId) {
        const match = rates.find(r => r.taskId === taskId && r.materialId === materialId && r.materialOptionId === optionId);
        if (match) return match;
    }
    // Match: Task + Material (no option)
    if (taskId && materialId) {
        const match = rates.find(r => r.taskId === taskId && r.materialId === materialId && !r.materialOptionId);
        if (match) return match;
    }
    // Match: Material + Option (no task)
    if (materialId && optionId) {
        const match = rates.find(r => !r.taskId && r.materialId === materialId && r.materialOptionId === optionId);
        if (match) return match;
    }
    // Match: Only Material
    if (materialId) {
        const match = rates.find(r => !r.taskId && r.materialId === materialId && !r.materialOptionId);
        if (match) return match;
    }
    // Match: Only Task
    if (taskId) {
        const match = rates.find(r => r.taskId === taskId && !r.materialId && !r.materialOptionId);
        if (match) return match;
    }
    return undefined;
};


export const groupLinesBySection = (lines: QuoteLine[]): Record<string, QuoteLine[]> => {
    return lines.reduce((acc, line) => {
        const section = line.section || 'Uncategorized';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(line);
        return acc;
    }, {} as Record<string, QuoteLine[]>);
};

// FIX: Update function signatures to use the correct base types
export const isTask = (item: any): item is Task => {
    return item && typeof item.name === 'string' && typeof item.taskRate === 'number';
};

export const isMaterial = (item: any): item is Material => {
    return item && typeof item.name === 'string' && typeof item.defaultRate === 'number';
};