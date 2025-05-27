# QuoteCraftv6 - UI/UX Enhancement Plan

**Last Updated:** May 27, 2025

## 1. Overall UI/UX Goals

* **Primary Objective 1:** (e.g., Modernize the visual appearance)
* **Primary Objective 2:** (e.g., Improve ease of use for key workflows like quote creation)
* **Primary Objective 3:** (e.g., Ensure better responsiveness on mobile/tablet devices)
* **Target User Persona(s):** (Briefly describe who you're designing for, e.g., busy tradespeople, estimators)
* **Desired Look & Feel:** (e.g., Clean, professional, intuitive, quick, modern, minimalist, robust)

## 2. Global UI/UX Enhancements

### 2.1. Styling & Theming
* **Current State:** (e.g., Mix of inline styles, CSS Modules, basic global CSS)
* **Desired Enhancements:**
    * [x] Define a consistent color palette.
        * Primary Color1: `#4DA8DA`
        * Primary Color2: `#FFFFFF`
        * Secondary Color1: `#A9B1B7`
        * Secondary Color2: `#A9B1B7`
        * Accent Color: `#00BFFF`
        * Text Color: `#FFFFFF`
        * Background Color: `#2C2C2C`
    * [ ] Standardize typography (font choices, sizes, weights for headings, paragraphs, labels).
        * Primary Font: `Monserratt`
        * Secondary Font (if any): `_________`
    * [] Create consistent styles for common elements (buttons, form inputs, modals, tables).
    * [] Consider adopting a UI component library (e.g., Material UI, Chakra UI, Mantine) or a utility-first CSS framework (e.g., Tailwind CSS) to speed up development and ensure consistency. If so, which one? `_________`
    * [ ] Dark Mode (Optional): `Yes/No/Future`
* **Action Items/Notes:**
    * `_________________________________________________________`

### 2.2. Responsiveness
* **Current State:** (e.g., Basic responsiveness, some pages may not adapt well to small screens)
* **Desired Enhancements:**
    * [ ] Ensure all pages are fully responsive and usable on mobile, tablet, and desktop.
    * [ ] Test key workflows on different screen sizes.
* **Specific Pages/Components to Check:**
    * `QuoteBuilder.tsx`
    * `ExistingQuotesPage.tsx` (especially the table)
    * Data management pages (Clients, Kits, Custom Items)
* **Action Items/Notes:**
    * `_________________________________________________________`

### 2.3. Accessibility (a11y)
* **Current State:** (e.g., Basic accessibility, not fully audited)
* **Desired Enhancements:**
    * [ ] Ensure proper keyboard navigation for all interactive elements.
    * [ ] Add ARIA attributes where necessary for semantic meaning.
    * [ ] Check and ensure sufficient color contrast ratios.
    * [ ] Implement clear focus indicators.
* **Action Items/Notes:**
    * `_________________________________________________________`

### 2.4. Loading States & User Feedback
* **Current State:** (e.g., Some loading text, uses browser `alert()` for messages)
* **Desired Enhancements:**
    * [ ] Implement consistent visual loading indicators (e.g., spinners, skeleton screens) for data fetching and operations.
    * [ ] Replace browser `alert()` messages with more integrated notifications/toasts (e.g., using a library like `react-toastify` or custom components).
    * [ ] Provide clear success, error, and warning messages.
* **Action Items/Notes:**
    * `_________________________________________________________`

### 2.5. Navigation
* **Current State:** (e.g., Header-based navigation via `Header.tsx` and `MainLayout.tsx`)
* **Desired Enhancements:**
    * [ ] Review clarity and intuitiveness of main navigation links.
    * [ ] Consider adding breadcrumbs for deeply nested pages (if any).
* **Action Items/Notes:**
    * `_________________________________________________________`

## 3. Page-Specific UI/UX Enhancements

### 3.1. `QuoteBuilder.tsx`
* **Current Pain Points/Areas for Improvement:**
    * (e.g., Layout of client info vs. item entry feels cluttered)
    * (e.g., Managing "Active Section/Area" could be more intuitive)
    * (e.g., Adding multiple line items can be repetitive)
* **Desired Enhancements:**
    * [ ] Improve overall layout for better visual hierarchy and workflow.
    * [ ] Consider a two-column layout (settings/info on one side, line items on the other).
    * [ ] Drag-and-drop reordering for line items.
    * [ ] Drag-and-drop reordering for sections.
    * [ ] "Quick add" functionality for tasks/materials directly from line item entry if current modal flow is too slow.
    * [ ] Better visual distinction between selected items (Task, Material, Option) and input fields.
    * [ ] Real-time update of quote totals as items are added/modified.
    * [ ] Clearer indication of which fields are overriding defaults (e.g., `overrideRateInput`).
* **Action Items/Notes:**
    * `_________________________________________________________`

### 3.2. `ExistingQuotesPage.tsx`
* **Current Pain Points/Areas for Improvement:**
    * (e.g., Table can become hard to read with many quotes)
    * (e.g., Action buttons could be grouped better)
* **Desired Enhancements:**
    * [ ] Add search functionality for quotes (by quote #, client name, job title).
    * [ ] Add filtering options (e.g., by status, date range).
    * [ ] Implement pagination if the list can grow very long.
    * [ ] Improve visual design of status indicators.
    * [ ] Consider a "card" view as an alternative to the table view for quotes.
* **Action Items/Notes:**
    * `_________________________________________________________`

### 3.3. `ProfileSettingsPage.tsx`
* **Current Pain Points/Areas for Improvement:**
    * (e.g., Page is getting long with many settings)
* **Desired Enhancements:**
    * [ ] Group settings more clearly (e.g., using tabs: Company, Quote Defaults, PDF Settings).
    * [ ] Provide tooltips or helper text for less obvious settings.
* **Action Items/Notes:**
    * `_________________________________________________________`

### 3.4. Data Management Pages (MyClients, KitCreator, ManageCustomItems)
* **Current Pain Points/Areas for Improvement:**
    * (General review needed)
* **Desired Enhancements:**
    * [ ] Consistent table/list design for viewing items.
    * [ ] Streamlined forms for adding/editing clients, kits, tasks, materials.
    * [ ] Search and filter capabilities within each management page.
    * [ ] Clearer visual cues for global vs. custom items.
* **Action Items/Notes:**
    * `_________________________________________________________`

### 3.5. `DashboardPage.tsx`
* **Current Pain Points/Areas for Improvement:**
    * (Currently basic)
* **Desired Enhancements:**
    * [ ] Add key metrics (e.g., total value of draft quotes, number of accepted quotes this month).
    * [ ] Visual charts/graphs (e.g., quote status distribution, quote values over time).
    * [ ] List of recent quotes or quotes needing attention.
* **Action Items/Notes:**
    * `_________________________________________________________`

## 4. UI/UX for Future Features (e.g., AI Content Generation)
* **Feature:** (e.g., AI Text Generation for Quote Sections)
    * **User Interaction Points:** (e.g., Button in QuoteBuilder, modal for AI interaction)
    * **Key UI Considerations:** (e.g., Clear indication of AI-generated content, easy editing, prompt guidance)
* **Action Items/Notes:**
    * `_________________________________________________________`

## 5. Tooling & Process
* **Design Tools (Optional):** (e.g., Figma, Sketch, Adobe XD for mockups)
* **Component Library/Framework Choice (if changing/adopting):** `_________`
* **Testing Strategy for UI/UX:** (e.g., User testing with target audience, A/B testing for certain features)
* **Action Items/Notes:**
    * `_________________________________________________________`

## 6. Prioritization & Roadmap
* **High Priority (Must-Haves for Next Iteration):**
    * 1. `_________________________`
    * 2. `_________________________`
* **Medium Priority (Nice-to-Haves):**
    * 1. `_________________________`
    * 2. `_________________________`
* **Low Priority (Future Consideration):**
    * 1. `_________________________`
    * 2. `_________________________`