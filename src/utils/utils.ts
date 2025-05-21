// src/utils/utils.ts
// Shared utility functions for the QuoteCraft application.

import { Timestamp } from 'firebase/firestore';
import { UserRateTemplate, QuoteLine, Task, CustomTask, Material, CustomMaterial, MaterialOption } from '../types'; // Ensure this path is correct

// Type aliases from QuoteBuilder/KitCreator for generateSuggestedDisplayName
type CombinedTask = (Task | CustomTask) & { isCustom?: boolean };
type CombinedMaterial = (Material | CustomMaterial) & { isCustom?: boolean };


/**
 * Formats a numeric amount into a currency string (e.g., $123.45).
 * @param amount The number to format.
 * @returns A string representing the formatted currency, or '$0.00' if amount is null/undefined.
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  // Consider using Intl.NumberFormat for more robust localization in the future:
  // return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  return `$${Number(amount).toFixed(2)}`;
};

/**
 * Finds a matching rate from a list of user rate templates based on task, material, and option IDs.
 * It tries to find the most specific match first (Task + Material + Option),
 * then falls back to Task + Material, then Task only.
 * @param rates Array of UserRateTemplate objects.
 * @param taskId ID of the task (or null).
 * @param materialId ID of the material (or null).
 * @param optionId ID of the material option (or null).
 * @returns The matching UserRateTemplate or undefined if no match is found.
 */
export const findMatchingRate = (
    rates: UserRateTemplate[],
    taskId: string | null,
    materialId: string | null,
    optionId: string | null
): UserRateTemplate | undefined => {
    // Most specific match: Task + Material + Option
    let match = rates.find(rate =>
        rate.taskId === taskId &&
        rate.materialId === materialId &&
        rate.materialOptionId === optionId
    );
    if (match) return match;

    // Fallback 1: Task + Material (no specific option, or optionId was null)
    if (materialId) { 
        match = rates.find(rate =>
            rate.taskId === taskId &&
            rate.materialId === materialId &&
            (rate.materialOptionId === null || rate.materialOptionId === undefined)
        );
        if (match) return match;
    }

    // Fallback 2: Task only (no material, or material-specific rate not found)
    if (taskId) { 
        match = rates.find(rate =>
            rate.taskId === taskId &&
            (rate.materialId === null || rate.materialId === undefined) &&
            (rate.materialOptionId === null || rate.materialOptionId === undefined)
        );
        if (match) return match;
    }
    
    return undefined;
};

/**
 * Groups an array of QuoteLine items by their section property.
 * @param lines Array of QuoteLine objects.
 * @returns A record where keys are section names and values are arrays of QuoteLine items.
 */
export const groupLinesBySection = (lines: QuoteLine[]): Record<string, QuoteLine[]> => {
    return lines.reduce((acc, line: QuoteLine) => {
        const section = line.section || 'Uncategorized'; // Default section if undefined
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(line);
        return acc;
    }, {} as Record<string, QuoteLine[]>);
};

/**
 * Formats a Firestore Timestamp into a human-readable date string.
 * Example: 'DD/MM/YYYY' or 'DD Mon YYYY'
 * @param timestamp The Firestore Timestamp object.
 * @param formatType Optional: 'short' (DD/MM/YYYY) or 'medium' (DD Mon YYYY). Defaults to 'short'.
 * @returns A formatted date string or 'N/A' if timestamp is invalid.
 */
export const formatFirestoreTimestamp = (timestamp: Timestamp | undefined | null, formatType: 'short' | 'medium' = 'short'): string => {
    if (!timestamp || !(timestamp instanceof Timestamp)) return 'N/A';
    try {
        const date = timestamp.toDate();
        if (formatType === 'medium') {
            return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        // Default to 'short'
        return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
        console.error("Error formatting timestamp:", error);
        return 'Invalid Date';
    }
};

/**
 * Generates a suggested display name based on selected task, material, and option.
 * @param task The selected task object (or null).
 * @param material The selected material object (or null).
 * @param option The selected material option object (or null).
 * @returns A string for the suggested display name.
 */
export const generateSuggestedDisplayName = (
    task: CombinedTask | null,
    material: CombinedMaterial | null,
    option: MaterialOption | null
): string => {
    let name = '';
    if (task) name += task.name;
    if (material) name += (name ? ' - ' : '') + material.name;
    if (option) name += ` (${option.name})`;
    return name || 'New Item'; // Default if nothing is selected
};

/**
 * Provides a more user-friendly error message from a Firebase error object.
 * @param error The error object, typically from a Firebase operation.
 * @returns A user-friendly error message string.
 */
export const getFirebaseErrorMessage = (error: any): string => {
  if (error && error.code) {
    switch (error.code) {
      case 'auth/user-not-found': return 'No user found with this email. Please check your email or sign up.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use': return 'This email address is already in use by another account.';
      case 'auth/invalid-email': return 'The email address is not valid.';
      case 'auth/weak-password': return 'The password is too weak. Please choose a stronger password.';
      case 'permission-denied': return 'You do not have permission to perform this action. Please contact support if you believe this is an error.';
      case 'unavailable': return 'The service is currently unavailable. Please try again later.';
      // Add more common Firebase error codes as needed
      default: 
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
  return 'An unknown error occurred. Please try again.';
};

/**
 * Debounce function to limit the rate at which a function is called.
 * @param func The function to debounce.
 * @param waitFor The delay in milliseconds.
 * @returns A debounced version of the function.
 */
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void; // Ensure correct return type for void functions
}


// --- Placeholder for Firestore Path & Query Helpers ---
// Consider creating a separate file like 'src/firebase/firestoreUtils.ts' for these
// export const getUserSubcollectionPath = (userId: string, subcollectionName: string, docId?: string): string => { ... }

// --- Placeholder for Validation Utilities ---
// Consider creating a separate file like 'src/utils/validation.ts' for these
// export const isValidEmail = (email: string): boolean => { ... }
// export const isNotEmpty = (value: string | null | undefined): boolean => { ... }

