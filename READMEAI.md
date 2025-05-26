QuoteCraftv6 - Project Context for AI Assistant
Last Updated: May 26, 2025 (AEST)

Project Overview
QuoteCraftv6 is a web application designed to help users (likely businesses or tradespeople) create, manage, and generate professional PDF quotes for their clients. The application is being built with a React frontend and Firebase as the backend. The development is primarily happening within Firebase Studio (IDX).

Core Features Implemented or In Progress:
User Authentication: Firebase Authentication for user login.
Profile & Settings Management (ProfileSettingsPage.tsx):
Users can set up their company profile (business name, address, contact details, ABN/Tax ID).
Configuration for quote generation (default terms, logo URL, quote prefix, next quote number, PDF display preferences like showFullItemizedTableInPdf).
Item Management (Custom Library - ManageCustomItemsPage.tsx):
Users can create and manage custom:
Tasks: (e.g., "Site Setup," "Installation Labor") with default units.
Materials: (e.g., "Colorbond Roofing," "Pendant Light") with default units, rates, and potentially multiple selectable Options.
Kits/Assemblies (KitCreatorPage.tsx, KitSelector.tsx): Pre-defined bundles of tasks and materials.
Rate Templates (UserRateTemplate type): To store specific rates for combinations of Task + Material + MaterialOption.
Quote Builder (QuoteBuilder.tsx):
Main interface for creating new quotes or editing existing ones.
Users can input job details (Job Title, Client Name, Terms, Project Description, Additional Details, General Notes, Valid Until Date).
Users select an "Active Section/Area" for adding line items. Changing this area no longer improperly resets the entire new quote form.
Line Item Creation:
Select from global or user-customized Tasks, Materials (with Options), and Kits.
Enter quantity, price, and a line item description (which now correctly defaults to null if empty, preventing Firestore save errors).
Override calculated rates if necessary.
Line items are grouped by section.
Displays a running total.
Includes modals for quickly adding new custom tasks and materials.
Existing Quotes Page (ExistingQuotesPage.tsx):
Lists all quotes created by the logged-in user.
Displays key information: Quote #, Job Title, Client, Date, Total, Status.
Allows users to:
Edit an existing quote (navigates back to QuoteBuilder).
Change the status of a quote.
New "Export Quote" Functionality:
An "Export Quote" button opens a modal (ExportQuoteModal.tsx).
The modal offers three PDF export options: "Summary PDF," "Standard Detail PDF," and "Full Detailed PDF."
The selected exportLevel is passed to the PDF generation Cloud Function.
PDF Generation (Cloud Function - functions/src/index.ts):
A Firebase Cloud Function (V2, TypeScript, Node.js 20, region: australia-southeast1) named generateQuotePdf.
Triggered as an HTTPS Callable Function.
Receives quoteId, userId, and the new exportLevel parameter.
Fetches user profile data, quote data, and quote line items from Firestore.
Uses Handlebars.js to populate an HTML template.
Conditional Rendering in Template: The HTML template now uses Handlebars conditionals ({{#if isSummary}}, {{#if isStandardDetail}}, {{#if isFullDetail}}, {{#if showFullItemizedTable}}) based on the exportLevel and user profile settings to render different levels of detail in the PDF (e.g., hiding full itemized tables for summary/standard views).
Uses Puppeteer (via puppeteer-core and @sparticuz/chromium) to convert the generated HTML into a PDF.
Returns the PDF as a base64 encoded string.
Technology Stack:
Frontend: React (with Vite), TypeScript
Backend: Firebase
Firebase Authentication
Cloud Firestore (NoSQL database)
Firebase Cloud Functions (V2, Node.js 20, TypeScript)
Firebase Hosting
PDF Generation: Puppeteer (puppeteer-core, @sparticuz/chromium), Handlebars.js
Development Environment: Firebase Studio (IDX)
Styling (Frontend): Regular CSS files (e.g., ExistingQuotesPage.css, ExportQuoteModal.css) and some CSS Modules.
State Management (Frontend): React Context API (AuthContext), component-level state with useState, useMemo, useCallback.
Firestore Data Structure (Key Points Addressed/Relevant to Changes):
Quotes Document (/users/{userId}/quotes/{quoteId}):
Now includes fields for projectDescription, additionalDetails, generalNotes, and validUntil which are populated from new inputs in QuoteBuilder.tsx. These are saved as null if not provided, preventing "undefined" errors.
Quote Lines Subcollection (/users/{userId}/quotes/{quoteId}/quoteLines/{lineId}):
The description field for line items is now correctly saved as null if empty, fixing a previous Firestore error.
Recent Development Focus & Resolutions:
"Export Quote" Modal Implementation:
The ExistingQuotesPage.tsx now features an "Export Quote" button that triggers a modal (ExportQuoteModal.tsx).
This modal provides options for "Summary," "Standard Detail," and "Full Detail" PDF exports.
The Cloud Function generateQuotePdf has been updated to accept an exportLevel parameter.
The HTML_QUOTE_TEMPLATE within the Cloud Function now uses Handlebars conditionals to render different content sections based on the exportLevel and user profile settings (like showFullItemizedTableInPdf).
Bug Fixes in QuoteBuilder.tsx:
Area Selector Reset Issue: Resolved the bug where changing the "Area" in a new quote form would cause other input fields (like Job Title, Client Name) to reset. This was fixed by refining useEffect dependency arrays and logic for initializing new quotes versus loading existing ones.
Firestore undefined Value Errors:
Corrected the handleAddLineItem function to ensure the description field for quote lines defaults to null instead of undefined if left empty.
Added new input fields for projectDescription, additionalDetails, and generalNotes at the main quote level.
The handleSaveQuote function was updated to save these new fields as null if they are empty, preventing Firestore errors.
General Code Refinements:
Addressed various TypeScript errors and warnings that appeared during development.
Re-integrated missing state variables for loading and error handling in QuoteBuilder.tsx.
Immediate Goals / Next Steps:
Thorough Testing of PDF Export Levels: Verify that the "Summary," "Standard Detail," and "Full Detail" PDF exports generate correctly formatted documents with the appropriate content for each level.
Finalize Input Fields: Ensure all necessary fields for a comprehensive quote (like projectDescription, validUntilDate, etc.) are present and working correctly in QuoteBuilder.tsx.
(Future) AI-Powered Quote Suggestions: Revisit the idea of using AI to analyze job descriptions and suggest relevant kits or line items.
(Future) "Assign Trade(s)" Onboarding: Implement the feature to seed a new user's library with relevant tasks, materials, and kits based on their selected trade(s).