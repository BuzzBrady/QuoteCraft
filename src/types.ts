// src/types.ts

import { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

// --- Utility & Context Types ---
export type QuoteExportLevel = 'summary' | 'standardDetail' | 'fullDetail';

export interface AuthContextType {
    currentUser: User | null;
    loadingAuthState: boolean;
    logout: () => Promise<void>;
}

export interface DataStoreState {
    allTasks: Task[];
    allMaterials: Material[];
    allKits: KitTemplate[];
    allAreas: Area[];
    isLoading: boolean;
    error: string | null;
    fetchInitialData: () => Promise<void>;
}

// --- User & Client Types ---
export interface UserProfile {
    id?: string;
    email?: string;
    displayName?: string;
    businessName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    abnOrTaxId?: string;
    logoUrl?: string;
    quotePrefix?: string;
    nextQuoteSequence?: number;
    defaultTerms?: string;

    // FIX: Add all missing properties below
    quoteNumberPadding?: number;
    taxRate?: number;
    currencyCode?: string;
    acceptanceInstructions?: string;
    salesContactPerson?: string;
    companyWebsite?: string;
    showUnitPricesInPdf?: boolean;
    showFullItemizedTableInPdf?: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Client {
    id: string;
    userId: string;
    clientName: string;
    clientAddress?: string;
    clientEmail?: string;
    clientPhone?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}


// --- Global Library Types ---
export interface Area {
    id: string;
    name: string;
    description?: string;
}

export interface Task {
    id: string;
    name: string;
    taskRate?: number;
    defaultUnit?: string;
    description?: string;
}

export interface Material {
    id: string;
    name: string;
    defaultRate?: number;
    defaultUnit?: string;
    description?: string;
    options?: MaterialOption[];
    optionsAvailable?: boolean;
}

export interface MaterialOption {
    id: string; 
    name: string;
    name_lowercase?: string; // <-- FIX: Add this line
    description?: string;    // <-- FIX: Add this line
    rateModifier?: number;   // <-- FIX: Changed from rateModifier: number to optional
}

// --- Combined types for use in selectors ---
export type CombinedTask = Task & { isCustom?: boolean };
export type CombinedMaterial = Material & { isCustom?: boolean; optionsAvailable?: boolean; };


// --- User-Specific Library Types ---
export interface UserRateTemplate {
    displayName: string;
    id: string;
    userId: string;
    taskId?: string | null;
    materialId?: string | null;
    materialOptionId?: string | null;
    templateName: string;
    referenceRate: number;
    unit: string;
    inputType: 'quantity' | 'price';
}

export interface KitTemplate {
    id: string;
    userId: string;
    name: string;
    description?: string;
    items: KitTemplateItem[];
}

export interface KitTemplateItem {
    taskId?: string;
    materialId?: string;
    materialOptionId?: string;
    displayName: string; 
    unit: string;
    quantity: number; 
}


// --- Quote Structure ---

export interface Quote {
    id: string;
    userId: string;
    quoteNumber: string;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Archived';
    
    // Client Details
    clientId?: string;
    clientName?: string;
    clientAddress?: string;
    clientEmail?: string;
    clientPhone?: string;

    // Job Details
    jobTitle: string;
    projectDescription?: string;
    additionalDetails?: string;
    terms?: string;

    // Financials
    totalAmount: number;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    sentAt?: Timestamp;
    acceptedAt?: Timestamp;
}

// This represents a document in the 'quoteLines' sub-collection
export interface QuoteLine {
    id: string;
    order: number;
    section: string;
    displayName: string;
    description?: string | null;
    
    // Link to original items
    taskId?: string | null;
    materialId?: string | null;
    materialOptionId?: string | null;
    materialOptionName?: string | null;
    kitTemplateId?: string;
    
    // Calculation fields
    quantity: number | null;
    price: number | null;
    unit: string;
    referenceRate: number | null;
    inputType: 'quantity' | 'price';

    // Total for this line
    lineTotal: number;
}