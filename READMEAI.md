# QuoteCraftv6 - Project Context for AI Assistant

**Last Updated:** May 19, 2025 (AEST)

## Project Overview

QuoteCraftv6 is a web application designed to help users (likely businesses or tradespeople) create, manage, and generate professional PDF quotes for their clients. The application is being built with a React frontend and Firebase as the backend. The development is primarily happening within Firebase Studio (IDX), a cloud-based IDE.

## Core Features Implemented or In Progress:

1.  **User Authentication:** Firebase Authentication for user login.
2.  **Profile & Settings Management (`ProfileSettingsPage.tsx`):**
    * Users can set up their company profile (business name, address, contact details, ABN/Tax ID).
    * Configuration for quote generation (default terms, logo URL, quote prefix, next quote number, PDF display preferences).
3.  **Item Management (Custom Library - `ManageCustomItemsPage.tsx`):**
    * Users can create and manage custom:
        * **Tasks:** (e.g., "Site Setup," "Installation Labor") with default units.
        * **Materials:** (e.g., "Colorbond Roofing," "Pendant Light") with default units, rates, and potentially multiple selectable **Options** (e.g., different sizes or colors for a material, each with its own rate adjustment).
        * **Kits/Assemblies (`KitSelector.tsx`):** Pre-defined bundles of tasks and materials.
        * **Rate Templates (`UserRateTemplate` type):** To store specific rates for combinations of Task + Material + MaterialOption.
4.  **Quote Builder (`QuoteBuilder.tsx`):**
    * Main interface for creating new quotes or editing existing ones.
    * Users can input job details (Job Title, Client Name, Terms).
    * Users select an "Active Section/Area" (e.g., "Main House Roof," "Kitchen").
    * **Line Item Creation:**
        * Select from global or user-customized Tasks.
        * Select from global or user-customized Materials.
        * If a material has options, select a Material Option.
        * Select from Kits/Assemblies (which add multiple pre-configured lines).
        * Enter quantity or a fixed price.
        * Override calculated rates if necessary.
        * Add a description/note for each line item.
    * Line items are grouped by section.
    * Displays a running total.
    * **Quick Add Material Modal:** Allows adding a new custom material on the fly from the Quote Builder.
5.  **Existing Quotes Page (`ExistingQuotesPage.tsx`):**
    * Lists all quotes created by the logged-in user.
    * Displays key information: Quote #, Job Title, Client, Date, Total, Status.
    * Allows users to:
        * Edit an existing quote (navigates back to `QuoteBuilder`).
        * Change the status of a quote (e.g., Draft, Sent, Accepted, Rejected).
        * **Generate and Download a PDF version of the quote.**
6.  **PDF Generation (Cloud Function - `functions/src/index.ts`):**
    * A Firebase Cloud Function (V2, TypeScript, Node.js 20 runtime, region: `australia-southeast1`) named `generateQuotePdf`.
    * Triggered as an HTTPS Callable Function from the client.
    * Receives `quoteId` and `userId`.
    * Fetches user profile data, quote data, and quote line items from Firestore.
    * Uses **Handlebars.js** to populate a detailed HTML template (which includes CSS for styling based on example quote images like `image_3a8482.png` and `image_3a874a.png`).
    * Uses **Puppeteer (via `puppeteer-core` and `@sparticuz/chromium`)** to convert the generated HTML into a PDF.
    * Returns the PDF as a base64 encoded string to the client.

## Technology Stack:

* **Frontend:** React (with Vite), TypeScript
* **Backend:** Firebase
    * Firebase Authentication
    * Cloud Firestore (NoSQL database)
    * Firebase Cloud Functions (V2, Node.js 20, TypeScript)
    * Firebase Hosting (for deploying the React app)
* **PDF Generation:** Puppeteer (via `puppeteer-core` and `@sparticuz/chromium` in Cloud Function), Handlebars.js
* **Development Environment:** Firebase Studio (IDX) - a Nix-managed environment.
* **Styling (Frontend):** Likely CSS Modules (e.g., `KitSelector.module.css`) and some inline styles.
* **UI Components (examples):** `AreaSelector`, `TaskSelector`, `MaterialSelector`, `MaterialOptionSelector`, `KitSelector`, `QuoteLineItemDisplay`, `QuickAddMaterialModal`.
* **State Management (Frontend):** React Context API (e.g., `AuthContext`).

## Firestore Data Structure (Key Points):

* **User Profiles:** `/users/{userId}` (contains company details, PDF settings, quote numbering sequence: `nextQuoteSequence`, `quotePrefix`, `quoteNumberPadding`).
* **User-Specific Custom Items (Subcollections under `/users/{userId}`):**
    * `customTasks/{taskId}`
    * `customMaterials/{materialId}`
        * `options/{optionId}` (sub-subcollection for material options)
    * `kitTemplates/{kitId}` (user-specific)
    * `rateTemplates/{rateId}`
* **Quotes (Subcollection under `/users/{userId}`):**
    * `/users/{userId}/quotes/{quoteId}` (contains quote header info like `jobTitle`, `clientName`, `totalAmount`, `status`, `quoteNumber`, `createdAt`, `updatedAt`, PDF template related fields like `projectDescription`, `additionalDetails`, `generalNotes`, `terms`).
    * `quoteLines` (sub-subcollection under each quote: `/users/{userId}/quotes/{quoteId}/quoteLines/{lineId}`) (contains `displayName`, `section`, `quantity`, `unit`, `price`, `referenceRate`, `inputType`, `lineTotal`, `order`, `description`).
* **Global Read-Only Data (Potentially at the root, though user mentioned these are not yet developed for seeding):**
    * `/areas/{areaId}`
    * `/tasks/{taskId}`
    * `/materials/{materialId}` (with potential `options` subcollection)
    * `/kitTemplates/{kitId}` (where `isGlobal: true`)

## Current Status & Main Challenges:

1.  **Local Development with Firebase Emulators:**
    * **Java successfully installed in Firebase Studio (IDX) Nix environment** by adding `pkgs.temurin-17-jre-bin` to `.idx/dev.nix`.
    * **Firebase Emulators (Auth, Firestore, Functions) ARE starting successfully.**
    * **CURRENT BLOCKER:** The React application (running in the Firebase Studio preview window) is **experiencing network connectivity issues when trying to communicate with the local Firebase Auth Emulator.**
        * **Symptom:** Browser console shows `FirebaseError: [code=unknown]: Fetching auth token failed: Firebase: Error (auth/network-request-failed).`
        * This prevents login with emulated users and subsequent Firestore operations.
        * **Hypothesis:** This is due to the networking setup within Firebase Studio (IDX) and how it handles communication between the browser preview (likely on an HTTPS `*.cloudworkstations.dev` URL) and services listening on `localhost` or `0.0.0.0` within the IDX workspace container (e.g., Auth emulator on HTTP `127.0.0.1:9099`). Mixed Content issues were seen when trying HTTP URLs for Auth from an HTTPS page. Using an HTTPS URL for the Auth emulator (`https://9099-IDX_BASE_HOST`) led to a `400 Bad Request (auth/user-not-found)`, indicating the request *reached* the emulator but the user didn't exist (which is expected for an empty emulator). However, other SDK connections to Firestore/Functions might still fail with `TypeError: Failed to fetch`.
        * **Current `firebaseConfig.ts`:** Attempts to use specific IDX hostnames for emulator connections.
    * **Data Seeding for Emulators:** The user wants to replicate their live production data into the emulator. A `seedEmulator.cjs` script was developed to read from live Firestore (using Admin SDK) and write to the emulated Firestore (also using Admin SDK, configured by `FIRESTORE_EMULATOR_HOST`). The script initially reported "No data found" from live, likely due to incorrect assumptions about global collections or an issue with the service account key for the live project. The script has been refined to focus on user-specific subcollections.

2.  **Cloud Function PDF Generation (`generateQuotePdf`):**
    * **Current Strategy:** Using `puppeteer-core` and `@sparticuz/chromium` for reliable browser availability in the Cloud Function runtime. Memory is set to "2GiB" and timeout to 300s.
    * **Past Issue (Potentially Resolved by `@sparticuz/chromium` but not yet fully tested at runtime due to emulator connectivity issues):** "Could not find Chrome" error when the deployed function ran, indicating Chromium wasn't correctly bundled or found.
    * The `predeploy` hooks in `firebase.json` are now only for `lint` and `build (tsc)`. No Puppeteer browser installation commands are there.
    * The `functions/package.json` includes `puppeteer-core` and `@sparticuz/chromium` in dependencies and no `gcp-build` script.
    * The `functions/src/index.ts` has been updated to import from `puppeteer-core`, `import chromium from "@sparticuz/chromium"`, and use `await chromium.executablePath()` etc. It also includes the fix for `__dirname` in ES Modules using `fileURLToPath(import.meta.url)`.

## Immediate Goals:

1.  **Resolve the `auth/network-request-failed` error to enable reliable connection from the Firebase Studio app preview to the local Firebase Emulators (Auth and Firestore primarily).** This will allow testing with local data.
2.  Once emulators are accessible, **populate the Firestore emulator with test data** (either by fixing/running `seedEmulator.cjs` or by manually adding a few key documents via Emulator UI and then using the emulator's `--import/--export-on-exit` feature).
3.  **Thoroughly test the `generateQuotePdf` function locally using the Functions Emulator** to ensure `@sparticuz/chromium` works and PDF generation logic is correct.
4.  Successfully deploy the working Cloud Function and test PDF generation from the live application.

## Files Provided/Discussed Recently:

* `QuoteCraftV6/firebase.json`
* `QuoteCraftV6/functions/package.json`
* `QuoteCraftV6/functions/src/index.ts`
* `QuoteCraftV6/src/config/firebaseConfig.ts`
* `QuoteCraftV6/firestore.rules`
* `QuoteCraftV6/functions/tsconfig.json`
* `QuoteCraftV6/functions/eslint.config.js` (and implicitly, `.eslintrc.js` was removed from `functions`)
* `QuoteCraftV6/.idx/dev.nix` (for managing the Firebase Studio environment packages like Java, sudo)
* `QuoteCraftV6/seedEmulator.cjs`
* Screenshots of Firebase Console (Firestore data, Functions dashboard, Cloud Build logs, Cloud Function runtime logs), browser console errors, VS Code/Studio file explorer.

