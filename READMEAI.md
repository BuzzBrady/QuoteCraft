

    ## Architectural Refactor Summary (June 2025)

The application recently underwent a significant architectural refactor to improve scalability, maintainability, and developer experience. The core goal was to establish a clear **separation of concerns** between the application's state, logic, and view layers.

### Core Problems Addressed

* **Monolithic Components:** Components like `QuoteBuilder` were responsible for too much, managing dozens of state variables and all data-fetching logic.
* **Prop Drilling:** Global data (like tasks and materials) and state were passed down through many layers of components, creating tight coupling.
* **Repetitive Logic:** Data-fetching logic was duplicated across many page-level components.
* **Flawed Data Model:** The initial `Quote` type stored line items as a large array within the main document, posing a significant risk of exceeding Firestore's 1MB document size limit.

### The New Architecture

The new architecture is built on a foundation of centralized stores and reusable hooks.

#### **State Management (Zustand)**

1.  **`useDataStore` (`src/stores/useDataStore.ts`):** A global store that acts as a central cache for non-user-specific data (e.g., `allTasks`, `allMaterials`, `allAreas`). It fetches this data once on app load and makes it available to any component, eliminating prop drilling for this data.

2.  **`useQuoteBuilderStore` (`src/stores/useQuoteBuilderStore.ts`):** A feature-specific store that encapsulates all the complex state and logic for the quote creation/editing process. It manages the quote header, line items, form state, and save/load actions. This transformed the `QuoteBuilder` component into a lightweight "orchestrator."

#### **Logic & Data Fetching (Custom Hooks)**

1.  **`useUserCollection` (`src/hooks/useUserCollection.ts`):** A generic and reusable hook for fetching any user-specific collection from Firestore (e.g., `clients`, `quotes`, `customTasks`). It replaced all repetitive `useEffect` fetching logic in page components. It has been enhanced to support sorting and query limits.

2.  **`useUserProfile` (`src/hooks/useUserProfile.ts`):** A dedicated hook for managing the logged-in user's profile document in real-time. It uses `onSnapshot` for live updates and provides a clean `updateProfile` function.

### Key Benefits

* **Maintainability:** Code is easier to find, debug, and modify.
* **Scalability:** The data model and state management patterns can handle significant growth in application complexity and data size.
* **Performance:** Centralized data fetching and a clear state management strategy reduce redundant operations and improve perceived performance.
* **Testability:** Decoupling the UI from the logic makes the application highly testable.

---

## Future Development Roadmap

The recent refactor has unlocked the potential for several professional-grade features and improvements. The following are the recommended next steps for development.

### 1. Real-time Data Synchronization

* **Goal:** Enhance the user experience by ensuring data lists (like quotes and clients) update in real-time across all of the user's devices or browser tabs.
* **Strategy:** Enhance the `useUserCollection` hook to accept an optional `realtime: boolean` parameter. If true, the hook will use Firestore's `onSnapshot` listener instead of a one-time `getDocs` call. This requires implementing a proper `unsubscribe` call in the `useEffect` cleanup function to prevent memory leaks.

### 2. Client-Side State Persistence

* **Goal:** Drastically improve the perceived load time of the application for returning users and provide basic offline access to global data.
* **Strategy:** Integrate Zustand's `persist` middleware into the `useDataStore`. This will automatically save the contents of the global store (tasks, materials, etc.) to the browser's `localStorage` and rehydrate the store from it on subsequent visits, making the UI appear instantly while fresh data is fetched in the background.

### 3. Firestore Data Modeling Verification

* **Goal:** Ensure the application's Firestore data model is scalable and avoids document size limitations.
* **Strategy:** Verify that the `saveQuote` action in the `useQuoteBuilderStore` saves all `QuoteLine` items as individual documents within a `/quotes/{quoteId}/quoteLines` sub-collection. This prevents the main `Quote` document from bloating and is critical for the application's long-term health.

### 4. Automated Testing Strategy

* **Goal:** Build confidence in the codebase, prevent regressions, and speed up future development by implementing an automated testing suite.
* **Strategy:** Introduce a testing framework like **Jest** with **React Testing Library**. The new architecture makes the app highly testable:
    * **Unit Tests:** Write tests for the Zustand stores in isolation to verify that actions correctly modify the state.
    * **Hook Tests:** Use `renderHook` to test custom hooks like `useUserCollection` independently of any UI, mocking Firebase calls and asserting the hook's return values.
    * **Component Tests:** Components can be tested easily by mocking the hooks they consume, allowing for targeted tests of rendering logic based on different states (e.g., loading, error, success).
