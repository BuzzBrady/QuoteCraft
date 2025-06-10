# QuoteCraft Component Backend Workflow

This document provides a detailed breakdown of the data flow, state management, and backend interactions for the major components in the QuoteCraft application.

**Last Updated:** June 10, 2025

---

## 1. Page-Level Components

These components are the primary views rendered by the router. They are responsible for orchestrating the data flow for an entire page or a major feature.

### 1.1. `MyClientsPage.tsx`

* **Purpose:** Provides a full interface for a user to manage their client list.
* **Data Fetching (Read):**
    * The `fetchClients` function queries the `users/{userId}/clients` collection in Firestore.
    * It uses `orderBy('clientName', 'asc')` to sort the results alphabetically.
    * The fetched documents are stored in the `clients: Client[]` state variable.
    * Manages `isLoading` and `error` states for the fetch operation.
* **State Management:**
    * `clients: Client[]`: Holds the list of clients displayed in the UI.
    * `isLoading: boolean`: Tracks the loading state for fetching and deleting.
    * `isModalOpen: boolean`: Controls the visibility of the Add/Edit Client modal.
    * `editingClient: Client | null`: Stores the client object when in "edit" mode to populate the modal.
    * `formData: ClientFormData`: Holds the state for the input fields within the modal.
* **Data Manipulation (Writes):**
    * **Add Client:** The `handleSubmitClient` function calls `addDoc` to create a new document in `users/{userId}/clients` with the data from the form. It includes `createdAt` and `updatedAt` server timestamps.
    * **Update Client:** If `editingClient` is not null, `handleSubmitClient` calls `updateDoc` on the specific client document (`users/{userId}/clients/{clientId}`) to save the changes.
    * **Delete Client:** The `handleDeleteClient` function calls `deleteDoc` on a specific client document after a user confirmation (`window.confirm`).
    * **CSV Import:**
        * The `handleFileChange` function uses the `papaparse` library to parse a user-uploaded CSV file.
        * The `handleImportClients` function takes the parsed data and creates a Firestore `writeBatch`. It iterates through the records, creates a new document reference for each, and stages a `set` operation in the batch. Finally, it commits the batch to add all clients in a single atomic operation.
* **Data Flow (Outputs):**
    * After any add, update, delete, or import operation, the component calls `fetchClients()` again to refresh its `clients` state and update the UI.
    * The modal is self-contained within this component, so it doesn't emit events to a parent.

### 1.2. `ManageCustomItemsPage.tsx`

* **Purpose:** Acts as a container with tabs to switch between managing custom tasks and custom materials.
* **Data Fetching (Read):** This component itself does not fetch data. It delegates the data fetching to its child components (`CustomTasksManager` and `CustomMaterialsManager`) based on which tab is active.
* **State Management:**
    * `activeTab: 'tasks' | 'materials'`: A simple state to control which of the two child components is visible.
* **Data Manipulation (Writes):** None. All write operations are handled by the child manager components.

### 1.3. `KitCreatorPage.tsx`

* **Purpose:** A comprehensive page for creating, viewing, and editing "Kit Templates" (pre-defined bundles of line items).
* **Data Fetching (Read):**
    * **Kits:** `fetchUserKits` queries `users/{userId}/kitTemplates` to display in the "My Kits" tab.
    * **Supporting Data:** A main `useEffect` hook fetches all global/custom tasks, global/custom materials, and user rate templates using `Promise.all()`. This data is required by the item form selectors and for rate calculations. It is stored in `allTasks`, `allMaterials`, and `userRates` state.
* **State Management:**
    * `userKits: KitTemplate[]`: The list of the user's saved kits.
    * `kitName`, `kitDescription`, `kitTags`: State for the main kit details form.
    * `kitLineItems: KitLineItemTemplate[]`: An array holding the line items that are currently part of the kit being built or edited.
    * `itemFormData: KitItemFormData`: A complex object holding the state for the "Add New Item to Kit" sub-form, including the selected task/material/option objects.
    * `showItemForm: boolean`: Toggles the visibility of the "Add New Item to Kit" form.
* **Data Manipulation (Writes):**
    * **Save/Update Kit:** The `handleSaveKit` function saves the entire kit.
        * If editing, it calls `updateDoc` on `users/{userId}/kitTemplates/{kitId}`.
        * If adding, it calls `addDoc` to create a new document in the same collection.
        * The `lineItems` array from the state is saved as an array of objects within the kit document.
    * **Delete Kit:** `handleDeleteKit` calls `deleteDoc` on a specific kit document.
    * **Quick Add Items:** The page can trigger modals (`QuickAddMaterialModal`) or prompts (`handleCreateCustomTaskForItemForm`) to create new tasks/materials, which then write to the `customTasks` or `customMaterials` collections respectively.

---

## 2. Data Manager Components

These components are rendered within pages and manage the CRUD operations for a specific data type.

### 2.1. `CustomTasksManager.tsx` & `CustomMaterialsManager.tsx`

*(Their workflows are nearly identical, so they are documented together)*

* **Purpose:** To display a list of a user's custom tasks or materials and provide the UI to trigger add, edit, and delete operations via modals.
* **Data Fetching (Read):**
    * `fetchTasks` / `fetchMaterials` queries the relevant user subcollection (`users/{userId}/customTasks` or `users/{userId}/customMaterials`).
    * The results are stored in local state (`tasks` or `materials`).
* **State Management:**
    * `tasks: CustomTask[]` or `materials: CustomMaterial[]`: Holds the list of items.
    * `isModalOpen: boolean` & `modalMode: 'add' | 'edit'`: Manages the state for the corresponding form modal.
    * `currentTask` / `currentMaterial`: Holds the data for the item currently being edited.
* **Data Manipulation (Writes):**
    * **Add/Edit:** These components render a form modal (`TaskFormModal` or `MaterialFormModal`). The save logic is contained *within the modal component itself*. This manager simply provides a callback (`handleSaveTask` / `handleSaveFromEditModal`) that gets called by the modal after a successful save to trigger a re-fetch of the data list.
    * **Delete:** The delete handlers (`handleDeleteTask` / `handleDeleteMaterial`) call `deleteDoc` on the specific item document. `handleDeleteMaterial` also includes logic to perform a `writeBatch` to delete the `options` subcollection if it exists.
* **Data Flow (Outputs):**
    * Passes an `onSave` callback to its modal. When the modal saves successfully, it calls this function, which triggers `fetchTasks`/`fetchMaterials` to update the list displayed on the page.

---

## 3. Modal & Form Components

These components are responsible for user input and data creation/updates.

### 3.1. `TaskFormModal.tsx` / `MaterialFormModal.tsx` / `RateTemplateFormModal.tsx`

*(These all follow a similar pattern)*

* **Purpose:** Provide a self-contained UI in a modal dialog for adding or editing a single data entity (a Task, Material, or Rate Template).
* **Data Flow (Inputs):**
    * `isOpen: boolean`: Controls visibility.
    * `onClose: () => void`: A function from the parent to close the modal.
    * `onSave: (data: any) => Promise<void>`: A callback function from the parent that is responsible for the actual Firestore write operation. The modal collects the data and passes it to this function.
    * `initialData`: The object to edit, used to pre-populate the form fields when in 'edit' mode.
    * `mode: 'add' | 'edit'`: Tells the modal which mode it's in.
    * `allTasks`, `allMaterials` (for `RateTemplateFormModal`): Data passed from the parent to populate selectors, avoiding redundant fetches.
* **Data Fetching (Read):**
    * Generally, these modals **do not fetch their own data**. They receive it via props (`allTasks`, `allMaterials`, `initialData`).
    * An exception is `MaterialFormModal`, which fetches the `options` subcollection for a material when in 'edit' mode.
* **State Management:**
    * Each modal has its own internal state for every form field (e.g., `useState` for `name`, `description`, `rate`, etc.).
    * `isSaving`: A boolean to disable the save button during a Firestore operation.
* **Data Manipulation (Writes):**
    * The `handleSubmit` function in each modal gathers the data from its internal form state into a single object.
    * It then calls the `onSave` prop, passing this data object up to the parent component (`CustomTasksManager`, `UserRateTemplatesPage`, etc.), which then performs the actual `addDoc` or `updateDoc` to Firestore.
    * *Correction/Refinement:* In some of our final versions, we moved the save logic *inside* the modal's `handleSubmit` to make the component more self-contained. In this case, the `onSaveCallback` prop from the parent is just used to signal a successful save so the parent can refresh its data.
* **UI/UX:**
    * Each modal now contains a `useEffect` to set `document.body.style.overflow = 'hidden'` when it opens, preventing the page behind it from scrolling.
    * Their corresponding CSS Modules are configured to allow the modal's internal content area (`.modalBody`) to scroll if it becomes too long.