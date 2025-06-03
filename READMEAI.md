# QuoteCraftv6 - UI/UX Enhancement Plan

**Last Updated:** June 3, 2025 *(Updated to reflect recent changes)*

## 1. Overall UI/UX Goals

* **Primary Objective 1:** Modernize the visual appearance for a clean, professional, and trustworthy feel.
* **Primary Objective 2:** Improve ease of use for key workflows, especially quote creation and management, to enhance user efficiency.
* **Primary Objective 3:** Ensure a responsive and accessible experience across common devices (desktop, tablet, mobile).
* **Target User Persona(s):** Tradespeople, estimators, small to medium-sized businesses requiring an efficient quoting tool.
* **Desired Look & Feel:** Intuitive, professional, fast, modern, reliable, and polished.

## 2. Foundational UI/UX Enhancements (Phase 1 - Immediate Focus)

### 2.1. Color Scheme & Typography
* **Current State:** Basic styling, mix of inline styles and CSS Modules. CSS Modules now more consistently used.
* **Desired Enhancements:**
    * [ ] Define a consistent color palette:
        * Primary Color: `_________` (e.g., for buttons, active elements)
        * Secondary Color: `_________` (e.g., for secondary actions, borders)
        * Accent Color: `_________` (e.g., for highlights, notifications)
        * Neutral - Text: `_________` (e.g., dark grey/black)
        * Neutral - Background (Main): `_________` (e.g., white/off-white)
        * Neutral - Background (Sections/Cards): `_________`
        * Neutral - Borders/Dividers: `_________`
    * [ ] Standardize typography:
        * Primary Font (Body & UI): `_________` (e.g., Inter, Lato, Open Sans from Google Fonts)
        * Heading Font (if different): `_________`
        * Define hierarchy (sizes, weights) for H1, H2, H3, p, label, small.
    * [ ] Apply globally via `src/index.css` or CSS Variables for module consumption.
* **Action Items/Notes:**
    * Discuss initial color preferences.
    * Select web-safe/Google Fonts.

### 2.2. Basic Element Styling Consistency
* **Current State:** Varies per component/module. Some global button styles initiated.
* **Desired Enhancements:**
    * [ ] Create consistent base styles for:
        * Buttons (primary, secondary, danger/warning).
        * Form Inputs (text, textarea, select, checkbox).
        * Modals.
        * Tables.
* **Action Items/Notes:**
    * Implement based on chosen color scheme and typography.

### 2.3. Core Usability & Layout Review (High-Impact Areas)
* **Current State:** Functional, significant improvements made to QuoteBuilder.
* **Desired Enhancements:**
    * [x] Review and simplify the layout of `QuoteBuilder.tsx` for better workflow. *(Implemented multi-step wizard, streamlined Step 1, added sticky navigation bar. Content centering addressed.)*
    * [ ] Improve table readability and actions on `ExistingQuotesPage.tsx`.
    * [ ] Standardize loading state indicators (e.g., simple spinner for now).
    * [ ] Replace browser `alert()` with a consistent, non-blocking notification/toast system (e.g., for save success/error). *(Partially addressed for AI generation errors, but a global system is needed).*
* **Action Items/Notes:**
    * Focus on one page/component at a time after global styles are set.

### 2.4. Responsiveness Basics
* **Current State:** Varies. `MainLayout.tsx` improved for centering.
* **Desired Enhancements:**
    * [x] Ensure `Header.tsx` and `MainLayout.tsx` are responsive and handle centering.
    * [ ] Basic checks for key pages like `QuoteBuilder.tsx` (wizard steps) and `ExistingQuotesPage.tsx` on smaller screens.
* **Action Items/Notes:**
    * Focus on preventing broken layouts initially.

### 2.5. Accessibility Basics
* **Current State:** Minimal explicit implementation.
* **Desired Enhancements:**
    * [ ] Ensure semantic HTML where possible.
    * [ ] Basic keyboard navigation checks for interactive elements.
    * [ ] Check for sufficient color contrast once the palette is defined.
* **Action Items/Notes:**
    * Incorporate during component styling and layout reviews.

## 3. Animation with GSAP (Phased Integration)

### 3.1. Phase 1: No GSAP (Focus on UI/UX Foundation)
* **Status:** Current phase.
* **Rationale:** Establish solid structure, styling, and core usability before introducing animations. Main layout fade-in initiated in `MainLayout.tsx`.

### 3.2. Phase 2: Subtle & Enhancing GSAP Animations
* **Trigger:** After the foundational UI/UX (colors, typography, basic layouts, core usability of main pages) is stable and consistent.
* **Goals:** Improve user experience with smooth transitions and meaningful feedback without being distracting.
* **Potential GSAP Uses (Core & ScrollTrigger for simple entrances):**
    * [ ] Subtle page transitions (e.g., fades, quick slides) for wizard steps.
    * [ ] Micro-interactions for buttons, form elements on hover/focus/click.
    * [ ] Smooth animations for modal dialogs (open/close).
    * [ ] Smooth enter/exit animations for list items (e.g., quote lines, items in management pages).
    * [ ] Simple ScrollTrigger effects: fade-in elements as they enter the viewport on longer pages.
* **Action Items/Notes:**
    * Identify specific elements/interactions for initial subtle animations.
    * Ensure animations are quick and don't hinder performance.

### 3.3. Phase 3: Advanced & "Delightful" GSAP Animations
* **Trigger:** After the application is robust, Phase 2 animations are well-integrated, and the core product is polished. When looking to add premium "wow" factors.
* **Goals:** Create more engaging and memorable user experiences in specific, appropriate areas.
* **Potential GSAP Uses (Premium Plugins like SplitText, MorphSVG; Advanced ScrollTrigger):**
    * [ ] **SplitText:** Engaging text reveals for headings, key messages, or section titles.
    * [ ] **MorphSVG:** Animating icons (e.g., status changes, success indicators), creative transitions between UI states using SVG.
    * [ ] **ScrollTrigger (Advanced):** More complex scroll-driven animations for landing/marketing pages (if any) or detailed feature showcases. Pinning elements, scrubbing animations.
    * [ ] **Complex GSAP Timelines:** Orchestrating multiple animations for sophisticated effects (e.g., onboarding tour, data visualizations on the dashboard).
* **Important Considerations for Advanced Animations:**
    * Maintain high performance; test thoroughly.
    * Ensure animations are purposeful and enhance usability or delight, not distract.
    * Consider user preferences for reduced motion.
* **Action Items/Notes:**
    * Identify specific "moments" in the app that could benefit most from these advanced effects.

## 4. Page-Specific UI/UX Enhancements (To be detailed after Phase 1 Foundations)

* **`QuoteBuilder.tsx`:**
    * **Done/In Progress:**
        * Implemented a multi-step wizard interface (Step 1: Job/Client, Step 2: Line Items, Step 3: Notes & Review).
        * Added a sticky bottom navigation bar for wizard progression.
        * Simplified Step 1: Focus on Job Title, Client Selection (from existing clients), and Quote Valid Until. Client details (name, email, etc.) are auto-populated for display from selection.
        * Added "+ Add New Client" and "Edit Client" buttons in Step 1, navigating to `/my-clients`.
        * Moved "Project Description," "Additional Details," and "General Notes" text areas to Step 3.
        * Integrated "Generate with AI" buttons next to these text areas in Step 3.
    * **Future Considerations:**
        * Real-time quote total updates in sticky bar or header.
        * Drag-and-drop reordering for line items/sections.
        * More intuitive Kit selection and preview before adding to quote.
        * UI for handling AI generation (loading states, error messages within the component).
* **`ExistingQuotesPage.tsx`:** (e.g., search, filter, pagination, card view)
* **`ProfileSettingsPage.tsx`:** (e.g., organization via tabs, tooltips)
* **Data Management Pages (Clients, Kits, Custom Items):** (e.g., consistent tables, streamlined forms, search)
* **`DashboardPage.tsx`:** (e.g., metrics, charts, actionable summaries)

## 5. UI/UX for Future Features

* **AI Content Generation:**
    * **In Progress:**
        * Added "Generate with AI" buttons in `QuoteBuilder.tsx` (Step 3) for Project Description, Additional Details, and General Notes.
        * Implemented frontend logic (`handleGenerateWithAI`) in `QuoteBuilder.tsx` to construct prompts (based on Job Title, Client Name, and Quote Lines) and call a Firebase Cloud Function.
        * Developed and debugged a new Firebase Cloud Function `generateQuoteText` (using `onCall` trigger in `australia-southeast1`) in `functions/src/index.ts`. This function interfaces with Google's Vertex AI (Gemini model) to generate text based on the provided prompt.
        * Addressed various TypeScript, CORS (via client-side region specification for `onCall`), and linting issues for the Cloud Function.
    * **Key UI Considerations (Future):**
        * Clearer visual indication of AI-generated content within textareas.
        * User-friendly display of AI generation in progress (beyond button text).
        * More sophisticated error handling and display for AI failures directly in the UI.
        * Potential for users to give feedback on or refine AI prompts (advanced).

## 6. Tooling & Process

* **Design Tools (Optional):** Figma (for mockups if needed for complex changes).
* **Component Library/Framework Choice:** Continue with CSS Modules, CSS Variables for themeability.
* **Testing Strategy for UI/UX:** Manual testing on different browsers/devices; gather user feedback when possible. Test AI generation with various inputs.

## 7. Prioritization & Roadmap (Simplified for Initial Focus)

* **Phase 1 - Immediate Priorities:**
    * [ ] Define and apply a new color scheme globally.
    * [ ] Define and apply basic global typography.
    * [x] Remove "Summary Sections" setting from `ProfileSettingsPage.tsx` & `UserProfile` type. *(Assuming this was implicitly done or not a blocker)*
    * [x] Initial review and **major layout refactor** for `QuoteBuilder.tsx` (wizard implementation) for usability gains.
    * [ ] Implement a non-blocking notification system (toasts) for save/error messages (including AI generation feedback).
    * [ ] Thoroughly test and refine the "Generate with AI" feature (both frontend and backend Cloud Function).
* **Phase 2 - Next Steps (After Phase 1):**
    * [ ] Introduce subtle GSAP animations (as per section 3.2).
    * [ ] Deeper UI/UX enhancements for `QuoteBuilder.tsx` (e.g., kit preview, drag-and-drop).
    * [ ] UI/UX enhancements for `ExistingQuotesPage.tsx`.
    * [ ] Comprehensive responsiveness pass for all wizard steps and key pages.
* **Phase 3 - Future Polish:**
    * [ ] Advanced GSAP animations (as per section 3.3).
    * [ ] UI/UX enhancements for other pages (`ProfileSettingsPage`, Data Management, `DashboardPage`).
    * [ ] Deeper accessibility audit and improvements.
    * [ ] Further refinement of AI Content Generation UI/UX (e.g., prompt helpers, editing generated content).