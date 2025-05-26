# QuoteCraftv6 - Project Context for AI Assistant

**Last Updated:** May 26, 2025 (AEST) - Reflects discussion on Firestore saves, TypeScript types, initial steps for PDF export variations, and expanded app workflow. Git issues resolved.

## Project Overview

QuoteCraftv6 is a web application designed to help users (likely businesses or tradespeople) create, manage, and generate professional PDF quotes for their clients. The application is being built with a React frontend and Firebase as the backend. The development is primarily happening within Firebase Studio (IDX).

## Typical User Workflow:

1.  **Authentication & Setup:**
    * User signs up or logs in using Firebase Authentication.
    * **(First-time/Optional):** User navigates to "Profile & Settings" (`ProfileSettingsPage.tsx`) to configure their business details (name, address, logo URL, ABN/Tax ID), default quote terms, quote numbering preferences (prefix, next number), and PDF display preferences.

2.  **Pre-Quote Preparations (Building Custom Libraries):**
    * User navigates to "Manage Custom Items" (`ManageCustomItemsPage.tsx`). From here, they can:
        * Create and manage custom **Tasks** (e.g., "Site Setup," "Installation Labor") with default units.
        * Create and manage custom **Materials** (e.g., "Colorbond Roofing," "Pendant Light") with default units, rates, and potentially multiple selectable **Options** (e.g., different sizes or colors for a material, each with its own rate adjustment).
    * User navigates to "Kit Creator" (`KitCreatorPage.tsx`) to define **Kits/Assemblies** – pre-defined bundles of tasks and materials for commonly repeated work.
    * (Implicitly) User might also manage **Rate Templates** if there's a dedicated interface, or these are managed through task/material creation.
    * User can manage their client list via "My Clients" (`MyClientsPage.tsx`).

3.  **Creating or Editing a Quote (`QuoteBuilder.tsx`):**
    * User navigates to create a new quote or selects an existing quote to edit from the "Existing Quotes" page.
    * **Quote Header:**
        * Inputs Job Title.
        * Selects an existing client or enters new client details (name, address, contact). Client details may auto-fill if an existing client is chosen.
        * Enters/reviews quote terms (can be pre-filled from profile/client settings).
        * (Potentially) Enters `projectDescription`, `additionalDetails`, `generalNotes` once input fields are added.
    * **Quote Body (Line Items):**
        * Selects or defines an "Active Section/Area" for the quote (e.g., "Main House Roof," "Kitchen").
        * For each line item within a section:
            * Selects from global or user-customized Tasks using `TaskSelector`.
            * Selects from global or user-customized Materials using `MaterialSelector`.
            * If a material has options, selects a Material Option using `MaterialOptionSelector`.
            * Alternatively, selects a pre-defined Kit/Assembly using `KitSelector`, which adds multiple pre-configured line items.
            * Enters quantity or a fixed price for the line item.
            * Can override calculated rates if necessary.
            * Adds a description/note for the line item.
            * Can add new custom materials on the fly via `QuickAddMaterialModal`.
        * Line items are displayed grouped by their section, with running totals.
    * **Saving:** User saves the quote (either as a new quote, generating a quote number, or updating an existing one).

4.  **Managing Existing Quotes (`ExistingQuotesPage.tsx`):**
    * User views a list of all their created quotes.
    * Key information displayed: Quote #, Job Title, Client, Date, Total, Status.
    * From here, the user can:
        * Edit an existing quote (navigates back to `QuoteBuilder.tsx`).
        * Change the status of a quote (e.g., Draft, Sent, Accepted, Rejected).
        * Trigger PDF generation:
            * Opens `ExportQuoteModal.tsx` (once implemented).
            * Selects PDF type ("summary," "standard detail," or "full detail").
            * The client calls the `generateQuotePdf` Firebase Function with `quoteId`, `userId`, and the chosen `pdfType`.
            * The Cloud Function generates the PDF and returns it as a base64 string.
            * The client side then initiates a download of the PDF.

5.  **Dashboard (`DashboardPage.tsx`):**
    * Provides an overview, potentially showing recent quotes, quote statuses, or summary analytics (feature scope to be detailed).

## Core Features Implemented or In Progress:

1.  **User Authentication:** Firebase Authentication for user login.
2.  **Profile & Settings Management (`ProfileSettingsPage.tsx`):**
    * Users can set up their company profile.
    * Configuration for quote generation.
3.  **Item Management (Custom Library - `ManageCustomItemsPage.tsx`, `KitCreatorPage.tsx`):**
    * Users can create and manage custom Tasks, Materials (with Options), Kits, and Rate Templates.
4.  **Client Management (`MyClientsPage.tsx`)**
    * Users can create and manage their client list.
5.  **Quote Builder (`QuoteBuilder.tsx`):**
    * Main interface for creating/editing quotes.
    * Line items are grouped by section.
    * **Recent Fixes:** Modified save logic (`mainQuotePayload`) to use `null` for empty optional fields (e.g., `projectDescription`, `clientName`) to prevent Firestore errors. Corresponding TypeScript types in `src/types.ts` updated to accept `string | null` for these fields.
    * **Pending Enhancement:** Add input fields in `QuoteBuilder.tsx` for `projectDescription`, `additionalDetails`, and `generalNotes`.
6.  **Existing Quotes Page (`ExistingQuotesPage.tsx`):**
    * Lists quotes, allows editing, status changes.
    * Initiates PDF generation via `ExportQuoteModal.tsx`.
    * **Next Feature:** Fully implement PDF type selection (summary, standard, full detail) in `ExportQuoteModal.tsx`.
7.  **PDF Generation (Cloud Function - `functions/src/index.ts`):**
    * `generateQuotePdf` Firebase Cloud Function using Handlebars.js and Puppeteer.
    * **Upcoming Change:** Will be modified to accept a `pdfType` parameter to generate different versions of the quote PDF.
8.  **Dashboard (`DashboardPage.tsx`):** Basic overview page.


## Technology Stack:

* **Frontend:** React (with Vite), TypeScript
* **Backend:** Firebase (Authentication, Cloud Firestore, Cloud Functions V2, Hosting)
* **PDF Generation:** Puppeteer (via `puppeteer-core` and `@sparticuz/chromium`), Handlebars.js
* **Development Environment:** Firebase Studio (IDX)
* **State Management (Frontend):** React Context API (e.g., `AuthContext`)

## Firestore Data Structure (Key Points):

* User Profiles: `/users/{userId}`
* Clients: `/users/{userId}/clients/{clientId}`
* User-Specific Custom Items (Subcollections under `/users/{userId}` for `customTasks`, `customMaterials`, `kitTemplates`, `rateTemplates`)
* Quotes (Subcollection under `/users/{userId}`): `/users/{userId}/quotes/{quoteId}`
    * Optional fields like `projectDescription`, `clientName`, etc., now use `null` for empty values.
* Quote Lines (Subcollection under each quote): `/users/{userId}/quotes/{quoteId}/quoteLines/{lineId}`
    * Optional fields like `description` now use `null` for empty values.

## Current Status & Main Challenges/Goals:

1.  **Implement PDF Export Variations:**
    * **Goal:** Allow users to select and generate "summary PDF", "standard detail PDF", or "full detail PDF" via `ExportQuoteModal.tsx`.
    * Requires client-side UI in `ExportQuoteModal.tsx` to select PDF type, passing the selected `pdfType` to the `generateQuotePdf` Firebase Cloud Function, and modifying the `generateQuotePdf` function (`functions/src/index.ts`) to handle the `pdfType` parameter. This may involve different Handlebars templates or conditional logic.
    * The `ExportQuoteModal.tsx` and `ExportQuoteModal.css` files have been created and are now assumed to be pushed to the remote repository.
2.  **Enhance QuoteBuilder:**
    * Add input fields for `projectDescription`, `additionalDetails`, and `generalNotes` in `QuoteBuilder.tsx` to allow users to populate these fields for new quotes.

## Files Provided/Discussed Recently (Relevant to recent changes):

* `QuoteCraftV6/src/components/QuoteBuilder.tsx` (modified for Firestore save logic)
* `QuoteCraftV6/src/types.ts` (modified for `string | null` types)
* `QuoteCraftV6/functions/src/index.ts` (to be modified for PDF types)
* `QuoteCraftV6/src/pages/ExistingQuotesPage.tsx` (will likely trigger `ExportQuoteModal.tsx`)
* `QuoteCraftV6/src/components/ExportQuoteModal.tsx` (now assumed to be accessible)
* `QuoteCraftV6/src/components/ExportQuoteModal.css` (now assumed to be accessible)
* `QuoteCraftV6/src/pages/MyClientsPage.tsx`
* `QuoteCraftV6/src/pages/KitCreatorPage.tsx`
* `QuoteCraftV6/src/pages/DashboardPage.tsx`
* Original `READMEAI.md`
* Screenshot of Firebase Studio Source Control panel (showed local commit).