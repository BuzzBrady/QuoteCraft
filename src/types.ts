// src/types.ts
// -------------
// Contains TypeScript interfaces for Firestore data structures
// Updated to align with QuoteBuilder.tsx and fix TS errors.

import { Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth'; // Import Firebase User type

// --- Authentication Context ---
export interface AuthContextType {
    currentUser: User | null;
    loadingAuthState: boolean;
    logout: () => Promise<void>; 
}

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
    defaultQuoteTerms?: string; 
    quotePrefix?: string;       
    nextQuoteSequence: number; 
    quoteNumberPadding?: number;
    summarySections?: string[];
    showFullItemizedTableInPdf?: boolean;
    showUnitPricesInPdf?: boolean; 
    taxRate?: number; 
    currencyCode?: string; 
    acceptanceInstructions?: string;
    salesContactPerson?: string;
    companyWebsite?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// --- Client ---
// (Subcollection: users/{userId}/clients)
export interface Client {
    id: string; // Firestore document ID
    userId: string; // Owner's ID
    clientName: string;
    clientContactPerson?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string; // Or a structured address object
    clientNotes?: string;
    defaultClientTerms?: string;
    createdAt: Timestamp; // Should be Timestamp from 'firebase/firestore'
    updatedAt: Timestamp; // Should be Timestamp from 'firebase/firestore'
}


// --- Global Area ---
export interface Area {
    id: string; 
    name: string;
    name_lowercase?: string; 
    order?: number;
    description?: string;
    type?: string; 
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// --- Global Task ---
export interface Task {
    id: string; 
    name: string;
    name_lowercase?: string;
    description?: string;
    defaultUnit?: string; 
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// --- Custom Task (User-Specific) ---
export interface CustomTask extends Omit<Task, 'id'> { 
    id: string; 
    userId: string; 
}

// --- Global Material ---
export interface Material {
    id: string; 
    name: string;
    name_lowercase?: string;
    description?: string;
    optionsAvailable: boolean; 
    searchKeywords?: string[];
    defaultRate?: number;   
    defaultUnit?: string;   
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    isGlobal?: boolean;       
}

// --- Custom Material (User-Specific) ---
export interface CustomMaterial extends Omit<Material, 'id'> { 
    id: string; 
    userId: string; 
    isCustom?: boolean; 
}


// --- Material Option ---
export interface MaterialOption {
    id: string; 
    userId?: string; 
    name: string;
    name_lowercase?: string;
    description?: string;
    rateModifier?: number; 
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}


// --- User Rate Template ---
export interface UserRateTemplate {
    id: string; 
    userId: string; 
    taskId: string | null; 
    materialId: string | null; 
    materialOptionId: string | null; 
    displayName: string; 
    displayName_lowercase?: string; 
    referenceRate: number; 
    unit: string; 
    inputType: 'quantity' | 'price' | 'checkbox'; 
    order?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// --- Kit Line Item Template (Structure within KitTemplate) ---
export interface KitLineItemTemplate {
    taskId: string | null; 
    materialId: string | null; 
    materialOptionId: string | null; 
    materialOptionName?: string | null; 
    displayName: string; 
    unit: string; 
    inputType: 'quantity' | 'price' | 'checkbox';
    baseQuantity: number; 
    description?: string; 
}

// --- Kit Template (Global or User-Specific) ---
export interface KitTemplate {
    id: string; 
    userId?: string; 
    name: string;
    name_lowercase?: string;
    description?: string;
    tags?: string[]; 
    isGlobal?: boolean; 
    lineItems: KitLineItemTemplate[]; 
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// --- Quote Line Item ---
export interface QuoteLine {
    id: string; 
    section: string; 
    taskId: string | null; 
    materialId: string | null; 
    materialOptionId: string | null; 
    materialOptionName?: string | null; 
    displayName: string; 
    description?: string; 
    quantity: number | null; 
    price: number | null; 
    unit: string | null; 
    referenceRate: number | null; 
    inputType: 'quantity' | 'price' | 'checkbox' | null; 
    lineTotal: number; 
    order: number; 
    kitTemplateId?: string; 
}

// --- Quote ---
export interface Quote {
    id: string; 
    userId: string; 
    quoteNumber: string; 
    jobTitle: string;
    clientName?: string; 
    clientAddress?: string; 
    clientPhone?: string; 
    clientEmail?: string; 
    status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
    totalAmount: number; 
    terms?: string; 
    projectDescription?: string; 
    additionalDetails?: string; 
    generalNotes?: string; 
    validUntil?: Timestamp | null; 
    currencyCode?: string; 
    createdAt: Timestamp; 
    updatedAt: Timestamp; 
}

