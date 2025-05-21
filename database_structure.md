# Quote Builder App - Firestore Database Structure

This document outlines the structure of the Firestore database for the Quote Builder application.


### 1. Areas

*   **Collection Name:** `areas`
*   **Document ID:** `areaId` (string, unique)
*   **Fields:**
    *   `name`: (string) The name of the area (e.g., "Bathroom", "Kitchen").
    *   `categories`: (array of document references) References to documents in the `categories` collection that belong to this area.

### 2. Categories

*   **Collection Name:** `categories`
*   **Document ID:** `categoryId` (string, unique)
*   **Fields:**
    *   `name`: (string) The name of the category (e.g., "Plumbing", "Tiling").
    *   `areaId`: (document reference) A reference to the `areas` document to which this category belongs.
    *   `tasks`: (array of document references) References to documents in the `tasks` collection that belong to this category.

### 3. Tasks

*   **Collection Name:** `tasks`
*   **Document ID:** `taskId` (string, unique)
*   **Fields:**
    *   `name`: (string) The name of the task (e.g., "Supply and Install", "Remove and Dispose").
    *   `categoryId`: (document reference) A reference to the `categories` document to which this task belongs.
    *   `materials`: (array of document references) References to documents in the `materials` collection that can be used with this task.
    *   `price_method`: (string) Specifies how the task is priced. Possible values:
        *   `"fixed"`: Fixed price.
        *   `"meter_rate"`: Price per unit of measure.
        *   `"lump_sum"`: Fixed amount
    *   `fixed_price`: (number, optional) The fixed price of the task (if `price_method` is `"fixed"`).
    *   `meter_rate`: (number, optional) The price per unit (if `price_method` is `"meter_rate"`).
    *   `unit`: (string, optional) The unit of measure (e.g., "m2", "linear meter") (if `price_method` is `"meter_rate"`).

### 4. Materials

*   **Collection Name:** `materials`
*   **Document ID:** `materialId` (string, unique)
*   **Fields:**
    *   `name`: (string) The name of the material (e.g., "Bath", "Shower", "Floorboards").
    *   `materialOptions`: (array of document references) References to documents in the `material_options` collection that are options for this material.

### 5. Material Options

*   **Collection Name:** `material_options`
*   **Document ID:** `materialOptionId` (string, unique)
*   **Fields:**
    *   `name`: (string) The name of the material option (e.g., "Freestanding", "Spa", "Timber").
    *   `materialId`: (document reference) A reference to the `materials` document to which this option belongs.


    quoteItemTemplates Collection

This is the core collection defining the actual line items available for selection in the quote builder. Each document represents a specific combination of category, task, material (and potentially option) along with its pricing structure.
/quoteItemTemplates/{templateId}
displayName: String (User-friendly name for selection, e.g., "Supply and Install Standard Bath", "Lay Floor Protection", "PA: Cabinetry")
description: String (Optional: More details about the item)
categoryId: String (Reference to /categories/{categoryId})
taskId: String (Reference to /tasks/{taskId})
materialId: String (Reference to /materials/{materialId})
materialOptionId: String (Optional: Reference to /materials/{materialId}/materialOptions/{optionId} - Use if this template is only for a specific option)
relevantAreaIds: Array&lt;String> (Optional: List of /areas/{areaId} where this template is applicable. If empty or omitted, assume it's applicable to all areas where the categoryId is relevant or handle relevance logic in your app/backend.)
pricingMethod: String (Enum: "fixed", "unit_rate", "provisional_allowance")
rate: Number (The cost per unit for unit_rate, or the total fixed price for fixed. Can be 0 for provisional_allowance.)
unit: String (e.g., "each", "m2", "lm", "item", "lot", "allowance" - Specifies the unit for unit_rate or context for fixed/pa)
requiresQuantityInput: Boolean (Typically true for unit_rate)
requiresPriceInput: Boolean (Typically true for provisional_allowance)
isCheckbox: Boolean (Typically true for simple fixed price items like "Floor Protection")
allowMaterialOptionsSelection: Boolean (If true, and materialOptionId is not set, the user must select an option from the linked materialId's subcollection)
defaultQuantity: Number (Optional: Pre-fill quantity, e.g., 1)
defaultPrice: Number (Optional: Pre-fill price for PA, e.g., 1500)
order: Number (For sorting items within a category list)